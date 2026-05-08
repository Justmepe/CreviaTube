// 2FA endpoints. TOTP setup/verify/disable + email OTP request/verify.
//
// Important: setup-init returns the plaintext secret + an otpauth:// URI
// (so the frontend can render a QR code). The secret only persists after
// the user proves they configured their authenticator by submitting a
// valid code via setup-verify. This prevents abandoned secret rows from
// being usable by anyone who later compromises the DB.

import type { Express } from "express";
import { eq } from "drizzle-orm";
import * as React from "react";
import { db } from "../db";
import { users } from "../../shared/schema.js";
import { generateSecret, buildOtpAuthUri, verifyCode } from "../lib/totp";
import { issueEmailOtp, EMAIL_OTP_TTL_MS } from "../lib/email-otp";
import { sendEmail } from "../lib/email";
import { EmailOtp } from "../emails/email-otp";
import { emit } from "../lib/metrics";

declare module "express-session" {
  interface SessionData {
    pendingTotpSecret?: string;
  }
}

export function setupTwoFactorAPI(app: Express): void {
  // ---- TOTP (Authenticator app) ----

  // Generate a fresh secret + otpauth URI. NOT persisted yet — held in
  // session until the user proves possession by submitting a code.
  app.post("/api/2fa/totp/setup-init", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const u = req.user as any;
    const secret = generateSecret();
    req.session.pendingTotpSecret = secret;
    res.json({
      secret,
      otpauthUri: buildOtpAuthUri(secret, u.email),
    });
  });

  app.post("/api/2fa/totp/setup-verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.body as { code?: string };
    const pending = req.session.pendingTotpSecret;
    if (!pending) {
      return res.status(400).json({ message: "No pending setup. Hit setup-init first." });
    }
    if (!code || !verifyCode(pending, code)) {
      return res.status(400).json({ message: "Invalid code. Try again." });
    }

    const u = req.user as any;
    await db.update(users).set({
      totpSecret: pending,
      totpEnabled: true,
      updatedAt: new Date(),
    }).where(eq(users.id, u.id));

    delete req.session.pendingTotpSecret;
    emit("signup", { event: "totp_enabled" }, u.id); // re-uses signup channel; bespoke event coming if we add it
    res.json({ enabled: true });
  });

  // Require a fresh code to disable. Don't let a session-cookie thief
  // turn 2FA off without the second factor.
  app.post("/api/2fa/totp/disable", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.body as { code?: string };
    const u = req.user as any;
    if (!u.totpEnabled || !u.totpSecret) {
      return res.status(400).json({ message: "TOTP is not enabled" });
    }
    if (!code || !verifyCode(u.totpSecret, code)) {
      return res.status(400).json({ message: "Invalid code" });
    }
    await db.update(users).set({
      totpSecret: null,
      totpEnabled: false,
      updatedAt: new Date(),
    }).where(eq(users.id, u.id));
    res.json({ enabled: false });
  });

  // ---- Email OTP ----

  app.post("/api/2fa/email/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const u = req.user as any;
    const reason = (req.body?.reason as string | undefined) || undefined;

    const code = await issueEmailOtp(u.id);

    // Fire-and-forget email. If Resend isn't configured the email lib
    // writes a "skipped" row to email_log — caller still proceeds.
    void sendEmail({
      kind: "email_otp",
      to: u.email,
      subject: "Your CreviaTube verification code",
      react: React.createElement(EmailOtp, {
        fullName: u.fullName,
        code,
        expiresInMinutes: Math.round(EMAIL_OTP_TTL_MS / 60_000),
        reason,
      }),
      // No dedupeKey — every requested OTP must send fresh.
      userId: u.id,
    });

    res.json({ sent: true, expiresInMinutes: Math.round(EMAIL_OTP_TTL_MS / 60_000) });
  });

  app.post("/api/2fa/email/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ message: "code required" });
    const u = req.user as any;
    const { verifyEmailOtp } = await import("../lib/email-otp");
    const ok = await verifyEmailOtp(u.id, code);
    if (!ok) return res.status(400).json({ message: "Invalid or expired code" });
    res.json({ verified: true });
  });
}
