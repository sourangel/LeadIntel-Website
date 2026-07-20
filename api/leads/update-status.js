/* POST /api/leads/update-status — sets the Status field on ONE lead in the
   authenticated contractor's OWN base.

   Security model (mirrors GET /api/leads exactly):
     1. Identity comes only from the signed session cookie.
     2. Authorization is re-checked live against AuthorizedContractors.
     3. The base ID is re-derived server-side from that verified identity.
        No base ID or customer ID is ever accepted from the browser.
     4. The target record must already exist in that resolved base, or the
        request is refused — a record ID from another contractor's base is
        simply not found here.
     5. Only the Status field is written, and only with one of four
        server-defined literals. */
const { getRecord, updateRecord } = require('../_lib/airtable');
const { findAuthorizedContractor, resolveBaseId } = require('../_lib/contractors');
const { readSession } = require('../_lib/session');
const cfg = require('../_lib/config');

// Airtable record IDs: "rec" + 14 alphanumerics. Anything else never reaches
// the API — it can't be a real record, so there is nothing to look up.
const RECORD_ID_RE = /^rec[A-Za-z0-9]{14}$/;

/* Maps submitted text to one of the four canonical values, or null.
   Matching ignores case and surrounding whitespace, but the value WRITTEN is
   always the canonical literal from config — never the client's string. */
function canonicalStatus(raw) {
  if (typeof raw !== 'string') return null;
  const needle = raw.trim().toLowerCase();
  return cfg.LEAD_STATUSES.find((s) => s.toLowerCase() === needle) || null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const email = readSession(req);
    if (!email) return res.status(401).json({ ok: false, error: 'Not signed in' });

    // Re-checked live, so revoking an email in Airtable cuts off writes
    // immediately even with a valid cookie.
    const contractor = await findAuthorizedContractor(email);
    if (!contractor) return res.status(401).json({ ok: false, error: 'Not signed in' });

    const baseId = await resolveBaseId(contractor.customerId);
    if (!baseId) return res.status(404).json({ ok: false, error: 'No lead base found for your account' });

    const body = req.body || {};
    const recordId = typeof body.id === 'string' ? body.id.trim() : '';
    if (!RECORD_ID_RE.test(recordId)) {
      return res.status(400).json({ ok: false, error: 'Invalid lead id' });
    }

    const status = canonicalStatus(body.status);
    if (!status) {
      return res.status(400).json({
        ok: false,
        error: `Status must be one of: ${cfg.LEAD_STATUSES.join(', ')}`
      });
    }

    // Ownership gate. The lookup is scoped to the base we resolved from the
    // session, so a record belonging to any other contractor returns null.
    const existing = await getRecord(baseId, cfg.LEADS_TABLE, recordId);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Lead not found' });
    }

    // Only ever this one field, on this one record, in this one base.
    await updateRecord(baseId, cfg.LEADS_TABLE, recordId, {
      [cfg.LEAD_FIELDS.status]: status
    });

    return res.status(200).json({ ok: true, id: recordId, status });
  } catch (err) {
    console.error('update-status error:', err.message);
    return res.status(500).json({ ok: false, error: 'Could not update that lead right now' });
  }
};
