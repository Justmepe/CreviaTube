import { db } from "../../core/database/connection";
import { 
  users, 
  campaigns, 
  trackingEvents, 
  type User 
} from "../../../shared/schema";
import { eq, count, sql } from "drizzle-orm";

import { revenueAnalyticsService } from "./revenue-analytics.service.js";

export class AdminService {
  async getStats() {
    const [userStats] = await db
      .select({ 
        totalUsers: count(users.id),
      })
      .from(users);

    const [campaignStats] = await db
      .select({ 
        activeCampaigns: count(campaigns.id),
      })
      .from(campaigns)
      .where(eq(campaigns.status, "active"));

    const [eventStats] = await db
      .select({ 
        totalEvents: count(trackingEvents.id),
      })
      .from(trackingEvents);

    // Calculate total revenue (20% of campaign budgets)
    const [revenueStats] = await db
      .select({
        totalBudget: sql<number>`COALESCE(SUM(${campaigns.budget}), 0)`,
      })
      .from(campaigns);

    const totalRevenue = Number(revenueStats.totalBudget) * 0.2;

    // Get new users this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [newUserStats] = await db
      .select({
        newUsersThisWeek: count(users.id),
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${weekAgo}`);

    // Get real user distribution by role
    const userDistribution = await db
      .select({
        role: users.role,
        count: count(users.id)
      })
      .from(users)
      .groupBy(users.role);

    // Get real creator type distribution
    const creatorTypeDistribution = await db
      .select({
        userType: users.userType,
        count: count(users.id)
      })
      .from(users)
      .where(eq(users.role, "creator"))
      .groupBy(users.userType);

    // Get revenue analytics correlation data
    const revenueAnalytics = await revenueAnalyticsService.getRevenueVsUserGrowthCorrelation();

    return {
      totalUsers: userStats.totalUsers,
      activeCampaigns: campaignStats.activeCampaigns,
      totalEvents: eventStats.totalEvents,
      totalRevenue: Math.round(totalRevenue),
      newUsersThisWeek: newUserStats.newUsersThisWeek,
      systemHealth: "Healthy",
      uptime: 99.8,
      eventsToday: 0, // Could be calculated with date filtering
      userDistribution,
      creatorTypeDistribution,
      revenueAnalytics,
      monthlyStats: revenueAnalytics.monthlyCorrelation,
      platformSummary: revenueAnalytics.platformSummary
    };
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId));
    return result.rowCount! > 0;
  }

  async getTransactions() {
    // Return campaign-based transactions
    const campaignTransactions = await db
      .select({
        id: campaigns.id,
        type: sql<string>`'campaign_budget'`,
        amount: campaigns.budget,
        status: campaigns.status,
        user: campaigns.creatorId,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns);

    return campaignTransactions;
  }

  async getSystemHealth() {
    return {
      services: [
        { name: "Database", status: "healthy", uptime: "99.9%" },
        { name: "API", status: "healthy", uptime: "99.8%" },
        { name: "Payments", status: "healthy", uptime: "99.7%" },
      ],
      totalUptime: "99.8%",
      lastIncident: "None in the last 30 days",
    };
  }

  async getRecentActivity() {
    return [
      {
        type: "signup",
        user: "admin",
        description: "New user registered",
        timestamp: new Date().toISOString(),
      },
      {
        type: "campaign",
        user: "creator",
        description: "New campaign created",
        timestamp: new Date().toISOString(),
      },
    ];
  }
}