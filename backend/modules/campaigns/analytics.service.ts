import { db } from "../../db";
import { campaigns, clipperCampaigns, trackingEvents, users } from "../../../shared/schema";
import { eq, and, gte, lte, desc, count, sum, avg } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface CampaignAnalytics {
  overview: {
    totalSpent: number;
    remainingBudget: number;
    burnRate: number;
    estimatedDaysLeft: number;
    roi: number;
    conversionRate: number;
  };
  performance: {
    totalViews: number;
    totalClicks: number;
    totalSignups: number;
    totalDeposits: number;
    totalTrades: number;
    totalConversions: number;
    clickThroughRate: number;
    signupRate: number;
    depositRate: number;
  };
  clippers: {
    totalClippers: number;
    activeClippers: number;
    completedClippers: number;
    avgPerformance: number;
    topPerformers: Array<{
      clipperId: string;
      clipperName: string;
      totalRewards: number;
      totalViews: number;
      totalClicks: number;
      conversionRate: number;
    }>;
  };
  timeline: {
    dailySpending: Array<{
      date: string;
      spending: number;
      rewards: number;
      clippers: number;
    }>;
    goalProgress: Array<{
      goalType: string;
      target: number;
      achieved: number;
      progress: number;
    }>;
  };
  budgetMetrics: {
    totalSpent: number;
    remainingBudget: number;
    burnRate: number;
    estimatedDaysLeft: number;
    clipperCount: number;
    avgSpendPerClipper: number;
    recentTransactions: Array<{
      id: string;
      amount: number;
      type: "reward" | "payout" | "escrow_release";
      description: string;
      timestamp: string;
    }>;
  };
}

export class CampaignAnalyticsService {
  /**
   * Get comprehensive campaign analytics
   */
  async getCampaignAnalytics(campaignId: string, timeframe: "24h" | "7d" | "30d" = "7d"): Promise<CampaignAnalytics> {
    try {
      const timeframeDays = timeframe === "24h" ? 1 : timeframe === "7d" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Get all campaign data in parallel
      const [
        overview,
        performance,
        clippersData,
        timeline,
        budgetMetrics
      ] = await Promise.all([
        this.getCampaignOverview(campaignId, campaign, timeframeDays),
        this.getCampaignPerformance(campaignId, startDate),
        this.getClippersAnalytics(campaignId, startDate),
        this.getTimelineAnalytics(campaignId, timeframeDays),
        this.getBudgetMetrics(campaignId, timeframe)
      ]);

      return {
        overview,
        performance,
        clippers: clippersData,
        timeline,
        budgetMetrics
      };

    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      throw new Error('Failed to fetch campaign analytics');
    }
  }

  /**
   * Get campaign overview metrics
   */
  private async getCampaignOverview(campaignId: string, campaign: any, timeframeDays: number) {
    const budget = parseFloat(campaign.budget);
    const budgetUsed = parseFloat(campaign.budgetUsed);
    const remainingBudget = budget - budgetUsed;
    
    // Calculate burn rate (spending per day)
    const daysActive = Math.max(1, Math.floor((new Date().getTime() - new Date(campaign.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const burnRate = budgetUsed / daysActive;
    
    // Estimate days left
    const estimatedDaysLeft = burnRate > 0 ? Math.floor(remainingBudget / burnRate) : Infinity;
    
    // Calculate ROI (simplified - total value generated vs spent)
    const [performanceData] = await db
      .select({
        totalSignups: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'signup' THEN 1 END), 0)`,
        totalDeposits: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'deposit' THEN 1 END), 0)`,
        totalConversions: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'conversion' THEN 1 END), 0)`,
        totalClicks: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'click' THEN 1 END), 0)`,
      })
      .from(trackingEvents)
      .where(eq(trackingEvents.campaignId, campaignId));

    // Estimate value (signup worth $50, deposit worth $100, conversion worth $200)
    const estimatedValue = 
      (performanceData?.totalSignups || 0) * 50 +
      (performanceData?.totalDeposits || 0) * 100 +
      (performanceData?.totalConversions || 0) * 200;
    
    const roi = budgetUsed > 0 ? ((estimatedValue - budgetUsed) / budgetUsed) * 100 : 0;
    const conversionRate = (performanceData?.totalClicks || 0) > 0 ? 
      ((performanceData?.totalSignups || 0) / (performanceData?.totalClicks || 0)) * 100 : 0;

    return {
      totalSpent: budgetUsed,
      remainingBudget,
      burnRate,
      estimatedDaysLeft: estimatedDaysLeft === Infinity ? 0 : estimatedDaysLeft,
      roi,
      conversionRate
    };
  }

