import { Request, Response } from 'express';
import { reviewService } from './service';
import { insertClipperReviewSchema } from '../../../shared/schema';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

export class ReviewController {
  /**
   * Submit a review for a clipper
   */
  async submitReview(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate request body
      const result = insertClipperReviewSchema.safeParse({
        ...req.body,
        creatorId: userId,
      });

      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }

      const reviewId = await reviewService.submitReview(result.data);

      res.status(201).json({ 
        success: true, 
        reviewId,
        message: 'Review submitted successfully' 
      });
    } catch (error: any) {
      console.error('Error in submitReview:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get reviews for a specific clipper
   */
  async getClipperReviews(req: Request, res: Response) {
    try {
      const { clipperId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const reviews = await reviewService.getClipperReviews(clipperId, limit, offset);

      res.json(reviews);
    } catch (error: any) {
      console.error('Error in getClipperReviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }

  /**
   * Get clipper stats and profile
   */
  async getClipperProfile(req: Request, res: Response) {
    try {
      const { clipperId } = req.params;

      const [stats, reviews] = await Promise.all([
        reviewService.getClipperStats(clipperId),
        reviewService.getClipperReviews(clipperId, 5, 0), // Get latest 5 reviews
      ]);

      res.json({
        stats,
        recentReviews: reviews,
      });
    } catch (error: any) {
      console.error('Error in getClipperProfile:', error);
      res.status(500).json({ error: 'Failed to fetch clipper profile' });
    }
  }

  /**
   * Get top-rated clippers for hiring
   */
  async getTopClippers(req: Request, res: Response) {
    try {
      const {
        limit = 20,
        minRating,
        tier,
        minCompletions,
        tags,
      } = req.query;

      const filterOptions: any = {};
      if (minRating) filterOptions.minRating = parseFloat(minRating as string);
      if (tier) filterOptions.tier = tier as string;
      if (minCompletions) filterOptions.minCompletions = parseInt(minCompletions as string);
      if (tags) filterOptions.tags = (tags as string).split(',');

      const clippers = await reviewService.getTopClippers(
        parseInt(limit as string),
        filterOptions
      );

      res.json(clippers);
    } catch (error: any) {
      console.error('Error in getTopClippers:', error);
      res.status(500).json({ error: 'Failed to fetch top clippers' });
    }
  }

  /**
   * Respond to a review as a clipper
   */
  async respondToReview(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { reviewId } = req.params;
      const { response } = req.body;

      if (!response || response.trim().length < 10) {
        return res.status(400).json({ error: 'Response must be at least 10 characters' });
      }

      await reviewService.respondToReview(reviewId, userId, response.trim());

      res.json({ success: true, message: 'Response submitted successfully' });
    } catch (error: any) {
      console.error('Error in respondToReview:', error);
      res.status(500).json({ error: 'Failed to submit response' });
    }
  }

  /**
   * Get review analytics for a creator
   */
  async getCreatorReviewAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // This would show the creator's submitted reviews and their impact
      // Implementation can be added based on specific requirements
      
      res.json({ 
        message: 'Review analytics endpoint ready for implementation',
        userId 
      });
    } catch (error: any) {
      console.error('Error in getCreatorReviewAnalytics:', error);
      res.status(500).json({ error: 'Failed to fetch review analytics' });
    }
  }
}

export const reviewController = new ReviewController();