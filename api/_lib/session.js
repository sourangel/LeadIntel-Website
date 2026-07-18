/* Stateless signed-cookie sessions (HMAC-SHA256, HttpOnly).
   The cookie payload holds only { email, exp } — every request
   re-resolves the contractor's base server-side from the email. */
const crypto = require('crypto');
const { SESSION_TTL_MS } = require('./config');

const COOKIE_NAME = 'li_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set (32+ chars)');
  return s;
}

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

function createSessionCookie(email) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  return serializeCookie(value, Math.floor(SESSION_TTL_MS / 1000));
}

function clearSessionCookie() {
  return serializeCookie('', 0);
}

function serializeCookie(value, maxAge) {
  return `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/* Returns the session email, or null if missing/invalid/expired. */
function readSession(req) {
  const header = req.headers.cookie || '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  const dot = value.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.email !== 'string' || typeof data.exp !== 'number') return null;
    if (Date.now() > data.exp) return null;
    return data.email;
  } catch {
    return null;
  }
}

module.exports = { createSessionCookie, clearSessionCookie, readSession };
