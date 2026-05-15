// GET /auth/tiktok/start  (Astro endpoint, deployed as a Vercel serverless fn)
//
// Kicks off the OAuth round-trip:
//   1. Generate an HMAC-signed state token (CSRF protection + tenant carry).
//   2. Build TikTok's /v2/auth/authorize/ URL with our client_key + scopes.
//   3. 302 the user to TikTok. They sign in + approve, TikTok bounces them
//      back to /auth/tiktok/callback with ?code=...&state=...
//
// Note: `prerender = false` opts this route out of Astro's static build so it
// runs as a Vercel function instead of returning a fixed 302 baked at build
// time (which couldn't generate fresh CSRF state per request).

import type { APIRoute } from "astro";
import { signState } from "../../../lib/oauth-state";
import { getAuthorizeUrl, TikTokAuthError } from "../../../lib/tiktok-oauth";
import { htmlError } from "../../../lib/oauth-html";

export const prerender = false;

// One tenant for now (FamPass). When we add a second business we'll let
// callers pass ?tenant=... and validate against an allowlist.
const TENANT_ID = process.env.TENANT_ID ?? "fampass";

function getRedirectUri(request: Request): string {
  // Prefer explicit env config — it has to match what's registered in the
  // TikTok developer portal exactly. Fall back to inferring from the request
  // URL (useful for Vercel preview URLs during development).
  if (process.env.TIKTOK_REDIRECT_URI) {
    return process.env.TIKTOK_REDIRECT_URI;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/auth/tiktok/callback`;
}

export const GET: APIRoute = ({ request }) => {
  try {
    const state = signState(TENANT_ID);
    const redirectUri = getRedirectUri(request);
    const authorize = getAuthorizeUrl({ state, redirectUri });
    return new Response(null, {
      status: 302,
      headers: {
        Location: authorize,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg =
      err instanceof TikTokAuthError
        ? err.message
        : err instanceof Error
        ? err.message
        : String(err);
    return htmlError("OAuth start failed", msg);
  }
};
