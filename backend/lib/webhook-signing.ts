// Phase 4 — webhook signature verifiers. Three formats in use:
//
//   Shopify           X-Shopify-Hmac-Sha256: <base64(hmac(secret, body))>
//   Stripe            Stripe-Signature: t=<unix>,v1=<hex(hmac(secret, t + "." + body))>,v0=<…>
//   Server postback   X-Postback-Signature: t=<unix>,v1=<hex(hmac(secret, t + "." + body))>
//
// Stripe and our own server postback use the same algorithm, so they
// share verifyTimestampedHmac. timingSafeEqual prevents timing-side-channel
// leaks; the t-tolerance window (5 min) defeats naive replay.

import { createHmac, timingSafeEqual } from "crypto";

// Shopify uses base64; signatures are 44 chars. We accept whatever the
// header sends and compare byte-equality on the decoded buffer.
export function verifyShopifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }
  if (received.length !== expected.length) return false;
  return timingSafeEqual(expected, received);
}

// Parse `t=<unix>,v1=<hex>[,v1=<hex>][,v0=<hex>]…` shared by Stripe and
// our server postback. Stripe rotates secrets and includes multiple v1
// signatures during the rotation window; we match if any v1 matches.
function parseTimestampedSignatureHeader(header: string): { t?: number; v1: string[] } {
  const out: { t?: number; v1: string[] } = { v1: [] };
  for (const part of header.split(",")) {
    const [key, val] = part.split("=", 2);
    if (key === "t" && val) out.t = Number(val);
    if (key === "v1" && val) out.v1.push(val);
  }
  return out;
}

// Tolerance: 5 minutes. Mirrors Stripe's recommended default. Anything
// older is rejected to defeat replay of captured webhook payloads.
const TIMESTAMPED_HMAC_TOLERANCE_SECONDS = 5 * 60;

// Generic verifier for the `t=…,v1=…` HMAC format. Used by both the
// Stripe webhook and our own server-postback receiver.
export function verifyTimestampedHmac(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
  // override for tests; production uses Date.now()
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader) return false;
  const { t, v1 } = parseTimestampedSignatureHeader(signatureHeader);
  if (!t || v1.length === 0) return false;
  if (Math.abs(nowSeconds - t) > TIMESTAMPED_HMAC_TOLERANCE_SECONDS) return false;

  const signedPayload = Buffer.concat([
    Buffer.from(String(t), "utf8"),
    Buffer.from(".", "utf8"),
    rawBody,
  ]);
  const expected = createHmac("sha256", secret).update(signedPayload).digest();

  for (const sig of v1) {
    let received: Buffer;
    try {
      received = Buffer.from(sig, "hex");
    } catch {
      continue;
    }
    if (received.length === expected.length && timingSafeEqual(expected, received)) {
      return true;
    }
  }
  return false;
}

// Provider-named alias kept so existing imports (Stripe webhook) don't
// have to change. Body, header, and algorithm are identical.
export const verifyStripeSignature = verifyTimestampedHmac;
