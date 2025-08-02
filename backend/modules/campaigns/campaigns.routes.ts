import { Router } from "express";
import { CampaignController } from "./campaigns.controller";
import { requireAuth, requireCreator, requireRole } from "../auth/auth.guards";

const router = Router();
const campaignController = new CampaignController();

// Create campaign (creators only)
router.post("/", requireCreator, campaignController.createCampaign);

// Get all active campaigns (for marketplace)
router.get("/active", requireAuth, campaignController.getActiveCampaigns);

// Get user's campaigns
router.get("/my-campaigns", requireAuth, campaignController.getMyCampaigns);

// Get specific campaign
router.get("/:id", requireAuth, campaignController.getCampaign);

// Update campaign (creator only, own campaigns)
router.put("/:id", requireAuth, campaignController.updateCampaign);

// Delete campaign (creator only, own campaigns)
router.delete("/:id", requireAuth, campaignController.deleteCampaign);

// Get campaign metrics
router.get("/:id/metrics", requireAuth, campaignController.getCampaignMetrics);

// Apply to campaign (clippers only)
router.post("/:id/apply", requireRole(["clipper"]), campaignController.applyToCampaign);

export { router as campaignRoutes };