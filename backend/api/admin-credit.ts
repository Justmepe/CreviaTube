// Phase 4 — admin manual-credit endpoint.
//
// The verification stack (pixels, webhooks, MMP, view-polling) covers
// most goal types end-to-end, but a few tails remain — X / Twitter has
// no public API, clippers may decline TikTok or IG OAuth, and disputes
// or ad-hoc corrections need human review.
//
// This endpoint lets ops staff write a tracking event on behalf of a
// clipper-campaign with a required reason and optional evidence URL.
// The event flows through the same goal-completion pipeline as any
// other source — so a manual credit that crosses the goal threshold
// triggers payout immediately.
//
// Audit trail:
//   - tracking_events.metadata stores admin_id, reason, evidence_url
//   - metric_events row "admin_event_credited" with the full payload
//   - structured stdout log via emit()

import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { campaigns, clipperCampaigns, trackingEvents } from "../../shared/schema";
import { emit } from "../lib/metrics";
import { campaignCompletionService } from "../core/services/campaign-completion";

// Tracked event types the manual-credit form accepts. Mirrors the
// allowlist from the conversion pixel + server postback so the admin
// can credit any event a real provider could fire. Excludes click and
// view? No — view is the most common reason ops will use this, since
// X / IG-non-Business / TikTok-without-OAuth views need manual credit.
const ADMIN_CREDITABLE_EVENTS = [
  "view",
  "click",
  "signup",
  "lead",
  "purchase",
  "conversion",
  "subscribe",
  "install",
  "code_redemption",
  "follow",
] as const;
type CreditableEvent = (typeof ADMIN_CREDITABLE_EVENTS)[number];

// Defensive caps. A typo "1000000000" should not silently land 1B
// views in escrow. Real-world manual credits rarely exceed 6 figures
// per call; if a clipper genuinely earned more, ops can fire the
// endpoint multiple times.
const MAX_COUNT = 1_000_000;
const MAX_VALUE = 1_000_000;       // $-amount cap for revenue events
const MAX_REASON_LEN = 1000;

// Sanity-check the body and pull validated fields out of it. Returns
// either an error message or the validated tuple.
function parseBody(body: any):
  | { ok: false; message: string }
  | {
      ok: true;
      clipperCampaignId: string;
      eventType: CreditableEvent;
      eventValue: number;
      reason: string;
      evidenceUrl: string | null;
      externalId: string | null;
    } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "body must be a JSON object" };
  }
  const clipperCampaignId = String(body.clipperCampaignId ?? "").trim();
  if (!clipperCampaignId) return { ok: false, message: "clipperCampaignId is required" };

  const eventType = String(body.eventType ?? "").toLowerCase() as CreditableEvent;
  if (!ADMIN_CREDITABLE_EVENTS.includes(eventType)) {
    return {
      ok: false,
      message: `eventType must be one of: ${ADMIN_CREDITABLE_EVENTS.join(", ")}`,
    };
  }

  // Revenue-style events use `value` ($), the rest use `count`. Caller
  // can pass either; whichever shows up wins, with sensible defaults.
  const isRevenue = eventType === "purchase";
  const raw = isRevenue ? body.value ?? body.count : body.count ?? body.value;
  const n = parseFloat(String(raw ?? ""));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, message: isRevenue ? "value must be > 0" : "count must be > 0" };
  }
  if (n > (isRevenue ? MAX_VALUE : MAX_COUNT)) {
    return {
      ok: false,
      message: isRevenue ? `value must be ≤ ${MAX_VALUE}` : `count must be ≤ ${MAX_COUNT}`,
    };
  }

  const reason = String(body.reason ?? "").trim();
  if (reason.length === 0) return { ok: false, message: "reason is required" };
  if (reason.length > MAX_REASON_LEN) {
    return { ok: false, message: `reason must be ≤ ${MAX_REASON_LEN} chars` };
  }

  // Optional evidence URL. Loose validation — must parse as http(s).
  let evidenceUrl: string | null = null;
  if (body.evidenceUrl) {
    try {
      const u = new URL(String(body.evidenceUrl).trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, message: "evidenceUrl must be http(s)" };
      }
      evidenceUrl = u.toString();
    } catch {
      return { ok: false, message: "evidenceUrl is not a valid URL" };
    }
  }

  // Optional external_id for dedup if ops re-fires.
  const externalId = body.externalId ? String(body.externalId).trim() : null;

  return {
    ok: true,
    clipperCampaignId,
    eventType,
    eventValue: n,
    reason,
    evidenceUrl,
    externalId,
  };
}

