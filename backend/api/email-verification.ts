import type { Express } from "express";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as React from "react";
import { db } from "../db";
import { users, emailVerificationTokens } from "../../shared/schema.js";
import { sendEmail, APP_URL } from "../lib/email";
import { WelcomeVerification } from "../emails/welcome-verification";

const TOKEN_TTL_HOURS = 24;

function newToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a fresh verification token for a user and email it. Caller is
 * responsible for ensuring the user is in a valid state to receive a token.
 * Resilient: if Resend is not configured, the token still gets stored so
 * the user can verify via the URL printed in dev logs.
 */
export async function issueVerificationEmail(opts: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<{ token: string; verifyUrl: string }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60_000);

  await db.insert(emailVerificationTokens).values({
    userId: opts.userId,
    token,
    expiresAt,
  });

  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  await sendEmail({
    kind: "welcome_verification",
    to: opts.email,
    subject: "Verify your CreviaTube email",
    react: React.createElement(WelcomeVerification, {
      fullName: opts.fullName,
      verifyUrl,
      expiresInHours: TOKEN_TTL_HOURS,
    }),
    dedupeKey: `welcome_verification:${token}`, // unique-per-token; resends create new tokens
    userId: opts.userId,
    metadata: { tokenId: token.slice(0, 8) + "…" },
  });

  return { token, verifyUrl };
}

export function setupEmailVerificationAPI(app: Express): void {
  // POST so the GET on /verify-email isn't accidentally fired by link
  // previewers / antivirus scanners (which would consume the token).
  app.post("/api/email/verify", async (req, res) => {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Missing token" });
    }

    const [row] = await db
      .select({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        expiresAt: emailVerificationTokens.expiresAt,
        usedAt: emailVerificationTokens.usedAt,
      })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);

    if (!row) return res.status(404).json({ message: "Invalid verification link" });
    if (row.usedAt) return res.status(409).json({ message: "This link has already been used" });
    if (row.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ message: "Verification link has expired. Request a new one." });
    }

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, row.userId));
      await tx.update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, row.id));
    });

    res.json({ success: true });
  });

  app.post("/api/email/resend-verification", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const u = req.user as any;
    if (u.emailVerified) {
      return res.status(409).json({ message: "Email already verified" });
    }
    try {
      const result = await issueVerificationEmail({
        userId: u.id,
        email: u.email,
        fullName: u.fullName,
      });
      res.json({
        success: true,
        // Surface the URL in dev so testers can verify without a real email provider
        ...(process.env.NODE_ENV !== "production" ? { devVerifyUrl: result.verifyUrl } : {}),
      });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to send verification email", error: e.message });
    }
  });
}
