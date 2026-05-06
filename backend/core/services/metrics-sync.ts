// Unified Metrics Synchronization Service
import { db } from "../../db";
import { users, socialMetrics, websiteMetrics } from "../../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { SocialMediaAggregator } from "./social-media-apis";
import { WebAnalyticsAggregator } from "./analytics-apis";

export class MetricsSyncService {
  private socialAggregator: SocialMediaAggregator;
  private webAggregator: WebAnalyticsAggregator;

  constructor() {
    this.socialAggregator = new SocialMediaAggregator();
    this.webAggregator = new WebAnalyticsAggregator();
  }

  // Sync all metrics for a specific user
  async syncUserMetrics(userId: string) {
    console.log(`Starting metrics sync for user: ${userId}`);

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const results = {
        social: null as any,
        website: null as any,
        errors: [] as string[]
      };

      // Sync Social Media Metrics
      if (user.socialAccounts && Object.keys(user.socialAccounts).length > 0) {
        try {
          console.log(`Syncing social media metrics for user: ${userId}`);
          const socialData = await this.socialAggregator.aggregateMetrics(user.socialAccounts);

          for (const [platform, metrics] of Object.entries(socialData)) {
            await db
              .insert(socialMetrics)
              .values({
                userId,
                platform,
                metrics: metrics as any,
                lastSyncAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [socialMetrics.userId, socialMetrics.platform],
                set: {
                  metrics: metrics as any,
                  lastSyncAt: new Date(),
                }
              });
          }

          results.social = socialData;
          console.log(`✅ Social media metrics synced for ${Object.keys(socialData).length} platforms`);
        } catch (error) {
          console.error(`❌ Social media sync error for user ${userId}:`, error);
          results.errors.push(`Social media: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Sync Website Analytics
      if (user.businessIntegration?.website || user.businessIntegration?.googleAnalyticsId) {
        try {
          console.log(`Syncing website analytics for user: ${userId}`);
          const websiteData = await this.webAggregator.aggregateMetrics(user.businessIntegration);

          const websiteUrl = user.businessIntegration.website || 'analytics-only';
          await db
            .insert(websiteMetrics)
            .values({
              userId,
              websiteUrl,
              metrics: websiteData as any,
              lastSyncAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [websiteMetrics.userId, websiteMetrics.websiteUrl],
              set: {
                metrics: websiteData as any,
                lastSyncAt: new Date(),
              }
            });

          results.website = websiteData;
          console.log(`✅ Website analytics synced`);
        } catch (error) {
          console.error(`❌ Website analytics sync error for user ${userId}:`, error);
          results.errors.push(`Website: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`✅ Metrics sync completed for user: ${userId}`);
      return results;

    } catch (error) {
      console.error(`❌ Metrics sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  async syncAllUsersMetrics() {
    console.log('Starting bulk metrics sync for all users...');

    try {
      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.isActive, true));

      console.log(`Found ${activeUsers.length} active users to sync`);

      const results = [];
      for (const user of activeUsers) {
        try {
          const result = await this.syncUserMetrics(user.id);
          results.push({ userId: user.id, success: true, data: result });
        } catch (error) {
          console.error(`Failed to sync user ${user.id}:`, error);
          results.push({ userId: user.id, success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`✅ Bulk sync completed: ${successful} successful, ${failed} failed`);
      return { successful, failed, results };

    } catch (error) {
      console.error('❌ Bulk metrics sync failed:', error);
      throw error;
    }
  }

  async getUserMetrics(userId: string) {
    try {
      const [socialData, websiteData] = await Promise.all([
        db.select().from(socialMetrics).where(eq(socialMetrics.userId, userId)),
        db.select().from(websiteMetrics).where(eq(websiteMetrics.userId, userId))
      ]);

      return {
        social: socialData.reduce((acc, item) => {
          acc[item.platform] = {
            metrics: item.metrics,
            lastSyncAt: item.lastSyncAt
          };
          return acc;
        }, {} as Record<string, any>),

        website: websiteData.reduce((acc, item) => {
          acc[item.websiteUrl] = {
            metrics: item.metrics,
            lastSyncAt: item.lastSyncAt
          };
          return acc;
        }, {} as Record<string, any>)
      };
    } catch (error) {
      console.error(`Error fetching metrics for user ${userId}:`, error);
      throw error;
    }
  }

  async scheduleSync(intervalMinutes: number = 60) {
    console.log(`Setting up automatic metrics sync every ${intervalMinutes} minutes`);

    const syncInterval = setInterval(async () => {
      try {
        console.log('🔄 Running scheduled metrics sync...');
        await this.syncAllUsersMetrics();
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    setTimeout(() => {
      this.syncAllUsersMetrics().catch(console.error);
    }, 5000);

    return syncInterval;
  }

  async syncByCreatorType(creatorType: 'influencer' | 'business') {
    console.log(`Syncing metrics for creator type: ${creatorType}`);

    try {
      const creators = await db
        .select()
        .from(users)
        .where(and(eq(users.accountType, creatorType), eq(users.isActive, true)));

      console.log(`Found ${creators.length} active ${creatorType} creators`);

      const results = [];
      for (const creator of creators) {
        try {
          const result = await this.syncUserMetrics(creator.id);
          results.push({ userId: creator.id, success: true, data: result });
        } catch (error) {
          console.error(`Failed to sync ${creatorType} creator ${creator.id}:`, error);
          results.push({ userId: creator.id, success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }

      return results;
    } catch (error) {
      console.error(`Error syncing ${creatorType} creators:`, error);
      throw error;
    }
  }
}

export const metricsSyncService = new MetricsSyncService();
