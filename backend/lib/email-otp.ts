// Email-based one-time codes. Used for sensitive actions (sending payouts,
// changing wallet, etc.) and as a fallback factor for users who haven't
// set up an authenticator app.
//
// Storage: we keep a SHA-256 hash of the code in users.email_otp_hash plus
// an expiry. Plaintext code never lives in the DB. Single-use — verifying
// clears the row so it can't be replayed.

import { createHash, randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../shared/schema.js";

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate a fresh 6-digit code, persist its hash + expiry on the user
 * row. Returns the plaintext code so the caller can email it.
 */
export async function issueEmailOtp(userId: string): Promise<string> {
  // randomInt is cryptographically secure — avoids the bias of Math.random.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
  await db
    .update(users)
    .set({
      emailOtpHash: hashCode(code),
      emailOtpExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return code;
}

/**
 * Verify a candidate code. Returns true on match, after which the stored
 * hash is cleared so the code can't be replayed. Expired or already-used
 * codes return false.
 */
export async function verifyEmailOtp(userId: string, code: string): Promise<boolean> {
  if (!code || !/^\d{6}$/.test(code)) return false;
  const [u] = await db
    .select({
      hash: users.emailOtpHash,
      exp: users.emailOtpExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u || !u.hash || !u.exp) return false;
  if (u.exp.getTime() < Date.now()) return false;
  if (u.hash !== hashCode(code)) return false;

  // Single-use: consume the code.
  await db
    .update(users)
    .set({ emailOtpHash: null, emailOtpExpiresAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}
