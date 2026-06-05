# FamPass Marketing Website

This is the **live public website at https://fampass.io** — a standalone **Astro** project,
separate from the FamPass iOS app + event/guide data pipeline (those live in the
**`ParentGuide`** repo: `github.com/justinlin15/ParentGuide`).

## Hosting / Deploy (read this before changing anything)
- **Framework:** Astro — `output: 'static'` with the `@astrojs/vercel` adapter. Most pages
  pre-render to plain HTML; a few routes opt out of prerender (`export const prerender = false`)
  and become Vercel serverless functions — currently the TikTok OAuth endpoints at `/auth/tiktok/*`.
- **Host:** **Vercel**, git-connected to this repo (`github.com/justinlin15/fampass-website`).
  **Pushing to `main` auto-deploys** in ~1–2 min. There is **no manual deploy step** (no
  `wrangler`, no `firebase deploy`). Just commit + push.
- **DNS:** **Cloudflare** fronts the `fampass.io` zone (the apex is proxied to Vercel — so live
  response headers say `server: cloudflare` even though the origin is Vercel). Cloudflare also
  serves `api.fampass.io` (R2 JSON data feed) and `admin.fampass.io` (admin Worker) — **those are
  NOT this project**, they belong to the `ParentGuide` repo.
- **Verify any change:** after `git push origin main`, load https://fampass.io and confirm.

## Key facts
- **App Store link:** `https://apps.apple.com/us/app/fampass/id6760528354` — used by every App
  Store badge/button across components (Hero, Footer, FinalCTA, CTAStrip, AppPreview, Pricing).
- **`app-ads.txt`** lives in this project (Google AdMob ownership verification) and is served at
  `https://fampass.io/app-ads.txt`.
- **Local dev:** `npm run dev` (Astro dev server). `npm run build` to produce the static output.

## Related project
The iOS app, event/guide/deal data pipeline, admin hub, and the `api.fampass.io` data feed all
live in **`github.com/justinlin15/ParentGuide`**. This repo is *only* the marketing website.
