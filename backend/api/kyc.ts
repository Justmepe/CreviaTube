// KYC endpoints — user-facing inquiry start + status, plus the Persona
// webhook receiver. The admin manual override (PATCH /api/admin/users/
// :id/kyc) lives in routes.ts and remains the fallback path.

import type { Express, Request, Response } from "express";
import express from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../shared/schema.js";
import { createInquiry, verifyWebhookSignature, mapPersonaStatus } from "../lib/persona-kyc";
import { emit } from "../lib/metrics";

export function setupKycAPI(app: Express): void {
  // Start a KYC inquiry for the current user. Returns a hosted-flow URL
  // they navigate to. We stamp kyc_status=pending immediately so the UI
  // shows the in-progress state without waiting for the webhook.
  app.post("/api/kyc/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const u = req.user as any;

    // Idempotent: if already approved, no-op. If pending, return existing
    // inquiry id and a fresh hosted URL.
    if (u.kycStatus === "approved") {
      return res.json({ status: "approved", message: "Already KYC-approved." });
    }

    try {
      const redirectUrl = `${process.env.APP_URL || "http://localhost:5000"}/settings?kyc=return`;
      const { inquiryId, hostedUrl } = await createInquiry({
        userId: u.id,
        email: u.email,
        redirectUrl,
      });

      await db.update(users).set({
        kycStatus: "pending",
        kycProvider: "persona",
        kycReference: inquiryId,
        kycUpdatedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, u.id));

      emit("signup", { event: "kyc_started", provider: "persona" }, u.id); // re-uses existing channel

      res.json({ status: "pending", inquiryId, hostedUrl });
    } catch (err: any) {
      console.error("KYC start failed:", err);
      res.status(500).json({ message: "Couldn't start KYC", error: err?.message });
    }
  });

  // Current user's KYC status. Used by the Settings card to render state.
  app.get("/api/kyc/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const u = req.user as any;
    res.json({
      status: u.kycStatus || null,
      provider: u.kycProvider || null,
      reference: u.kycReference || null,
      updatedAt: u.kycUpdatedAt || null,
    });
  });

  // Persona webhook. Mounted with express.raw so signature verification
  // gets the exact bytes Persona signed. JSON parsing happens AFTER the
  // signature check passes.
  app.post(
    "/api/webhooks/kyc/persona",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      const secret = process.env.PERSONA_WEBHOOK_SECRET;
      if (!secret) {
        // Webhook configured but no secret on server — refuse rather than
        // accept anything. Operator must set the secret.
        return res.status(503).json({ message: "Webhook secret not configured" });
      }

      const rawBody = req.body as Buffer;
      const sigHeader = req.header("persona-signature");
      if (!verifyWebhookSignature(rawBody, sigHeader, secret)) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      let payload: any;
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).json({ message: "Invalid JSON" });
      }

      // Persona webhook shape (partial): { data: { type: 'event', attributes:
      // { name: 'inquiry.approved', payload: { data: { id, attributes: {
      // 'reference-id', status } } } } } }
      const inquiry = payload?.data?.attributes?.payload?.data;
      const referenceId = inquiry?.attributes?.["reference-id"] as string | undefined;
      const personaStatus = inquiry?.attributes?.status as string | undefined;
      const inquiryId = inquiry?.id as string | undefined;

      if (!referenceId || !personaStatus) {
        return res.status(400).json({ message: "Missing reference-id or status" });
      }

      const newStatus = mapPersonaStatus(personaStatus);
      if (!newStatus) {
        // Persona event we don't act on (e.g., 'created', 'started') —
        // ack so they don't retry, but no DB change.
        return res.json({ acknowledged: true, status: null });
      }

      await db.update(users).set({
        kycStatus: newStatus,
        kycProvider: "persona",
        kycReference: inquiryId || referenceId,
        kycUpdatedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, referenceId));

      emit("signup", { event: "kyc_decided", status: newStatus, provider: "persona" }, referenceId);

      res.json({ acknowledged: true, status: newStatus });
    },
  );
}
