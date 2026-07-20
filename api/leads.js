/* GET /api/leads — returns ONLY the authenticated contractor's leads.
   Identity comes exclusively from the signed session cookie; the base
   is re-resolved server-side on every request. */
const { listRecords } = require('./_lib/airtable');
const { findAuthorizedContractor, resolveBaseId } = require('./_lib/contractors');
const { readSession } = require('./_lib/session');
const cfg = require('./_lib/config');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const email = readSession(req);
    if (!email) return res.status(401).json({ ok: false, error: 'Not signed in' });

    // Authorization is re-checked live, so revoking an email in Airtable
    // cuts off access immediately even with a valid cookie.
    const contractor = await findAuthorizedContractor(email);
    if (!contractor) return res.status(401).json({ ok: false, error: 'Not signed in' });

    const baseId = await resolveBaseId(contractor.customerId);
    if (!baseId) return res.status(404).json({ ok: false, error: 'No lead base found for your account' });

    const records = await listRecords(baseId, cfg.LEADS_TABLE);
    const f = cfg.LEAD_FIELDS;
    const leads = records.map((r) => ({
      id: r.id,
      name: r.fields[f.name] || '',
      phone: r.fields[f.phone] || '',
      email: r.fields[f.email] || '',
      details: r.fields[f.details] || '',
      score: numberOrNull(r.fields[f.score]),
      priority: String(r.fields[f.priority] || '').toUpperCase(),
      // Returned as the raw stored text (e.g. "$10,000–$12,000"); the
      // client displays it verbatim and parses ranges for the total.
      estimatedValue: r.fields[f.estimatedValue] != null ? String(r.fields[f.estimatedValue]) : '',
      recommendedAction: r.fields[f.recommendedAction] || '',
      status: r.fields[f.status] || '',
      // Airtable omits unchecked checkboxes, and bases that predate the field
      // omit it entirely — both read as not archived.
      archived: r.fields[f.archived] === true
    }));

    return res.status(200).json({ ok: true, email, leads });
  } catch (err) {
    console.error('leads error:', err.message);
    return res.status(500).json({ ok: false, error: 'Could not load leads right now' });
  }
};

function numberOrNull(v) {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v;
  return typeof n === 'number' && isFinite(n) ? n : null;
}
