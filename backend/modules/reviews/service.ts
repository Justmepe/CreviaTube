import { db } from '../../db';
import { clipperReviews, clipperStats, users, campaigns, clipperCampaigns } from '../../../shared/schema';
import { eq, desc, avg, sum, count, and, sql } from 'drizzle-orm';
import * as React from 'react';
import type { InsertClipperReview, ClipperReview, ClipperStats } from '../../../shared/schema';
import { sendEmail, APP_URL } from '../../lib/email';
import { ReviewReceived } from '../../emails/review-received';

export class ReviewService {
  /**
   * Submit a review for a clipper after campaign completion
   */
  async submitReview(reviewData: InsertClipperReview): Promise<string> {
    try {
      // Verify the creator can review this clipper (campaign must be completed)
      const [clipperCampaign] = await db
        .select({
          id: clipperCampaigns.id,
          isCompleted: clipperCampaigns.isCompleted,
          campaignId: clipperCampaigns.campaignId,
          clipperId: clipperCampaigns.clipperId,
          completionMetrics: clipperCampaigns.completionMetrics,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(
          and(
            eq(clipperCampaigns.id, reviewData.clipperCampaignId),
            eq(campaigns.creatorId, reviewData.creatorId),
            eq(clipperCampaigns.isCompleted, true)
          )
        );

      if (!clipperCampaign) {
        throw new Error('Cannot review: Campaign not completed or unauthorized');
      }

      // Check if review already exists
      const [existingReview] = await db
        .select()
        .from(clipperReviews)
        .where(
          and(
            eq(clipperReviews.clipperCampaignId, reviewData.clipperCampaignId),
            eq(clipperReviews.creatorId, reviewData.creatorId)
          )
        );

      if (existingReview) {
        throw new Error('Review already submitted for this campaign');
      }

      // Extract performance metrics from completion data
      const completionMetrics = clipperCampaign.completionMetrics as any;
      const metricsAchieved = {
        views: completionMetrics?.totalViews || 0,
        clicks: completionMetrics?.totalClicks || 0,
        signups: completionMetrics?.totalSignups || 0,
        deposits: completionMetrics?.totalDeposits || 0,
        trades: completionMetrics?.totalTrades || 0,
        conversions: completionMetrics?.totalConversions || 0,
        goalCompleted: !!completionMetrics?.goalReached,
        completionPercentage: completionMetrics?.goalReached?.achieved / completionMetrics?.goalReached?.target * 100 || 0,
      };

      // Insert the review
      const [review] = await db
        .insert(clipperReviews)
        .values({
          ...reviewData,
          metricsAchieved,
        })
        .returning();

      // Update clipper stats
      await this.updateClipperStats(reviewData.clipperId);

      // Notify the clipper of the new review (fire-and-forget)
      void (async () => {
        try {
          const [clipper] = await db.select({ id: users.id, email: users.email, fullName: users.fullName })
            .from(users).where(eq(users.id, reviewData.clipperId)).limit(1);
          const [creator] = await db.select({ fullName: users.fullName })
            .from(users).where(eq(users.id, reviewData.creatorId)).limit(1);
          const [campaign] = await db.select({ name: campaigns.name })
            .from(campaigns).where(eq(campaigns.id, reviewData.campaignId)).limit(1);
          if (!clipper || !creator || !campaign) return;
          await sendEmail({
            kind: "review_received",
            to: clipper.email,
            subject: `New ${Number(reviewData.overallRating).toFixed(1)}★ review from ${creator.fullName}`,
            react: React.createElement(ReviewReceived, {
              clipperFullName: clipper.fullName,
              creatorName: creator.fullName,
              campaignName: campaign.name,
              overallRating: Number(reviewData.overallRating),
              reviewTitle: reviewData.reviewTitle,
              appUrl: APP_URL,
            }),
            dedupeKey: `review_received:${review.id}`,
            userId: clipper.id,
          });
        } catch (err) {
          console.error("review_received email failed:", err);
        }
      })();

      console.log(`✅ Review submitted for clipper ${reviewData.clipperId} by creator ${reviewData.creatorId}`);
      return review.id;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a specific clipper with pagination
   */
  async getClipperReviews(clipperId: string, limit = 10, offset = 0) {
    try {
      const reviews = await db
        .select({
          id: clipperReviews.id,
          overallRating: clipperReviews.overallRating,
          qualityRating: clipperReviews.qualityRating,
          communicationRating: clipperReviews.communicationRating,
          timeliness: clipperReviews.timeliness,
          creativity: clipperReviews.creativity,
          professionalism: clipperReviews.professionalism,
          reviewTitle: clipperReviews.reviewTitle,
          reviewText: clipperReviews.reviewText,
          metricsAchieved: clipperReviews.metricsAchieved,
          wouldHireAgain: clipperReviews.wouldHireAgain,
          recommendToOthers: clipperReviews.recommendToOthers,
          tags: clipperReviews.tags,
          clipperResponse: clipperReviews.clipperResponse,
          clipperRespondedAt: clipperReviews.clipperRespondedAt,
          createdAt: clipperReviews.createdAt,
          // Creator info (anonymized for privacy)
          creatorName: users.fullName,
          campaignName: campaigns.name,
        })
        .from(clipperReviews)
        .innerJoin(users, eq(clipperReviews.creatorId, users.id))
        .innerJoin(campaigns, eq(clipperReviews.campaignId, campaigns.id))
        .where(eq(clipperReviews.clipperId, clipperId))
        .orderBy(desc(clipperReviews.createdAt))
        .limit(limit)
        .offset(offset);

      return reviews;
    } catch (error) {
      console.error('Error fetching clipper reviews:', error);
      throw error;
    }
  }

  /**
   * Get clipper stats and summary
   */
  async getClipperStats(clipperId: string): Promise<ClipperStats | null> {
    try {
      const [stats] = await db
        .select()
        .from(clipperStats)
        .where(eq(clipperStats.clipperId, clipperId));

      return stats || null;
    } catch (error) {
      console.error('Error fetching clipper stats:', error);
      throw error;
    }
  }

  /**
   * Get top-rated clippers for creator hiring
   */
  async getTopClippers(limit = 20, filterOptions?: {
    minRating?: number;
    tier?: string;
    tags?: string[];
    minCompletions?: number;
  }) {
    try {
      let query = db
        .select({
          clipperId: clipperStats.clipperId,
          clipperName: users.fullName,
          clipperUsername: users.username,
          averageRating: clipperStats.averageRating,
          totalReviews: clipperStats.totalReviews,
          totalCampaignsCompleted: clipperStats.totalCampaignsCompleted,
          successRate: clipperStats.successRate,
          tier: clipperStats.tier,
          rankingScore: clipperStats.rankingScore,
          qualityAverage: clipperStats.qualityAverage,
          communicationAverage: clipperStats.communicationAverage,
          timelinessAverage: clipperStats.timelinessAverage,
          creativityAverage: clipperStats.creativityAverage,
          professionalismAverage: clipperStats.professionalismAverage,
          totalViewsGenerated: clipperStats.totalViewsGenerated,
          totalClicksGenerated: clipperStats.totalClicksGenerated,
          totalSignupsGenerated: clipperStats.totalSignupsGenerated,
          positiveRecommendations: clipperStats.positiveRecommendations,
          lastActiveAt: clipperStats.lastActiveAt,
          isActive: clipperStats.isActive,
        })
        .from(clipperStats)
        .innerJoin(users, eq(clipperStats.clipperId, users.id))
        .where(eq(clipperStats.isActive, true));

      // Apply filters
      if (filterOptions?.minRating) {
        query = query.where(sql`${clipperStats.averageRating} >= ${filterOptions.minRating}`);
      }
      if (filterOptions?.tier) {
        query = query.where(eq(clipperStats.tier, filterOptions.tier));
      }
      if (filterOptions?.minCompletions) {
        query = query.where(sql`${clipperStats.totalCampaignsCompleted} >= ${filterOptions.minCompletions}`);
      }

      const clippers = await query
        .orderBy(desc(clipperStats.rankingScore), desc(clipperStats.averageRating))
        .limit(limit);

      return clippers;
    } catch (error) {
      console.error('Error fetching top clippers:', error);
      throw error;
    }
  }

  /**
   * Update clipper statistics based on reviews and performance
   */
  private async updateClipperStats(clipperId: string): Promise<void> {
    try {
      // Calculate rating averages from reviews
      const [reviewStats] = await db
        .select({
          totalReviews: count(clipperReviews.id),
          averageRating: avg(clipperReviews.overallRating),
          qualityAverage: avg(clipperReviews.qualityRating),
          communicationAverage: avg(clipperReviews.communicationRating),
          timelinessAverage: avg(clipperReviews.timeliness),
          creativityAverage: avg(clipperReviews.creativity),
          professionalismAverage: avg(clipperReviews.professionalism),
          positiveRecommendations: sum(sql`CASE WHEN ${clipperReviews.wouldHireAgain} THEN 1 ELSE 0 END`),
        })
        .from(clipperReviews)
        .where(eq(clipperReviews.clipperId, clipperId));

      // Calculate performance metrics from completed campaigns
      const [performanceStats] = await db
        .select({
          totalCampaignsCompleted: count(clipperCampaigns.id),
          totalViews: sum(sql`(${clipperCampaigns.completionMetrics}->>'totalViews')::int`),
          totalClicks: sum(sql`(${clipperCampaigns.completionMetrics}->>'totalClicks')::int`),
          totalSignups: sum(sql`(${clipperCampaigns.completionMetrics}->>'totalSignups')::int`),
          totalDeposits: sum(sql`(${clipperCampaigns.completionMetrics}->>'totalDeposits')::int`),
          totalTrades: sum(sql`(${clipperCampaigns.completionMetrics}->>'totalTrades')::int`),
          totalConversions: sum(sql`(${clipperCampaigns.completionMetrics}->>'totalConversions')::int`),
          avgCompletionDays: avg(sql`EXTRACT(DAY FROM ${clipperCampaigns.completedAt} - ${clipperCampaigns.joinedAt})`),
        })
        .from(clipperCampaigns)
        .where(
          and(
            eq(clipperCampaigns.clipperId, clipperId),
            eq(clipperCampaigns.isCompleted, true)
          )
        );

      // Calculate success rate and tier
      const totalCampaigns = performanceStats?.totalCampaignsCompleted || 0;
      const completedCampaigns = totalCampaigns;
      const successRate = totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0;

      // Calculate ranking score (weighted formula)
      const avgRating = Number(reviewStats?.averageRating || 0);
      const reviewCount = Number(reviewStats?.totalReviews || 0);
      const campaignCount = Number(totalCampaigns);
      
      const rankingScore = 
        (avgRating * 0.4) +
        (Math.min(reviewCount, 50) * 0.3) +  // Cap review count impact
        (Math.min(campaignCount, 100) * 0.2) +  // Cap campaign count impact
        (successRate * 0.1);

      // Determine tier based on ranking score and experience
      let tier = 'bronze';
      if (rankingScore >= 4.5 && campaignCount >= 20) tier = 'diamond';
      else if (rankingScore >= 4.0 && campaignCount >= 15) tier = 'platinum';
      else if (rankingScore >= 3.5 && campaignCount >= 10) tier = 'gold';
      else if (rankingScore >= 3.0 && campaignCount >= 5) tier = 'silver';

      // Upsert clipper stats
      await db
        .insert(clipperStats)
        .values({
          clipperId,
          averageRating: avgRating.toString(),
          totalReviews: reviewCount,
          qualityAverage: (Number(reviewStats?.qualityAverage || 0)).toString(),
          communicationAverage: (Number(reviewStats?.communicationAverage || 0)).toString(),
          timelinessAverage: (Number(reviewStats?.timelinessAverage || 0)).toString(),
          creativityAverage: (Number(reviewStats?.creativityAverage || 0)).toString(),
          professionalismAverage: (Number(reviewStats?.professionalismAverage || 0)).toString(),
          totalCampaignsCompleted: totalCampaigns,
          successRate: successRate.toString(),
          averageCompletionTime: Math.round(Number(performanceStats?.avgCompletionDays || 0)),
          totalViewsGenerated: Number(performanceStats?.totalViews || 0),
          totalClicksGenerated: Number(performanceStats?.totalClicks || 0),
          totalSignupsGenerated: Number(performanceStats?.totalSignups || 0),
          totalDepositsGenerated: Number(performanceStats?.totalDeposits || 0),
          totalTradesGenerated: Number(performanceStats?.totalTrades || 0),
          totalConversionsGenerated: Number(performanceStats?.totalConversions || 0),
          positiveRecommendations: Number(reviewStats?.positiveRecommendations || 0),
          rankingScore: rankingScore.toString(),
          tier,
          lastActiveAt: new Date(),
        })
        .onConflictDoUpdate({
          target: clipperStats.clipperId,
          set: {
            averageRating: avgRating.toString(),
            totalReviews: reviewCount,
            qualityAverage: (Number(reviewStats?.qualityAverage || 0)).toString(),
            communicationAverage: (Number(reviewStats?.communicationAverage || 0)).toString(),
            timelinessAverage: (Number(reviewStats?.timelinessAverage || 0)).toString(),
            creativityAverage: (Number(reviewStats?.creativityAverage || 0)).toString(),
            professionalismAverage: (Number(reviewStats?.professionalismAverage || 0)).toString(),
            totalCampaignsCompleted: totalCampaigns,
            successRate: successRate.toString(),
            averageCompletionTime: Math.round(Number(performanceStats?.avgCompletionDays || 0)),
            totalViewsGenerated: Number(performanceStats?.totalViews || 0),
            totalClicksGenerated: Number(performanceStats?.totalClicks || 0),
            totalSignupsGenerated: Number(performanceStats?.totalSignups || 0),
            totalDepositsGenerated: Number(performanceStats?.totalDeposits || 0),
            totalTradesGenerated: Number(performanceStats?.totalTrades || 0),
            totalConversionsGenerated: Number(performanceStats?.totalConversions || 0),
            positiveRecommendations: Number(reviewStats?.positiveRecommendations || 0),
            rankingScore: rankingScore.toString(),
            tier,
            lastActiveAt: new Date(),
            updatedAt: new Date(),
          },
        });

      console.log(`✅ Updated stats for clipper ${clipperId}: ${avgRating}/5 (${reviewCount} reviews), ${tier} tier`);
    } catch (error) {
      console.error('Error updating clipper stats:', error);
      throw error;
    }
  }

  /**
   * Respond to a review as a clipper
   */
  async respondToReview(reviewId: string, clipperId: string, response: string): Promise<void> {
    try {
      await db
        .update(clipperReviews)
        .set({
          clipperResponse: response,
          clipperRespondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clipperReviews.id, reviewId),
            eq(clipperReviews.clipperId, clipperId)
          )
        );

      console.log(`✅ Clipper ${clipperId} responded to review ${reviewId}`);
    } catch (error) {
      console.error('Error responding to review:', error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();