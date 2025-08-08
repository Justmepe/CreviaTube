import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../../storage";
import { insertPlatformReviewSchema } from "../../../shared/schema";

const router = Router();

// Get platform reviews
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, userId, limit } = req.query;
    const reviews = await storage.getPlatformReviews({
      status: status as string,
      userId: userId as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(reviews);
  } catch (error: any) {
    console.error('Platform reviews fetch error:', error);
    res.status(500).json({ message: "Failed to fetch platform reviews", error: error.message });
  }
});

// Get platform review statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await storage.getPlatformReviewStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Platform review stats error:', error);
    res.status(500).json({ message: "Failed to fetch platform review stats", error: error.message });
  }
});

// Create a platform review
router.post("/", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const reviewData = insertPlatformReviewSchema.parse({
      ...req.body,
      userId: req.user.id,
      status: "published", // Auto-publish for now
      isVerified: true, // Auto-verify authenticated users
    });

    const review = await storage.createPlatformReview(reviewData);
    res.status(201).json({ review });
  } catch (error: any) {
    console.error('Platform review creation error:', error);
    res.status(400).json({ message: "Failed to create platform review", error: error.message });
  }
});

export { router as platformReviewsAPI };