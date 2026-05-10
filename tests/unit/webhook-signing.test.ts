// Unit tests for the webhook-signing primitives. Both Shopify (base64
// HMAC of body) and Stripe / server-postback (timestamped HMAC of
// `${t}.${body}`) ship in production — wrong implementation == anyone
// can fake a payment / signup. The cases below lock the contract.

import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyShopifySignature,
  verifyTimestampedHmac,
  verifyStripeSignature,
} from "../../backend/lib/webhook-signing";

const SECRET = "test-webhook-secret-do-not-use-in-prod";

function shopifySig(body: string | Buffer, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function timestampedSig(
  body: string | Buffer,
  secret: string,
  ts: number,
): string {
  const payload = Buffer.concat([
    Buffer.from(String(ts), "utf8"),
    Buffer.from(".", "utf8"),
    typeof body === "string" ? Buffer.from(body, "utf8") : body,
  ]);
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${ts},v1=${hmac}`;
}

describe("verifyShopifySignature", () => {
  it("accepts a freshly signed body", () => {
    const body = Buffer.from(JSON.stringify({ id: 12345, total_price: "29.99" }), "utf8");
    expect(verifyShopifySignature(body, shopifySig(body, SECRET), SECRET)).toBe(true);
  });

  it("rejects when the body is tampered after signing", () => {
    const original = Buffer.from(JSON.stringify({ id: 12345, total_price: "29.99" }), "utf8");
    const tampered = Buffer.from(JSON.stringify({ id: 12345, total_price: "2999.99" }), "utf8");
    expect(verifyShopifySignature(tampered, shopifySig(original, SECRET), SECRET)).toBe(false);
  });

  it("rejects when signed with the wrong secret", () => {
    const body = Buffer.from('{"x":1}', "utf8");
    expect(verifyShopifySignature(body, shopifySig(body, "wrong"), SECRET)).toBe(false);
  });

  it("rejects when the signature header is missing", () => {
    expect(verifyShopifySignature(Buffer.from("{}"), undefined, SECRET)).toBe(false);
    expect(verifyShopifySignature(Buffer.from("{}"), "", SECRET)).toBe(false);
  });

  it("rejects garbage in the signature header without throwing", () => {
    expect(verifyShopifySignature(Buffer.from("{}"), "%%%not-base64%%%", SECRET)).toBe(false);
  });

  it("rejects when the byte length doesn't match (avoids timingSafeEqual throw)", () => {
    // 'short' is base64 for 5 raw bytes — well under SHA-256's 32.
    expect(verifyShopifySignature(Buffer.from("{}"), "short", SECRET)).toBe(false);
  });
});

describe("verifyTimestampedHmac (Stripe / server-postback shape)", () => {
  it("accepts a freshly signed payload", () => {
    const body = Buffer.from('{"event":"signup"}', "utf8");
    const now = Math.floor(Date.now() / 1000);
    expect(verifyTimestampedHmac(body, timestampedSig(body, SECRET, now), SECRET)).toBe(true);
  });

  it("verifyStripeSignature is the same function (alias preserved)", () => {
    expect(verifyStripeSignature).toBe(verifyTimestampedHmac);
  });

  it("rejects when the body is tampered after signing", () => {
    const original = Buffer.from('{"amount":100}', "utf8");
    const tampered = Buffer.from('{"amount":99999}', "utf8");
    const now = Math.floor(Date.now() / 1000);
    expect(verifyTimestampedHmac(tampered, timestampedSig(original, SECRET, now), SECRET)).toBe(
      false,
    );
  });

  it("rejects timestamps older than the 5-minute replay window", () => {
    const body = Buffer.from("{}", "utf8");
    const now = 1_700_000_000;
    const eightMinAgo = now - 8 * 60;
    const sig = timestampedSig(body, SECRET, eightMinAgo);
    // override `now` so the test isn't time-flaky
    expect(verifyTimestampedHmac(body, sig, SECRET, now)).toBe(false);
  });

  it("rejects timestamps from the future beyond tolerance", () => {
    const body = Buffer.from("{}", "utf8");
    const now = 1_700_000_000;
    const eightMinFuture = now + 8 * 60;
    const sig = timestampedSig(body, SECRET, eightMinFuture);
    expect(verifyTimestampedHmac(body, sig, SECRET, now)).toBe(false);
  });

  it("accepts a timestamp within the tolerance window", () => {
    const body = Buffer.from("{}", "utf8");
    const now = 1_700_000_000;
    const fourMinAgo = now - 4 * 60;
    const sig = timestampedSig(body, SECRET, fourMinAgo);
    expect(verifyTimestampedHmac(body, sig, SECRET, now)).toBe(true);
  });

  it("accepts when ANY v1 in a multi-version header matches (rotation)", () => {
    // Stripe sends multiple v1 signatures during a key rotation. We
    // accept if any matches.
    const body = Buffer.from('{"hi":1}', "utf8");
    const now = Math.floor(Date.now() / 1000);
    const goodSig = createHmac("sha256", SECRET)
      .update(`${now}.${body.toString()}`)
      .digest("hex");
    const badSig = "deadbeef".repeat(8); // 64 hex chars, valid length, wrong value
    const header = `t=${now},v1=${badSig},v1=${goodSig}`;
    expect(verifyTimestampedHmac(body, header, SECRET)).toBe(true);
  });

  it("rejects when none of the v1 signatures match", () => {
    const body = Buffer.from("{}", "utf8");
    const now = Math.floor(Date.now() / 1000);
    const header = `t=${now},v1=${"00".repeat(32)},v1=${"11".repeat(32)}`;
    expect(verifyTimestampedHmac(body, header, SECRET)).toBe(false);
  });

  it("rejects when the header has no t component", () => {
    const body = Buffer.from("{}", "utf8");
    expect(verifyTimestampedHmac(body, "v1=" + "00".repeat(32), SECRET)).toBe(false);
  });

  it("rejects when the header has no v1 component", () => {
    const body = Buffer.from("{}", "utf8");
    const now = Math.floor(Date.now() / 1000);
    expect(verifyTimestampedHmac(body, `t=${now}`, SECRET)).toBe(false);
  });

  it("rejects an empty / undefined header", () => {
    const body = Buffer.from("{}", "utf8");
    expect(verifyTimestampedHmac(body, undefined, SECRET)).toBe(false);
    expect(verifyTimestampedHmac(body, "", SECRET)).toBe(false);
  });
});
