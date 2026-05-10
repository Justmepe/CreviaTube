import { db } from "../../db";
import { campaigns, clipperCampaigns, trackingEvents, users } from "../../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Progress queries only count events that passed bot detection.
// flaggedAsBot defaults to false on all writes (see migration 0000); we
// match the existing convention from getBotDetectionStats — eq(...,false)
// — which is also conservatively correct for any NULL rows (excluded
// from progress, since we can't confirm they're human).
const BOT_FILTER = eq(trackingEvents.flaggedAsBot, false);

// Synthetic events fired by the integration-test tool carry
// metadata.test=true. We surface them in the recent-events diagnostic
// panel but they must NOT move real progress. Plain text LIKE rather
// than JSONB casting so a row with malformed metadata doesn't crash the
// query — JSON.stringify always produces `"test":true` with no space.
const TEST_EVENT_FILTER = sql`(
  ${trackingEvents.metadata} IS NULL
  OR ${trackingEvents.metadata} NOT LIKE '%"test":true%'
)`;
import * as React from "react";
import { EscrowService } from "./escrow-service";
import { sendEmail, APP_URL } from "../../lib/email";
import { CampaignGoalReached } from "../../emails/campaign-goal-reached";
import { CampaignCompletedCreator } from "../../emails/campaign-completed-creator";
import { emit } from "../../lib/metrics";

export interface CampaignCompletionService {
  checkAndUpdateClipperCompletion(clipperCampaignId: string): Promise<boolean>;
  getClipperProgress(clipperCampaignId: string): Promise<ClipperProgress>;
  markClipperCampaignComplete(clipperCampaignId: string, goalType: string, targetValue: number, achievedValue: number): Promise<void>;
}

export interface ClipperProgress {
  totalViews: number;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  // Phase 3 — persona-specific event types
  totalFollows: number;
  totalSubscribes: number;
  totalInstalls: number;
  // Phase 4 — goal-verification v1
  totalLeads: number;
  totalCodeRedemptions: number;
  totalPurchases: number;          // count of purchase events (rows)
  totalRevenue: number;            // SUM(event_value) for purchase events ($)
  totalApprovedPosts: number;      // ugc_volume: approved + post-URL-verified submissions for this clipper-campaign
  isCompleted: boolean;
  goalProgress: {
    type: string;
    target: number;
    current: number;
    percentage: number;
    isReached: boolean;
  } | null;
}

class CampaignCompletionServiceImpl implements CampaignCompletionService {
  private escrowService: EscrowService;

  constructor() {
    this.escrowService = new EscrowService();
  }
  
