// Phase 4 — campaign integration config CRUD.
//
// Each campaign has at most one campaign_integrations row holding the creds
// the campaigner provides so we can ingest conversion signals: a generated
// pixel id (embedded on their thank-you page), a generated postback secret
// (HMAC-signed by their backend), and connector creds for Shopify / Stripe
// / mobile-measurement-partner postbacks.
//
// Auto-generated fields (pixelId, postbackSecret) are created on first PUT
// and persisted thereafter; they are returned in plaintext exactly once
// per generation so the campaigner can copy them. Subsequent GETs return
// the pixelId (it's a public path) but redact secrets to a "set/unset" flag.

import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../db";
import {
  campaigns,
  campaignIntegrations,
  clipperCampaigns,
  trackingEvents,
} from "../../shared/schema";
import { and, desc, eq } from "drizzle-orm";
import { trackingService, type TrackedEventType } from "../core/services/tracking-service";

// 16-byte random URL-safe id, lowercase hex. Embedded in <img src> tags
// served on third-party sites — no need for it to be unguessable, just
// unique. Globally unique via partial index in migration 0018.
function generatePixelId(): string {
  return randomBytes(16).toString("hex");
}

// 32-byte URL-safe secret. Used by the campaigner's backend to sign
// postback payloads with HMAC-SHA256. Returned plaintext once on
// generation, never again.
function generatePostbackSecret(): string {
  return randomBytes(32).toString("base64url");
}

// Owner check — only the campaign's creator (or an admin) can read/write
// the integration. Returns the campaign row if authorized, sends 403/404
// and returns null otherwise.
async function authorizeCampaignAccess(req: Request, res: Response, campaignId: string) {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return null;
  }
  const [campaign] = await db
    .select({ id: campaigns.id, creatorId: campaigns.creatorId })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return null;
  }
  const user = req.user as any;
  if (user.role !== "admin" && campaign.creatorId !== user.id) {
    res.status(403).json({ message: "Not your campaign" });
    return null;
  }
  return campaign;
}

