// HTML helpers for the OAuth callback's success and error pages.
//
// Kept inline (no template files) so the function bundle stays tiny — these
// pages are only seen by the admin connecting a TikTok account, not by end
// users. Style is a stripped-down match to the rest of fampass.io.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlPage(status: number, title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — FamPass</title>
<style>
  body { font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; max-width: 560px; margin: 80px auto; padding: 0 24px; color: #111827; background: #fafafa; }
  h1 { margin: 0 0 12px; font-size: 24px; }
  .panel { padding: 28px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .ok { background: #ecfdf5; border: 1px solid #a7f3d0; }
  .err { background: #fef2f2; border: 1px solid #fecaca; }
  code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .meta { color: #6b7280; font-size: 13px; margin-top: 12px; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  p { margin: 8px 0; }
</style>
</head><body>${body}</body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export function htmlSuccess(args: {
  displayName: string;
  openId: string;
  tenantId: string;
}): Response {
  return htmlPage(
    200,
    "TikTok connected",
    `
    <div class="panel ok">
      <h1>✅ Connected to TikTok</h1>
      <p>Saved credentials for <strong>${escapeHtml(args.displayName)}</strong>.</p>
      <p class="meta">tenant: <code>${escapeHtml(args.tenantId)}</code> &middot; open_id: <code>${escapeHtml(args.openId)}</code></p>
      <p class="meta">You can close this tab. The marketing engine will use this account for auto-posts.</p>
      <p><a href="/">← back to fampass.io</a></p>
    </div>`,
  );
}

export function htmlError(title: string, detail: string): Response {
  return htmlPage(
    400,
    "OAuth error",
    `
    <div class="panel err">
      <h1>⚠️ ${escapeHtml(title)}</h1>
      <p>${escapeHtml(detail)}</p>
      <p><a href="/auth/tiktok/start">Try again</a></p>
    </div>`,
  );
}
