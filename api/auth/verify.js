/* GET /api/auth/verify?token=... — validates a one-time magic link,
   marks it used, sets the session cookie, redirects to the dashboard. */
const crypto = require('crypto');
const { listRecords, updateRecord } = require('../_lib/airtable');
const { findAuthorizedContractor, hubBaseId } = require('../_lib/contractors');
const { createSessionCookie } = require('../_lib/session');
const cfg = require('../_lib/config');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const fail = () => res.redirect(302, '/login?error=link');

  try {
    const token = String((req.query || {}).token || '');
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return fail();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Token hash is server-generated hex, safe to embed in the formula.
    const records = await listRecords(hubBaseId(), cfg.MAGIC_LINKS_TABLE, {
      filterByFormula: `{${cfg.MAGIC_TOKEN_HASH_FIELD}} = '${tokenHash}'`,
      maxRecords: 1
    });
    if (!records.length) return fail();

    const rec = records[0];
    const used = !!rec.fields[cfg.MAGIC_USED_FIELD];
    const expires = Date.parse(rec.fields[cfg.MAGIC_EXPIRES_FIELD] || '');
    const email = String(rec.fields[cfg.MAGIC_EMAIL_FIELD] || '').toLowerCase();
    if (used || !email || !expires || Date.now() > expires) return fail();

    // Burn the token before issuing the session (single use).
    await updateRecord(hubBaseId(), cfg.MAGIC_LINKS_TABLE, rec.id, {
      [cfg.MAGIC_USED_FIELD]: true
    });

    // Re-check authorization at sign-in time — removing an email from
    // AuthorizedContractors invalidates any outstanding links.
    const contractor = await findAuthorizedContractor(email);
    if (!contractor) return fail();

    res.setHeader('Set-Cookie', createSessionCookie(email));
    return res.redirect(302, '/dashboard');
  } catch (err) {
    console.error('verify error:', err.message);
    return fail();
  }
};
