import { describe, it, expect } from "vitest";
import { generateSecret, buildOtpAuthUri, verifyCode, generateCode } from "../../backend/lib/totp";

describe("TOTP primitives", () => {
  it("generates a base32 secret", () => {
    const s = generateSecret();
    expect(s).toBeTruthy();
    expect(s.length).toBeGreaterThan(10);
    expect(/^[A-Z2-7]+$/i.test(s)).toBe(true); // base32 alphabet
  });

  it("buildOtpAuthUri includes the issuer + email", () => {
    const uri = buildOtpAuthUri("ABCDEFGH", "user@example.test");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toMatch(/CreviaTube/);
    // otplib URL-encodes the email (@ → %40)
    expect(uri).toMatch(/user(%40|@)example\.test/);
  });

  it("verifyCode accepts a freshly generated current code", () => {
    const secret = generateSecret();
    const code = generateCode(secret);
    expect(verifyCode(secret, code)).toBe(true);
  });

  it("verifyCode rejects a wrong code", () => {
    const secret = generateSecret();
    expect(verifyCode(secret, "000000")).toBe(false);
    expect(verifyCode(secret, "123456")).toBe(false);
  });

  it("verifyCode rejects malformed inputs gracefully (no throw)", () => {
    expect(verifyCode("", "123456")).toBe(false);
    expect(verifyCode("ABC", "")).toBe(false);
    expect(() => verifyCode("invalid-not-base32!@#", "123456")).not.toThrow();
  });
});
