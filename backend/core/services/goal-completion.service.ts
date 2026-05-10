import { db } from "../../db";
import { campaigns, clipperCampaigns, trackingEvents, users } from "../../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { EscrowService } from "./escrow-service";

// Most campaign-goal targets live at JSON key `${goalType}Goal`. Two of
// the Phase 4 goal types use camelCase keys instead of literal
// snake_case_concat to keep the JSON readable. Mirror these in
// campaign-completion.ts and shared/goal-options.ts when adding new goals.
const TARGET_KEY_BY_GOAL: Record<string, string> = {
  code_redemptions: 'codeRedemptionsGoal',
  ugc_volume: 'ugcVolumeGoal',
};
function goalTargetKey(goalType: string): string {
  return TARGET_KEY_BY_GOAL[goalType] || `${goalType}Goal`;
}

// Goal type → reward-rate key (what the campaigner configured the per-event
// payout under). Mirrors campaign-completion.ts and the form's GOAL_TO_RATE_KEY.
const GOAL_TO_RATE_KEY: Record<string, string> = {
  views: 'view',
  clicks: 'click',
  signups: 'signup',
  conversions: 'conversion',
  follows: 'follow',
  subscribes: 'subscribe',
  installs: 'install',
  revenue: 'purchase',
  leads: 'lead',
  code_redemptions: 'codeRedemption',
  ugc_volume: 'post',
};

export interface GoalCompletionResult {
  success: boolean;
  completedClippers: Array<{
    clipperCampaignId: string;
    clipperId: string;
    clipperName: string;
    goalType: string;
    targetValue: number;
    achievedValue: number;
    rewardAmount: number;
    completedAt: Date;
  }>;
  errors: string[];
}

export class GoalCompletionService {
  private escrowService: EscrowService;

  constructor() {
    this.escrowService = new EscrowService();
  }

  /**
   * Check all active campaigns for goal completion triggers
   */
  async processGoalCompletions(): Promise<GoalCompletionResult> {
    const completedClippers: GoalCompletionResult['completedClippers'] = [];
    const errors: string[] = [];

    try {
      // Get all active campaigns with goals
      const activeCampaigns = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          campaignGoals: campaigns.campaignGoals,
          rewardRates: campaigns.rewardRates,
        })
        .from(campaigns)
        .where(eq(campaigns.status, "active"));

