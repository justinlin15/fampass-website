// GET /auth/tiktok/callback  (Astro endpoint, deployed as Vercel serverless fn)
//
// TikTok bounces here after the user authorizes us. We:
//   1. Verify the ?state= we sent (HMAC + 10-min TTL).
//   2. Exchange ?code= for access + refresh tokens.
//   3. Fetch display_name + open_id for the connected account (nice-to-have
//      so the success page is informative).
//   4. Upsert credentials into Firestore at `tiktok_credentials/{tenantId}__{openId}`.
//      The marketing worker on the Mac reads this same doc via Firebase Admin SDK.
//   5. Render a success HTML page.
//
// Errors anywhere in this chain render an error page rather than a JSON 500
// because a human is sitting at the browser tab and needs a "what happened
// and what to do next" message.

import type { APIRoute } from "astro";
import { verifyState } from "../../../lib/oauth-state";
import {
  exchangeCodeForToken,
  fetchUserInfo,
  DEFAULT_OAUTH_SCOPES,
  TikTokAuthError,
} from "../../../lib/tiktok-oauth";
import { htmlError, htmlSuccess } from "../../../lib/oauth-html";
import { getFirestore, FieldValue, Timestamp } from "../../../lib/firestore-admin";

export const prerender = false;

function getRedirectUri(request: Request): string {
  if (process.env.TIKTOK_REDIRECT_URI) return process.env.TIKTOK_REDIRECT_URI;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/auth/tiktok/callback`;
}

export const GET: APIRoute = async ({ request, url }) => {
  // ---- 1. Parse + validate query params ----
  const errParam = url.searchParams.get("error") ?? undefined;
  if (errParam) {
    // User cancelled, or TikTok rejected the request (e.g. invalid_scope).
    const desc = url.searchParams.get("error_description") ?? "";
    return htmlError(`TikTok rejected the authorization (${errParam})`, desc);
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return htmlError(
      "Missing code/state",
      "TikTok did not include the expected query params.",
    );
  }

  // ---- 2. Verify state (CSRF + expiry) ----
  const stateResult = verifyState(state);
  if (!stateResult.ok) {
    return htmlError(
      "Invalid or expired state",
      `${stateResult.reason}. Please restart the OAuth flow from /auth/tiktok/start.`,
    );
  }
  const { tenantId } = stateResult.payload;

  // ---- 3. Exchange code → tokens, then fetch user info ----
  try {
    const redirectUri = getRedirectUri(request);
    const tokens = await exchangeCodeForToken({ code, redirectUri });
    const userInfo = await fetchUserInfo(tokens.access_token);

    // ---- 4. Upsert into Firestore ----
    // Doc id format: `${tenantId}__${openId}` — deterministic so re-running
    // OAuth for the same tenant+account updates rather than duplicates.
    const db = getFirestore();
    const docId = `${tenantId}__${userInfo.open_id}`;
    const now = Timestamp.now();
    const tokenExpiresAt = Timestamp.fromMillis(Date.now() + tokens.expires_in * 1000);
    const refreshExpiresAt = Timestamp.fromMillis(Date.now() + tokens.refresh_expires_in * 1000);

    await db
      .collection("tiktok_credentials")
      .doc(docId)
      .set(
        {
          tenantId,
          openId: userInfo.open_id,
          displayName: userInfo.display_name ?? null,
          avatarUrl: userInfo.avatar_url ?? null,
          unionId: userInfo.union_id ?? null,
          scope: DEFAULT_OAUTH_SCOPES.join(","),
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          refreshExpiresAt,
          updatedAt: now,
          // createdAt: only set on first write — server timestamp is safe to
          // include on every merge:true call because Firestore only writes
          // the field if it's been provided (we always provide it here, so
          // it'll get overwritten on re-auth; that's an acceptable tradeoff
          // for keeping the function stateless).
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    // ---- 5. Render success page ----
    return htmlSuccess({
      displayName: userInfo.display_name,
      openId: userInfo.open_id,
      tenantId,
    });
  } catch (err) {
    const msg =
      err instanceof TikTokAuthError
        ? err.message
        : err instanceof Error
        ? err.message
        : String(err);
    return htmlError("Token exchange failed", msg);
  }
};
