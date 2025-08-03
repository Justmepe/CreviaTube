import { db } from "../db";
import { campaigns, clipperCampaigns, trackingEvents } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

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
      // Get aggregated metrics for this clipper campaign
      const metrics = await db
        .select({
          eventType: trackingEvents.eventType,
          totalEvents: sql<number>`count(*)::int`,
          totalValue: sql<number>`sum(${trackingEvents.eventValue})::decimal`,
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
        switch (metric.eventType) {
          case 'view':
            progress.totalViews = metric.totalEvents;
            break;
          case 'click':
            progress.totalClicks = metric.totalEvents;
            break;
          case 'signup':
            progress.totalSignups = metric.totalEvents;
            break;
          case 'deposit':
            progress.totalDeposits = metric.totalEvents;
            break;
          case 'trade':
            progress.totalTrades = metric.totalEvents;
            break;
          case 'conversion':
            progress.totalConversions = metric.totalEvents;
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
   * Mark a clipper's campaign participation as complete
   */
  async markClipperCampaignComplete(
    clipperCampaignId: string, 
    goalType: string, 
    targetValue: number, 
    achievedValue: number
  ): Promise<void> {
    try {
      const completionMetrics = {
        goalReached: {
          type: goalType as any,
          target: targetValue,
          achieved: achievedValue,
          reachedAt: new Date().toISOString(),
        },
      };

      await db
        .update(clipperCampaigns)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          completionMetrics,
        })
        .where(eq(clipperCampaigns.id, clipperCampaignId));

      console.log(`✅ Clipper campaign ${clipperCampaignId} marked as complete. Goal: ${goalType} (${achievedValue}/${targetValue})`);
    } catch (error) {
      console.error('Error marking clipper campaign complete:', error);
      throw error;
    }
  }
}

export const campaignCompletionService = new CampaignCompletionServiceImpl();