  /**
   * Check if a clipper has reached the campaign goals and update their completion status
   */
  async checkAndUpdateClipperCompletion(clipperCampaignId: string): Promise<boolean> {
    try {
      // Get clipper campaign details with campaign goals
      const [clipperCampaign] = await db
        .select({
          id: clipperCampaigns.id,
          clipperId: clipperCampaigns.clipperId,
          campaignId: clipperCampaigns.campaignId,
          isCompleted: clipperCampaigns.isCompleted,
          campaignGoals: campaigns.campaignGoals,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      if (!clipperCampaign || clipperCampaign.isCompleted) {
        return false; // Already completed or not found
      }

      const goals = clipperCampaign.campaignGoals as any;
      if (!goals || !goals.primaryGoal) {
        return false; // No goals set
      }

      // Get current progress
      const progress = await this.getClipperProgress(clipperCampaignId);

      // Check if primary goal is reached. Most goal targets are stored as
      // `${goalType}Goal`; code_redemptions and ugc_volume have explicit
      // camelCase keys to avoid concatenating snake_case into JSON paths.
      const primaryGoal = goals.primaryGoal;
      const targetKeyByGoal: Record<string, string> = {
        code_redemptions: 'codeRedemptionsGoal',
        ugc_volume: 'ugcVolumeGoal',
      };
      const targetKey = targetKeyByGoal[primaryGoal] || `${primaryGoal}Goal`;
      const targetValue = goals[targetKey];

      if (!targetValue) {
        return false; // No target set for primary goal
      }

      let currentValue = 0;
      switch (primaryGoal) {
        case 'views':            currentValue = progress.totalViews; break;
        case 'clicks':           currentValue = progress.totalClicks; break;
        case 'signups':          currentValue = progress.totalSignups; break;
        case 'conversions':      currentValue = progress.totalConversions; break;
        case 'follows':          currentValue = progress.totalFollows; break;
        case 'subscribes':       currentValue = progress.totalSubscribes; break;
        case 'installs':         currentValue = progress.totalInstalls; break;
        case 'leads':            currentValue = progress.totalLeads; break;
        case 'code_redemptions': currentValue = progress.totalCodeRedemptions; break;
        case 'revenue':          currentValue = progress.totalRevenue; break;
        case 'ugc_volume':       currentValue = progress.totalApprovedPosts; break;
      }

      // If goal is reached, mark as complete
      if (currentValue >= targetValue) {
        await this.markClipperCampaignComplete(
          clipperCampaignId,
          primaryGoal,
          targetValue,
          currentValue
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking clipper completion:', error);
      return false;
    }
  }

  /**
   * Get current progress for a clipper's campaign participation
   */
  async getClipperProgress(clipperCampaignId: string): Promise<ClipperProgress> {
    try {
      // Aggregated metrics. Three columns per event type:
      //
      //   rowCount  — count(*). Used as a literal "how many rows" when
      //               the row count itself is the answer (e.g., the
      //               totalPurchases display counter — number of orders).
      //   countSum  — sum(coalesce(event_value, 1)). Used for count-based
      //               goals. eventValue defaults to "1" on every insert,
      //               so a single click event contributes 1; a view-poll
      //               sweep that observed a +N delta inserts one row with
      //               eventValue=N and contributes N. Both add up cleanly.
      //   valueSum  — sum(event_value). Used for revenue (purchase events
      //               where event_value is the order amount in $).
      const metrics = await db
        .select({
          eventType: trackingEvents.eventType,
          rowCount: sql<number>`count(*)::int`,
          countSum: sql<number>`coalesce(sum(coalesce(${trackingEvents.eventValue}::numeric, 1))::int, 0)`,
          valueSum: sql<number>`coalesce(sum(${trackingEvents.eventValue}::numeric), 0)::numeric`,
        })
        .from(trackingEvents)
        .where(
          and(
            eq(trackingEvents.clipperCampaignId, clipperCampaignId),
            BOT_FILTER,
            TEST_EVENT_FILTER,
          ),
        )
        .groupBy(trackingEvents.eventType);

      const progress: ClipperProgress = {
        totalViews: 0,
        totalClicks: 0,
        totalSignups: 0,
        totalConversions: 0,
        totalFollows: 0,
        totalSubscribes: 0,
        totalInstalls: 0,
        totalLeads: 0,
        totalCodeRedemptions: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        totalApprovedPosts: 0,
        isCompleted: false,
        goalProgress: null,
      };

      metrics.forEach(metric => {
        const rows = Number(metric.rowCount) || 0;
        const count = Number(metric.countSum) || 0;
        const value = Number(metric.valueSum) || 0;
        switch (metric.eventType) {
          case 'view':            progress.totalViews = count; break;
          case 'click':           progress.totalClicks = count; break;
          case 'signup':          progress.totalSignups = count; break;
          case 'conversion':      progress.totalConversions = count; break;
          case 'follow':          progress.totalFollows = count; break;
          case 'subscribe':       progress.totalSubscribes = count; break;
          case 'install':         progress.totalInstalls = count; break;
          case 'lead':            progress.totalLeads = count; break;
          case 'code_redemption': progress.totalCodeRedemptions = count; break;
          case 'purchase':
            // Purchases counter = number of orders (literal rowCount).
            // Revenue = SUM of order amounts ($, valueSum).
            progress.totalPurchases = rows;
            progress.totalRevenue = value;
            break;
        }
      });

      // Get campaign goals + completion status + ugc_volume signal (the
      // submission's approval state and post URL — ugc_volume goals don't
      // emit tracking events, they verify via the submission record itself).
      const [clipperCampaign] = await db
        .select({
          isCompleted: clipperCampaigns.isCompleted,
          campaignGoals: campaigns.campaignGoals,
          applicationStatus: clipperCampaigns.applicationStatus,
          postUrl: clipperCampaigns.postUrl,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      if (clipperCampaign) {
        progress.isCompleted = clipperCampaign.isCompleted;
        // ugc_volume per-clipper progress is binary: their submission is
        // approved AND has a verifiable post_url. Per-campaign budget caps
        // total payouts; we don't gate completion on the campaign-wide N.
        progress.totalApprovedPosts =
          clipperCampaign.applicationStatus === 'approved' && clipperCampaign.postUrl ? 1 : 0;

        const goals = clipperCampaign.campaignGoals as any;
        if (goals && goals.primaryGoal) {
          const goalType = goals.primaryGoal;
          // Most goals store target as `${goalType}Goal`. Two exceptions:
          //   code_redemptions → codeRedemptionsGoal (already snake-cased
          //                       primary goal value to camelCase JSON key)
          //   ugc_volume       → ugcVolumeGoal
          const targetKeyByGoal: Record<string, string> = {
            code_redemptions: 'codeRedemptionsGoal',
            ugc_volume: 'ugcVolumeGoal',
          };
          const targetKey = targetKeyByGoal[goalType] || `${goalType}Goal`;
          const target = goals[targetKey];

          if (target) {
            let current = 0;
            switch (goalType) {
              case 'views':            current = progress.totalViews; break;
              case 'clicks':           current = progress.totalClicks; break;
              case 'signups':          current = progress.totalSignups; break;
              case 'conversions':      current = progress.totalConversions; break;
              case 'follows':          current = progress.totalFollows; break;
              case 'subscribes':       current = progress.totalSubscribes; break;
              case 'installs':         current = progress.totalInstalls; break;
              case 'leads':            current = progress.totalLeads; break;
              case 'code_redemptions': current = progress.totalCodeRedemptions; break;
              case 'revenue':          current = progress.totalRevenue; break;
              case 'ugc_volume':       current = progress.totalApprovedPosts; break;
            }

            progress.goalProgress = {
              type: goalType,
              target,
              current,
              percentage: Math.min(100, (current / target) * 100),
              isReached: current >= target,
            };
          }
        }
      }

      return progress;
    } catch (error) {
      console.error('Error getting clipper progress:', error);
      throw error;
    }
  }

  /**
   * Mark a clipper's campaign as complete with completion details and trigger automatic payout
   */
  async markClipperCampaignComplete(clipperCampaignId: string, goalType: string, targetValue: number, achievedValue: number): Promise<void> {
    try {
      // Get clipper campaign details for payout calculation
      const [clipperCampaign] = await db
        .select({
          id: clipperCampaigns.id,
          clipperId: clipperCampaigns.clipperId,
          campaignId: clipperCampaigns.campaignId,
          rewardRates: campaigns.rewardRates,
          budget: campaigns.budget,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      if (!clipperCampaign) {
        throw new Error("Clipper campaign not found");
      }

      const completionMetrics = {
        goalReached: {
          type: goalType as any,
          target: targetValue,
          achieved: achievedValue,
          reachedAt: new Date().toISOString(),
        },
      };

      // Mark campaign as complete
      await db
        .update(clipperCampaigns)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          completionMetrics,
        })
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      // Calculate completion reward — fixed bonus for completing goal.
      // goalType comes in as a plural ("views", "clicks") from
      // campaignGoals.primaryGoal but rewardRates is keyed by the singular
      // event type ("view", "click"). Map plural→singular here so the
      // lookup actually hits the configured rate instead of falling
      // through to the $10 default.
      const GOAL_TO_RATE_KEY: Record<string, string> = {
        views: "view",
        clicks: "click",
        signups: "signup",
        conversions: "conversion",
        follows: "follow",
        subscribes: "subscribe",
        installs: "install",
        // Phase 4 — reward keys for the new event types. Mirrors
        // GOAL_TO_RATE_KEY in client/src/pages/campaign-creation.tsx.
        revenue: "purchase",
        leads: "lead",
        code_redemptions: "codeRedemption",
        ugc_volume: "post",
      };
      const rewardRates = JSON.parse(clipperCampaign.rewardRates || "{}");
      const rateKey = GOAL_TO_RATE_KEY[goalType] || goalType;
      const baseReward = parseFloat(rewardRates[rateKey] || "10");
      const completionReward = baseReward * 10; // 10x bonus for completing the full goal

      // Create an automatic completion bonus payment
      await this.processCompletionPayout(
        clipperCampaign.clipperId,
        clipperCampaign.campaignId,
        clipperCampaignId,
        completionReward,
        goalType,
        achievedValue
      );

      console.log(`✅ Clipper campaign ${clipperCampaignId} marked as complete. Goal: ${goalType} (${achievedValue}/${targetValue}). Completion payout: $${completionReward}`);

      emit("campaign_goal_reached", {
        clipperCampaignId,
        campaignId: clipperCampaign.campaignId,
        goalType,
        target: targetValue,
        achieved: achievedValue,
        completionReward,
      }, clipperCampaign.clipperId);

      // Notify both sides (fire-and-forget — failures don't unwind completion)
      void this.notifyCampaignCompletion({
        clipperCampaignId,
        clipperId: clipperCampaign.clipperId,
        campaignId: clipperCampaign.campaignId,
        goalType,
        target: targetValue,
        achieved: achievedValue,
        completionReward,
      });
    } catch (error) {
      console.error('Error marking clipper campaign complete:', error);
      throw error;
    }
  }

  /**
   * Notify clipper + creator that the campaign goal was reached. Each side gets
   * a tailored template; both deduped on clipperCampaignId so retries no-op.
   */
  private async notifyCampaignCompletion(opts: {
    clipperCampaignId: string;
    clipperId: string;
    campaignId: string;
    goalType: string;
    target: number;
    achieved: number;
    completionReward: number;
  }): Promise<void> {
    try {
      const [clipper] = await db
        .select({ id: users.id, email: users.email, fullName: users.fullName })
        .from(users).where(eq(users.id, opts.clipperId)).limit(1);
      const [campaign] = await db
        .select({ id: campaigns.id, name: campaigns.name, creatorId: campaigns.creatorId })
        .from(campaigns).where(eq(campaigns.id, opts.campaignId)).limit(1);
      if (!clipper || !campaign) return;
      const [creator] = await db
        .select({ id: users.id, email: users.email, fullName: users.fullName })
        .from(users).where(eq(users.id, campaign.creatorId)).limit(1);

      // Resolve verification source for the email body. We read the most
      // recent verified non-bot non-test event for this clipper-campaign
      // and translate metadata.source into a human label. Best-effort —
      // failure leaves verificationSource undefined and the templates
      // skip the line entirely.
      const verificationSource = await this.resolveVerificationSource(opts.clipperCampaignId);

      // Clipper-side: "you hit the goal"
      await sendEmail({
        kind: "campaign_goal_reached",
        to: clipper.email,
        subject: `Goal reached on "${campaign.name}" — bonus released`,
        react: React.createElement(CampaignGoalReached, {
          fullName: clipper.fullName,
          campaignName: campaign.name,
          goalType: opts.goalType,
          target: opts.target,
          achieved: opts.achieved,
          completionReward: opts.completionReward.toFixed(2),
          appUrl: APP_URL,
          verificationSource,
        }),
        dedupeKey: `campaign_goal_reached:${opts.clipperCampaignId}`,
        userId: clipper.id,
      });

      // Creator-side: "your campaign was completed"
      if (creator) {
        await sendEmail({
          kind: "campaign_completed_creator",
          to: creator.email,
          subject: `${clipper.fullName} completed "${campaign.name}"`,
          react: React.createElement(CampaignCompletedCreator, {
            creatorName: creator.fullName,
            clipperName: clipper.fullName,
            campaignName: campaign.name,
            goalType: opts.goalType,
            target: opts.target,
            achieved: opts.achieved,
            appUrl: APP_URL,
            verificationSource,
          }),
          dedupeKey: `campaign_completed_creator:${opts.clipperCampaignId}`,
          userId: creator.id,
        });
      }
    } catch (err) {
      console.error("notifyCampaignCompletion failed:", err);
    }
  }

  // Translate the most recent verified event's metadata.source into a
  // human-friendly label for the goal-reached email. Returns undefined
  // when no verifying event was found (e.g., ugc_volume goals where the
  // submission record itself is the proof — see notes).
  private async resolveVerificationSource(
    clipperCampaignId: string,
  ): Promise<string | undefined> {
    try {
      // Sort by created_at DESC; the most recent verified event is the
      // one that crossed the threshold (or close to it). Apply the same
      // bot+test filters as goal-progress aggregation so a synthetic
      // test event can never claim credit for the verification line.
      const [row] = await db
        .select({ metadata: trackingEvents.metadata })
        .from(trackingEvents)
        .where(
          and(
            eq(trackingEvents.clipperCampaignId, clipperCampaignId),
            eq(trackingEvents.flaggedAsBot, false),
            sql`(${trackingEvents.metadata} IS NULL OR ${trackingEvents.metadata} NOT LIKE '%"test":true%')`,
          ),
        )
        .orderBy(sql`${trackingEvents.createdAt} desc`)
        .limit(1);
      if (!row?.metadata) return undefined;
      let parsed: Record<string, any> = {};
      try { parsed = JSON.parse(row.metadata); } catch { return undefined; }
      const SOURCE_LABEL: Record<string, string> = {
        pixel:            "Conversion pixel",
        shopify_webhook:  "Shopify webhook",
        stripe_webhook:   "Stripe webhook",
        mmp_postback:     "Mobile Measurement Partner",
        server_postback:  "Server postback",
        view_polling:     "Public-platform API polling",
        admin_credit:     "Manual admin credit",
        manual_test:      "Manual test event",
      };
      return SOURCE_LABEL[parsed.source as string] ?? undefined;
    } catch (err) {
      console.warn("resolveVerificationSource failed:", err);
      return undefined;
    }
  }

  /**
   * Process automatic payout when clipper completes campaign goals
   */
  private async processCompletionPayout(
    clipperId: string,
    campaignId: string,
    clipperCampaignId: string,
    completionReward: number,
    goalType: string,
    achievedValue: number
  ): Promise<void> {
    try {
      // Create a virtual tracking event for the completion reward.
      // eventType must come from the enum ["click","signup","view","conversion"]
      // — we use 'conversion' since a goal hit IS a conversion. The
      // completion-bonus marker lives in metadata, not the type column.
      const [completionEvent] = await db
        .insert(trackingEvents)
        .values({
          clipperId: clipperId,
          campaignId,
          clipperCampaignId,
          eventType: 'conversion',
          eventValue: achievedValue.toString(),
          rewardAmount: completionReward.toString(),
          status: 'verified', // Auto-verify completion bonuses
          metadata: JSON.stringify({
            type: 'goal_completion',
            goalType,
            achievedValue,
            isCompletionBonus: true,
          }),
        })
        .returning();

      // Process automatic payment through escrow system
      await this.escrowService.processAutomaticPayment(completionEvent.id);

      console.log(`💰 Completion payout processed for clipper ${clipperId}: $${completionReward} for ${goalType} completion`);
    } catch (error) {
      console.error('❌ Error processing completion payout:', error);
      // Don't throw error to prevent campaign completion from failing
      // Log error and continue - manual payout can be processed later
    }
  }
}

export const campaignCompletionService = new CampaignCompletionServiceImpl();