// Strip secrets from the response body. We surface a boolean flag for
// each instead so the UI can render a "set / not set" state without
// re-displaying the value.
function redactIntegration(row: typeof campaignIntegrations.$inferSelect | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaignId,
    pixelId: row.pixelId,
    hasPostbackSecret: Boolean(row.postbackSecret),
    shopifyDomain: row.shopifyDomain,
    hasShopifyWebhookSecret: Boolean(row.shopifyWebhookSecret),
    hasStripeWebhookSecret: Boolean(row.stripeWebhookSecret),
    mmpProvider: row.mmpProvider,
    mmpAppId: row.mmpAppId,
    hasMmpApiKey: Boolean(row.mmpApiKey),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function setupCampaignIntegrationsAPI(app: Express) {
  // Read the integration for a campaign (secrets redacted).
  app.get("/api/campaigns/:id/integration", async (req, res) => {
    const campaign = await authorizeCampaignAccess(req, res, req.params.id);
    if (!campaign) return;

    const [row] = await db
      .select()
      .from(campaignIntegrations)
      .where(eq(campaignIntegrations.campaignId, campaign.id));

    res.json({ integration: redactIntegration(row) });
  });

  // Upsert the integration. Body fields are all optional — pass only what's
  // changing. pixelId + postbackSecret are auto-generated on first write
  // and returned plaintext exactly once via the `generated` field; on
  // subsequent writes they are preserved (not regenerated) unless the
  // caller passes `?regenerate=postback` or `?regenerate=pixel`.
  app.put("/api/campaigns/:id/integration", async (req, res) => {
    const campaign = await authorizeCampaignAccess(req, res, req.params.id);
    if (!campaign) return;

    const body = req.body ?? {};
    const regenerate = String(req.query.regenerate ?? "");
    const wantsRegeneratePixel = regenerate.includes("pixel");
    const wantsRegeneratePostback = regenerate.includes("postback");

    const [existing] = await db
      .select()
      .from(campaignIntegrations)
      .where(eq(campaignIntegrations.campaignId, campaign.id));

    // Build the patch. Auto-generated fields on first write only, or when
    // explicitly regenerated. Other fields update only if present in body.
    const generated: { pixelId?: string; postbackSecret?: string } = {};
    let pixelId = existing?.pixelId ?? null;
    let postbackSecret = existing?.postbackSecret ?? null;

    if (!pixelId || wantsRegeneratePixel) {
      pixelId = generatePixelId();
      generated.pixelId = pixelId;
    }
    if (!postbackSecret || wantsRegeneratePostback) {
      postbackSecret = generatePostbackSecret();
      generated.postbackSecret = postbackSecret;
    }

    // Only allow these fields from the body. mmpProvider is constrained
    // at the DB level (CHECK), so the DB rejects bad values; we don't
    // duplicate the check here.
    const allowedKeys = [
      "shopifyDomain",
      "shopifyWebhookSecret",
      "stripeWebhookSecret",
      "mmpProvider",
      "mmpAppId",
      "mmpApiKey",
    ] as const;
    const patch: Record<string, unknown> = {};
    for (const k of allowedKeys) {
      if (k in body) patch[k] = body[k] ?? null;
    }

    let saved;
    if (existing) {
      [saved] = await db
        .update(campaignIntegrations)
        .set({
          ...patch,
          pixelId,
          postbackSecret,
          updatedAt: new Date(),
        })
        .where(eq(campaignIntegrations.campaignId, campaign.id))
        .returning();
    } else {
      [saved] = await db
        .insert(campaignIntegrations)
        .values({
          campaignId: campaign.id,
          pixelId,
          postbackSecret,
          ...patch,
        })
        .returning();
    }

    res.json({
      integration: redactIntegration(saved),
      // Plaintext secrets — included only on the response that generated
      // them so the campaigner can copy. Never returned by GET.
      generated: Object.keys(generated).length ? generated : undefined,
    });
  });

  // Recent events for this campaign — debugging panel. Returns the last
  // N tracking events with source / metadata / timestamp so the campaigner
  // can verify wiring without poking the DB. Test events (metadata.test)
  // are included with a flag so they can be styled differently in the UI.
  app.get("/api/campaigns/:id/integration/recent-events", async (req, res) => {
    const campaign = await authorizeCampaignAccess(req, res, req.params.id);
    if (!campaign) return;

    const limitParam = parseInt(String(req.query.limit ?? "20"), 10);
    const limit = Math.max(1, Math.min(100, Number.isFinite(limitParam) ? limitParam : 20));

    const rows = await db
      .select({
        id: trackingEvents.id,
        clipperCampaignId: trackingEvents.clipperCampaignId,
        clipperId: trackingEvents.clipperId,
        eventType: trackingEvents.eventType,
        eventValue: trackingEvents.eventValue,
        status: trackingEvents.status,
        flaggedAsBot: trackingEvents.flaggedAsBot,
        metadata: trackingEvents.metadata,
        createdAt: trackingEvents.createdAt,
      })
      .from(trackingEvents)
      .where(eq(trackingEvents.campaignId, campaign.id))
      .orderBy(desc(trackingEvents.createdAt))
      .limit(limit);

    // Surface a few high-signal fields up to the top-level shape so the
    // UI doesn't have to JSON.parse metadata to find them.
    const events = rows.map((r) => {
      let parsed: Record<string, any> = {};
      if (r.metadata) {
        try { parsed = JSON.parse(r.metadata); } catch { /* ignore malformed */ }
      }
      return {
        id: r.id,
        clipperCampaignId: r.clipperCampaignId,
        clipperId: r.clipperId,
        eventType: r.eventType,
        eventValue: r.eventValue,
        status: r.status,
        flaggedAsBot: r.flaggedAsBot,
        source: parsed.source ?? null,                 // pixel | shopify_webhook | stripe_webhook | mmp_postback | server_postback | view_polling | manual_test
        isTest: parsed.test === true,
        metadata: parsed,
        createdAt: r.createdAt,
      };
    });
    res.json({ events });
  });

  // Synthetic-event injection. Lets the campaigner click "Send test signup"
  // and see it land — useful before going live with real Shopify/Stripe
  // events. Test events are tagged metadata.test=true so they show up
  // in the diagnostic panel above but are excluded from progress
  // aggregation in both completion services (see TEST_EVENT_FILTER).
  app.post("/api/campaigns/:id/integration/test", async (req, res) => {
    const campaign = await authorizeCampaignAccess(req, res, req.params.id);
    if (!campaign) return;

    // Allowed test events — same set as the generic server postback /
    // conversion pixel. Click/view aren't useful here (their pipelines
    // are exercised separately).
    const ALLOWED: TrackedEventType[] = [
      "signup",
      "lead",
      "purchase",
      "conversion",
      "subscribe",
      "install",
      "code_redemption",
    ];

    const eventType = String(req.body?.eventType ?? "").toLowerCase() as TrackedEventType;
    if (!ALLOWED.includes(eventType)) {
      return res.status(400).json({
        message: `eventType must be one of: ${ALLOWED.join(", ")}`,
      });
    }

    let eventValue: number | undefined;
    if (req.body?.value != null && String(req.body.value).length > 0) {
      const n = parseFloat(String(req.body.value));
      if (Number.isFinite(n) && n >= 0) eventValue = n;
    }

    // Pick the clipper-campaign to attribute this test to. Caller can
    // override via body.clipperCampaignId; otherwise we use the first
    // approved clipper on this campaign.
    let clipperCampaignId: string | undefined = req.body?.clipperCampaignId;
    if (!clipperCampaignId) {
      const [first] = await db
        .select({ id: clipperCampaigns.id })
        .from(clipperCampaigns)
        .where(
          and(
            eq(clipperCampaigns.campaignId, campaign.id),
            eq(clipperCampaigns.applicationStatus, "approved"),
          ),
        )
        .limit(1);
      clipperCampaignId = first?.id;
    }
    if (!clipperCampaignId) {
      return res.status(400).json({
        message:
          "No approved clipper to attribute the test event to. Approve at least one application first, or pass clipperCampaignId.",
      });
    }

    try {
      await trackingService.recordTrackingEvent({
        clipperCampaignId,
        eventType,
        eventValue,
        metadata: {
          source: "manual_test",
          test: true,
          triggered_by: (req.user as any)?.id ?? null,
        },
      });
    } catch (err: any) {
      // recordTrackingEvent throws when the campaign isn't active+funded.
      // Surface the actual reason so the campaigner can fix it.
      return res.status(400).json({
        message: err?.message ?? "Failed to record test event",
      });
    }

    res.json({ ok: true, clipperCampaignId, eventType, eventValue: eventValue ?? 1 });
  });
}