  /**
   * Get campaign performance metrics
   */
  private async getCampaignPerformance(campaignId: string, startDate: Date) {
    const [metrics] = await db
      .select({
        totalViews: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'view' THEN 1 END), 0)`,
        totalClicks: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'click' THEN 1 END), 0)`,
        totalSignups: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'signup' THEN 1 END), 0)`,
        totalDeposits: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'deposit' THEN 1 END), 0)`,
        totalTrades: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'trade' THEN 1 END), 0)`,
        totalConversions: sql<number>`COALESCE(COUNT(CASE WHEN ${trackingEvents.eventType} = 'conversion' THEN 1 END), 0)`,
      })
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.campaignId, campaignId),
          gte(trackingEvents.createdAt, startDate)
        )
      );

    const clickThroughRate = (metrics?.totalViews || 0) > 0 ? 
      ((metrics?.totalClicks || 0) / (metrics?.totalViews || 0)) * 100 : 0;
    
    const signupRate = (metrics?.totalClicks || 0) > 0 ? 
      ((metrics?.totalSignups || 0) / (metrics?.totalClicks || 0)) * 100 : 0;
    
    const depositRate = (metrics?.totalSignups || 0) > 0 ? 
      ((metrics?.totalDeposits || 0) / (metrics?.totalSignups || 0)) * 100 : 0;

    return {
      totalViews: metrics?.totalViews || 0,
      totalClicks: metrics?.totalClicks || 0,
      totalSignups: metrics?.totalSignups || 0,
      totalDeposits: metrics?.totalDeposits || 0,
      totalTrades: metrics?.totalTrades || 0,
      totalConversions: metrics?.totalConversions || 0,
      clickThroughRate,
      signupRate,
      depositRate
    };
  }

  /**
   * Get clippers analytics
   */
  private async getClippersAnalytics(campaignId: string, startDate: Date) {
    // Get clipper counts
    const [clipperCounts] = await db
      .select({
        totalClippers: sql<number>`COUNT(*)`,
        activeClippers: sql<number>`COUNT(CASE WHEN ${clipperCampaigns.isApproved} = true AND ${clipperCampaigns.isCompleted} = false THEN 1 END)`,
        completedClippers: sql<number>`COUNT(CASE WHEN ${clipperCampaigns.isCompleted} = true THEN 1 END)`,
      })
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.campaignId, campaignId));

    // Get top performers
    const topPerformers = await db
      .select({
        clipperId: clipperCampaigns.clipperId,
        clipperName: users.fullName,
        totalRewards: sql<number>`COALESCE(SUM(${trackingEvents.rewardAmount}), 0)`,
        totalViews: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'view' THEN 1 END)`,
        totalClicks: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'click' THEN 1 END)`,
        totalSignups: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'signup' THEN 1 END)`,
      })
      .from(clipperCampaigns)
      .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
      .leftJoin(trackingEvents, and(
        eq(trackingEvents.campaignId, campaignId),
        eq(trackingEvents.clipperId, clipperCampaigns.clipperId),
        gte(trackingEvents.createdAt, startDate)
      ))
      .where(eq(clipperCampaigns.campaignId, campaignId))
      .groupBy(clipperCampaigns.clipperId, users.fullName)
      .orderBy(desc(sql`SUM(${trackingEvents.rewardAmount})`))
      .limit(5);

    // Calculate average performance
    const avgPerformance = topPerformers.length > 0 ? 
      topPerformers.reduce((sum, p) => sum + p.totalRewards, 0) / topPerformers.length : 0;

    return {
      totalClippers: clipperCounts?.totalClippers || 0,
      activeClippers: clipperCounts?.activeClippers || 0,
      completedClippers: clipperCounts?.completedClippers || 0,
      avgPerformance,
      topPerformers: topPerformers.map(p => ({
        clipperId: p.clipperId,
        clipperName: p.clipperName,
        totalRewards: p.totalRewards,
        totalViews: p.totalViews,
        totalClicks: p.totalClicks,
        conversionRate: p.totalClicks > 0 ? (p.totalSignups / p.totalClicks) * 100 : 0
      }))
    };
  }

  /**
   * Get timeline analytics
   */
  private async getTimelineAnalytics(campaignId: string, timeframeDays: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Get daily spending data
    const dailySpending = await db
      .select({
        date: sql<string>`DATE(${trackingEvents.createdAt})`,
        spending: sql<number>`COALESCE(SUM(${trackingEvents.rewardAmount}), 0)`,
        rewards: sql<number>`COUNT(*)`,
        clippers: sql<number>`COUNT(DISTINCT ${trackingEvents.clipperId})`
      })
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.campaignId, campaignId),
          gte(trackingEvents.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${trackingEvents.createdAt})`)
      .orderBy(sql`DATE(${trackingEvents.createdAt})`);

    // Get campaign goals and progress
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    const goals = campaign.campaignGoals as any;
    const goalProgress = [];

    if (goals) {
      const [currentMetrics] = await db
        .select({
          totalViews: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'view' THEN 1 END)`,
          totalClicks: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'click' THEN 1 END)`,
          totalSignups: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'signup' THEN 1 END)`,
          totalDeposits: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'deposit' THEN 1 END)`,
          totalTrades: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'trade' THEN 1 END)`,
          totalConversions: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'conversion' THEN 1 END)`,
        })
        .from(trackingEvents)
        .where(eq(trackingEvents.campaignId, campaignId));

      const goalTypes: Array<'views' | 'clicks' | 'signups' | 'deposits' | 'trades' | 'conversions'> = ['views', 'clicks', 'signups', 'deposits', 'trades', 'conversions'];
      
      goalTypes.forEach(goalType => {
        const targetKey = `${goalType}Goal` as keyof typeof goals;
        const target = goals[targetKey];
        
        if (target && target > 0) {
          const metricKey = `total${goalType.charAt(0).toUpperCase() + goalType.slice(1)}` as keyof typeof currentMetrics;
          const achieved = currentMetrics?.[metricKey] || 0;
          goalProgress.push({
            goalType,
            target,
            achieved: achieved as number,
            progress: (achieved as number / target) * 100
          });
        }
      });
    }

    return {
      dailySpending: dailySpending.map(d => ({
        date: d.date,
        spending: d.spending,
        rewards: d.rewards,
        clippers: d.clippers
      })),
      goalProgress
    };
  }

  /**
   * Get budget metrics for budget tracker
   */
  async getBudgetMetrics(campaignId: string, timeframe: "24h" | "7d" | "30d"): Promise<CampaignAnalytics['budgetMetrics']> {
    const timeframeDays = timeframe === "24h" ? 1 : timeframe === "7d" ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Get campaign and recent spending
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: trackingEvents.id,
        amount: trackingEvents.rewardAmount,
        eventType: trackingEvents.eventType,
        createdAt: trackingEvents.createdAt,
        clipperName: users.fullName
      })
      .from(trackingEvents)
      .innerJoin(users, eq(trackingEvents.clipperId, users.id))
      .where(
        and(
          eq(trackingEvents.campaignId, campaignId),
          gte(trackingEvents.createdAt, startDate)
        )
      )
      .orderBy(desc(trackingEvents.createdAt))
      .limit(10);

    // Get clipper count
    const [clipperData] = await db
      .select({
        clipperCount: sql<number>`COUNT(DISTINCT ${trackingEvents.clipperId})`,
        totalSpent: sql<number>`COALESCE(SUM(${trackingEvents.rewardAmount}), 0)`
      })
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.campaignId, campaignId),
          gte(trackingEvents.createdAt, startDate)
        )
      );

    const budget = parseFloat(campaign.budget);
    const budgetUsed = parseFloat(campaign.budgetUsed);
    const remainingBudget = budget - budgetUsed;
    
    // Calculate burn rate
    const daysActive = Math.max(1, timeframeDays);
    const burnRate = (clipperData?.totalSpent || 0) / daysActive;
    const estimatedDaysLeft = burnRate > 0 ? Math.floor(remainingBudget / burnRate) : 0;

    const avgSpendPerClipper = (clipperData?.clipperCount || 0) > 0 ? 
      (clipperData?.totalSpent || 0) / (clipperData?.clipperCount || 0) : 0;

    return {
      totalSpent: clipperData?.totalSpent || 0,
      remainingBudget,
      burnRate,
      estimatedDaysLeft,
      clipperCount: clipperData?.clipperCount || 0,
      avgSpendPerClipper,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        amount: t.amount || 0,
        type: "reward" as const,
        description: `${t.eventType} reward - ${t.clipperName}`,
        timestamp: t.createdAt.toISOString()
      }))
    };
  }

  /**
   * Get goal-based completion triggers
   */
  async checkGoalCompletionTriggers(campaignId: string): Promise<{
    triggeredClippers: Array<{
      clipperCampaignId: string;
      clipperId: string;
      goalType: string;
      targetValue: number;
      achievedValue: number;
      completedAt: Date;
    }>;
  }> {
    try {
      // Get campaign goals
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign || !campaign.campaignGoals) {
        return { triggeredClippers: [] };
      }

      const goals = campaign.campaignGoals as any;
      const primaryGoal = goals.primaryGoal;
      const targetValue = goals[`${primaryGoal}Goal`];

      if (!primaryGoal || !targetValue) {
        return { triggeredClippers: [] };
      }

      // Get all active clipper campaigns for this campaign
      const activeClippers = await db
        .select({
          id: clipperCampaigns.id,
          clipperId: clipperCampaigns.clipperId,
        })
        .from(clipperCampaigns)
        .where(
          and(
            eq(clipperCampaigns.campaignId, campaignId),
            eq(clipperCampaigns.isApproved, true),
            eq(clipperCampaigns.isCompleted, false)
          )
        );

      const triggeredClippers = [];

      // Check each clipper's progress
      for (const clipper of activeClippers) {
        const [progress] = await db
          .select({
            totalViews: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'view' THEN 1 END)`,
            totalClicks: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'click' THEN 1 END)`,
            totalSignups: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'signup' THEN 1 END)`,
            totalDeposits: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'deposit' THEN 1 END)`,
            totalTrades: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'trade' THEN 1 END)`,
            totalConversions: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'conversion' THEN 1 END)`,
          })
          .from(trackingEvents)
          .where(
            and(
              eq(trackingEvents.campaignId, campaignId),
              eq(trackingEvents.clipperId, clipper.clipperId)
            )
          );

        let achievedValue = 0;
        switch (primaryGoal) {
          case 'views':
            achievedValue = progress?.totalViews || 0;
            break;
          case 'clicks':
            achievedValue = progress?.totalClicks || 0;
            break;
          case 'signups':
            achievedValue = progress?.totalSignups || 0;
            break;
          case 'deposits':
            achievedValue = progress?.totalDeposits || 0;
            break;
          case 'trades':
            achievedValue = progress?.totalTrades || 0;
            break;
          case 'conversions':
            achievedValue = progress?.totalConversions || 0;
            break;
        }

        // Check if goal is reached
        if (achievedValue >= targetValue) {
          triggeredClippers.push({
            clipperCampaignId: clipper.id,
            clipperId: clipper.clipperId,
            goalType: primaryGoal as string,
            targetValue: targetValue as number,
            achievedValue,
            completedAt: new Date()
          });
        }
      }

      return { triggeredClippers };

    } catch (error) {
      console.error('Error checking goal completion triggers:', error);
      return { triggeredClippers: [] };
    }
  }
}