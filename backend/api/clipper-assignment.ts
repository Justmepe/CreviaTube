// Phase 4 — clipper-side endpoints for one assignment (their row on
// clipper_campaigns). Two routes:
//
//   GET  /api/clipper-campaigns/:id          → clipper-readable detail
//   POST /api/clipper-campaigns/:id/post-url → set/update the live post URL
//
// Auth + authorization: only the clipper who owns the row, or an admin.
// Creators can already see clipper progress through other endpoints; they
// don't read this one because it surfaces clipper-specific assets
// (tracking link, promo code) that belong to the clipper.

import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { campaigns, clipperCampaigns, users } from "../../shared/schema";
import { campaignCompletionService } from "../core/services/campaign-completion";
import { fingerprintPostUrl, viewPollingSupported } from "../core/services/view-polling";

// Loose URL validation: must parse as http(s) URL with a host. We deliberately
// don't check the post is "live" here — that's verification's job (next
// round of work). For now we just keep junk out of the column.
function isPlausibleUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const trimmed = s.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Resolve and authorize a clipper-campaign row. Returns the row with the
// joined campaign goal data, or null if not authorized (after sending the
// response).
async function loadOwnedAssignment(req: Request, res: Response, id: string) {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return null;
  }
  const user = req.user as any;

  const [row] = await db
    .select({
      id: clipperCampaigns.id,
      clipperId: clipperCampaigns.clipperId,
      campaignId: clipperCampaigns.campaignId,
      trackingCode: clipperCampaigns.trackingCode,
      clipperPromoCode: clipperCampaigns.clipperPromoCode,
      postUrl: clipperCampaigns.postUrl,
      isApproved: clipperCampaigns.isApproved,
      isCompleted: clipperCampaigns.isCompleted,
      applicationStatus: clipperCampaigns.applicationStatus,
      rejectionReason: clipperCampaigns.rejectionReason,
      completedAt: clipperCampaigns.completedAt,
      joinedAt: clipperCampaigns.joinedAt,
      campaign: {
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        campaignGoals: campaigns.campaignGoals,
        targetPlatforms: campaigns.targetPlatforms,
      },
    })
    .from(clipperCampaigns)
    .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
    .where(eq(clipperCampaigns.id, id));

  if (!row) {
    res.status(404).json({ message: "Assignment not found" });
    return null;
  }
  if (user.role !== "admin" && row.clipperId !== user.id) {
    res.status(403).json({ message: "Not your assignment" });
    return null;
  }
  return row;
}

export function setupClipperAssignmentAPI(app: Express): void {
  // Detail view — campaign overview + this clipper's assignment + progress.
  app.get("/api/clipper-campaigns/:id", async (req: Request, res: Response) => {
    const row = await loadOwnedAssignment(req, res, req.params.id);
    if (!row) return;

    // Progress is the same shape used by the goal-completion service, so
    // the UI can render a single percentage bar without secondary lookups.
    let progress = null;
    try {
      progress = await campaignCompletionService.getClipperProgress(row.id);
    } catch (err) {
      // Don't fail the detail call if progress aggregation hiccups.
      console.error("[clipper-assignment] progress fetch failed", err);
    }

    // Coverage: tells the clipper whether their post URL's platform is
    // auto-verified by our view-polling sweep. Only meaningful when the
    // campaign goal is "views" — for other goals (signups, revenue, etc.)
    // verification comes from webhooks/pixels and the post URL is just
    // the proof-of-existence link.
    //
    // For TikTok / Instagram we additionally check whether *this clipper*
    // has connected the relevant account. autoVerified == true requires
    // both the server config AND a stored token; needsClipperOAuth
    // signals the UI to render a "Connect <platform>" button.
    const fp = fingerprintPostUrl(row.postUrl);
    const [clipperRow] = await db
      .select({ socialAccounts: users.socialAccounts })
      .from(users)
      .where(eq(users.id, row.clipperId));
    const socials = (clipperRow?.socialAccounts as any) ?? {};
    const tiktokConnected = Boolean(
      socials.tiktok?.accessToken &&
        socials.tiktok?.refreshToken &&
        socials.tiktok?.expiresAt,
    );
    const instagramConnected = Boolean(
      socials.instagram?.accessToken &&
        socials.instagram?.businessAccountId &&
        socials.instagram?.expiresAt,
    );
    const support = viewPollingSupported(fp.platform, {
      tiktokConnected,
      instagramConnected,
    });
    const goalType = (row.campaign.campaignGoals as any)?.primaryGoal ?? null;
    const coverage = {
      platform: fp.platform,
      goalType,
      relevant: goalType === "views",       // true when this matters for the clipper's progress
      autoVerified: support.supported,
      reason: support.reason ?? null,        // SkipReason — shown in UI as a human message
      needsClipperOAuth: support.needsClipperOAuth ?? false,
      tiktokConnected,
      instagramConnected,
      instagramUsername: socials.instagram?.username ?? null,
    };

    res.json({
      assignment: {
        id: row.id,
        campaignId: row.campaignId,
        trackingCode: row.trackingCode,
        clipperPromoCode: row.clipperPromoCode,
        postUrl: row.postUrl,
        isApproved: row.isApproved,
        isCompleted: row.isCompleted,
        applicationStatus: row.applicationStatus,
        rejectionReason: row.rejectionReason,
        completedAt: row.completedAt,
        joinedAt: row.joinedAt,
      },
      campaign: row.campaign,
      progress,
      coverage,
    });
  });

  // Set/update the live post URL. Re-runs the completion check so a
  // ugc_volume goal moves to completed the moment a post URL is added on
  // an already-approved row.
  app.post("/api/clipper-campaigns/:id/post-url", async (req: Request, res: Response) => {
    const row = await loadOwnedAssignment(req, res, req.params.id);
    if (!row) return;

    const url = req.body?.postUrl;
    if (!isPlausibleUrl(url)) {
      return res.status(400).json({
        message: "postUrl must be an http(s) URL.",
      });
    }
    const normalized = (url as string).trim();

    await db
      .update(clipperCampaigns)
      .set({ postUrl: normalized })
      .where(eq(clipperCampaigns.id, row.id));

    // ugc_volume completes the instant we have approval + a post URL —
    // re-run the check so the bonus releases without waiting for an
    // unrelated tracked event.
    try {
      await campaignCompletionService.checkAndUpdateClipperCompletion(row.id);
    } catch (err) {
      console.error("[clipper-assignment] post URL completion check failed", err);
    }

    res.json({ ok: true, postUrl: normalized });
  });
}

