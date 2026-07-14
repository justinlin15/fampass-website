// POST /api/subscribe  — website newsletter signup → Beehiiv.
//
// The marketing site's email-capture endpoint. The client-side form in
// components/NewsletterSignup.astro POSTs { email, metro?, hp? } here; we
// validate server-side and create the subscription in Beehiiv with the API key
// (which must NEVER reach the browser). Custom fields let the newsletter segment
// the same way the app-user sync does (signup_source / home_city / is_premium).
//
// Env (set in the Vercel project — same key as the ParentGuide pipeline uses):
//   BEEHIIV_API_KEY          — Beehiiv API key (Settings → Integrations → API)
//   BEEHIIV_PUBLICATION_ID   — pub_...  (same Settings page)
// If unset, we return a friendly 503 and log — the form shows an error rather
// than silently dropping the email.
//
// prerender=false so this runs as a Vercel serverless function (per-request),
// not a static file baked at build time.

import type { APIRoute } from "astro";

export const prerender = false;

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Metro labels we offer in the form's optional dropdown. Kept in sync with the
// app's Wave 1 launch metros; unknown values are ignored (never trusted raw).
const ALLOWED_METROS = new Set([
  "Los Angeles",
  "Orange County",
  "San Diego",
  "San Francisco",
  "Silicon Valley",
  "Oakland & East Bay",
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }
  // Fall back to form-encoded (progressive enhancement / no-JS submit).
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) out[k] = v;
  return out;
}

export const POST: APIRoute = async ({ request }) => {
  const data = await readBody(request);

  // Honeypot: real users never fill a hidden field. Pretend success for bots so
  // they don't retry, but never hit Beehiiv.
  if (typeof data.hp === "string" && data.hp.trim() !== "") {
    return json({ ok: true });
  }

  const email = String(data.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  const metroRaw = String(data.metro ?? "").trim();
  const metro = ALLOWED_METROS.has(metroRaw) ? metroRaw : "";

  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !pubId) {
    console.error("[subscribe] BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID not set");
    return json(
      { ok: false, error: "Signups aren't available right now — try again soon." },
      503
    );
  }

  const customFields: Array<{ name: string; value: string }> = [
    { name: "signup_source", value: "website" },
    { name: "is_premium", value: "false" },
  ];
  if (metro) customFields.push({ name: "home_city", value: metro });

  const payload = {
    email,
    reactivate_existing: true,
    send_welcome_email: true,
    utm_source: "website",
    utm_medium: "organic",
    referring_site: "fampass.io",
    custom_fields: customFields,
  };

  try {
    const resp = await fetch(`${BEEHIIV_BASE}/publications/${pubId}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (resp.ok) {
      return json({ ok: true });
    }

    // 429 = rate limited; anything else is a Beehiiv-side problem. Log the real
    // detail, return a generic message (never leak the response body/key context).
    const detail = await resp.text().catch(() => "");
    console.error(`[subscribe] Beehiiv ${resp.status}: ${detail}`);
    if (resp.status === 429) {
      return json({ ok: false, error: "Too many requests — please try again in a moment." }, 429);
    }
    return json({ ok: false, error: "Something went wrong. Please try again." }, 502);
  } catch (err) {
    console.error("[subscribe] request failed:", err);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 502);
  }
};
