import { db } from "../db";
import { trackingEvents, users, campaigns, clipperCampaigns, socialMetrics } from "@shared/schema";
import { eq, and, desc, sum, count, sql } from "drizzle-orm";

export interface TrackingData {
  clipperCampaignId: string;
  eventType: 'click' | 'view' | 'signup' | 'deposit' | 'trade' | 'conversion';
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  socialPlatform?: string;
  contentId?: string;
  viewDuration?: number;
  metadata?: Record<string, any>;
}

export interface SocialMediaIntegration {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';
  username?: string;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  profileUrl?: string;
  followerCount?: number;
}

export class TrackingService {
  
  /**
   * Records a tracking event and calculates reward automatically
   */
  async recordTrackingEvent(data: TrackingData): Promise<{ eventId: string; rewardAmount: number; autoPayment?: boolean }> {
    try {
      // Get clipper campaign details
      const [clipperCampaign] = await db
        .select({
          id: clipperCampaigns.id,
          clipperId: clipperCampaigns.clipperId,
          campaignId: clipperCampaigns.campaignId,
          isApproved: clipperCampaigns.isApproved,
        })
        .from(clipperCampaigns)
        .where(eq(clipperCampaigns.id, data.clipperCampaignId));

      if (!clipperCampaign || !clipperCampaign.isApproved) {
        throw new Error("Invalid or unapproved clipper campaign");
      }

      // Get campaign reward rates
      const [campaign] = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          rewardRates: campaigns.rewardRates,
          status: campaigns.status,
          fundingStatus: campaigns.fundingStatus,
        })
        .from(campaigns)
        .where(eq(campaigns.id, clipperCampaign.campaignId));

      if (!campaign || campaign.status !== "active" || campaign.fundingStatus !== "funded") {
        throw new Error("Campaign is not active or not funded");
      }

      const rewardRates = JSON.parse(campaign.rewardRates);
      const rewardAmount = parseFloat(rewardRates[data.eventType] || "0");

      // Create tracking event
      const [trackingEvent] = await db
        .insert(trackingEvents)
        .values({
          clipperId: clipperCampaign.clipperId,
          campaignId: clipperCampaign.campaignId,
          clipperCampaignId: data.clipperCampaignId,
          eventType: data.eventType,
          eventValue: "1", // Default value for count-based events
          rewardAmount: rewardAmount.toString(),
          status: "verified", // Auto-verify for now
          metadata: JSON.stringify({
            userAgent: data.userAgent,
            referrer: data.referrer,
            socialPlatform: data.socialPlatform,
            contentId: data.contentId,
            viewDuration: data.viewDuration,
            ...data.metadata,
          }),
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
        })
        .returning();

      // Check if clipper has reached campaign goals after recording this event
      try {
        const { campaignCompletionService } = await import('./campaign-completion');
        const goalReached = await campaignCompletionService.checkAndUpdateClipperCompletion(data.clipperCampaignId);
        
        if (goalReached) {
          console.log(`🎯 Goal reached! Clipper campaign ${data.clipperCampaignId} automatically completed with escrow release`);
        }
      } catch (error: any) {
        console.error(`❌ Error checking goal completion for clipper campaign ${data.clipperCampaignId}:`, error.message);
        // Continue without throwing - completion can be checked manually later
      }

