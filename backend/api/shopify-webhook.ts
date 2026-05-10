// Phase 4 — Shopify webhook receiver.
//
// The campaigner wires their Shopify store to POST orders to:
//   POST {APP_URL}/api/webhooks/shopify/:campaignId
// with topic "orders/paid" or "orders/create". Shopify HMAC-signs the body
// with the campaigner's chosen secret (stored in
// campaign_integrations.shopify_webhook_secret).
//
// On every order we:
//   1. HMAC-verify against the campaign's stored secret. Reject 401 on miss.
//   2. Parse the JSON.
//   3. For each discount_code on the order whose `code` matches a
//      clipper_promo_code on this campaign, attribute the order:
//        - one `purchase` event with eventValue = order total ($)
//        - one `code_redemption` event (count)
//      The goal-completion service only counts the type matching the
//      campaign's primaryGoal, but firing both keeps the data complete
//      regardless of which goal the campaigner picked.
//   4. Dedupe per (clipper_campaign_id, shopify_order_id) so retries
//      from Shopify don't double-count.
//
// We always respond 2xx (even on internal errors) once HMAC has passed —
// otherwise Shopify retries up to 19 times over 48 hours. Issues are
// logged for the campaigner's debugging.

import type { Express, Request, Response } from "express";
import express from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaignIntegrations,
  clipperCampaigns,
  trackingEvents,
} from "../../shared/schema";
import { verifyShopifySignature } from "../lib/webhook-signing";
import { trackingService, type TrackedEventType } from "../core/services/tracking-service";

interface ShopifyOrder {
  id: number | string;
  total_price?: string;
  currency?: string;
  discount_codes?: Array<{
    code?: string;
    amount?: string;
    type?: string;
  }>;
  // Shopify includes many other fields we don't need.
}

// Has this clipper_campaign already produced an event for this Shopify
// order id? Check both purchase and code_redemption rows so a retry that
// runs after we already wrote one type doesn't double-fire the other.
async function alreadyProcessed(
  clipperCampaignId: string,
  eventType: TrackedEventType,
  shopifyOrderId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: trackingEvents.id })
    .from(trackingEvents)
    .where(
      and(
        eq(trackingEvents.clipperCampaignId, clipperCampaignId),
        eq(trackingEvents.eventType, eventType as any),
        // metadata is stored as TEXT JSON; cast to jsonb for ->> path access.
        sql`(${trackingEvents.metadata}::jsonb->>'shopify_order_id') = ${shopifyOrderId}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export function setupShopifyWebhookAPI(app: Express): void {
  app.post(
    "/api/webhooks/shopify/:campaignId",
    // Raw body for HMAC. express.json() at the app level is bypassed for
    // this route because the route-specific middleware runs first.
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      const { campaignId } = req.params;
      const rawBody = req.body as Buffer;
      const sigHeader = req.header("x-shopify-hmac-sha256");

      // Look up this campaign's secret. We resolve secret per-campaign
      // (rather than a single platform-wide secret) so each campaigner
      // can rotate independently.
      const [integration] = await db
        .select({
          campaignId: campaignIntegrations.campaignId,
          shopifyWebhookSecret: campaignIntegrations.shopifyWebhookSecret,
        })
        .from(campaignIntegrations)
        .where(eq(campaignIntegrations.campaignId, campaignId));

      if (!integration?.shopifyWebhookSecret) {
        // Campaign exists or doesn't, secret missing. Don't leak which —
        // 401 either way.
        return res.status(401).json({ message: "Webhook not configured" });
      }

      if (!verifyShopifySignature(rawBody, sigHeader, integration.shopifyWebhookSecret)) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Parse AFTER signature passes. Anything below this line is operating
      // on trusted-by-HMAC bytes.
      let order: ShopifyOrder;
      try {
        order = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).json({ message: "Invalid JSON" });
      }

      const orderId = String(order.id ?? "");
      if (!orderId) {
        return res.status(400).json({ message: "Order missing id" });
      }

      // No discount codes → nothing to attribute. Ack and move on.
      const codes = (order.discount_codes ?? [])
        .map((c) => (c.code ? c.code.trim() : ""))
        .filter(Boolean);
      if (codes.length === 0) {
        return res.json({ acknowledged: true, attributed: 0 });
      }

      // Look up every matching clipper_campaign in one go. Match exact
      // case (Shopify normalizes the saved code) and require the row
      // belongs to THIS campaign.
      const matched = await db
        .select({
          id: clipperCampaigns.id,
          code: clipperCampaigns.clipperPromoCode,
        })
        .from(clipperCampaigns)
        .where(
          and(
            eq(clipperCampaigns.campaignId, campaignId),
            // ANY(array) gets us a single round-trip rather than a query per code.
            sql`${clipperCampaigns.clipperPromoCode} = ANY(${codes})`,
          ),
        );

      if (matched.length === 0) {
        // Order had codes but none matched any clipper on this campaign.
        // Could be a campaigner's manual code — fine, just ack.
        return res.json({ acknowledged: true, attributed: 0 });
      }

      const totalPrice = parseFloat(order.total_price ?? "0") || 0;
      let attributed = 0;
      const errors: Array<{ clipperCampaignId: string; error: string }> = [];

      for (const cc of matched) {
        // Fire purchase + code_redemption per matched clipper. Skip if
        // this order has already been processed for that clipper.
        const events: Array<{ type: TrackedEventType; value: number }> = [
          { type: "purchase", value: totalPrice },
          { type: "code_redemption", value: 1 },
        ];

        for (const ev of events) {
          try {
            const dupe = await alreadyProcessed(cc.id, ev.type, orderId);
            if (dupe) continue;
            await trackingService.recordTrackingEvent({
              clipperCampaignId: cc.id,
              eventType: ev.type,
              eventValue: ev.value,
              metadata: {
                source: "shopify_webhook",
                shopify_order_id: orderId,
                shopify_code: cc.code ?? null,
                currency: order.currency ?? null,
              },
            });
            attributed += 1;
          } catch (err: any) {
            // recordTrackingEvent throws if the campaign is paused/unfunded.
            // Log but keep going — we still ack the webhook so Shopify
            // doesn't retry forever. The campaigner can replay later.
            errors.push({ clipperCampaignId: cc.id, error: err?.message ?? String(err) });
          }
        }
      }

      if (errors.length) {
        console.warn("[shopify-webhook] partial errors", { campaignId, orderId, errors });
      }

      return res.json({
        acknowledged: true,
        attributed,
        clippersMatched: matched.length,
      });
    },
  );
}