      for (const campaign of activeCampaigns) {
        try {
          const result = await this.processCampaignGoalCompletions(campaign.id);
          completedClippers.push(...result.completedClippers);
          errors.push(...result.errors);
        } catch (error) {
          console.error(`Error processing campaign ${campaign.id}:`, error);
          errors.push(`Campaign ${campaign.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        completedClippers,
        errors
      };

    } catch (error) {
      console.error('Error in processGoalCompletions:', error);
      return {
        success: false,
        completedClippers: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Process goal completions for a specific campaign
   */
  async processCampaignGoalCompletions(campaignId: string): Promise<GoalCompletionResult> {
    const completedClippers: GoalCompletionResult['completedClippers'] = [];
    const errors: string[] = [];

    try {
      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign || !campaign.campaignGoals) {
        return { success: true, completedClippers: [], errors: [] };
      }

      const goals = campaign.campaignGoals as any;
      const primaryGoal = goals.primaryGoal;
      const targetValue = goals[goalTargetKey(primaryGoal)];

      if (!primaryGoal || !targetValue) {
        return { success: true, completedClippers: [], errors: [] };
      }

      // Get all active clipper campaigns
      const activeClippers = await db
        .select({
          id: clipperCampaigns.id,
          clipperId: clipperCampaigns.clipperId,
          clipperName: users.fullName,
        })
        .from(clipperCampaigns)
        .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
        .where(
          and(
            eq(clipperCampaigns.campaignId, campaignId),
            eq(clipperCampaigns.isApproved, true),
            eq(clipperCampaigns.isCompleted, false)
          )
        );

      // Check each clipper's progress
      for (const clipper of activeClippers) {
        try {
          const achievedValue = await this.getClipperProgress(campaignId, clipper.clipperId, primaryGoal);
          
          if (achievedValue >= targetValue) {
            // Calculate reward amount
            const rewardAmount = await this.calculateCompletionReward(campaign, achievedValue, primaryGoal);
            
            // Mark clipper as completed
            await this.markClipperCompleted(clipper.id, primaryGoal, targetValue, achievedValue);
            
            // Process payout
            await this.processClipperPayout(clipper.clipperId, campaignId, rewardAmount);

            completedClippers.push({
              clipperCampaignId: clipper.id,
              clipperId: clipper.clipperId,
              clipperName: clipper.clipperName,
              goalType: primaryGoal,
              targetValue,
              achievedValue,
              rewardAmount,
              completedAt: new Date()
            });
          }
        } catch (error) {
          console.error(`Error processing clipper ${clipper.clipperId}:`, error);
          errors.push(`Clipper ${clipper.clipperName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        completedClippers,
        errors
      };

    } catch (error) {
      console.error(`Error processing campaign ${campaignId}:`, error);
      return {
        success: false,
        completedClippers: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get clipper's progress for a specific goal type. Most goals are
   * count-based (rows of a given event_type); revenue is value-based
   * (sum of event_value over purchase events); ugc_volume is binary
   * (this clipper's submission is approved + has a verified post URL).
   */
  private async getClipperProgress(campaignId: string, clipperId: string, goalType: string): Promise<number> {
    // ugc_volume doesn't read tracking events — verification lives on the
    // submission record.
    if (goalType === 'ugc_volume') {
      const [row] = await db
        .select({
          applicationStatus: clipperCampaigns.applicationStatus,
          postUrl: clipperCampaigns.postUrl,
        })
        .from(clipperCampaigns)
        .where(
          and(
            eq(clipperCampaigns.campaignId, campaignId),
            eq(clipperCampaigns.clipperId, clipperId),
          ),
        );
      return row?.applicationStatus === 'approved' && row.postUrl ? 1 : 0;
    }

    // Map goal type → the event_type whose rows we count, plus whether
    // we count rows or sum event_value (revenue is the only sum-based goal).
    const goalToEventType: Record<string, string> = {
      views: 'view',
      clicks: 'click',
      signups: 'signup',
      conversions: 'conversion',
      follows: 'follow',
      subscribes: 'subscribe',
      installs: 'install',
      leads: 'lead',
      code_redemptions: 'code_redemption',
      revenue: 'purchase',
    };
    const eventType = goalToEventType[goalType];
    if (!eventType) return 0;

    const [progress] = await db
      .select({
        // sum(coalesce(value,1)) so single-row writes (eventValue defaults
        // to "1") and delta-bearing writes (e.g., view-polling) both add
        // up to the right count. See the matching aggregation in
        // campaign-completion.ts:getClipperProgress for context.
        countSum: sql<number>`coalesce(sum(coalesce(${trackingEvents.eventValue}::numeric, 1))::int, 0)`,
        valueSum: sql<number>`coalesce(sum(${trackingEvents.eventValue}::numeric), 0)::numeric`,
      })
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.campaignId, campaignId),
          eq(trackingEvents.clipperId, clipperId),
          eq(trackingEvents.eventType, eventType as any),
          // Exclude bot-flagged events from qualification. Convention
          // matches getBotDetectionStats; NULL rows (rare) get excluded
          // too, which is the conservative choice.
          eq(trackingEvents.flaggedAsBot, false),
          // Exclude synthetic events fired by the integration-test tool.
          // metadata is text, plain LIKE so a malformed row can't crash
          // the query.
          sql`(${trackingEvents.metadata} IS NULL OR ${trackingEvents.metadata} NOT LIKE '%"test":true%')`,
        ),
      );

    if (goalType === 'revenue') {
      return Number(progress?.valueSum) || 0;
    }
    return Number(progress?.countSum) || 0;
  }

  /**
   * Calculate reward amount for completed goal
   */
  private async calculateCompletionReward(campaign: any, achievedValue: number, goalType: string): Promise<number> {
    try {
      const rewardRates = JSON.parse(campaign.rewardRates);
      // goalType is plural ("views"/"revenue"); reward rates are keyed by
      // the singular event type ("view"/"purchase"). Map before lookup or
      // we silently fall through to 0 for every Phase 4 goal.
      const rateKey = GOAL_TO_RATE_KEY[goalType] || goalType;
      const baseReward = parseFloat(rewardRates[rateKey] || "0");

      // Base reward calculation. For revenue goals achievedValue is a $
      // amount, not a count — multiplying by per-event rate would double-
      // count. Treat the configured rate as a percentage of revenue
      // instead. For all other goals, achievedValue * per-event rate.
      let totalReward =
        goalType === 'revenue'
          ? achievedValue * baseReward
          : baseReward * achievedValue;

      // Add completion bonus (10% of accumulated rewards)
      const completionBonus = totalReward * 0.10;
      totalReward += completionBonus;

      return Math.round(totalReward * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating completion reward:', error);
      return 0;
    }
  }

  /**
   * Mark clipper campaign as completed
   */
  private async markClipperCompleted(
    clipperCampaignId: string,
    goalType: string,
    targetValue: number,
    achievedValue: number
  ): Promise<void> {
    await db
      .update(clipperCampaigns)
      .set({
        isCompleted: true,
        completedAt: new Date()
      })
      .where(eq(clipperCampaigns.id, clipperCampaignId));
  }

  /**
   * Process automatic payout for completed clipper
   */
  private async processClipperPayout(
    clipperId: string,
    campaignId: string,
    rewardAmount: number
  ): Promise<void> {
    try {
      // Basic payout processing - would integrate with actual escrow service
      console.log(`✅ Processing payout of $${rewardAmount} for clipper ${clipperId} in campaign ${campaignId}`);
      
      // TODO: Integrate with actual escrow service for payout processing
      // await this.escrowService.processClipperPayout(clipperId, campaignId, rewardAmount);
      
    } catch (error) {
      console.error(`❌ Failed to process payout for clipper ${clipperId}:`, error);
      throw error;
    }
  }

  /**
   * Get completion statistics for a campaign
   */
  async getCampaignCompletionStats(campaignId: string): Promise<{
    totalClippers: number;
    activeClippers: number;
    completedClippers: number;
    averageProgress: number;
    completionRate: number;
    totalRewardsPaid: number;
  }> {
    try {
      const [stats] = await db
        .select({
          totalClippers: sql<number>`COUNT(*)`,
          activeClippers: sql<number>`COUNT(CASE WHEN ${clipperCampaigns.isApproved} = true AND ${clipperCampaigns.isCompleted} = false THEN 1 END)`,
          completedClippers: sql<number>`COUNT(CASE WHEN ${clipperCampaigns.isCompleted} = true THEN 1 END)`,
          totalRewardsPaid: sql<number>`COALESCE(SUM(CASE WHEN ${clipperCampaigns.isCompleted} = true THEN 100 ELSE 0 END), 0)`,
        })
        .from(clipperCampaigns)
        .where(eq(clipperCampaigns.campaignId, campaignId));

      const totalClippers = stats?.totalClippers || 0;
      const completedClippers = stats?.completedClippers || 0;
      const completionRate = totalClippers > 0 ? (completedClippers / totalClippers) * 100 : 0;

      return {
        totalClippers,
        activeClippers: stats?.activeClippers || 0,
        completedClippers,
        averageProgress: 0, // Could be calculated based on current progress
        completionRate,
        totalRewardsPaid: stats?.totalRewardsPaid || 0
      };
    } catch (error) {
      console.error('Error getting completion stats:', error);
      return {
        totalClippers: 0,
        activeClippers: 0,
        completedClippers: 0,
        averageProgress: 0,
        completionRate: 0,
        totalRewardsPaid: 0
      };
    }
  }

  /**
   * Manual trigger for checking specific clipper completion
   */
  async checkClipperCompletion(clipperCampaignId: string): Promise<{
    completed: boolean;
    clipperName?: string;
    goalType?: string;
    achievedValue?: number;
    targetValue?: number;
    rewardAmount?: number;
  }> {
    try {
      // Get clipper campaign details
      const [clipperCampaign] = await db
        .select({
          id: clipperCampaigns.id,
          campaignId: clipperCampaigns.campaignId,
          clipperId: clipperCampaigns.clipperId,
          isCompleted: clipperCampaigns.isCompleted,
          clipperName: users.fullName,
          campaignGoals: campaigns.campaignGoals,
          rewardRates: campaigns.rewardRates,
        })
        .from(clipperCampaigns)
        .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      if (!clipperCampaign || clipperCampaign.isCompleted) {
        return { completed: clipperCampaign?.isCompleted || false };
      }

      const goals = clipperCampaign.campaignGoals as any;
      if (!goals || !goals.primaryGoal) {
        return { completed: false };
      }

      const primaryGoal = goals.primaryGoal;
      const targetValue = goals[goalTargetKey(primaryGoal)];

      if (!targetValue) {
        return { completed: false };
      }

      const achievedValue = await this.getClipperProgress(
        clipperCampaign.campaignId,
        clipperCampaign.clipperId,
        primaryGoal
      );

      if (achievedValue >= targetValue) {
        // Process completion
        const result = await this.processCampaignGoalCompletions(clipperCampaign.campaignId);
        const completedClipper = result.completedClippers.find(c => c.clipperCampaignId === clipperCampaignId);

        return {
          completed: true,
          clipperName: clipperCampaign.clipperName,
          goalType: primaryGoal,
          achievedValue,
          targetValue,
          rewardAmount: completedClipper?.rewardAmount || 0
        };
      }

      return {
        completed: false,
        clipperName: clipperCampaign.clipperName,
        goalType: primaryGoal,
        achievedValue,
        targetValue
      };

    } catch (error) {
      console.error('Error checking clipper completion:', error);
      return { completed: false };
    }
  }
}