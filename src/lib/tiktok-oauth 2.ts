// TikTok OAuth helpers — pure HTTP wrappers, no DB.
//
// Ported from marketing/worker/src/lib/tiktok.ts so the Vercel callback can
// stand alone. The marketing worker has its own copy of these for the posting
// + metrics flow; this file mirrors only the bootstrap-time pieces.

const TIKTOK_API = "https://open.tiktokapis.com";

// Scopes we request at install time. Keep this list in sync with what's enabled
// in the TikTok developer portal — requesting a scope that isn't enabled returns
// `invalid_scope` and the user can't even start the OAuth flow.
//
// Post-audit we'll also want `video.list` to enable metrics polling.
export const DEFAULT_OAUTH_SCOPES = [
  "user.info.basic",
  "video.publish",
  "video.upload",
] as const;

export class TikTokAuthError extends Error {}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
  open_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  display_name: string;
  avatar_url?: string;
  union_id?: string;
}

function clientId(): string {
  const v = process.env.TIKTOK_CLIENT_ID;
  if (!v) throw new TikTokAuthError("TIKTOK_CLIENT_ID missing from env");
  return v;
}

function clientSecret(): string {
  const v = process.env.TIKTOK_CLIENT_SECRET;
  if (!v) throw new TikTokAuthError("TIKTOK_CLIENT_SECRET missing from env");
  return v;
}

// Build the URL we 302 the user to. They sign in to TikTok and grant scopes,
// then TikTok redirects back to redirectUri with ?code=...&state=...
export function getAuthorizeUrl(args: {
  state: string;
  redirectUri: string;
  scopes?: readonly string[];
}): string {
  const scopes = (args.scopes ?? DEFAULT_OAUTH_SCOPES).join(",");
  const params = new URLSearchParams({
    client_key: clientId(),
    response_type: "code",
    scope: scopes,
    redirect_uri: args.redirectUri,
    state: args.state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

// Trade the one-time `code` from the callback for an access_token + refresh_token.
// redirect_uri here MUST exactly match the one used at /authorize (TikTok checks).
export async function exchangeCodeForToken(args: {
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_key: clientId(),
    client_secret: clientSecret(),
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
  });
  const resp = await fetch(`${TIKTOK_API}/v2/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });
  const json = (await resp.json()) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };
  if (!resp.ok || !json.access_token) {
    throw new TikTokAuthError(
      `Code exchange failed (${resp.status}): ${json.error_description ?? json.error ?? JSON.stringify(json)}`,
    );
  }
  return json as TokenResponse;
}

// Pull display_name + open_id + avatar for the freshly-authorized account so
// the success page can show "Connected as @fampass.oc" instead of just an
// opaque token confirmation.
export async function fetchUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const resp = await fetch(
    `${TIKTOK_API}/v2/user/info/?fields=open_id,union_id,display_name,avatar_url`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const json = (await resp.json()) as {
    data?: { user?: TikTokUserInfo };
    error?: { code: string; message: string };
  };
  if (!resp.ok || !json.data?.user) {
    throw new TikTokAuthError(
      `user/info failed: ${json.error?.message ?? `HTTP ${resp.status}`}`,
    );
  }
  return json.data.user;
}
