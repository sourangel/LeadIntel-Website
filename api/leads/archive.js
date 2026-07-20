/* POST /api/leads/archive — sets the Archived checkbox on ONE lead in the
   authenticated contractor's OWN base.

   Authentication, base resolution and the ownership check are shared with the
   status endpoint via _lib/leadAccess.js. Only the Archived field is writable
   here; nothing else on the record can be reached through this endpoint. */
const { updateRecord } = require('../_lib/airtable');
const { resolveOwnedLead } = require('../_lib/leadAccess');
const cfg = require('../_lib/config');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

    const owned = await resolveOwnedLead(req, body.id);
    if (owned.error) return res.status(owned.status).json({ ok: false, error: owned.error });

    // Strictly boolean — no truthy strings, no 0/1. The value written is a
    // real boolean built here, never the client's value.
    if (typeof body.archived !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'archived must be true or false' });
    }
    const archived = body.archived === true;

    // Only ever this one field, on this one record, in this one base.
    await updateRecord(owned.baseId, cfg.LEADS_TABLE, owned.recordId, {
      [cfg.LEAD_FIELDS.archived]: archived
    });

    return res.status(200).json({ ok: true, id: owned.recordId, archived });
  } catch (err) {
    console.error('archive error:', err.message);
    // A missing "Archived" column in the contractor's base surfaces here as an
    // Airtable 422; the generic message keeps base internals out of the client.
    return res.status(500).json({ ok: false, error: 'Could not update that lead right now' });
  }
};
