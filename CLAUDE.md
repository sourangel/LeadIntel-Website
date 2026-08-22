# LeadIntel CRM — website redesign

This folder is the **redesign** of leadintelcrm.com. It is not yet deployed.
The live site still runs from `~/Desktop/LeadIntel-Website`
(github.com/sourangel/LeadIntel-Website, auto-deploying to Vercel from `main`).

Ten static pages, no build step, no framework. Plain HTML + one stylesheet.

## Read this first

`DESIGN.md` is the authoritative design system and it is strict. Read it before
changing any visual. It is adapted from the REKKI system with two deliberate
divergences (font substitutions, and lead priority encoded by luminance instead
of a second accent colour). Do not "improve" toward conventional SaaS defaults —
bold headlines, drop shadows, and semantic red/green are all explicitly wrong here.

Key rules that get broken by accident:
- One chromatic accent only. `#0063e1` is for the single primary CTA per viewport,
  active nav, brand dots, and lead priority. Never decorative.
- Headlines are weight 400. Authority comes from size and negative tracking.
- Elevation is the 12% inset white border. There are no drop shadows.
- Every colour comes from a token in `:root`. No hardcoded hex in components.

## Layout

```
index.html  pricing.html  about.html  contact.html  web-design.html
login.html  sms-optin.html  privacy.html  terms.html  dashboard.html
assets/styles.css      all ten pages; tokens live in :root here
assets/dashboard.css   dashboard-only components, inherits the same tokens
assets/site.js         mobile menu + homepage queue animation
assets/dashboard.js    the dashboard app
assets/logo-mark-128.png   eclipse mark, rendered at 34px (see DESIGN.md)
tools/build-preview.py     bundles all ten pages into one shareable file
files/, files.zip          source artwork — NOT for deploy
```

A palette change is one edit: the `:root` block in `assets/styles.css`.
All ten pages and the dashboard pick it up.

## The dashboard talks to a real API — do not reinvent it

`assets/dashboard.js` speaks to serverless functions that already exist in the
live repo under `api/`. The Airtable credentials live server-side; nothing here
holds a key, and nothing here should.

```
GET  /api/leads               -> { email, leads: [...] }
POST /api/leads/update-status -> { id, status }   -> { ok, status }
POST /api/leads/archive       -> { id, archived } -> { ok, archived }
POST /api/auth/logout
POST /api/auth/request-link   -> { email } -> { message }   (login.html)
```

Any 401 means the session expired; redirect to `/login`.

A lead record: `id, name, created, phone, email, estimatedValue, priority, score,
status, recommendedAction, details, archived`.

- `priority` is uppercase `HOT` / `WARM` / `COLD`.
- `estimatedValue` is free text ("$10,000–$12,000", "$8,500+"). A range contributes
  its midpoint to the pipeline total.
- `details` is one string joined by `" • "`, each segment `"Label: value"`.
- Statuses are `New`, `Contacted`, `Won`, `Lost`.

## Things that must not change

- `dashboard.html` and `login.html` keep those filenames. `vercel.json` rewrites
  `/dashboard` and `/login` to them.
- `/api/auth/verify` is baked into magic-link emails already in people's inboxes.
- `login.html` must keep reading `?error=link` — `verify.js` redirects there when a
  link is expired or already used. Without it an expired link is a dead end.
- The SMS consent text in `sms-optin.html` is carrier-compliance language. It posts
  to a Make.com webhook with seven exact keys. Do not reword or restructure it.
- `privacy.html` and `terms.html` bodies were carried over verbatim and word-count
  verified. Do not rewrite legal copy.

## Deploying (not started)

1. Branch `redesign` in the live repo; copy these files over `main`'s.
2. Push. Vercel builds a preview automatically.
3. **Set a Preview-scoped `APP_URL`** in Vercel to the branch alias URL. Magic links
   are built as `${APP_URL}/api/auth/verify?token=…` and the code deliberately refuses
   to fall back to the request host — so without this, a link requested from preview
   emails you into *production*.
4. Test on preview: request a link, sign in, confirm real leads load, change a status,
   archive something, sign out.
5. Merge to `main`. Vercel Instant Rollback is the undo.

Session cookies are host-only (`Path=/; HttpOnly; Secure; SameSite=Lax`, no Domain),
so preview holds its own login without touching production.

## Local preview

```
python3 -m http.server 4173
```

Then http://localhost:4173/index.html — hard-reload (Cmd+Shift+R) after CSS edits.

The dashboard shows its error state locally because `/api/leads` doesn't exist here.
That is expected. `tools/build-preview.py` bundles everything into one self-contained
file with sample leads injected, for sharing.
