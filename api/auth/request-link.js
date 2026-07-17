/* POST { email } — always responds with the same generic message,
   whether or not the email is on the authorized list. */
const crypto = require('crypto');
const { listRecords, createRecord, formulaString } = require('../_lib/airtable');
const { normalizeEmail, findAuthorizedContractor, hubBaseId } = require('../_lib/contractors');
const cfg = require('../_lib/config');

const GENERIC = {
  ok: true,
  message: 'If that email has dashboard access, a sign-in link is on its way. Check your inbox.'
};

// Best-effort per-instance rate limit (backed up by the per-email cap below).
const attempts = new Map();
function rateLimited(key) {
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const list = (attempts.get(key) || []).filter((t) => t > windowStart);
  list.push(now);
  attempts.set(key, list);
  if (attempts.size > 5000) attempts.clear();
  return list.length > 8;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const email = normalizeEmail((req.body || {}).email);
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (!email || rateLimited(ip) || rateLimited(email)) {
      return res.status(200).json(GENERIC);
    }

    const contractor = await findAuthorizedContractor(email);
    if (!contractor) return res.status(200).json(GENERIC);

    // Cap outstanding links per email (durable across serverless instances).
    const active = await listRecords(hubBaseId(), cfg.MAGIC_LINKS_TABLE, {
      filterByFormula:
        `AND({${cfg.MAGIC_EMAIL_FIELD}} = ${formulaString(email)}, ` +
        `NOT({${cfg.MAGIC_USED_FIELD}}), ` +
        `IS_AFTER({${cfg.MAGIC_EXPIRES_FIELD}}, NOW()))`
    });
    if (active.length >= cfg.MAX_ACTIVE_LINKS_PER_EMAIL) {
      return res.status(200).json(GENERIC);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await createRecord(hubBaseId(), cfg.MAGIC_LINKS_TABLE, {
      [cfg.MAGIC_TOKEN_HASH_FIELD]: tokenHash,
      [cfg.MAGIC_EMAIL_FIELD]: email,
      [cfg.MAGIC_EXPIRES_FIELD]: new Date(Date.now() + cfg.MAGIC_LINK_TTL_MS).toISOString()
    });

    const origin = process.env.APP_URL;
    if (!origin) {
      // Never fall back to req.headers.host — on Vercel that is the
      // per-deployment hash URL, which produces broken/rotating links.
      throw new Error('APP_URL is not configured; refusing to build a magic link');
    }
    const link = `${origin.replace(/\/$/, '')}/api/auth/verify?token=${token}`;
    await sendMagicLinkEmail(email, link);

    return res.status(200).json(GENERIC);
  } catch (err) {
    console.error('request-link error:', err.message);
    // Still generic — never leak internals or authorization state.
    return res.status(200).json(GENERIC);
  }
};

async function sendMagicLinkEmail(to, link) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  const from = process.env.MAGIC_LINK_FROM_EMAIL || 'LeadIntel CRM <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your LeadIntel CRM sign-in link',
      html:
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">` +
        `<h2 style="color:#0B0F17;">Sign in to your lead dashboard</h2>` +
        `<p style="color:#5B6B80;line-height:1.6;">Click the button below to sign in. This link works once and expires in 15 minutes.</p>` +
        `<p style="margin:28px 0;"><a href="${link}" style="background:#2E7CF6;color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:bold;display:inline-block;">Open My Dashboard</a></p>` +
        `<p style="color:#8492A3;font-size:13px;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>` +
        `</div>`
    })
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status})`);
}
