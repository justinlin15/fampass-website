// HMAC-signed OAuth state tokens.
//
// Why HMAC instead of a server-side store?
//   Vercel serverless functions are stateless — there's no in-memory Map that
//   survives across invocations, and we don't want to spin up Firestore reads
//   for a single short-lived CSRF token. HMAC-signing the state means the same
//   string TikTok echoes back to us is self-verifying: we trust the timestamp
//   and tenant inside it because the signature can only be produced with our
//   secret.
//
// Layout: state = base64url(payloadJson) + "." + base64url(hmacSha256(secret, payloadJson))
// Payload: { nonce: string; tenantId: string; iat: number }  (iat = ms since epoch)

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MS = 10 * 60 * 1000; // 10 minutes — TikTok's auth screen is fast

interface StatePayload {
  nonce: string;
  tenantId: string;
  iat: number;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getSecret(): string {
  const raw = process.env.TIKTOK_OAUTH_STATE_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "TIKTOK_OAUTH_STATE_SECRET missing or too short (need 32+ chars). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return raw;
}

export function signState(tenantId: string): string {
  const payload: StatePayload = {
    nonce: randomBytes(12).toString("hex"),
    tenantId,
    iat: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(Buffer.from(payloadJson, "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payloadJson).digest();
  const sigB64 = b64urlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyState(state: string): { ok: true; payload: StatePayload } | { ok: false; reason: string } {
  const parts = state.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed state" };
  const [payloadB64, sigB64] = parts as [string, string];

  let payloadJson: string;
  try {
    payloadJson = b64urlDecode(payloadB64).toString("utf8");
  } catch {
    return { ok: false, reason: "bad payload encoding" };
  }

  const expectedSig = createHmac("sha256", getSecret()).update(payloadJson).digest();
  let providedSig: Buffer;
  try {
    providedSig = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: "bad sig encoding" };
  }
  // Wrap as Uint8Array views — Node 22's stricter Buffer types want this
  // rather than raw Buffer args for timingSafeEqual.
  const providedView = new Uint8Array(providedSig);
  const expectedView = new Uint8Array(expectedSig);
  if (providedView.length !== expectedView.length || !timingSafeEqual(providedView, expectedView)) {
    return { ok: false, reason: "signature mismatch" };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(payloadJson) as StatePayload;
  } catch {
    return { ok: false, reason: "bad payload JSON" };
  }

  if (typeof payload.iat !== "number" || Date.now() - payload.iat > TTL_MS) {
    return { ok: false, reason: "state expired" };
  }
  if (typeof payload.tenantId !== "string" || !payload.tenantId) {
    return { ok: false, reason: "missing tenantId" };
  }

  return { ok: true, payload };
}
