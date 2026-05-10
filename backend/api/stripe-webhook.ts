// Phase 4 — Stripe webhook receiver.
//
// The campaigner configures their Stripe account to POST to:
//   POST {APP_URL}/api/webhooks/stripe/:campaignId
// Stripe signs the body with the per-endpoint signing secret stored in
// campaign_integrations.stripe_webhook_secret. The header format is:
//   Stripe-Signature: t=<unix>,v1=<hex_hmac(secret, "t.body")>
//
// Attribution rule: the campaigner must include the clipper's code in the
// PaymentIntent / Checkout Session / Subscription metadata under either of:
//   metadata.clipperCode      → the clipper_campaigns.tracking_code (preferred)
//   metadata.clipperPromoCode → the clipper_campaigns.clipper_promo_code (fallback)
// We document this convention in the integration setup UI.
//
// Events handled in v1:
//   checkout.session.completed   → revenue (amount_total) + signup if mode=='subscription'
//   payment_intent.succeeded     → revenue (amount)
//   invoice.payment_succeeded    → revenue (amount_paid)  [recurring renewals]
//   customer.subscription.created → subscribe (count)
//
// Anything else: ack 200, no DB write. Stripe sends a long tail; not all
// of them are interesting to us.

import type { Express, Request, Response } from "express";
import express from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaignIntegrations,
  clipperCampaigns,
  trackingEvents,
} from "../../shared/schema";
import { verifyStripeSignature } from "../lib/webhook-signing";
import { trackingService, type TrackedEventType } from "../core/services/tracking-service";

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
}

// Stripe re-fires events on retry — same id. Dedupe per
// (clipper_campaign_id, event_type, stripe_event_id) so retries don't
// double-count.
async function alreadyProcessed(
  clipperCampaignId: string,
  eventType: TrackedEventType,
  stripeEventId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: trackingEvents.id })
    .from(trackingEvents)
    .where(
      and(
        eq(trackingEvents.clipperCampaignId, clipperCampaignId),
        eq(trackingEvents.eventType, eventType as any),
        sql`(${trackingEvents.metadata}::jsonb->>'stripe_event_id') = ${stripeEventId}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

// Resolve a clipper for this campaign from the metadata bag the campaigner
// attached to the underlying Stripe object. Returns the matched clipper
// campaign row or null.
async function resolveClipperFromMetadata(
  campaignId: string,
  metadata: Record<string, any> | undefined | null,
): Promise<{ id: string } | null> {
  const trackingCode = (metadata?.clipperCode ?? "").trim();
  const promoCode = (metadata?.clipperPromoCode ?? "").trim();
  if (!trackingCode && !promoCode) return null;

  // Prefer trackingCode (auto-issued, always present); fall back to
  // promoCode (which the campaigner may have used for branding).
  if (trackingCode) {
    const [row] = await db
      .select({ id: clipperCampaigns.id })
      .from(clipperCampaigns)
      .where(
        and(
          eq(clipperCampaigns.campaignId, campaignId),
          eq(clipperCampaigns.trackingCode, trackingCode),
        ),
      )
      .limit(1);
    if (row) return row;
  }
  if (promoCode) {
    const [row] = await db
      .select({ id: clipperCampaigns.id })
      .from(clipperCampaigns)
      .where(
        and(
          eq(clipperCampaigns.campaignId, campaignId),
          eq(clipperCampaigns.clipperPromoCode, promoCode),
        ),
      )
      .limit(1);
    if (row) return row;
  }
  return null;
}

interface AttributedEvent {
  type: TrackedEventType;
  value: number; // dollars (Stripe sends cents)
}

// Map Stripe event types → the (eventType, value) tuples we want to
// record. Returns [] for events we don't act on so the receiver can ack
// without writes.
function eventsForStripeEvent(stripeEvent: StripeEvent): AttributedEvent[] {
  const obj = stripeEvent.data.object;
  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      // amount_total in the smallest currency unit (cents). For
      // subscription mode also fire a `subscribe` count.
      const amount = Number(obj?.amount_total ?? 0) / 100;
      const out: AttributedEvent[] = [];
      if (amount > 0) out.push({ type: "purchase", value: amount });
      if (obj?.mode === "subscription") out.push({ type: "subscribe", value: 1 });
      return out;
    }
    case "payment_intent.succeeded": {
      const amount = Number(obj?.amount ?? 0) / 100;
      return amount > 0 ? [{ type: "purchase", value: amount }] : [];
    }
    case "invoice.payment_succeeded": {
      // Recurring subscription renewal — counts as revenue but not as a
      // new subscribe event.
      const amount = Number(obj?.amount_paid ?? 0) / 100;
      return amount > 0 ? [{ type: "purchase", value: amount }] : [];
    }
    case "customer.subscription.created": {
      // No $ amount on this event; it's emitted alongside the underlying
      // payment which carries the value. Just count the subscribe.
      return [{ type: "subscribe", value: 1 }];
    }
    default:
      return [];
  }
}

export function setupStripeWebhookAPI(app: Express): void {
  app.post(
    "/api/webhooks/stripe/:campaignId",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      const { campaignId } = req.params;
      const rawBody = req.body as Buffer;
      const sigHeader = req.header("stripe-signature");

      const [integration] = await db
        .select({
          stripeWebhookSecret: campaignIntegrations.stripeWebhookSecret,
        })
        .from(campaignIntegrations)
        .where(eq(campaignIntegrations.campaignId, campaignId));

      if (!integration?.stripeWebhookSecret) {
        return res.status(401).json({ message: "Webhook not configured" });
      }
      if (!verifyStripeSignature(rawBody, sigHeader, integration.stripeWebhookSecret)) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      let stripeEvent: StripeEvent;
      try {
        stripeEvent = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).json({ message: "Invalid JSON" });
      }

      const events = eventsForStripeEvent(stripeEvent);
      if (events.length === 0) {
        // Acknowledge events we don't care about so Stripe stops retrying.
        return res.json({ acknowledged: true, attributed: 0, type: stripeEvent.type });
      }

      const obj = stripeEvent.data.object;
      const clipper = await resolveClipperFromMetadata(campaignId, obj?.metadata);
      if (!clipper) {
        // Event we'd attribute, but no clipper code on the metadata.
        // Could be a direct purchase the campaigner made without a clipper
        // referral. Not an error.
        return res.json({
          acknowledged: true,
          attributed: 0,
          reason: "no clipper metadata",
          type: stripeEvent.type,
        });
      }

      let attributed = 0;
      const errors: Array<{ type: TrackedEventType; error: string }> = [];

      for (const ev of events) {
        try {
          const dupe = await alreadyProcessed(clipper.id, ev.type, stripeEvent.id);
          if (dupe) continue;
          await trackingService.recordTrackingEvent({
            clipperCampaignId: clipper.id,
            eventType: ev.type,
            eventValue: ev.value,
            metadata: {
              source: "stripe_webhook",
              stripe_event_id: stripeEvent.id,
              stripe_event_type: stripeEvent.type,
              stripe_object_id: obj?.id ?? null,
              currency: obj?.currency ?? null,
            },
          });
          attributed += 1;
        } catch (err: any) {
          errors.push({ type: ev.type, error: err?.message ?? String(err) });
        }
      }

      if (errors.length) {
        console.warn("[stripe-webhook] partial errors", {
          campaignId,
          stripeEventId: stripeEvent.id,
          errors,
        });
      }

      return res.json({
        acknowledged: true,
        attributed,
        type: stripeEvent.type,
      });
    },
  );
}
