// Phase 4 — generic server-to-server postback receiver.
//
// For backends that prefer S2S over the conversion pixel (e.g., a SaaS
// signup flow that wants to confirm the conversion server-side rather
// than rely on a tracking pixel surviving ad blockers).
//
// Endpoint:
//   POST /api/postback/:campaignId
//
// Headers:
//   X-Postback-Signature: t=<unix_seconds>,v1=<hex_hmac_sha256(secret, "${t}.${rawBody}")>
//   Content-Type:         application/json
//
// Body (JSON):
//   {
//     "event":        "signup" | "lead" | "purchase" | "conversion" |
//                     "subscribe" | "install" | "code_redemption",
//     "clipper_code": "<trackingCode or clipperPromoCode>",
//     "external_id":  "<unique id, used for dedup>",
//     "value":        29.99,         // optional, $-amount for purchase
//     "metadata":     { "...": "..." } // optional, free-form
//   }
//
// Auth: HMAC-SHA256 of the timestamp + raw body, keyed with the campaign's
// generated postback_secret (revealed exactly once via PUT /integration).
// Mirrors Stripe's signature scheme; the helper is shared.
//
// Dedup: per (clipper_campaign_id, event_type, external_id). Replays from
// the campaigner's retry logic don't double-count.

import type { Express, Request, Response } from "express";
import express from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaignIntegrations,
  clipperCampaigns,
  trackingEvents,
} from "../../shared/schema";
import { verifyTimestampedHmac } from "../lib/webhook-signing";
import { trackingService, type TrackedEventType } from "../core/services/tracking-service";

// Event names accepted by this endpoint. Matches the conversion-pixel
// allowlist — clicks come from /track/:trackingCode, views come from
// public platform-API polling, neither of which makes sense to ship S2S.
const POSTBACK_ALLOWED_EVENTS = new Set<TrackedEventType>([
  "signup",
  "conversion",
  "subscribe",
  "install",
  "lead",
  "purchase",
  "code_redemption",
]);

interface PostbackBody {
  event?: string;
  clipper_code?: string;
  clipperCode?: string;            // accept camelCase too
  external_id?: string;
  externalId?: string;
  value?: number | string;
  metadata?: Record<string, any>;
}

async function resolveClipper(
  campaignId: string,
  clipperCode: string,
): Promise<{ id: string } | null> {
  const trimmed = clipperCode.trim();
  if (!trimmed) return null;

  const [byTracking] = await db
    .select({ id: clipperCampaigns.id })
    .from(clipperCampaigns)
    .where(
      and(
        eq(clipperCampaigns.campaignId, campaignId),
        eq(clipperCampaigns.trackingCode, trimmed),
      ),
    )
    .limit(1);
  if (byTracking) return byTracking;

  const [byPromo] = await db
    .select({ id: clipperCampaigns.id })
    .from(clipperCampaigns)
    .where(
      and(
        eq(clipperCampaigns.campaignId, campaignId),
        eq(clipperCampaigns.clipperPromoCode, trimmed),
      ),
    )
    .limit(1);
  return byPromo ?? null;
}

async function alreadyProcessed(
  clipperCampaignId: string,
  eventType: TrackedEventType,
  externalId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: trackingEvents.id })
    .from(trackingEvents)
    .where(
      and(
        eq(trackingEvents.clipperCampaignId, clipperCampaignId),
        eq(trackingEvents.eventType, eventType as any),
        sql`(${trackingEvents.metadata}::jsonb->>'postback_external_id') = ${externalId}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export function setupServerPostbackAPI(app: Express): void {
  app.post(
    "/api/postback/:campaignId",
    // Raw body for HMAC. The signed payload is `${timestamp}.${rawBody}`
    // — once verified we parse the JSON ourselves.
    express.raw({ type: "*/*", limit: "256kb" }),
    async (req: Request, res: Response) => {
      const { campaignId } = req.params;
      const rawBody = req.body as Buffer;
      const sigHeader = req.header("x-postback-signature");

      const [integration] = await db
        .select({ postbackSecret: campaignIntegrations.postbackSecret })
        .from(campaignIntegrations)
        .where(eq(campaignIntegrations.campaignId, campaignId));

      if (!integration?.postbackSecret) {
        // Single-shape failure either way — don't leak whether the
        // campaign or the secret is the missing piece.
        return res.status(401).json({ message: "Invalid postback" });
      }
      if (!verifyTimestampedHmac(rawBody, sigHeader, integration.postbackSecret)) {
        return res.status(401).json({ message: "Invalid postback" });
      }

      // From here on the payload is HMAC-trusted.
      let body: PostbackBody;
      try {
        body = JSON.parse(rawBody.toString("utf8")) as PostbackBody;
      } catch {
        return res.status(400).json({ message: "Invalid JSON" });
      }

      const eventRaw = String(body.event ?? "").toLowerCase() as TrackedEventType;
      if (!POSTBACK_ALLOWED_EVENTS.has(eventRaw)) {
        return res.status(400).json({
          message: `event must be one of: ${[...POSTBACK_ALLOWED_EVENTS].join(", ")}`,
        });
      }

      const clipperCode = String(body.clipper_code ?? body.clipperCode ?? "");
      const externalId = String(body.external_id ?? body.externalId ?? "");
      if (!clipperCode || !externalId) {
        return res.status(400).json({
          message: "clipper_code and external_id are required",
        });
      }

      const clipper = await resolveClipper(campaignId, clipperCode);
      if (!clipper) {
        // Fully signed but the clipper code doesn't match anyone on this
        // campaign. Most likely a stale code. Still respond 200 so the
        // campaigner's retry logic doesn't loop on it.
        return res.json({
          acknowledged: true,
          attributed: 0,
          reason: "no clipper match",
        });
      }

      if (await alreadyProcessed(clipper.id, eventRaw, externalId)) {
        return res.json({ acknowledged: true, attributed: 0, reason: "duplicate" });
      }

      // Optional purchase value. Reject NaN / negatives but pass 0 through.
      let eventValue: number | undefined;
      if (body.value != null && String(body.value).length > 0) {
        const n = parseFloat(String(body.value));
        if (Number.isFinite(n) && n >= 0) eventValue = n;
      }

      try {
        await trackingService.recordTrackingEvent({
          clipperCampaignId: clipper.id,
          eventType: eventRaw,
          eventValue,
          metadata: {
            source: "server_postback",
            postback_external_id: externalId,
            // Pass through opaque metadata the campaigner attached, namespaced
            // under `payload` so nothing collides with our own keys above.
            payload: body.metadata ?? null,
          },
        });
        return res.json({ acknowledged: true, attributed: 1, type: eventRaw });
      } catch (err: any) {
        // Campaign paused / unfunded etc. Still ack so the campaigner
        // doesn't loop on retries.
        console.warn("[server-postback] record failed", {
          campaignId,
          clipperCampaignId: clipper.id,
          error: err?.message ?? String(err),
        });
        return res.json({
          acknowledged: true,
          attributed: 0,
          reason: "record failed",
        });
      }
    },
  );
}
