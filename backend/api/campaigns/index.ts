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

// Get user's campaigns (my-campaigns endpoint)
router.get("/my-campaigns", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    console.log(`User ${req.user.username} (${req.user.role}, ${req.user.userType}) requesting my campaigns`);
    
    if (req.user.role === "creator") {
      const campaigns = await storage.getCampaignsByCreator(req.user.id);
      console.log(`Found ${campaigns.length} campaigns for creator ${req.user.username}`);
      res.json(campaigns);
    } else if (req.user.role === "clipper") {
      const clipperCampaigns = await storage.getClipperCampaignsByClipper(req.user.id);
      console.log(`Found ${clipperCampaigns.length} clipper campaigns for ${req.user.username}`);
      res.json(clipperCampaigns);
    } else {
      res.status(403).json({ message: "Access denied" });
    }
  } catch (error: any) {
    console.error('My campaigns fetch error:', error);
    res.status(500).json({ message: "Failed to fetch my campaigns", error: error.message });
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

// Additional campaign endpoints needed by frontend
router.get("/available", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const campaigns = await storage.getAvailableCampaigns();
    // Filter for standard campaigns (not cold outreach) 
    const standardCampaigns = campaigns.filter(c => c.campaignType !== "cold_outreach");
    res.json(standardCampaigns);
  } catch (error: any) {
    console.error('Available campaigns fetch error:', error);
    res.status(500).json({ message: "Failed to fetch available campaigns", error: error.message });
  }
});

router.get("/cold-outreach", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const campaigns = await storage.getAvailableCampaigns();
    // Filter for cold outreach campaigns only
    const coldOutreachCampaigns = campaigns.filter(c => c.campaignType === "cold_outreach");
    res.json(coldOutreachCampaigns);
  } catch (error: any) {
    console.error('Cold outreach campaigns fetch error:', error);
    res.status(500).json({ message: "Failed to fetch cold outreach campaigns", error: error.message });
  }
});

router.get("/with-clippers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== "creator") {
    return res.status(403).json({ message: "Only creators can view campaigns with clippers" });
  }

  try {
    const campaignsWithClippers = await storage.getCampaignsWithClippers(req.user.id);
    res.json(campaignsWithClippers);
  } catch (error: any) {
    console.error('Campaigns with clippers fetch error:', error);
    res.status(500).json({ message: "Failed to fetch campaigns with clippers", error: error.message });
  }
});

// Campaign funding endpoint
router.post("/:id/fund", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== "creator") {
    return res.status(403).json({ message: "Only creators can fund campaigns" });
  }

  try {
    const { id } = req.params;
    const { method, phoneNumber, email } = req.body;
    
    if (!method) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    const campaign = await storage.getCampaign(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    if (campaign.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // For now, simulate successful funding
    await storage.updateCampaignFundingStatus(id, "funded");
    
    res.json({ 
      message: "Campaign funded successfully",
      transactionId: `txn_${Date.now()}`,
      status: "funded"
    });
  } catch (error: any) {
    console.error('Campaign funding error:', error);
    res.status(500).json({ message: "Failed to fund campaign", error: error.message });
  }
});

// Campaign application endpoint
router.post("/:id/apply", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== "clipper") {
    return res.status(403).json({ message: "Only clippers can apply to campaigns" });
  }

  try {
    const { id } = req.params;
    const applicationData = {
      ...req.body,
      clipperId: req.user.id,
      campaignId: id,
    };

    const application = await storage.createClipperApplication(applicationData);
    res.status(201).json({
      ...application,
      message: "Application submitted successfully"
    });
  } catch (error: any) {
    console.error('Campaign application error:', error);
    res.status(400).json({ message: "Failed to submit application", error: error.message });
  }
});

// Campaign funding status endpoint
router.get("/:id/funding-status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const { id } = req.params;
    const campaign = await storage.getCampaign(id);
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    // Check permissions
    if (req.user.role === "creator" && campaign.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json({
      status: campaign.fundingStatus,
      budget: campaign.budget,
      funded: campaign.fundingStatus === "funded"
    });
  } catch (error: any) {
    console.error('Funding status fetch error:', error);
    res.status(500).json({ message: "Failed to fetch funding status", error: error.message });
  }
});

export { router as campaignsAPI };