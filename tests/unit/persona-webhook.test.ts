// Persona webhook signature verification + status mapping. Both are
// security-sensitive — wrong implementation = anyone can flip a user's
// kyc_status. Tests below lock the contract.

import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature, mapPersonaStatus } from "../../backend/lib/persona-kyc";

const SECRET = "test-webhook-secret-do-not-use-in-prod";

function signPayload(body: string, secret: string, ts = Math.floor(Date.now() / 1000)): string {
  const hmac = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${hmac}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a freshly signed payload", () => {
    const body = JSON.stringify({ data: { type: "event" } });
    const sig = signPayload(body, SECRET);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });

  it("accepts a Buffer body the same way as a string", () => {
    const body = '{"foo":"bar"}';
    const sig = signPayload(body, SECRET);
    expect(verifyWebhookSignature(Buffer.from(body, "utf8"), sig, SECRET)).toBe(true);
  });

  it("rejects when the body has been tampered with", () => {
    const body = '{"original":true}';
    const sig = signPayload(body, SECRET);
    const tamperedBody = '{"original":false}'; // attacker swapped value
    expect(verifyWebhookSignature(tamperedBody, sig, SECRET)).toBe(false);
  });

  it("rejects when signed with the wrong secret", () => {
    const body = '{"x":1}';
    const sig = signPayload(body, "the-attackers-guess");
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(false);
  });

  it("rejects malformed signature header", () => {
    const body = '{}';
    expect(verifyWebhookSignature(body, "no-equals-here", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "t=123", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "v1=abc", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
  });

  it("rejects expired signatures (>5 min by default)", () => {
    const body = '{}';
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const sig = signPayload(body, SECRET, oldTs);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(false);
  });

  it("uses constant-time comparison (length-mismatch fast-path)", () => {
    const body = '{}';
    const ts = Math.floor(Date.now() / 1000);
    // Truncated v1 — short hmac that won't match length
    expect(verifyWebhookSignature(body, `t=${ts},v1=abc`, SECRET)).toBe(false);
  });

  it("rejects when secret is empty (defense in depth)", () => {
    const body = '{}';
    const sig = signPayload(body, "");
    expect(verifyWebhookSignature(body, sig, "")).toBe(false);
  });
});

describe("mapPersonaStatus", () => {
  it("maps approval-class statuses to approved", () => {
    expect(mapPersonaStatus("approved")).toBe("approved");
    expect(mapPersonaStatus("completed")).toBe("approved");
    expect(mapPersonaStatus("APPROVED")).toBe("approved");
  });

  it("maps decline-class statuses to rejected", () => {
    expect(mapPersonaStatus("declined")).toBe("rejected");
    expect(mapPersonaStatus("rejected")).toBe("rejected");
    expect(mapPersonaStatus("expired")).toBe("rejected");
  });

  it("maps in-flight statuses to pending", () => {
    expect(mapPersonaStatus("created")).toBe("pending");
    expect(mapPersonaStatus("pending")).toBe("pending");
    expect(mapPersonaStatus("started")).toBe("pending");
  });

  it("returns null for unknown statuses (no DB write)", () => {
    expect(mapPersonaStatus("unknown_event")).toBeNull();
    expect(mapPersonaStatus("")).toBeNull();
  });
});
