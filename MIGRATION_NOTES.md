# fampass.io: Migrating from Firebase Hosting to Vercel

This branch adds Vercel-deployable infrastructure to the existing Astro site:

- **TikTok OAuth endpoints** at `/auth/tiktok/start` + `/auth/tiktok/callback`, deployed as Vercel serverless functions (via the @astrojs/vercel adapter)
- **Audit-ready legal pages** with TikTok-specific privacy + terms language required by TikTok's production audit reviewers
- **Tighter Firestore rules** that lock down the new `tiktok_credentials` collection so refresh tokens can never leak to a browser

The site still uses **Firestore (blog posts + feedback)** and **Firebase Auth (admin login)** as its data backend. Only the *hosting* changes — Firebase Hosting → Vercel.

---

## What's new in this branch

```
fampass-website/
├── astro.config.mjs                            ← UPDATED: adds @astrojs/vercel adapter
├── firestore.rules                             ← UPDATED: locks down tiktok_credentials
├── package.json                                ← UPDATED: +@astrojs/vercel +firebase-admin
│
├── vercel.json                                 ← NEW: blog 301 + resources slug rewrite + cleanUrls
├── .vercelignore                               ← NEW
│
├── src/lib/
│   ├── firestore-admin.ts                      ← NEW: Firebase Admin SDK init
│   ├── oauth-state.ts                          ← NEW: HMAC-signed CSRF state
│   ├── oauth-html.ts                           ← NEW: success/error pages
│   └── tiktok-oauth.ts                         ← NEW: TikTok OAuth API helpers
│
├── src/pages/auth/tiktok/
│   ├── start.ts                                ← NEW: GET /auth/tiktok/start  (Astro endpoint)
│   └── callback.ts                             ← NEW: GET /auth/tiktok/callback (Astro endpoint)
│
├── src/pages/privacy-policy.astro              ← UPDATED: added TikTok subsection in §4
└── src/pages/terms-of-service.astro            ← UPDATED: added §5 Social Media; renumbered 6-14
```

The existing `firebase.json` and `firestore.indexes.json` are left in place so `firebase deploy` is available as an emergency rollback.

---

## Setup checklist (one-time, ~30–60 min)

