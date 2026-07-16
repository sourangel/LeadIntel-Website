/* Minimal Airtable REST client. The PAT never leaves the server. */
const API_ROOT = 'https://api.airtable.com/v0';

function pat() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) throw new Error('AIRTABLE_PAT is not configured');
  return token;
}

async function airtableRequest(method, baseId, table, { query, body } = {}) {
  let url = `${API_ROOT}/${baseId}/${encodeURIComponent(table)}`;
  if (query) url += `?${new URLSearchParams(query)}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${pat()}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Airtable ${method} ${table} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Escape a value for use inside a single-quoted Airtable formula string.
function formulaString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function listRecords(baseId, table, { filterByFormula, maxRecords } = {}) {
  const records = [];
  let offset;
  do {
    const query = {};
    if (filterByFormula) query.filterByFormula = filterByFormula;
    if (maxRecords) query.maxRecords = String(maxRecords);
    if (offset) query.offset = offset;
    const page = await airtableRequest('GET', baseId, table, { query });
    records.push(...page.records);
    offset = page.offset;
  } while (offset && (!maxRecords || records.length < maxRecords));
  return records;
}

async function createRecord(baseId, table, fields) {
  return airtableRequest('POST', baseId, table, { body: { records: [{ fields }] } });
}

async function updateRecord(baseId, table, recordId, fields) {
  return airtableRequest('PATCH', baseId, table, {
    body: { records: [{ id: recordId, fields }] }
  });
}

module.exports = { listRecords, createRecord, updateRecord, formulaString };
