// TOTP (RFC 6238) primitives wrapping otplib v13. Used for Authenticator-app
// 2FA. base32 secret, 30-second window, 6-digit codes — the standard
// settings every authenticator app supports out of the box.

import {
  generateSecret as otplibGenerateSecret,
  generateSync,
  verifySync,
  generateURI,
} from "otplib";

const ISSUER = "CreviaTube";
const PERIOD = 30; // seconds per code
const DIGITS = 6;

// ±30 seconds clock drift tolerance (one full window).
const EPOCH_TOLERANCE = PERIOD;

export function generateSecret(): string {
  return otplibGenerateSecret({ length: 20 });
}

export function buildOtpAuthUri(secret: string, accountEmail: string): string {
  return generateURI({
    issuer: ISSUER,
    label: accountEmail,
    secret,
    period: PERIOD,
    digits: DIGITS,
    algorithm: "sha1",
  });
}

/** Generate the current code for a secret. Useful for tests. */
export function generateCode(secret: string): string {
  return generateSync({ secret, period: PERIOD, digits: DIGITS, algorithm: "sha1" });
}

/**
 * Verify a 6-digit code against the user's stored secret. Returns true
 * iff the code matches the current window (with ±30s drift tolerance).
 *
 * otplib v13's verifySync returns a structured result `{ valid, delta, ... }`
 * — we collapse to a boolean here so callers don't have to worry about it.
 */
export function verifyCode(secret: string, code: string): boolean {
  if (!secret || !code) return false;
  try {
    const result: any = verifySync({
      secret,
      token: code,
      period: PERIOD,
      digits: DIGITS,
      algorithm: "sha1",
      epochTolerance: EPOCH_TOLERANCE,
    });
    return result?.valid === true;
  } catch {
    return false;
  }
}
