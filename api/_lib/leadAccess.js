/* Shared authorization gate for every per-lead WRITE endpoint.

   This is the single place the cross-contractor protection lives, so the
   status and archive endpoints cannot drift apart:
     1. Identity comes only from the signed session cookie.
     2. Authorization is re-checked live against AuthorizedContractors, so
        revoking an email cuts off writes immediately.
     3. The base ID is re-derived server-side from that verified identity —
        no base ID or customer ID is ever accepted from the browser.
     4. The record is looked up in THAT base only. A record belonging to any
        other contractor simply isn't there, so the caller gets "not found"
        and no write is attempted. */
const { getRecord } = require('./airtable');
const { findAuthorizedContractor, resolveBaseId } = require('./contractors');
const { readSession } = require('./session');
const cfg = require('./config');

// Airtable record IDs: "rec" + 14 alphanumerics. Anything else can't be a real
// record, so it never reaches the API.
const RECORD_ID_RE = /^rec[A-Za-z0-9]{14}$/;

function fail(status, error) {
  return { error, status };
}

/* Returns { baseId, recordId, record } for a lead the caller provably owns,
   or { status, error } describing the refusal. */
async function resolveOwnedLead(req, rawRecordId) {
  const email = readSession(req);
  if (!email) return fail(401, 'Not signed in');

  const contractor = await findAuthorizedContractor(email);
  if (!contractor) return fail(401, 'Not signed in');

  const baseId = await resolveBaseId(contractor.customerId);
  if (!baseId) return fail(404, 'No lead base found for your account');

  const recordId = typeof rawRecordId === 'string' ? rawRecordId.trim() : '';
  if (!RECORD_ID_RE.test(recordId)) return fail(400, 'Invalid lead id');

  // The ownership gate: scoped to the base resolved from the session.
  const record = await getRecord(baseId, cfg.LEADS_TABLE, recordId);
  if (!record) return fail(404, 'Lead not found');

  return { baseId, recordId, record };
}

module.exports = { resolveOwnedLead, RECORD_ID_RE };