export function setupAdminCreditAPI(app: Express): void {
  app.post("/api/admin/credit-event", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const admin = req.user as any;
    if (admin.role !== "admin") return res.sendStatus(403);

    const parsed = parseBody(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    // Resolve the clipper-campaign and confirm it points at an active
    // campaign. We refuse to credit toward archived/draft campaigns —
    // safety against fat-finger payouts to a paused campaign.
    const [row] = await db
      .select({
        id: clipperCampaigns.id,
        clipperId: clipperCampaigns.clipperId,
        campaignId: clipperCampaigns.campaignId,
        isApproved: clipperCampaigns.isApproved,
        isCompleted: clipperCampaigns.isCompleted,
        applicationStatus: clipperCampaigns.applicationStatus,
        campaignStatus: campaigns.status,
        campaignName: campaigns.name,
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .where(eq(clipperCampaigns.id, parsed.clipperCampaignId));
    if (!row) {
      return res.status(404).json({ message: "clipper campaign not found" });
    }
    if (!row.isApproved) {
      return res.status(400).json({
        message: "clipper application not approved — cannot credit toward an unapproved row",
      });
    }
    if (row.isCompleted) {
      return res.status(400).json({
        message: "clipper has already completed this campaign — credit a different one",
      });
    }
    if (row.campaignStatus !== "active") {
      return res.status(400).json({
        message: `campaign status is ${row.campaignStatus} — only active campaigns accept manual credits`,
      });
    }

    // Insert directly rather than via trackingService — we want the
    // event marked verified, with status carrying admin metadata, and
    // we don't want trackingService's reward-rate calc to fire (manual
    // credits are evidence-based, not rate-paid; payout still happens
    // through the goal-completion bonus path).
    const metadata = {
      source: "admin_credit",
      manual: true,
      admin_id: admin.id,
      admin_username: admin.username ?? null,
      reason: parsed.reason,
      evidence_url: parsed.evidenceUrl,
      external_id: parsed.externalId,
    };
    const [inserted] = await db
      .insert(trackingEvents)
      .values({
        clipperId: row.clipperId,
        campaignId: row.campaignId,
        clipperCampaignId: row.id,
        eventType: parsed.eventType as any,
        eventValue: parsed.eventValue.toString(),
        rewardAmount: "0",            // manual credit — bonus comes from goal completion, not per-event rate
        status: "verified",
        metadata: JSON.stringify(metadata),
      })
      .returning();

    // Run the goal-completion check so a credit that crosses the
    // threshold immediately triggers the bonus + payout path.
    let triggeredCompletion = false;
    try {
      triggeredCompletion = await campaignCompletionService.checkAndUpdateClipperCompletion(
        row.id,
      );
    } catch (err) {
      console.error("[admin-credit] post-credit completion check failed", err);
      // Don't fail the credit — the event is recorded; ops can re-run
      // the check via the existing manual endpoints if needed.
    }

    // Audit trail — two writes:
    //   1. emit() to metric_events (product analytics, rolling retention)
    //   2. logAdminAction() to admin_audit_log (adversarial trail, indefinite)
    emit(
      "admin_event_credited",
      {
        admin_id: admin.id,
        clipper_campaign_id: row.id,
        clipper_id: row.clipperId,
        campaign_id: row.campaignId,
        campaign_name: row.campaignName,
        event_type: parsed.eventType,
        event_value: parsed.eventValue,
        reason: parsed.reason,
        evidence_url: parsed.evidenceUrl,
        triggered_completion: triggeredCompletion,
      },
      admin.id,
    );
    const { logAdminAction } = await import("../lib/audit");
    await logAdminAction(req, {
      action: "credit.manual_post",
      targetType: "clipper_campaign",
      targetId: row.id,
      payload: {
        clipperId: row.clipperId,
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        eventType: parsed.eventType,
        eventValue: parsed.eventValue,
        reason: parsed.reason,
        evidenceUrl: parsed.evidenceUrl,
        triggeredCompletion,
      },
    });

    return res.status(201).json({
      ok: true,
      eventId: inserted.id,
      eventType: parsed.eventType,
      eventValue: parsed.eventValue,
      triggeredCompletion,
    });
  });
}
