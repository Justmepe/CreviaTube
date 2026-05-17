import {
  users, campaigns, clipperCampaigns, trackingEvents, payouts, socialMetrics, websiteMetrics,
  platformReviews, reviewPrompts, clipperStats, creatorClipperTrust, subscriptions,
  type User, type InsertUser, type Campaign, type InsertCampaign,
  type ClipperCampaign, type InsertClipperCampaign,
  type TrackingEvent, type InsertTrackingEvent,
  type Payout, type InsertPayout
} from "../shared/schema.js";
import { db } from "./db";
import { eq, and, desc, sql, sum, count, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomUUID, randomBytes } from "crypto";

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
  getCampaignByTrackingId(trackingId: string): Promise<Campaign | undefined>;
  
  // Clipper-Campaign operations
  getClipperCampaign(clipperId: string, campaignId: string): Promise<ClipperCampaign | undefined>;
  getClipperCampaignsByClipper(clipperId: string): Promise<ClipperCampaign[]>;
  getClipperCampaignsByCampaign(campaignId: string): Promise<ClipperCampaign[]>;
  createClipperCampaign(clipperCampaign: InsertClipperCampaign): Promise<ClipperCampaign>;
  updateClipperCampaign(id: string, updates: Partial<ClipperCampaign>): Promise<ClipperCampaign | undefined>;
  
  // AI Content Detection & Application Workflow
  createClipperApplication(applicationData: any): Promise<ClipperCampaign>;
  getPendingApplicationsByCreator(creatorId: string): Promise<any[]>;
  reviewClipperApplication(
    applicationId: string,
    action: 'approve' | 'reject',
    notes: string,
    creatorId: string,
    reasonCode?: string | null,
  ): Promise<ClipperCampaign>;
  
  // Additional campaign methods for marketplace interface
  getClipperApplications(clipperId: string): Promise<any[]>;
  getCampaignsWithPendingApplications(creatorId: string): Promise<any[]>;
  getCampaignsWithClippers(creatorId: string): Promise<any[]>;
  
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
    businessIntegration?: any;
  }): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: string, status: string): Promise<User | undefined>;

  deleteUser(userId: string): Promise<boolean>;
  
  // Platform review system
  createPlatformReview(review: any): Promise<any>;
  getPlatformReviews(filters?: { userId?: string; status?: string; limit?: number }): Promise<any[]>;
  getPlatformReviewStats(): Promise<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }>;
  
  // Review prompts tracking
  createReviewPrompt(prompt: any): Promise<any>;
  getReviewPrompts(userId: string): Promise<any[]>;
  shouldPromptForReview(userId: string): Promise<{ shouldPrompt: boolean; triggerType?: string; triggerValue?: string }>;
  markReviewPromptResponded(promptId: string, response: string, reviewId?: string): Promise<void>;
  
  // User milestones for review triggers
  getUserReviewMilestones(userId: string): Promise<{
    daysSinceJoined: number;
    totalEarnings: number;
    payoutsReceived: number;
    campaignsCompleted: number;
    userRole: string;
    accountType: string;
    lastPromptedAt?: Date;
  }>;
  
  // Missing storage methods
  getAllWithdrawals(): Promise<any[]>;
  getAllClippers(): Promise<User[]>;
  getTopClippers(filters?: any): Promise<any[]>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool: pool || undefined, 
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
    // Safely handle JSON fields
    const userData = {
      ...insertUser,
      socialAccounts: insertUser.socialAccounts as any || null,
      businessIntegration: insertUser.businessIntegration as any || null,
    };
    
    const [user] = await db
      .insert(users)
      .values([userData])
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
    // Phase 6 Slice B — priority placement for Premium creators.
    // Campaigns whose creator has an active premium subscription
    // float to the top with isFeatured=true. The marketplace UI
    // reads that flag to render the "Featured" badge.
    //
    // Implementation: LEFT JOIN subscriptions on creator_id, evaluate
    // active-and-not-expired in SQL (so the sort is correct regardless
    // of whether the daily expiry sweep is behind). ORDER BY
    // (isFeatured DESC, created_at DESC) so featured rows lead while
    // each section is still time-ordered.
    //
    // Also INNER JOIN users so each row carries the creator's
    // username + accountType. The marketplace UI reads
    // `campaign.creator.accountType` on every card render and on every
    // filter pass — until this JOIN was added the field was undefined
    // and the whole page crashed the first time a funded+active
    // campaign was loaded by a clipper.
    const rows = await db
      .select({
        campaign: campaigns,
        creatorUsername: users.username,
        creatorAccountType: users.accountType,
        isFeatured: sql<boolean>`
          (${subscriptions.tier} = 'premium'
            AND ${subscriptions.status} = 'active'
            AND ${subscriptions.currentPeriodEnd} > NOW())
        `,
      })
      .from(campaigns)
      .innerJoin(users, eq(users.id, campaigns.creatorId))
      .leftJoin(subscriptions, eq(campaigns.creatorId, subscriptions.userId))
      .where(eq(campaigns.status, "active"))
      .orderBy(
        sql`(${subscriptions.tier} = 'premium'
          AND ${subscriptions.status} = 'active'
          AND ${subscriptions.currentPeriodEnd} > NOW()) DESC NULLS LAST`,
        desc(campaigns.createdAt),
      );

    // Flatten — the API contract on /api/campaigns/available is a flat
    // Campaign[] today (plus the embedded creator object the UI needs).
    // The client TypeScript widens both extras as non-schema fields.
    return rows.map((r) => ({
      ...r.campaign,
      isFeatured: Boolean(r.isFeatured),
      creator: {
        username: r.creatorUsername,
        accountType: r.creatorAccountType,
      },
    })) as unknown as Campaign[];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const campaignData = {
      ...campaign,
      campaignGoals: campaign.campaignGoals as any || null,
    };
    
    const [newCampaign] = await db
      .insert(campaigns)
      .values([campaignData])
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

  async getCampaignByTrackingId(trackingId: string): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, trackingId)); // Use campaign ID instead of non-existent paymentTrackingId
    return campaign || undefined;
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
    // INNER JOIN campaigns so each row carries an embedded
    // { campaign: { title, description } }. Without this the
    // clipper marketplace's "My applications" tab crashed on
    // application.campaign.title with "Cannot read properties of
    // undefined" — the entire React tree died including the sidebar.
    // `title` is aliased from the schema's `name` column to match
    // what the UI has always expected.
    const rows = await db
      .select({
        clipperCampaign: clipperCampaigns,
        campaignName: campaigns.name,
        campaignDescription: campaigns.description,
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(campaigns.id, clipperCampaigns.campaignId))
      .where(eq(clipperCampaigns.clipperId, clipperId));
    return rows.map((r) => ({
      ...r.clipperCampaign,
      campaign: {
        title: r.campaignName,
        description: r.campaignDescription,
      },
    })) as unknown as ClipperCampaign[];
  }

  async getClipperCampaignsByCampaign(campaignId: string): Promise<ClipperCampaign[]> {
    // Same embedding pattern as the by-clipper variant above —
    // the creator-side dashboard reads the same shape.
    const rows = await db
      .select({
        clipperCampaign: clipperCampaigns,
        campaignName: campaigns.name,
        campaignDescription: campaigns.description,
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(campaigns.id, clipperCampaigns.campaignId))
      .where(eq(clipperCampaigns.campaignId, campaignId));
    return rows.map((r) => ({
      ...r.clipperCampaign,
      campaign: {
        title: r.campaignName,
        description: r.campaignDescription,
      },
    })) as unknown as ClipperCampaign[];
  }

  async createClipperCampaign(clipperCampaign: InsertClipperCampaign): Promise<ClipperCampaign> {
    // Safely handle JSON fields for completion metrics
    const clipperData = {
      ...clipperCampaign,
      completionMetrics: clipperCampaign.completionMetrics ? JSON.parse(JSON.stringify(clipperCampaign.completionMetrics)) : null,
      aiDetectionResult: clipperCampaign.aiDetectionResult ? JSON.parse(JSON.stringify(clipperCampaign.aiDetectionResult)) : null,
      aiFlags: clipperCampaign.aiFlags ? JSON.parse(JSON.stringify(clipperCampaign.aiFlags)) : null,
    };
    
    const [newClipperCampaign] = await db
      .insert(clipperCampaigns)
      .values([clipperData])
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
    const payoutData = {
      ...payout,
      amount: payout.amount.toString(), // Convert number to string for database
    };
    const [newPayout] = await db
      .insert(payouts)
      .values([payoutData])
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

  async updateUserIntegrations(userId: string, integrations: {
    socialAccounts?: any;
    businessIntegration?: any;
  }): Promise<User | undefined> {
    const updateData: any = {};

    if (integrations.socialAccounts !== undefined) {
      updateData.socialAccounts = integrations.socialAccounts;
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
    // Phase 5 — per-clipper approval count for this creator. The
    // correlated subqueries below answer "how many of this clipper's
    // applications have I previously approved across my campaigns,
    // and when did I last do it?" — the trust signal that the
    // creator-side review UI surfaces as a chip and that Slice C
    // turns into the "auto-approve" toggle threshold.
    //
    // Per-row correlated subquery is fine for typical pending-app
    // volumes (<100). If the page ever scales past that, swap to a
    // single batched GROUP BY + in-memory join.
    const results = await db
      .select({
        id: clipperCampaigns.id,
        clipperId: clipperCampaigns.clipperId,
        campaignId: clipperCampaigns.campaignId,
        clipperUsername: users.username,
        campaignTitle: campaigns.name,
        submittedContent: clipperCampaigns.submittedContent,
        submissionUrl: clipperCampaigns.submissionUrl,
        submissionKind: clipperCampaigns.submissionKind,
        contentType: clipperCampaigns.contentType,
        contentDescription: clipperCampaigns.contentDescription,
        applicationStatus: clipperCampaigns.applicationStatus,
        aiDetectionResult: clipperCampaigns.aiDetectionResult,
        aiConfidence: clipperCampaigns.aiConfidence,
        aiFlags: clipperCampaigns.aiFlags,
        joinedAt: clipperCampaigns.joinedAt,
        creatorReviewNotes: clipperCampaigns.creatorReviewNotes,
        rejectionReason: clipperCampaigns.rejectionReason,
        rejectionReasonCode: clipperCampaigns.rejectionReasonCode,
        // Reputation enrichment (LEFT JOIN — null for clippers with no stats yet)
        clipperRating: clipperStats.averageRating,
        clipperReviewCount: clipperStats.totalReviews,
        clipperTier: clipperStats.tier,
        // Phase 5 — per-creator trust signals.
        approvedCountFromThisClipper: sql<number>`(
          SELECT COUNT(*)::int FROM clipper_campaigns cc2
          INNER JOIN campaigns c2 ON cc2.campaign_id = c2.id
          WHERE c2.creator_id = ${creatorId}
            AND cc2.clipper_id = ${clipperCampaigns.clipperId}
            AND cc2.is_approved = true
        )`,
        lastApprovedFromThisClipperAt: sql<string | null>`(
          SELECT MAX(cc2.reviewed_at) FROM clipper_campaigns cc2
          INNER JOIN campaigns c2 ON cc2.campaign_id = c2.id
          WHERE c2.creator_id = ${creatorId}
            AND cc2.clipper_id = ${clipperCampaigns.clipperId}
            AND cc2.is_approved = true
        )`,
        rejectedCountFromThisClipper: sql<number>`(
          SELECT COUNT(*)::int FROM clipper_campaigns cc2
          INNER JOIN campaigns c2 ON cc2.campaign_id = c2.id
          WHERE c2.creator_id = ${creatorId}
            AND cc2.clipper_id = ${clipperCampaigns.clipperId}
            AND cc2.application_status = 'rejected'
        )`,
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
      .leftJoin(clipperStats, eq(clipperCampaigns.clipperId, clipperStats.clipperId))
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
    creatorId: string,
    reasonCode?: string | null,
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
      // Phase 5 — store the structured rejection-reason code alongside
      // the freeform notes. Validation already happened at the route
      // layer; this just persists it. null when caller didn't supply
      // (keeps backwards-compatible callers working).
      if (reasonCode) {
        updateData.rejectionReasonCode = reasonCode;
      }
    }

    // On approval, mint a unique clipperPromoCode the clipper can share for
    // offline / e-commerce attribution (Shopify/Stripe webhooks look it up
    // here). Auto-generated only the first time — re-approving an already-
    // approved application preserves the existing code so the clipper's
    // outbound posts don't suddenly stop attributing.
    if (action === 'approve') {
      const [existing] = await db
        .select({ clipperPromoCode: clipperCampaigns.clipperPromoCode })
        .from(clipperCampaigns)
        .where(eq(clipperCampaigns.id, applicationId));
      if (!existing?.clipperPromoCode) {
        updateData.clipperPromoCode = await this.generateUniquePromoCode();
      }
    }

    const [updated] = await db
      .update(clipperCampaigns)
      .set(updateData)
      .where(eq(clipperCampaigns.id, applicationId))
      .returning();

    // Phase 5 — on every approve, increment the creator/clipper trust
    // counter. Upsert because the first approval establishes the row.
    // approved_count is what Slice C's "auto-approve threshold" UI
    // reads to decide whether to show the trust toggle.
    if (action === 'approve') {
      try {
        const [resolved] = await db
          .select({
            clipperId: clipperCampaigns.clipperId,
            creatorId: campaigns.creatorId,
          })
          .from(clipperCampaigns)
          .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
          .where(eq(clipperCampaigns.id, applicationId))
          .limit(1);
        if (resolved?.creatorId && resolved?.clipperId) {
          const now = new Date();
          await db
            .insert(creatorClipperTrust)
            .values({
              creatorId: resolved.creatorId,
              clipperId: resolved.clipperId,
              approvedCount: 1,
              lastApprovedAt: now,
            })
            .onConflictDoUpdate({
              target: [creatorClipperTrust.creatorId, creatorClipperTrust.clipperId],
              set: {
                approvedCount: sql`${creatorClipperTrust.approvedCount} + 1`,
                lastApprovedAt: now,
                updatedAt: now,
              },
            });
        }
      } catch (err) {
        // Trust-counter maintenance is fire-and-forget — never block a
        // legitimate approval if the upsert hits a transient error.
        console.error("creator_clipper_trust upsert failed:", err);
      }
    }

    // ugc_volume goals don't emit tracking events — verification *is* the
    // approval + post URL. Fire the completion check on approve so the
    // clipper's bonus + payout flow runs without waiting for an unrelated
    // tracked event. Other goal types still rely on the event-driven path
    // in trackingService.recordTrackingEvent.
    if (action === 'approve') {
      try {
        const { campaignCompletionService } = await import("./core/services/campaign-completion");
        await campaignCompletionService.checkAndUpdateClipperCompletion(applicationId);
      } catch (err) {
        console.error("UGC approval completion check failed:", err);
      }
    }

    return updated;
  }

  // Additional marketplace interface methods
  async getClipperApplications(clipperId: string): Promise<any[]> {
    const results = await db
      .select({
        id: clipperCampaigns.id,
        campaignId: clipperCampaigns.campaignId,
        campaignTitle: campaigns.name,
        campaignDescription: campaigns.description,
        status: campaigns.status,
        isApproved: clipperCampaigns.isApproved,
        applicationStatus: clipperCampaigns.applicationStatus,
        appliedAt: clipperCampaigns.joinedAt,
        trackingCode: clipperCampaigns.trackingCode,
        campaign: {
          id: campaigns.id,
          title: campaigns.name,
          description: campaigns.description,
          status: campaigns.status,
          rewardRates: campaigns.rewardRates,
          campaignType: campaigns.campaignType,
        }
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .where(eq(clipperCampaigns.clipperId, clipperId))
      .orderBy(desc(clipperCampaigns.joinedAt));

    return results;
  }

  async getCampaignsWithPendingApplications(creatorId: string): Promise<any[]> {
    // This is the same as getPendingApplicationsByCreator, just renamed for clarity
    return this.getPendingApplicationsByCreator(creatorId);
  }

  async getCampaignsWithClippers(creatorId: string): Promise<any[]> {
    const results = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        budget: campaigns.budget,
        budgetUsed: campaigns.budgetUsed,
        campaignType: campaigns.campaignType,
        createdAt: campaigns.createdAt,
        clippers: sql`
          json_agg(
            json_build_object(
              'id', ${clipperCampaigns.id},
              'clipperId', ${clipperCampaigns.clipperId},
              'username', ${users.username},
              'isApproved', ${clipperCampaigns.isApproved},
              'applicationStatus', ${clipperCampaigns.applicationStatus},
              'joinedAt', ${clipperCampaigns.joinedAt},
              'trackingCode', ${clipperCampaigns.trackingCode}
            )
          )
        `
      })
      .from(campaigns)
      .leftJoin(clipperCampaigns, eq(campaigns.id, clipperCampaigns.campaignId))
      .leftJoin(users, eq(clipperCampaigns.clipperId, users.id))
      .where(eq(campaigns.creatorId, creatorId))
      .groupBy(campaigns.id)
      .orderBy(desc(campaigns.createdAt));

    return results;
  }
  
  // Platform Reviews Implementation
  async createPlatformReview(review: any): Promise<any> {
    const [newReview] = await db
      .insert(platformReviews)
      .values([review])
      .returning();
    return newReview;
  }
  
  async getPlatformReviews(filters: { userId?: string; status?: string; limit?: number } = {}): Promise<any[]> {
    // Build where conditions
    const whereConditions: any[] = [];
    if (filters.userId) {
      whereConditions.push(eq(platformReviews.userId, filters.userId));
    }
    if (filters.status) {
      whereConditions.push(eq(platformReviews.status, filters.status));
    }

    // Build query with all conditions
    let query = db
      .select({
        id: platformReviews.id,
        userId: platformReviews.userId,
        overallRating: platformReviews.overallRating,
        easeOfUse: platformReviews.easeOfUse,
        paymentReliability: platformReviews.paymentReliability,
        campaignQuality: platformReviews.campaignQuality,
        clipperQuality: platformReviews.clipperQuality,
        customerSupport: platformReviews.customerSupport,
        platformFeatures: platformReviews.platformFeatures,
        reviewTitle: platformReviews.reviewTitle,
        reviewText: platformReviews.reviewText,
        reviewTrigger: platformReviews.reviewTrigger,
        userExperience: platformReviews.userExperience,
        improvementSuggestions: platformReviews.improvementSuggestions,
        featuresRequested: platformReviews.featuresRequested,
        npsScore: platformReviews.npsScore,
        wouldRecommend: platformReviews.wouldRecommend,
        status: platformReviews.status,
        isVerified: platformReviews.isVerified,
        adminResponse: platformReviews.adminResponse,
        adminRespondedAt: platformReviews.adminRespondedAt,
        helpfulVotes: platformReviews.helpfulVotes,
        totalVotes: platformReviews.totalVotes,
        createdAt: platformReviews.createdAt,
        updatedAt: platformReviews.updatedAt,
        // User info
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          accountType: users.accountType,
        }
      })
      .from(platformReviews)
      .leftJoin(users, eq(platformReviews.userId, users.id));

    // Apply conditions directly in a single query
    if (whereConditions.length > 0) {
      if (filters.limit) {
        return await query.where(and(...whereConditions)).orderBy(desc(platformReviews.createdAt)).limit(filters.limit);
      } else {
        return await query.where(and(...whereConditions)).orderBy(desc(platformReviews.createdAt));
      }
    } else {
      if (filters.limit) {
        return await query.orderBy(desc(platformReviews.createdAt)).limit(filters.limit);
      } else {
        return await query.orderBy(desc(platformReviews.createdAt));
      }
    }
  }
  
  async getPlatformReviewStats(): Promise<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }> {
    const publishedReviews = await db
      .select({
        overallRating: platformReviews.overallRating
      })
      .from(platformReviews)
      .where(eq(platformReviews.status, 'published'));
      
    const totalReviews = publishedReviews.length;
    
    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0, ratingBreakdown: {} };
    }
    
    const averageRating = publishedReviews.reduce((sum, r) => sum + parseFloat(r.overallRating), 0) / totalReviews;
    
    const ratingBreakdown: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingBreakdown[i] = publishedReviews.filter(r => Math.floor(parseFloat(r.overallRating)) === i).length;
    }
    
    return { averageRating: Math.round(averageRating * 10) / 10, totalReviews, ratingBreakdown };
  }
  
  // Review Prompts Implementation
  async createReviewPrompt(prompt: any): Promise<any> {
    const [newPrompt] = await db
      .insert(reviewPrompts)
      .values([prompt])
      .returning();
    return newPrompt;
  }
  
  async getReviewPrompts(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(reviewPrompts)
      .where(eq(reviewPrompts.userId, userId))
      .orderBy(desc(reviewPrompts.promptedAt));
  }
  
  async shouldPromptForReview(userId: string): Promise<{ shouldPrompt: boolean; triggerType?: string; triggerValue?: string }> {
    const user = await this.getUser(userId);
    if (!user) return { shouldPrompt: false };
    
    // Check if user has already left a review
    const existingReview = await db
      .select({ id: platformReviews.id })
      .from(platformReviews)
      .where(eq(platformReviews.userId, userId))
      .limit(1);
      
    if (existingReview.length > 0) return { shouldPrompt: false };
    
    // Get user milestones
    const milestones = await this.getUserReviewMilestones(userId);
    
    // Get recent prompts
    const recentPrompts = await this.getReviewPrompts(userId);
    
    // Don't prompt more than once per 30 days
    const lastPrompt = recentPrompts[0];
    if (lastPrompt) {
      const daysSinceLastPrompt = Math.floor((Date.now() - new Date(lastPrompt.promptedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastPrompt < 30) return { shouldPrompt: false };
    }
    
    // Check milestone-based triggers
    const triggers = {
      first_payout: milestones.payoutsReceived === 1 && !recentPrompts.some(p => p.triggerType === 'first_payout'),
      earnings_50: milestones.totalEarnings >= 50 && milestones.totalEarnings < 100 && !recentPrompts.some(p => p.triggerType === 'earnings_milestone' && p.triggerValue === '$50'),
      earnings_100: milestones.totalEarnings >= 100 && milestones.totalEarnings < 250 && !recentPrompts.some(p => p.triggerType === 'earnings_milestone' && p.triggerValue === '$100'),
      earnings_250: milestones.totalEarnings >= 250 && milestones.totalEarnings < 500 && !recentPrompts.some(p => p.triggerType === 'earnings_milestone' && p.triggerValue === '$250'),
      campaigns_3: milestones.campaignsCompleted >= 3 && milestones.campaignsCompleted < 5 && !recentPrompts.some(p => p.triggerType === 'campaign_milestone' && p.triggerValue === '3_campaigns'),
      campaigns_5: milestones.campaignsCompleted >= 5 && milestones.campaignsCompleted < 10 && !recentPrompts.some(p => p.triggerType === 'campaign_milestone' && p.triggerValue === '5_campaigns'),
      days_30: milestones.daysSinceJoined >= 30 && milestones.daysSinceJoined < 60 && !recentPrompts.some(p => p.triggerType === 'time_milestone' && p.triggerValue === '30_days'),
      days_60: milestones.daysSinceJoined >= 60 && milestones.daysSinceJoined < 180 && !recentPrompts.some(p => p.triggerType === 'time_milestone' && p.triggerValue === '60_days'),
    };
    
    // Return first matching trigger
    for (const [triggerKey, shouldTrigger] of Object.entries(triggers)) {
      if (shouldTrigger) {
        const triggerMapping: Record<string, { type: string; value: string }> = {
          first_payout: { type: 'first_payout', value: 'first_payout' },
          earnings_50: { type: 'earnings_milestone', value: '$50' },
          earnings_100: { type: 'earnings_milestone', value: '$100' },
          earnings_250: { type: 'earnings_milestone', value: '$250' },
          campaigns_3: { type: 'campaign_milestone', value: '3_campaigns' },
          campaigns_5: { type: 'campaign_milestone', value: '5_campaigns' },
          days_30: { type: 'time_milestone', value: '30_days' },
          days_60: { type: 'time_milestone', value: '60_days' },
        };
        
        const trigger = triggerMapping[triggerKey];
        return { shouldPrompt: true, triggerType: trigger.type, triggerValue: trigger.value };
      }
    }
    
    return { shouldPrompt: false };
  }
  
  async markReviewPromptResponded(promptId: string, response: string, reviewId?: string): Promise<void> {
    await db
      .update(reviewPrompts)
      .set({
        userResponse: response,
        reviewId: reviewId || null,
        dismissedAt: response === 'dismissed' ? new Date() : null,
      })
      .where(eq(reviewPrompts.id, promptId));
  }
  
  async getUserReviewMilestones(userId: string): Promise<{
    daysSinceJoined: number;
    totalEarnings: number;
    payoutsReceived: number;
    campaignsCompleted: number;
    userRole: string;
    accountType: string;
    lastPromptedAt?: Date;
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    // Get user's clipper campaigns
    const userCampaigns = await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.clipperId, userId));
      
    const completedCampaigns = userCampaigns.filter(cc => cc.isCompleted);
    
    // Get user's payouts
    const userPayouts = await db
      .select()
      .from(payouts)
      .where(and(
        eq(payouts.clipperId, userId),
        eq(payouts.status, 'completed')
      ));
      
    const totalEarnings = userPayouts.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    const daysSinceJoined = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    // Get last prompt
    const lastPrompts = await this.getReviewPrompts(userId);
    const lastPrompt = lastPrompts[0];
    
    return {
      daysSinceJoined,
      totalEarnings,
      payoutsReceived: userPayouts.length,
      campaignsCompleted: completedCampaigns.length,
      userRole: user.role,
      accountType: user.accountType || 'unknown',
      lastPromptedAt: lastPrompt ? new Date(lastPrompt.promptedAt) : undefined,
    };
  }

  // ===== MISSING STORAGE METHODS IMPLEMENTATION =====

  // 1. Admin withdrawal management
  async getAllWithdrawals(): Promise<any[]> {
    try {
      const withdrawals = await db
        .select({
          id: payouts.id,
          clipperId: payouts.clipperId,
          campaignId: payouts.campaignId,
          amount: payouts.amount,
          method: payouts.method,
          status: payouts.status,
          createdAt: payouts.createdAt,
          // Join with users to get clipper info
          clipperUsername: users.username,
          clipperEmail: users.email,
          // Join with campaigns to get campaign info
          campaignName: campaigns.name,
        })
        .from(payouts)
        .leftJoin(users, eq(payouts.clipperId, users.id))
        .leftJoin(campaigns, eq(payouts.campaignId, campaigns.id))
        .orderBy(desc(payouts.createdAt));

      return withdrawals;
    } catch (error) {
      console.error('Error fetching all withdrawals:', error);
      throw new Error('Failed to fetch withdrawals');
    }
  }

  // 2. Clipper management
  async getAllClippers(): Promise<User[]> {
    try {
      const clippers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'clipper'))
        .orderBy(desc(users.createdAt));

      return clippers;
    } catch (error) {
      console.error('Error fetching all clippers:', error);
      throw new Error('Failed to fetch clippers');
    }
  }

  async getTopClippers(filters?: any): Promise<any[]> {
    try {
      // Get clippers with their performance metrics
      const clipperStats = await db
        .select({
          userId: users.id,
          username: users.username,
          email: users.email,
          totalEarnings: sql<number>`COALESCE(SUM(${payouts.amount}), 0)`,
          totalPayouts: sql<number>`COUNT(${payouts.id})`,
          completedCampaigns: sql<number>`COUNT(DISTINCT ${clipperCampaigns.campaignId})`,
          avgRating: sql<number>`COALESCE(AVG(${platformReviews.overallRating}), 0)`,
          totalReviews: sql<number>`COUNT(${platformReviews.id})`,
          joinedAt: users.createdAt,
        })
        .from(users)
        .leftJoin(payouts, eq(users.id, payouts.clipperId))
        .leftJoin(clipperCampaigns, eq(users.id, clipperCampaigns.clipperId))
        .leftJoin(platformReviews, eq(users.id, platformReviews.userId))
        .where(eq(users.role, 'clipper'))
        .groupBy(users.id, users.username, users.email, users.createdAt)
        .orderBy(desc(sql`COALESCE(SUM(${payouts.amount}), 0)`))
        .limit(50);

      return clipperStats;
    } catch (error) {
      console.error('Error fetching top clippers:', error);
      throw new Error('Failed to fetch top clippers');
    }
  }

  // Mint a unique clipperPromoCode. 8-char uppercase alphanumeric drawn
  // from a 32-char alphabet that excludes ambiguous glyphs (no I, O, 0, 1)
  // so codes are easy to read off a screen and hard to mistype on a
  // checkout page. The partial unique index on clipper_campaigns
  // (clipper_promo_code) guarantees uniqueness; we pre-check to avoid
  // an INSERT failure path, but still retry on the rare collision.
  private async generateUniquePromoCode(): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars
    const codeLen = 8; // 32^8 ≈ 1.1e12 — collision risk is negligible
    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = randomBytes(codeLen);
      let code = "";
      for (let i = 0; i < codeLen; i++) {
        code += alphabet[bytes[i] % alphabet.length];
      }
      const [collision] = await db
        .select({ id: clipperCampaigns.id })
        .from(clipperCampaigns)
        .where(eq(clipperCampaigns.clipperPromoCode, code))
        .limit(1);
      if (!collision) return code;
    }
    // Fallback that's unlikely to collide even if 5 prior tries did.
    return `C${randomBytes(6).toString("hex").toUpperCase()}`;
  }

}

export const storage = new DatabaseStorage();
