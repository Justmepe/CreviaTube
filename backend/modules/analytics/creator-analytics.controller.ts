import { Request, Response } from "express";
import { CreatorAnalyticsService } from "./creator-analytics.service";

const creatorAnalyticsService = new CreatorAnalyticsService();

export const getInfluencerAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const metrics = await creatorAnalyticsService.getInfluencerMetrics(userId);
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching influencer analytics:", error);
    res.status(500).json({ message: "Failed to fetch influencer analytics" });
  }
};

export const getTraderAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const metrics = await creatorAnalyticsService.getTraderMetrics(userId);
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching trader analytics:", error);
    res.status(500).json({ message: "Failed to fetch trader analytics" });
  }
};

export const getEntrepreneurAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const metrics = await creatorAnalyticsService.getEntrepreneurMetrics(userId);
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching entrepreneur analytics:", error);
    res.status(500).json({ message: "Failed to fetch entrepreneur analytics" });
  }
};