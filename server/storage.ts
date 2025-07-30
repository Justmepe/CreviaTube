import { 
  users, campaigns, clipperCampaigns, trackingEvents, payouts, socialMetrics, tradingMetrics, websiteMetrics,
  type User, type InsertUser, type Campaign, type InsertCampaign,
  type ClipperCampaign, type InsertClipperCampaign,
  type TrackingEvent, type InsertTrackingEvent,
  type Payout, type InsertPayout
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, sum } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomUUID } from "crypto";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaign operations
  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignsByCreator(creatorId: string): Promise<Campaign[]>;
  getAllCampaigns(): Promise<Campaign[]>;
  getAvailableCampaigns(): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  updateCampaignFundingStatus(id: string, status: string): Promise<void>;
  
  // Clipper-Campaign operations
  getClipperCampaign(clipperId: string, campaignId: string): Promise<ClipperCampaign | undefined>;
  getClipperCampaignsByClipper(clipperId: string): Promise<ClipperCampaign[]>;
  getClipperCampaignsByCampaign(campaignId: string): Promise<ClipperCampaign[]>;
  createClipperCampaign(clipperCampaign: InsertClipperCampaign): Promise<ClipperCampaign>;
  updateClipperCampaign(id: string, updates: Partial<ClipperCampaign>): Promise<ClipperCampaign | undefined>;
  
  // AI Content Detection & Application Workflow
  createClipperApplication(applicationData: any): Promise<ClipperCampaign>;
  getPendingApplicationsByCreator(creatorId: string): Promise<any[]>;
  reviewClipperApplication(applicationId: string, action: 'approve' | 'reject', notes: string, creatorId: string): Promise<ClipperCampaign>;
  
  // Tracking operations
  createTrackingEvent(event: InsertTrackingEvent): Promise<TrackingEvent>;
  getTrackingEventsByClipper(clipperId: string): Promise<TrackingEvent[]>;
  getTrackingEventsByCampaign(campaignId: string): Promise<TrackingEvent[]>;
  updateTrackingEventStatus(id: string, status: string): Promise<TrackingEvent | undefined>;
  
  // Payout operations
  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayoutsByClipper(clipperId: string): Promise<Payout[]>;
  getPayoutsByCreator(creatorId: string): Promise<Payout[]>;
  getAllPayouts(): Promise<Payout[]>;
  updatePayoutStatus(id: string, status: string, transactionId?: string): Promise<Payout | undefined>;
  
  // Analytics
  getClipperEarnings(clipperId: string): Promise<{ total: number; pending: number; paid: number }>;
  getCampaignStats(campaignId: string): Promise<{ 
    totalClicks: number; 
    totalSignups: number; 
    totalConversions: number; 
    totalPaid: number;
  }>;
  
  // User integration updates
  updateUserIntegrations(userId: string, integrations: {
    socialAccounts?: any;
    tradingAccounts?: any;
    businessIntegration?: any;
  }): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: string, status: string): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  
  // Trading account operations
  addTradingAccount(userId: string, account: {
    name: string;
    platform: string;
    apiKey: string;
    accountId: string;
    serverUrl?: string;
  }): Promise<User | undefined>;
  
  removeTradingAccount(userId: string, accountId: string): Promise<User | undefined>;
  
  getTradingAccounts(userId: string): Promise<any>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.creatorId, creatorId));
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getAvailableCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns)
      .where(eq(campaigns.status, "active"))
      .orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign || undefined;
  }

  async updateCampaignFundingStatus(id: string, status: string): Promise<void> {
    await db
      .update(campaigns)
      .set({ 
        fundingStatus: status,
        status: status === 'completed' ? 'active' : 'draft',
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, id));
  }

  async getClipperCampaign(clipperId: string, campaignId: string): Promise<ClipperCampaign | undefined> {
    const [clipperCampaign] = await db
      .select()
      .from(clipperCampaigns)
      .where(and(
        eq(clipperCampaigns.clipperId, clipperId),
        eq(clipperCampaigns.campaignId, campaignId)
      ));
    return clipperCampaign || undefined;
  }

  async getClipperCampaignsByClipper(clipperId: string): Promise<ClipperCampaign[]> {
    return await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.clipperId, clipperId));
  }

  async getClipperCampaignsByCampaign(campaignId: string): Promise<ClipperCampaign[]> {
    return await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.campaignId, campaignId));
  }

  async createClipperCampaign(clipperCampaign: InsertClipperCampaign): Promise<ClipperCampaign> {
    const [newClipperCampaign] = await db
      .insert(clipperCampaigns)
      .values(clipperCampaign)
      .returning();
    return newClipperCampaign;
  }

  async updateClipperCampaign(id: string, updates: Partial<ClipperCampaign>): Promise<ClipperCampaign | undefined> {
    const [updated] = await db
      .update(clipperCampaigns)
      .set(updates)
      .where(eq(clipperCampaigns.id, id))
      .returning();
    return updated || undefined;
  }

  async createTrackingEvent(event: InsertTrackingEvent): Promise<TrackingEvent> {
    const [newEvent] = await db
      .insert(trackingEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getTrackingEventsByClipper(clipperId: string): Promise<TrackingEvent[]> {
    return await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.clipperId, clipperId))
      .orderBy(desc(trackingEvents.createdAt));
  }

  async getTrackingEventsByCampaign(campaignId: string): Promise<TrackingEvent[]> {
    return await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.campaignId, campaignId))
      .orderBy(desc(trackingEvents.createdAt));
  }

  async updateTrackingEventStatus(id: string, status: string): Promise<TrackingEvent | undefined> {
    const [updated] = await db
      .update(trackingEvents)
      .set({ status: status as any })
      .where(eq(trackingEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async createPayout(payout: InsertPayout): Promise<Payout> {
    const [newPayout] = await db
      .insert(payouts)
      .values(payout)
      .returning();
    return newPayout;
  }

  async getPayoutsByClipper(clipperId: string): Promise<Payout[]> {
    return await db
      .select()
      .from(payouts)
      .where(eq(payouts.clipperId, clipperId))
      .orderBy(desc(payouts.createdAt));
  }

  async getPayoutsByCreator(creatorId: string): Promise<Payout[]> {
    // Get payouts for campaigns owned by this creator
    const result = await db
      .select({ payouts })
      .from(payouts)
      .innerJoin(clipperCampaigns, eq(payouts.clipperId, clipperCampaigns.clipperId))
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .where(eq(campaigns.creatorId, creatorId))
      .orderBy(desc(payouts.createdAt));
    
    return result.map(row => row.payouts);
  }

  async getAllPayouts(): Promise<Payout[]> {
    return await db
      .select()
      .from(payouts)
      .orderBy(desc(payouts.createdAt));
  }

  async updatePayoutStatus(id: string, status: string, transactionId?: string): Promise<Payout | undefined> {
    const [updated] = await db
      .update(payouts)
      .set({ 
        status: status as any,
        ...(transactionId && { mpesaTransactionId: transactionId }),
        ...(status === "completed" && { processedAt: new Date() })
      })
      .where(eq(payouts.id, id))
      .returning();
    return updated || undefined;
  }

  async getClipperEarnings(clipperId: string): Promise<{ total: number; pending: number; paid: number }> {
    const results = await db
      .select({
        status: trackingEvents.status,
        totalAmount: sum(trackingEvents.rewardAmount),
      })
      .from(trackingEvents)
      .where(eq(trackingEvents.clipperId, clipperId))
      .groupBy(trackingEvents.status);

    const earnings = { total: 0, pending: 0, paid: 0 };
    
    results.forEach(result => {
      const amount = parseFloat(result.totalAmount || "0");
      if (result.status === "paid") {
        earnings.paid += amount;
      } else if (result.status === "pending" || result.status === "verified") {
        earnings.pending += amount;
      }
    });

    earnings.total = earnings.paid + earnings.pending;
    return earnings;
  }

  async getCampaignStats(campaignId: string): Promise<{ 
    totalClicks: number; 
    totalSignups: number; 
    totalConversions: number; 
    totalPaid: number;
  }> {
    const results = await db
      .select({
        eventType: trackingEvents.eventType,
        count: sql<number>`count(*)`,
        totalPaid: sum(trackingEvents.rewardAmount),
      })
      .from(trackingEvents)
      .where(eq(trackingEvents.campaignId, campaignId))
      .groupBy(trackingEvents.eventType);

    const stats = {
      totalClicks: 0,
      totalSignups: 0,
      totalConversions: 0,
      totalPaid: 0,
    };

    results.forEach(result => {
      const count = result.count;
      const paid = parseFloat(result.totalPaid || "0");
      
      switch (result.eventType) {
        case "click":
          stats.totalClicks += count;
          break;
        case "signup":
          stats.totalSignups += count;
          break;
        case "conversion":
          stats.totalConversions += count;
          break;
      }
      
      stats.totalPaid += paid;
    });

    return stats;
  }

  async addTradingAccount(userId: string, account: {
    name: string;
    platform: string;
    apiKey: string;
    accountId: string;
    serverUrl?: string;
  }): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const existingAccounts = user.tradingAccounts ? 
      (typeof user.tradingAccounts === 'string' ? JSON.parse(user.tradingAccounts) : user.tradingAccounts) : 
      { brokers: [] };
    const newAccount = {
      id: randomUUID(),
      ...account,
      isConnected: true,
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    existingAccounts.brokers.push(newAccount);

    const [updated] = await db
      .update(users)
      .set({ tradingAccounts: JSON.stringify(existingAccounts) as any })
      .where(eq(users.id, userId))
      .returning();
    
    return updated || undefined;
  }

  async removeTradingAccount(userId: string, accountId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const existingAccounts = user.tradingAccounts ? 
      (typeof user.tradingAccounts === 'string' ? JSON.parse(user.tradingAccounts) : user.tradingAccounts) : 
      { brokers: [] };
    existingAccounts.brokers = existingAccounts.brokers.filter((broker: any) => broker.id !== accountId);

    const [updated] = await db
      .update(users)
      .set({ tradingAccounts: JSON.stringify(existingAccounts) as any })
      .where(eq(users.id, userId))
      .returning();
    
    return updated || undefined;
  }

  async getTradingAccounts(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user || !user.tradingAccounts) {
      return { brokers: [] };
    }

    try {
      return typeof user.tradingAccounts === 'string' ? 
        JSON.parse(user.tradingAccounts) : 
        user.tradingAccounts;
    } catch {
      return { brokers: [] };
    }
  }

  async updateUserIntegrations(userId: string, integrations: {
    socialAccounts?: any;
    tradingAccounts?: any;
    businessIntegration?: any;
  }): Promise<User | undefined> {
    const updateData: any = {};
    
    if (integrations.socialAccounts !== undefined) {
      updateData.socialAccounts = integrations.socialAccounts;
    }
    if (integrations.tradingAccounts !== undefined) {
      updateData.tradingAccounts = integrations.tradingAccounts;
    }
    if (integrations.businessIntegration !== undefined) {
      updateData.businessIntegration = integrations.businessIntegration;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  async updateUserStatus(userId: string, status: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ status: status as "active" | "inactive" | "suspended" })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      // First delete related records
      await db.delete(clipperCampaigns).where(eq(clipperCampaigns.clipperId, userId));
      await db.delete(trackingEvents).where(eq(trackingEvents.clipperId, userId));
      await db.delete(payouts).where(eq(payouts.clipperId, userId));
      await db.delete(campaigns).where(eq(campaigns.creatorId, userId));
      
      // Then delete the user
      const result = await db.delete(users).where(eq(users.id, userId));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Bot detection methods
  async getBotDetectionStats(): Promise<any> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const [totalResult, botResult, suspiciousResult] = await Promise.all([
        db.select({ count: count() }).from(trackingEvents).where(gte(trackingEvents.createdAt, oneDayAgo)),
        db.select({ count: count() }).from(trackingEvents).where(
          and(
            eq(trackingEvents.flaggedAsBot, true),
            gte(trackingEvents.createdAt, oneDayAgo)
          )
        ),
        db.select({ count: count() }).from(trackingEvents).where(
          and(
            gte(trackingEvents.botScore, "0.4"),
            eq(trackingEvents.flaggedAsBot, false),
            gte(trackingEvents.createdAt, oneDayAgo)
          )
        )
      ]);

      const total = totalResult[0]?.count || 0;
      const bots = botResult[0]?.count || 0;
      const suspicious = suspiciousResult[0]?.count || 0;

      return {
        totalEvents: Number(total),
        botEvents: Number(bots),
        suspiciousEvents: Number(suspicious),
        blockedEvents: Number(bots),
        botRate: total > 0 ? bots / total : 0,
        topBotIPs: [],
        botEventsByHour: [],
      };
    } catch (error) {
      console.error('Bot stats error:', error);
      return {
        totalEvents: 0,
        botEvents: 0,
        suspiciousEvents: 0,
        blockedEvents: 0,
        botRate: 0,
        topBotIPs: [],
        botEventsByHour: [],
      };
    }
  }

  async getBotDetectionEvents(): Promise<any[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const events = await db
        .select({
          id: trackingEvents.id,
          clipperId: trackingEvents.clipperId,
          campaignId: trackingEvents.campaignId,
          eventType: trackingEvents.eventType,
          botScore: trackingEvents.botScore,
          flaggedAsBot: trackingEvents.flaggedAsBot,
          deviceFingerprint: trackingEvents.deviceFingerprint,
          userAgent: trackingEvents.userAgent,
          ipAddress: trackingEvents.ipAddress,
          createdAt: trackingEvents.createdAt,
        })
        .from(trackingEvents)
        .where(gte(trackingEvents.createdAt, oneDayAgo))
        .orderBy(desc(trackingEvents.createdAt))
        .limit(500);

      return events.map(event => ({
        id: event.id,
        clipperId: event.clipperId,
        campaignId: event.campaignId,
        eventType: event.eventType,
        botScore: Number(event.botScore) || 0,
        flaggedAsBot: event.flaggedAsBot || false,
        deviceFingerprint: event.deviceFingerprint || '{}',
        userAgent: event.userAgent || '',
        ipAddress: event.ipAddress || '',
        createdAt: event.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error('Bot events error:', error);
      return [];
    }
  }

  // AI Content Detection & Application Workflow Methods
  async createClipperApplication(applicationData: any): Promise<ClipperCampaign> {
    const [clipperCampaign] = await db
      .insert(clipperCampaigns)
      .values(applicationData)
      .returning();
    return clipperCampaign;
  }

  async getPendingApplicationsByCreator(creatorId: string): Promise<any[]> {
    const results = await db
      .select({
        id: clipperCampaigns.id,
        clipperId: clipperCampaigns.clipperId,
        campaignId: clipperCampaigns.campaignId,
        clipperUsername: users.username,
        campaignTitle: campaigns.title,
        submittedContent: clipperCampaigns.submittedContent,
        contentType: clipperCampaigns.contentType,
        contentDescription: clipperCampaigns.contentDescription,
        applicationStatus: clipperCampaigns.applicationStatus,
        aiDetectionResult: clipperCampaigns.aiDetectionResult,
        aiConfidence: clipperCampaigns.aiConfidence,
        aiFlags: clipperCampaigns.aiFlags,
        joinedAt: clipperCampaigns.joinedAt,
        creatorReviewNotes: clipperCampaigns.creatorReviewNotes,
        rejectionReason: clipperCampaigns.rejectionReason,
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
      .where(and(
        eq(campaigns.creatorId, creatorId),
        sql`${clipperCampaigns.applicationStatus} IN ('creator_review', 'ai_scanning', 'approved', 'rejected', 'ai_flagged')`
      ))
      .orderBy(desc(clipperCampaigns.joinedAt));

    return results;
  }

  async reviewClipperApplication(
    applicationId: string, 
    action: 'approve' | 'reject', 
    notes: string, 
    creatorId: string
  ): Promise<ClipperCampaign> {
    // Verify the application belongs to this creator's campaign
    const applicationDetails = await db
      .select()
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .where(and(
        eq(clipperCampaigns.id, applicationId),
        eq(campaigns.creatorId, creatorId)
      ));

    if (applicationDetails.length === 0) {
      throw new Error("Application not found or access denied");
    }

    const updateData: any = {
      applicationStatus: action === 'approve' ? 'approved' : 'rejected',
      isApproved: action === 'approve',
      creatorReviewNotes: notes,
      reviewedAt: new Date(),
    };

    if (action === 'reject') {
      updateData.rejectionReason = notes || 'Content does not meet campaign requirements';
    }

    const [updated] = await db
      .update(clipperCampaigns)
      .set(updateData)
      .where(eq(clipperCampaigns.id, applicationId))
      .returning();

    return updated;
  }
}

export const storage = new DatabaseStorage();
