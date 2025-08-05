import { Router } from 'express';
import { reviewController } from './controller';
// Simple auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const router = Router();

// Review submission and management
router.post('/reviews', requireAuth, reviewController.submitReview);
router.post('/reviews/:reviewId/respond', requireAuth, reviewController.respondToReview);

// Clipper profiles and stats
router.get('/clippers/top', reviewController.getTopClippers);
router.get('/clippers/:clipperId/reviews', reviewController.getClipperReviews);
router.get('/clippers/:clipperId/profile', reviewController.getClipperProfile);

// Creator analytics
router.get('/reviews/analytics', requireAuth, reviewController.getCreatorReviewAnalytics);

export default router;