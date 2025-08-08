import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../../storage";
import { insertCampaignSchema } from "../../../shared/schema";

const router = Router();

// Get campaigns
router.get("/", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    console.log(`User ${req.user.username} (${req.user.role}, ${req.user.userType}) requesting campaigns`);
    
    if (req.user.role === "creator") {
      const campaigns = await storage.getCampaignsByCreator(req.user.id);
      console.log(`Found ${campaigns.length} campaigns for creator ${req.user.username}`);
      res.json(campaigns);
    } else if (req.user.role === "admin") {
      const campaigns = await storage.getAllCampaigns();
      console.log(`Found ${campaigns.length} total campaigns for admin ${req.user.username}`);
      res.json(campaigns);
    } else if (req.user.role === "clipper") {
      const campaigns = await storage.getAvailableCampaigns();
      console.log(`Found ${campaigns.length} available campaigns for clipper ${req.user.username}`);
      res.json(campaigns);
    } else {
      res.status(403).json({ message: "Access denied" });
    }
  } catch (error: any) {
    console.error('Campaigns fetch error:', error);
    res.status(500).json({ message: "Failed to fetch campaigns", error: error.message });
  }
});

// Get single campaign by ID
router.get("/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const { id } = req.params;
    const campaign = await storage.getCampaign(id);
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    // Check if user has permission to view this campaign
    if (req.user.role === "creator" && campaign.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(campaign);
  } catch (error: any) {
    console.error('Campaign fetch error:', error);
    res.status(500).json({ message: "Failed to fetch campaign", error: error.message });
  }
});

// Create campaign
router.post("/", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== "creator") {
    return res.status(403).json({ message: "Only creators can create campaigns" });
  }

  try {
    const validatedData = insertCampaignSchema.parse({
      ...req.body,
      creatorId: req.user.id,
      fundingStatus: "pending",
    });

    const campaign = await storage.createCampaign(validatedData);
    res.status(201).json({
      ...campaign,
      message: "Campaign created successfully. Please fund it to activate."
    });
  } catch (error: any) {
    console.error('Campaign creation error:', error);
    res.status(400).json({ message: "Invalid campaign data", error: error.message });
  }
});

export { router as campaignsAPI };