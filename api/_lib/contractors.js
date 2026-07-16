/* Server-side identity resolution. This is the security core:
   email -> AuthorizedContractors -> Customer ID -> Customers -> Base ID.
   Nothing client-supplied ever selects a base. */
const { listRecords, formulaString } = require('./airtable');
const cfg = require('./config');

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function hubBaseId() {
  const id = process.env.AIRTABLE_HUB_BASE_ID;
  if (!id) throw new Error('AIRTABLE_HUB_BASE_ID is not configured');
  return id;
}

function normalizeEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

/* Returns { customerId } or null. Email must already be normalized. */
async function findAuthorizedContractor(email) {
  const records = await listRecords(hubBaseId(), cfg.AUTHORIZED_TABLE, {
    filterByFormula: `LOWER({${cfg.AUTHORIZED_EMAIL_FIELD}}) = ${formulaString(email)}`,
    maxRecords: 1
  });
  if (!records.length) return null;
  const customerId = records[0].fields[cfg.AUTHORIZED_CUSTOMER_ID_FIELD];
  return customerId ? { customerId: String(customerId) } : null;
}

/* Returns the contractor's own Airtable base ID, or null. */
async function resolveBaseId(customerId) {
  const records = await listRecords(hubBaseId(), cfg.CUSTOMERS_TABLE, {
    filterByFormula: `{${cfg.CUSTOMER_ID_FIELD}} = ${formulaString(customerId)}`,
    maxRecords: 1
  });
  if (!records.length) return null;
  const baseId = records[0].fields[cfg.CUSTOMER_BASE_ID_FIELD];
  return typeof baseId === 'string' && /^app[A-Za-z0-9]+$/.test(baseId) ? baseId : null;
}

module.exports = { hubBaseId, normalizeEmail, findAuthorizedContractor, resolveBaseId };
