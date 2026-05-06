import { db } from "../../db";
import { campaigns, clipperCampaigns, trackingEvents, users } from "../../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import * as React from "react";
import { EscrowService } from "./escrow-service";
import { sendEmail, APP_URL } from "../../lib/email";
import { CampaignGoalReached } from "../../emails/campaign-goal-reached";
import { CampaignCompletedCreator } from "../../emails/campaign-completed-creator";

export interface CampaignCompletionService {
  checkAndUpdateClipperCompletion(clipperCampaignId: string): Promise<boolean>;
  getClipperProgress(clipperCampaignId: string): Promise<ClipperProgress>;
  markClipperCampaignComplete(clipperCampaignId: string, goalType: string, targetValue: number, achievedValue: number): Promise<void>;
}

export interface ClipperProgress {
  totalViews: number;
  totalClicks: number;
  totalSignups: number;
  totalDeposits: number;
  totalTrades: number;
  totalConversions: number;
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
      
      // Check if primary goal is reached
      const primaryGoal = goals.primaryGoal;
      const targetValue = goals[`${primaryGoal}Goal`];
      
      if (!targetValue) {
        return false; // No target set for primary goal
      }

      let currentValue = 0;
      switch (primaryGoal) {
        case 'views':
          currentValue = progress.totalViews;
          break;
        case 'clicks':
          currentValue = progress.totalClicks;
          break;
        case 'signups':
          currentValue = progress.totalSignups;
          break;
        case 'deposits':
          currentValue = progress.totalDeposits;
          break;
        case 'trades':
          currentValue = progress.totalTrades;
          break;
        case 'conversions':
          currentValue = progress.totalConversions;
          break;
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
      // Aggregated metrics. Sum the per-event value with a fallback of 1 so an
      // event without an explicit eventValue still counts as one occurrence —
      // this matches how trackingService records views/clicks (value optional).
      const metrics = await db
        .select({
          eventType: trackingEvents.eventType,
          totalValue: sql<number>`sum(coalesce(${trackingEvents.eventValue}::numeric, 1))::int`,
        })
        .from(trackingEvents)
        .where(eq(trackingEvents.clipperCampaignId, clipperCampaignId))
        .groupBy(trackingEvents.eventType);

      // Initialize progress
      const progress: ClipperProgress = {
        totalViews: 0,
        totalClicks: 0,
        totalSignups: 0,
        totalDeposits: 0,
        totalTrades: 0,
        totalConversions: 0,
        isCompleted: false,
        goalProgress: null,
      };

      // Aggregate metrics by type
      metrics.forEach(metric => {
        const value = Number(metric.totalValue) || 0;
        switch (metric.eventType) {
          case 'view':
            progress.totalViews = value;
            break;
          case 'click':
            progress.totalClicks = value;
            break;
          case 'signup':
            progress.totalSignups = value;
            break;
          case 'deposit':
            progress.totalDeposits = value;
            break;
          case 'trade':
            progress.totalTrades = value;
            break;
          case 'conversion':
            progress.totalConversions = value;
            break;
        }
      });

      // Get campaign goals and completion status
      const [clipperCampaign] = await db
        .select({
          isCompleted: clipperCampaigns.isCompleted,
          campaignGoals: campaigns.campaignGoals,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      if (clipperCampaign) {
        progress.isCompleted = clipperCampaign.isCompleted;
        
        const goals = clipperCampaign.campaignGoals as any;
        if (goals && goals.primaryGoal) {
          const goalType = goals.primaryGoal;
          const target = goals[`${goalType}Goal`];
          
          if (target) {
            let current = 0;
            switch (goalType) {
              case 'views':
                current = progress.totalViews;
                break;
              case 'clicks':
                current = progress.totalClicks;
                break;
              case 'signups':
                current = progress.totalSignups;
                break;
              case 'deposits':
                current = progress.totalDeposits;
                break;
              case 'trades':
                current = progress.totalTrades;
                break;
              case 'conversions':
                current = progress.totalConversions;
                break;
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

      // Calculate completion reward - fixed bonus for completing goal
      const rewardRates = JSON.parse(clipperCampaign.rewardRates || "{}");
      const baseReward = parseFloat(rewardRates[goalType] || "10"); // Base reward per goal type
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
          }),
          dedupeKey: `campaign_completed_creator:${opts.clipperCampaignId}`,
          userId: creator.id,
        });
      }
    } catch (err) {
      console.error("notifyCampaignCompletion failed:", err);
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
      // Create a virtual tracking event for the completion reward
      const [completionEvent] = await db
        .insert(trackingEvents)
        .values({
          clipperId: clipperId,
          campaignId,
          clipperCampaignId,
          eventType: 'completion_bonus',
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