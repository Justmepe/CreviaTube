// Phase 4 — Mobile Measurement Partner postback receiver.
//
// AppsFlyer / Adjust / Firebase use S2S postbacks (typically GET) to fire
// install + post-install events to a configurable URL. The campaigner sets
// up their MMP dashboard with a URL template; we receive it here.
//
// URL the campaigner pastes into their MMP dashboard (with provider-
// specific macros where indicated):
//
//   https://{APP_URL}/api/postback/mmp/{campaignId}
//     ?token={mmp_api_key}
//     &event={install|signup|purchase|subscribe}
//     &clipper_code={macro_for_click_id}
//     &external_id={macro_for_unique_event_id}
//     &amount={macro_for_revenue}            // optional, purchase only
//     &provider={appsflyer|adjust|firebase}  // optional, for logging
//
// MMPs retry on non-2xx, so we always 2xx after token verification — even
// for unknown clippers / disabled campaigns / dupes — so retry storms
// don't accumulate. Issues are logged for the campaigner.
//
// Dedup: per (clipper_campaign_id, event_type, external_id). MMPs re-fire
// the same external_id on retry; without dedup we'd double-count installs.

import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaignIntegrations,
  clipperCampaigns,
  trackingEvents,
} from "../../shared/schema";
import { trackingService, type TrackedEventType } from "../core/services/tracking-service";

// MMP event names the campaigner can ship. We deliberately keep this
// list small — the goal types we ship for installs / signups / revenue /
// subscriptions are the only ones MMPs add value over a pixel for.
const MMP_EVENTS: Record<string, TrackedEventType> = {
  install: "install",
  signup: "signup",
  register: "signup",
  purchase: "purchase",
  revenue: "purchase",
  subscribe: "subscribe",
  subscription: "subscribe",
};

function safeTokenEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Resolve the clipper-campaign row by either the trackingCode (always
// present) or the clipperPromoCode (only present after creator approval).
// Trying both lets the campaigner template either macro.
async function resolveClipper(
  campaignId: string,
  clipperCode: string,
): Promise<{ id: string } | null> {
  const trimmed = clipperCode.trim();
  if (!trimmed) return null;

  // trackingCode is the auto-issued path component, format "<campaignId>_<userId>_<rand>"
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

  // Fallback: 8-char promo code minted on approval.
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
        sql`(${trackingEvents.metadata}::jsonb->>'mmp_external_id') = ${externalId}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function handleMmpPostback(req: Request, res: Response): Promise<void> {
  const campaignId = req.params.campaignId;
  // Merge body + query so the campaigner can configure the postback as
  // either GET (most common) or POST without us caring.
  const params: Record<string, any> = { ...(req.body ?? {}), ...(req.query ?? {}) };

  const token = String(params.token ?? "");
  const eventRaw = String(params.event ?? "").toLowerCase();
  const clipperCode = String(params.clipper_code ?? params.clipperCode ?? "");
  const externalId = String(params.external_id ?? params.externalId ?? "");
  const amountRaw = params.amount ?? params.revenue ?? null;
  const provider = String(params.provider ?? "").toLowerCase() || null;

  // Auth: token must match the campaign's saved mmp_api_key. We resolve
  // and verify in one query; fail with a generic 401 either way so a
  // probe can't enumerate which campaigns have MMP configured.
  const [integration] = await db
    .select({ mmpApiKey: campaignIntegrations.mmpApiKey })
    .from(campaignIntegrations)
    .where(eq(campaignIntegrations.campaignId, campaignId));

  if (!integration?.mmpApiKey || !token || !safeTokenEqual(token, integration.mmpApiKey)) {
    res.status(401).json({ message: "Invalid postback" });
    return;
  }

  // From here on we 2xx no matter what so the MMP doesn't retry. Any
  // problems (missing clipper, dupe, etc.) are logged.
  const eventType = MMP_EVENTS[eventRaw];
  if (!eventType) {
    console.warn("[mmp-postback] unsupported event", { campaignId, eventRaw });
    res.status(200).json({ acknowledged: true, attributed: 0, reason: "unsupported event" });
    return;
  }
  if (!externalId) {
    console.warn("[mmp-postback] missing external_id", { campaignId, eventRaw });
    res.status(200).json({ acknowledged: true, attributed: 0, reason: "missing external_id" });
    return;
  }

  const clipper = await resolveClipper(campaignId, clipperCode);
  if (!clipper) {
    // Direct-attribution (organic) install with no clipper macro filled in
    // — perfectly normal, just nothing to credit.
    res.status(200).json({ acknowledged: true, attributed: 0, reason: "no clipper match" });
    return;
  }

  if (await alreadyProcessed(clipper.id, eventType, externalId)) {
    res.status(200).json({ acknowledged: true, attributed: 0, reason: "duplicate" });
    return;
  }

  // Optional revenue value. Reject NaN / negatives but pass 0 through.
  let eventValue: number | undefined;
  if (amountRaw != null && String(amountRaw).length > 0) {
    const n = parseFloat(String(amountRaw));
    if (Number.isFinite(n) && n >= 0) eventValue = n;
  }

  try {
    await trackingService.recordTrackingEvent({
      clipperCampaignId: clipper.id,
      eventType,
      eventValue,
      metadata: {
        source: "mmp_postback",
        mmp_provider: provider,
        mmp_external_id: externalId,
        mmp_event_raw: eventRaw,
      },
    });
    res.status(200).json({ acknowledged: true, attributed: 1, type: eventType });
  } catch (err: any) {
    // Campaign paused / unfunded etc. — still 2xx so MMP stops retrying.
    console.warn("[mmp-postback] record failed", {
      campaignId,
      clipperCampaignId: clipper.id,
      error: err?.message ?? String(err),
    });
    res.status(200).json({ acknowledged: true, attributed: 0, reason: "record failed" });
  }
}

export function setupMmpPostbackAPI(app: Express): void {
  // GET is the canonical S2S form for AppsFlyer / Adjust / Firebase.
  app.get("/api/postback/mmp/:campaignId", handleMmpPostback);
  // POST fallback for setups that prefer a JSON body. Same handler since
  // the merge above reads from both sides.
  app.post("/api/postback/mmp/:campaignId", handleMmpPostback);
}
