// Phase 4 — conversion pixel receiver.
//
// The campaigner embeds an <img> on their thank-you page:
//
//   <img src="https://creviatube.example/pixel/{pixelId}?clipper={trackingCode}&event=signup&value=29.99"
//        width="1" height="1" style="display:none" />
//
// On every fire we:
//   1. Resolve pixelId → campaign_id via campaign_integrations.
//   2. Resolve trackingCode → clipper_campaigns row scoped to that campaign.
//   3. Validate the requested event type is one of the pixel-supported set.
//   4. Record a tracking_events row via the existing trackingService so
//      goal-completion checks fire end-to-end.
//   5. Return a 1x1 transparent GIF with no-cache headers.
//
// Deliberately public + unauthenticated — the pixel runs in the visitor's
// browser. Bot/abuse mitigation reuses the existing recordTrackingEvent
// path (auto-verify today; bot-detection plugs in later).

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { campaignIntegrations, clipperCampaigns } from "../../shared/schema";
import { and, eq } from "drizzle-orm";
import { trackingService, type TrackedEventType } from "../core/services/tracking-service";

// 1x1 transparent GIF. Always returned, even on error, so the visitor's
// browser doesn't render a broken image and surface our errors back to them.
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

// Events the pixel will accept. Click-tracking still goes through
// /track/{trackingCode} (server-side redirect); views come from public
// platform APIs. Pixel handles the rest.
const PIXEL_ALLOWED_EVENTS = new Set<TrackedEventType>([
  "signup",
  "conversion",
  "subscribe",
  "install",
  "lead",
  "purchase",
  "code_redemption",
]);

function sendPixel(res: Response) {
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.status(200).end(PIXEL_GIF);
}

export function setupConversionPixelAPI(app: Express) {
  app.get("/pixel/:pixelId", async (req: Request, res: Response) => {
    // Always 200 + GIF, even on validation failure, to avoid surfacing
    // platform internals to the visitor's browser. Errors logged
    // server-side for the campaigner's debugging.
    try {
      const { pixelId } = req.params;
      const clipperCode = String(req.query.clipper ?? "").trim();
      const eventRaw = String(req.query.event ?? "").trim() as TrackedEventType;
      const valueRaw = req.query.value;

      if (!pixelId || !clipperCode || !eventRaw) {
        console.warn("[pixel] missing params", { pixelId, clipperCode, eventRaw });
        return sendPixel(res);
      }

      if (!PIXEL_ALLOWED_EVENTS.has(eventRaw)) {
        console.warn("[pixel] unsupported event", { pixelId, eventRaw });
        return sendPixel(res);
      }

      // pixelId → campaign
      const [integration] = await db
        .select({ campaignId: campaignIntegrations.campaignId })
        .from(campaignIntegrations)
        .where(eq(campaignIntegrations.pixelId, pixelId));
      if (!integration) {
        console.warn("[pixel] unknown pixelId", { pixelId });
        return sendPixel(res);
      }

      // tracking code → clipper-campaign (scoped to this campaign)
      const [cc] = await db
        .select({ id: clipperCampaigns.id })
        .from(clipperCampaigns)
        .where(
          and(
            eq(clipperCampaigns.trackingCode, clipperCode),
            eq(clipperCampaigns.campaignId, integration.campaignId),
          ),
        );
      if (!cc) {
        console.warn("[pixel] unknown tracking code for campaign", {
          pixelId,
          clipperCode,
          campaignId: integration.campaignId,
        });
        return sendPixel(res);
      }

      // Parse optional event value. Only revenue (purchase) is value-bearing
      // in v1; for everything else value is ignored and defaults to 1 in
      // the trackingService.
      let eventValue: number | undefined;
      if (valueRaw != null && String(valueRaw).length > 0) {
        const parsed = parseFloat(String(valueRaw));
        if (Number.isFinite(parsed) && parsed >= 0) {
          eventValue = parsed;
        }
      }

      await trackingService.recordTrackingEvent({
        clipperCampaignId: cc.id,
        eventType: eventRaw,
        eventValue,
        userAgent: req.get("user-agent") ?? undefined,
        ipAddress: req.ip,
        referrer: req.get("referer") ?? undefined,
        metadata: { source: "pixel", pixelId },
      });

      return sendPixel(res);
    } catch (err) {
      console.error("[pixel] handler error", err);
      return sendPixel(res);
    }
  });
}
