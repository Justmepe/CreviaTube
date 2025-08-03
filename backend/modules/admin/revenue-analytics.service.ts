import { db } from "../../db.js";
import { users, campaigns, trackingEvents, budgetEscrow, payouts } from "../../../shared/schema.js";
import { sql, eq, gte, and, desc, count, sum } from "drizzle-orm";

export class RevenueAnalyticsService {
  async getRevenueVsUserGrowthCorrelation() {
    // Get monthly data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Calculate monthly revenue and user growth from real database data
    const monthlyData = await this.getMonthlyRevenueAndUserData(sixMonthsAgo);
    
    // Calculate platform analytics summary from real data
    const platformSummary = await this.getPlatformAnalyticsSummary();
    
    // Calculate creator type distribution from real data  
    const creatorTypeDistribution = await this.getCreatorTypeDistribution();

    return {
      monthlyCorrelation: monthlyData,
      platformSummary,
      creatorTypeDistribution
    };
  }

  private async getMonthlyRevenueAndUserData(startDate: Date) {
    // Generate month labels
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      months.push({
        name: monthName,
        date: monthDate,
        nextDate: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
      });
    }

    const monthlyData = await Promise.all(
      months.map(async (month) => {
        // Calculate real revenue from campaign budgets and escrow for this month
        const [revenueData] = await db
          .select({
            totalBudget: sql<number>`COALESCE(SUM(${campaigns.budget}), 0)`,
            campaignCount: count(campaigns.id)
          })
          .from(campaigns)
          .where(
            and(
              gte(campaigns.createdAt, month.date),
              gte(month.nextDate, campaigns.createdAt)
            )
          );

        // Get new users registered in this month
        const [userGrowthData] = await db
          .select({
            newUsers: count(users.id)
          })
          .from(users)
          .where(
            and(
              gte(users.createdAt, month.date),
              gte(month.nextDate, users.createdAt)
            )
          );

        // Calculate 20% platform revenue from total campaign budgets
        const totalBudget = Number(revenueData.totalBudget) || 0;
        const platformRevenue = totalBudget * 0.2;
        
        // Calculate revenue per user
        const newUsers = userGrowthData.newUsers || 0;
        const revenuePerUser = newUsers > 0 ? platformRevenue / newUsers : 0;

        return {
          month: month.name,
          revenue: Math.round(platformRevenue).toLocaleString(),
          newUsers: `+${newUsers}`,
          revenuePerUser: `$${Math.round(revenuePerUser).toLocaleString()}`,
          campaigns: revenueData.campaignCount || 0,
          // Raw numbers for calculations
          rawRevenue: platformRevenue,
          rawNewUsers: newUsers,
          rawRevenuePerUser: revenuePerUser
        };
      })
    );

    return monthlyData;
  }

  private async getPlatformAnalyticsSummary() {
    // Calculate average monthly revenue per user from real data
    const [totalStats] = await db
      .select({
        totalUsers: count(users.id),
        totalRevenue: sql<number>`COALESCE(SUM(${campaigns.budget}) * 0.2, 0)`
      })
      .from(campaigns)
      .leftJoin(users, eq(campaigns.creatorId, users.id));

    // Calculate campaign success rate from real tracking events
    const [campaignStats] = await db
      .select({
        totalCampaigns: count(campaigns.id),
        activeCampaigns: sql<number>`COALESCE(COUNT(CASE WHEN ${campaigns.status} = 'active' THEN 1 END), 0)`,
        completedCampaigns: sql<number>`COALESCE(COUNT(CASE WHEN ${campaigns.status} = 'completed' THEN 1 END), 0)`
      })
      .from(campaigns);

    const totalCampaigns = campaignStats.totalCampaigns || 1;
    const successfulCampaigns = campaignStats.completedCampaigns || 0;
    const campaignSuccessRate = (successfulCampaigns / totalCampaigns) * 100;

    // Calculate average monthly revenue per user
    const totalUsers = totalStats.totalUsers || 1;
    const totalRevenue = Number(totalStats.totalRevenue) || 0;
    const avgMonthlyRevPerUser = totalRevenue / totalUsers;

    return {
      avgMonthlyRevPerUser: Math.round(avgMonthlyRevPerUser),
      campaignSuccessRate: Math.round(campaignSuccessRate * 10) / 10
    };
  }

  private async getCreatorTypeDistribution() {
    // Get real creator type distribution from database
    const creatorDistribution = await db
      .select({
        userType: users.userType,
        count: count(users.id)
      })
      .from(users)
      .where(eq(users.role, "creator"))
      .groupBy(users.userType);

    // Calculate total creators for percentage calculation
    const totalCreators = creatorDistribution.reduce((sum, item) => sum + item.count, 0);

    return creatorDistribution.map(item => ({
      type: item.userType || 'undefined',
      count: item.count,
      percentage: totalCreators > 0 ? Math.round((item.count / totalCreators) * 100) : 0,
      displayName: this.getCreatorTypeDisplayName(item.userType)
    }));
  }

  private getCreatorTypeDisplayName(userType: string | null): string {
    switch (userType) {
      case 'trader_creator':
        return 'Trading Educators';
      case 'influencer':
        return 'Social Influencers';
      case 'entrepreneur':
        return 'Entrepreneurs';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Other';
    }
  }

  async getMonthlyTrendAnalysis() {
    // Calculate growth trends from real data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await this.getMonthlyRevenueAndUserData(sixMonthsAgo);
    
    if (monthlyData.length < 2) {
      return {
        revenueGrowthTrend: 0,
        userGrowthTrend: 0,
        correlation: 0
      };
    }

    // Calculate growth trends
    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    
    const revenueGrowthTrend = previousMonth.rawRevenue > 0 
      ? ((currentMonth.rawRevenue - previousMonth.rawRevenue) / previousMonth.rawRevenue) * 100
      : 0;
      
    const userGrowthTrend = previousMonth.rawNewUsers > 0
      ? ((currentMonth.rawNewUsers - previousMonth.rawNewUsers) / previousMonth.rawNewUsers) * 100
      : 0;

    // Calculate correlation coefficient between revenue and user growth
    const revenues = monthlyData.map(m => m.rawRevenue);
    const users = monthlyData.map(m => m.rawNewUsers);
    const correlation = this.calculateCorrelation(revenues, users);

    return {
      revenueGrowthTrend: Math.round(revenueGrowthTrend * 10) / 10,
      userGrowthTrend: Math.round(userGrowthTrend * 10) / 10,
      correlation: Math.round(correlation * 100) / 100
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = y.reduce((a, b) => a + b) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / (denomX * denomY);
  }
}

export const revenueAnalyticsService = new RevenueAnalyticsService();