      return {
        eventId: trackingEvent.id,
        rewardAmount,
        autoPayment: rewardAmount > 0, // Indicates if payment will be processed
      };

    } catch (error: any) {
      console.error('Tracking event error:', error);
      throw new Error(error.message || "Failed to record tracking event");
    }
  }

  /**
   * Records a view event with duration and social platform context
   */
  async recordViewEvent(
    clipperCampaignId: string, 
    duration: number, 
    platform: string,
    contentId?: string,
    metadata?: Record<string, any>
  ) {
    // Views are often paid in batches (e.g., per 1000 views)
    return this.recordTrackingEvent({
      clipperCampaignId,
      eventType: 'view',
      socialPlatform: platform,
      contentId,
      viewDuration: duration,
      metadata,
    });
  }

  /**
   * Records engagement events (likes, shares, comments) that may contribute to view rewards
   */
  async recordEngagementEvent(
    clipperCampaignId: string,
    engagementType: 'like' | 'share' | 'comment' | 'subscribe',
    platform: string,
    contentId?: string,
    metadata?: Record<string, any>
  ) {
    return this.recordTrackingEvent({
      clipperCampaignId,
      eventType: 'view', // Engagement contributes to view metrics
      socialPlatform: platform,
      contentId,
      metadata: {
        engagementType,
        ...metadata,
      },
    });
  }

  /**
   * Updates social media account information for a user
   */
  async updateSocialMediaIntegration(userId: string, integration: SocialMediaIntegration) {
    try {
      // Get current social accounts
      const [user] = await db
        .select({ socialAccounts: users.socialAccounts })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error("User not found");
      }

      const currentAccounts = user.socialAccounts as any || {};
      
      // Update the specific platform
      currentAccounts[integration.platform] = {
        username: integration.username,
        userId: integration.userId,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        profileUrl: integration.profileUrl,
        followerCount: integration.followerCount,
        updatedAt: new Date().toISOString(),
      };

      // Update user record
      await db
        .update(users)
        .set({ socialAccounts: currentAccounts })
        .where(eq(users.id, userId));

      // Store metrics for tracking
      if (integration.followerCount) {
        await this.recordSocialMetrics(userId, integration.platform, {
          followers: integration.followerCount,
          lastUpdated: new Date().toISOString(),
        });
      }

      return { success: true, platform: integration.platform };

    } catch (error: any) {
      console.error('Social media integration error:', error);
      throw new Error(error.message || "Failed to update social media integration");
    }
  }

  /**
   * Records social media metrics for performance tracking
   */
  async recordSocialMetrics(userId: string, platform: string, metrics: Record<string, any>) {
    try {
      await db
        .insert(socialMetrics)
        .values({
          userId,
          platform,
          metrics,
        });

      return { success: true };
    } catch (error: any) {
      console.error('Social metrics error:', error);
      throw new Error("Failed to record social metrics");
    }
  }

  /**
   * Gets view-based earnings for a clipper on a specific campaign
   */
  async getViewBasedEarnings(clipperId: string, campaignId?: string) {
    try {
      let query = db
        .select({
          totalViews: count(trackingEvents.id),
          totalEarnings: sum(trackingEvents.rewardAmount),
          platform: trackingEvents.metadata,
        })
        .from(trackingEvents)
        .where(and(
          eq(trackingEvents.clipperId, clipperId),
          eq(trackingEvents.eventType, "view"),
          eq(trackingEvents.status, "verified")
        ));

      // If campaignId is provided, add it to the where clause
      if (campaignId) {
        query = db
          .select({
            totalViews: count(trackingEvents.id),
            totalEarnings: sum(trackingEvents.rewardAmount),
            platform: trackingEvents.metadata,
          })
          .from(trackingEvents)
          .where(and(
            eq(trackingEvents.clipperId, clipperId),
            eq(trackingEvents.campaignId, campaignId),
            eq(trackingEvents.eventType, "view"),
            eq(trackingEvents.status, "verified")
          ));
      }

      const results = await query;

      return results.map(result => ({
        platform: JSON.parse(result.platform || "{}").socialPlatform || "unknown",
        views: result.totalViews,
        earnings: parseFloat(result.totalEarnings || "0"),
      }));

    } catch (error: any) {
      console.error('View earnings error:', error);
      throw new Error("Failed to get view-based earnings");
    }
  }

  /**
   * Gets campaign performance metrics including views and engagement
   */
  async getCampaignPerformance(campaignId: string) {
    try {
      const [viewStats] = await db
        .select({
          totalViews: count(trackingEvents.id),
          totalEarnings: sum(trackingEvents.rewardAmount),
          uniqueClippers: sql`COUNT(DISTINCT ${trackingEvents.clipperId})`,
        })
        .from(trackingEvents)
        .where(and(
          eq(trackingEvents.campaignId, campaignId),
          eq(trackingEvents.eventType, "view")
        ));

      const platformBreakdown = await db
        .select({
          platform: sql`JSON_EXTRACT(${trackingEvents.metadata}, '$.socialPlatform')`,
          views: count(trackingEvents.id),
          earnings: sum(trackingEvents.rewardAmount),
        })
        .from(trackingEvents)
        .where(and(
          eq(trackingEvents.campaignId, campaignId),
          eq(trackingEvents.eventType, "view")
        ))
        .groupBy(sql`JSON_EXTRACT(${trackingEvents.metadata}, '$.socialPlatform')`);

      return {
        totalViews: viewStats?.totalViews || 0,
        totalEarnings: parseFloat(viewStats?.totalEarnings || "0"),
        uniqueClippers: viewStats?.uniqueClippers || 0,
        platformBreakdown: platformBreakdown.map(p => ({
          platform: p.platform || "unknown",
          views: p.views,
          earnings: parseFloat(p.earnings || "0"),
        })),
      };

    } catch (error: any) {
      console.error('Campaign performance error:', error);
      throw new Error("Failed to get campaign performance");
    }
  }

  /**
   * Ends a campaign and processes final payments
   */
  async endCampaign(campaignId: string, creatorId: string) {
    try {
      // Verify creator ownership
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.creatorId, creatorId)
        ));

      if (!campaign) {
        throw new Error("Campaign not found or unauthorized");
      }

      if (campaign.status === "completed") {
        throw new Error("Campaign is already completed");
      }

      // Update campaign status
      await db
        .update(campaigns)
        .set({ 
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      // Get pending events and process final payments
      const pendingEvents = await db
        .select()
        .from(trackingEvents)
        .where(and(
          eq(trackingEvents.campaignId, campaignId),
          eq(trackingEvents.status, "pending")
        ));

      // Auto-verify remaining events for final payment
      for (const event of pendingEvents) {
        await db
          .update(trackingEvents)
          .set({ status: "verified" })
          .where(eq(trackingEvents.id, event.id));
      }

      return {
        success: true,
        finalizedEvents: pendingEvents.length,
        message: "Campaign ended successfully. Final payments are being processed.",
      };

    } catch (error: any) {
      console.error('End campaign error:', error);
      throw new Error(error.message || "Failed to end campaign");
    }
  }

  /**
   * Creates unique tracking URLs for clippers
   */
  generateTrackingUrl(trackingCode: string, contentType: 'post' | 'video' | 'story' = 'post') {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    return `${baseUrl}/track/${trackingCode}?type=${contentType}&t=${Date.now()}`;
  }

  /**
   * Handles incoming tracking requests from social media platforms
   */
  async handleTrackingCallback(trackingCode: string, requestData: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    platform?: string;
    contentId?: string;
    viewDuration?: number;
  }) {
    try {
      // Find clipper campaign by tracking code
      const [clipperCampaign] = await db
        .select()
        .from(clipperCampaigns)
        .where(eq(clipperCampaigns.trackingCode, trackingCode));

      if (!clipperCampaign) {
        throw new Error("Invalid tracking code");
      }

      // Determine event type based on platform and interaction
      let eventType: 'click' | 'view' = 'click';
      if (requestData.viewDuration && requestData.viewDuration > 3) {
        eventType = 'view'; // Count as view if watched for more than 3 seconds
      }

      return await this.recordTrackingEvent({
        clipperCampaignId: clipperCampaign.id,
        eventType,
        userAgent: requestData.userAgent,
        ipAddress: requestData.ipAddress,
        referrer: requestData.referrer,
        socialPlatform: requestData.platform,
        contentId: requestData.contentId,
        viewDuration: requestData.viewDuration,
      });

    } catch (error: any) {
      console.error('Tracking callback error:', error);
      throw new Error(error.message || "Failed to handle tracking callback");
    }
  }
}

export const trackingService = new TrackingService();