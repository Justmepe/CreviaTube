import type { Express } from "express";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import * as React from "react";
import { db } from "../db";
import { users, passwordResetTokens } from "../../shared/schema.js";
import { sendEmail, APP_URL } from "../lib/email";
import { PasswordReset } from "../emails/password-reset";

const scryptAsync = promisify(scrypt);
const TOKEN_TTL_MINUTES = 60;
const MIN_PASSWORD_LEN = 8;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

export function setupPasswordResetAPI(app: Express): void {
  // Always returns 200 — never confirms whether the email exists (account-enumeration defence).
  app.post("/api/password/request-reset", async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email required" });
    }

    const generic = { success: true, message: "If an account exists for that email, a reset link has been sent." };

    try {
      const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (!u) {
        // Constant-time-ish: fall through to the generic 200 without leaking
        return res.json(generic);
      }

      const token = newToken();
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);
      await db.insert(passwordResetTokens).values({
        userId: u.id,
        token,
        expiresAt,
      });

      const resetUrl = `${APP_URL}/reset-password?token=${token}`;

      await sendEmail({
        kind: "password_reset",
        to: u.email,
        subject: "Reset your CreviaTube password",
        react: React.createElement(PasswordReset, {
          fullName: u.fullName,
          resetUrl,
          expiresInMinutes: TOKEN_TTL_MINUTES,
        }),
        dedupeKey: `password_reset:${token}`,
        userId: u.id,
      });

      // In dev, expose the URL in the response so testers can use it without an email provider
      const devVerifyUrl = process.env.NODE_ENV !== "production" ? resetUrl : undefined;
      return res.json(devVerifyUrl ? { ...generic, devVerifyUrl } : generic);
    } catch (e: any) {
      console.error("password reset request failed:", e);
      // Still return 200 generic to avoid leaking info on errors
      return res.json(generic);
    }
  });

  app.post("/api/password/reset", async (req, res) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Missing token or new password" });
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LEN} characters` });
    }

    const [row] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token)).limit(1);

    if (!row) return res.status(404).json({ message: "Invalid reset link" });
    if (row.usedAt) return res.status(409).json({ message: "This reset link has already been used" });
    if (row.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ message: "Reset link has expired. Request a new one." });
    }

    const hashed = await hashPassword(newPassword);

    await db.transaction(async (tx) => {
      await tx.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.id, row.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
    });

    res.json({ success: true, message: "Password updated. You can now log in with your new password." });
  });
}
