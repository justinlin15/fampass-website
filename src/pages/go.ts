// GET /go  — TikTok bio-link click tracker + App Store redirect.
//
// Put this URL in the @fampass.oc TikTok bio. Every tap:
//   1. INCRements a daily counter (and a lifetime total) in Upstash Redis, and
//   2. 302-redirects to the App Store.
// The marketing engine (which can't be reached from Vercel) reads those same
// counters back over Upstash's HTTP API to measure how many downloads TikTok
// actually drives — the download-correlated KPI in the optimization loop.
//
// Key scheme MUST match worker/src/lib/clicks-store.ts in the marketing repo:
//   clicks:{tenant}:{campaign}:{YYYY-MM-DD}   (UTC day)
//   clicks:{tenant}:{campaign}:total
//
// Env (set in the Vercel project — same values as the engine's .env):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// If unset, the redirect still works; it just doesn't log.
//
// prerender=false so this runs as a Vercel function (fresh per request) rather
// than being baked to a static 302 at build time.

import type { APIRoute } from "astro";

export const prerender = false;

const TENANT = "fampass";
const APP_STORE_URL = "https://apps.apple.com/us/app/fampass/id6760528354";

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Fire the two INCRs against Upstash. Bounded so a slow/unreachable store never
// delays the user's redirect by more than ~800ms.
async function recordClick(campaign: string): Promise<void> {
  // Vercel's Upstash integration injects KV_REST_API_URL/KV_REST_API_TOKEN;
  // a standalone Upstash DB uses UPSTASH_REDIS_REST_URL/TOKEN. Accept either.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return; // not configured → skip logging, still redirect

  const keys = [
    `clicks:${TENANT}:${campaign}:${utcDay()}`,
    `clicks:${TENANT}:${campaign}:total`,
  ];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    await Promise.all(
      keys.map((k) =>
        fetch(`${url}/incr/${encodeURIComponent(k)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }),
      ),
    );
  } catch {
    // Never let click logging break the redirect.
  } finally {
    clearTimeout(timer);
  }
}

export const GET: APIRoute = async ({ request }) => {
  const campaign = new URL(request.url).searchParams.get("c") || "tiktok-bio";
  // Sanitize: counters are keyed by this, so keep it boring.
  const safeCampaign = campaign.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "tiktok-bio";

  await recordClick(safeCampaign);

  return new Response(null, {
    status: 302,
    headers: {
      Location: APP_STORE_URL,
      "Cache-Control": "no-store",
    },
  });
};
