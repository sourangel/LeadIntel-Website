/* POST /api/leads/update-status — sets the Status field on ONE lead in the
   authenticated contractor's OWN base.

   Authentication, base resolution and the ownership check all live in
   _lib/leadAccess.js, shared with the archive endpoint. */
const { updateRecord } = require('../_lib/airtable');
const { resolveOwnedLead } = require('../_lib/leadAccess');
const cfg = require('../_lib/config');

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
    const body = req.body || {};

    // Authenticate and prove ownership first — an anonymous caller learns
    // nothing about the payload rules.
    const owned = await resolveOwnedLead(req, body.id);
    if (owned.error) return res.status(owned.status).json({ ok: false, error: owned.error });

    const status = canonicalStatus(body.status);
    if (!status) {
      return res.status(400).json({
        ok: false,
        error: `Status must be one of: ${cfg.LEAD_STATUSES.join(', ')}`
      });
    }

    // Only ever this one field, on this one record, in this one base.
    await updateRecord(owned.baseId, cfg.LEADS_TABLE, owned.recordId, {
      [cfg.LEAD_FIELDS.status]: status
    });

    return res.status(200).json({ ok: true, id: owned.recordId, status });
  } catch (err) {
    console.error('update-status error:', err.message);
    return res.status(500).json({ ok: false, error: 'Could not update that lead right now' });
  }
};