### 1. Generate a Firebase service account JSON
1. **Firebase Console → Project Settings → Service Accounts tab → Generate new private key**.
2. Save the JSON file somewhere safe (don't commit it).
3. (If we ran this already during the migration, the file lives at `~/Desktop/marketing-engine/.secrets/firebase-service-account.json`.)

### 2. Generate an OAuth state secret
HMAC key for CSRF protection on the OAuth round-trip. Run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

(If we already generated this, it's at `~/Desktop/marketing-engine/.secrets/tiktok_oauth_state_secret.txt`.)

### 3. Create the Vercel project
1. Sign in at [vercel.com](https://vercel.com).
2. **Add New… → Project**.
3. Import `justinlin15/fampass-website` (you'll need to install the Vercel GitHub App on the `justinlin15` personal account first — Vercel UI will guide you).
4. Framework preset: **Astro** (auto-detected).
5. Root Directory: `./` (the repo root — no override needed).
6. Don't deploy yet — set env vars first.

### 4. Set environment variables in Vercel
Project Settings → Environment Variables → add to **all** environments (Production + Preview + Development):

| Name | Value |
|---|---|
| `TIKTOK_CLIENT_ID` | `sbawgz3xvv1ov32fa3` |
| `TIKTOK_CLIENT_SECRET` | `rrZakNvqIfLyQswaZpGZ5hiY7H2x2kyv` |
| `TIKTOK_REDIRECT_URI` | `https://fampass.io/auth/tiktok/callback` |
| `TIKTOK_OAUTH_STATE_SECRET` | (output from step 2) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | entire JSON contents from step 1 |
| `TENANT_ID` | `fampass` (optional, this is the default) |

⚠️ For `FIREBASE_SERVICE_ACCOUNT_JSON`: paste the full JSON including the curly braces and the multi-line `private_key`. Vercel preserves newlines in env var values.

### 5. Deploy the first preview
Click **Deploy**. After ~1 minute you get a URL like `fampass-website-abc123.vercel.app`. Verify:
- `/` loads (the Astro-rendered homepage)
- `/about`, `/support`, `/privacy-policy`, `/terms-of-service` all render
- `/resources/` loads the blog reader (will show your blog posts from Firestore)
- `/admin/` opens the admin login

### 6. Authorize the new domain in Firebase
The blog reader + admin panel use Firebase Auth + Firestore from the browser. Firebase only allows requests from authorized domains.

1. **Firebase Console → Authentication → Settings → Authorized domains**.
2. Add:
   - `fampass.io`
   - `www.fampass.io`
   - the preview URL Vercel gave you (e.g. `fampass-website-abc123.vercel.app`)
3. Reload the Vercel preview and verify `/admin/` login works.

### 7. Deploy the updated Firestore rules
The new `firestore.rules` adds a deny-all rule for the `tiktok_credentials` collection. Deploy it:

```bash
cd ~/Desktop/fampass-website
firebase deploy --only firestore:rules
```

(Firebase CLI must be installed: `npm install -g firebase-tools && firebase login`.)

### 8. Test OAuth (skip if uncertain — covered in step 11)
Optional: temporarily register the preview URL as a TikTok redirect, then hit `https://<preview>/auth/tiktok/start`. Or just trust the code (HMAC state lib + Astro endpoints both smoke-tested) and move to DNS.

### 9. Swap DNS at GoDaddy
1. Vercel **Project → Settings → Domains → Add Domain** → enter `fampass.io`.
2. Vercel shows the DNS records to add. Typical:
   - `A` at `@` → `76.76.21.21`
   - `CNAME` at `www` → `cname.vercel-dns.com`
3. GoDaddy → DNS for fampass.io → **delete** existing Firebase A/CNAME records → **add** Vercel's.
4. Wait 5–30 min for propagation. Vercel auto-provisions SSL.

### 10. Verify the live site
Once `fampass.io` resolves to Vercel:
- Reload homepage + legal pages.
- Reload `/admin/` and confirm login (Firebase Auth on the new domain).
- Reload `/resources/` and confirm blog posts load (Firestore reads still work).
- Visit `https://fampass.io/auth/tiktok/start` → redirects to TikTok's authorize screen.
- Authorize → land on success page → check Firestore for new doc at `tiktok_credentials/fampass__<your-open-id>`.

### 11. Record the audit demo video
URL bar will correctly show `fampass.io` throughout. Record per the shot list in the marketing-engine notes.

---

## Architecture summary

```
┌──────────────────────────────────────────────────────┐
│                       fampass.io                     │
│                     (DNS → Vercel)                   │
└─────────────────────┬────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
┌───────────────────┐      ┌─────────────────────┐
│  Astro static     │      │  Astro endpoints     │
│  (prerendered)    │      │  (Vercel serverless) │
│  /, /about,       │      │  /auth/tiktok/start  │
│  /resources, etc. │      │  /auth/tiktok/callbk │
│  /admin (raw HTML)│      │                     │
└─────────┬─────────┘      └──────────┬──────────┘
          │                            │
          │ browser SDK reads          │ Admin SDK writes
          ▼                            ▼
┌──────────────────────────────────────────────────────┐
│              Firebase (unchanged)                    │
│                                                      │
│  Auth (admin login)                                 │
│  Firestore                                          │
│    ├─ blog_posts       (public read, admin write)  │
│    ├─ feedback         (public create, admin read) │
│    └─ tiktok_credentials  ← NEW, server-only       │
└──────────────────────────┬───────────────────────────┘
                           │
                           │ Admin SDK reads
                           ▼
              ┌──────────────────────────┐
              │  Marketing worker        │
              │  (Mac, launchd cron)     │
              │                          │
              │  Reads creds, posts to   │
              │  @fampass.oc TikTok      │
              └──────────────────────────┘
```

The marketing worker on the Mac currently reads credentials from local Postgres. To pick up the new Firestore-stored credentials, we need a follow-up patch to `marketing/worker/src/lib/tiktok.ts` (replace `loadCredentials` / `saveRefreshedToken` / `upsertCredentials` with Firestore reads via Firebase Admin SDK). This is a **separate, follow-up task** — the OAuth flow you record for the audit demo doesn't depend on it.

---

## What didn't change
- **Blog content** stays in Firestore. Zero data migration.
- **Admin login** still uses Firebase Auth email/password.
- **Feedback collection** keeps the same access pattern.
- **Firebase project** (`fampass-3bb49`) keeps owning the data layer.
- All `.astro` components, layouts, and Styles are untouched.

## Rollback

If anything goes wrong:
1. GoDaddy: point DNS back to Firebase (previous A records).
2. `cd ~/Desktop/fampass-website && firebase deploy --only hosting` — you're back on Firebase within minutes.

The Firestore changes (new `tiktok_credentials` deny rule) don't affect existing user-facing flows, so they're safe to leave even if hosting rolls back.

## Cost
- **Vercel free tier:** covers fampass.io's traffic indefinitely. OAuth callback runs ~10×/year.
- **Firebase free tier:** unchanged.
- **TikTok API:** free.

Total ongoing cost: **$0**.
