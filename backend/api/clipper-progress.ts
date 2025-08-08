import type { Express } from "express";
import { campaignCompletionService } from "../core/services/campaign-completion";

export function setupClipperProgressRoutes(app: Express) {
  // Get clipper's progress for a specific campaign
  app.get("/api/clipper-campaigns/:clipperCampaignId/progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { clipperCampaignId } = req.params;
      
      // Verify the clipper campaign belongs to the authenticated user
      // (This should be done via storage service - simplified for now)
      
      const progress = await campaignCompletionService.getClipperProgress(clipperCampaignId);
      res.json(progress);
    } catch (error: any) {
      console.error('Error fetching clipper progress:', error);
      res.status(500).json({ message: "Failed to fetch progress", error: error.message });
    }
  });

  // Manually check and update clipper completion (for testing or admin purposes)
  app.post("/api/clipper-campaigns/:clipperCampaignId/check-completion", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { clipperCampaignId } = req.params;
      
      const isCompleted = await campaignCompletionService.checkAndUpdateClipperCompletion(clipperCampaignId);
      
      res.json({
        clipperCampaignId,
        wasCompleted: isCompleted,
        message: isCompleted ? "Campaign completed!" : "Campaign not yet completed"
      });
    } catch (error: any) {
      console.error('Error checking completion:', error);
      res.status(500).json({ message: "Failed to check completion", error: error.message });
    }
  });
}