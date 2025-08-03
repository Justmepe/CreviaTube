import { Express } from "express";
import { GoalCompletionService } from "../services/goal-completion.service";

export function setupGoalCompletionAPI(app: Express) {
  const goalCompletionService = new GoalCompletionService();

  // Process all goal completions (admin or scheduled task)
  app.post("/api/admin/process-goal-completions", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.sendStatus(403);
    }
    
    try {
      const result = await goalCompletionService.processGoalCompletions();
      res.json(result);
    } catch (error: any) {
      console.error('Error processing goal completions:', error);
      res.status(500).json({ message: "Failed to process goal completions", error: error.message });
    }
  });

  // Check specific clipper completion
  app.post("/api/clipper-campaigns/:clipperCampaignId/check-completion", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { clipperCampaignId } = req.params;
      const result = await goalCompletionService.checkClipperCompletion(clipperCampaignId);
      res.json(result);
    } catch (error: any) {
      console.error('Error checking clipper completion:', error);
      res.status(500).json({ message: "Failed to check completion", error: error.message });
    }
  });

  // Get campaign completion stats
  app.get("/api/campaigns/:campaignId/completion-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { campaignId } = req.params;
      const stats = await goalCompletionService.getCampaignCompletionStats(campaignId);
      res.json(stats);
    } catch (error: any) {
      console.error('Error getting completion stats:', error);
      res.status(500).json({ message: "Failed to get completion stats", error: error.message });
    }
  });
}