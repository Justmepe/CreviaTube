import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { escrowService } from "./services/escrow-service";
import { trackingService } from "./services/tracking-service";
import { insertCampaignSchema, insertClipperCampaignSchema, insertTrackingEventSchema } from "@shared/schema";
import { randomBytes } from "crypto";
// PesaPal configuration for African payments
let pesapalConfigured = false;

if (process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET) {
  pesapalConfigured = true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Campaign routes
  app.get("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (req.user.role === "creator") {
        const campaigns = await storage.getCampaignsByCreator(req.user.id);
        res.json(campaigns);
      } else {
        res.status(403).json({ message: "Only creators can view campaigns" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "creator") {
      return res.status(403).json({ message: "Only creators can create campaigns" });
    }

    try {
      const validatedData = insertCampaignSchema.parse({
        ...req.body,
        creatorId: req.user.id,
        fundingStatus: "pending", // All campaigns start as pending funding
      });

      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json({
        ...campaign,
        message: "Campaign created successfully. Please fund it to activate."
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid campaign data", error });
    }
  });

  // Campaign funding endpoints
  app.post("/api/campaigns/:id/fund", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "creator") {
      return res.status(403).json({ message: "Only creators can fund campaigns" });
    }

    try {
      const { method, phoneNumber, email } = req.body;
      if (!method) {
        return res.status(400).json({ message: "Payment method is required" });
      }

      if (method === "mpesa" && !phoneNumber) {
        return res.status(400).json({ message: "Phone number is required for M-Pesa payments" });
      }

      const result = await escrowService.fundCampaign(req.params.id, {
        method,
        phoneNumber,
        email: email || req.user.email,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/campaigns/:id/funding-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const escrowStatus = await escrowService.getEscrowStatus(req.params.id);
      res.json(escrowStatus);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PesaPal payment methods endpoint
  app.get("/api/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    if (!pesapalConfigured) {
      return res.status(500).json({ 
        message: "Payment system not configured",
        availableMethods: [] 
      });
    }

    res.json({
      availableMethods: [
        {
          id: "mpesa",
          name: "M-Pesa",
          description: "Pay with M-Pesa mobile money",
          icon: "phone",
          requiresPhone: true,
        },
        {
          id: "airtel_money",
          name: "Airtel Money",
          description: "Pay with Airtel Money",
          icon: "phone",
          requiresPhone: true,
        },
        {
          id: "card",
          name: "Credit/Debit Card",
          description: "Pay with Visa, MasterCard",
          icon: "credit-card",
          requiresPhone: false,
        },
        {
          id: "bank",
          name: "Bank Transfer",
          description: "Direct bank transfer",
          icon: "building",
          requiresPhone: false,
        }
      ]
    });
  });

  // PesaPal callback endpoint
  app.post("/api/pesapal/callback", async (req, res) => {
    try {
      const { OrderTrackingId, OrderNotificationType } = req.body;
      
      // Update campaign funding status based on payment result
      if (OrderNotificationType === "COMPLETED") {
        // Find campaign by transaction ID and update status
        console.log(`PesaPal payment completed: ${OrderTrackingId}`);
        // Update campaign funding status to funded
      }
      
      res.json({ status: "received" });
    } catch (error: any) {
      console.error('PesaPal callback error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Check if user has access to this campaign
      if (req.user.role === "creator" && campaign.creatorId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  // Clipper campaign routes
  app.get("/api/clipper-campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      if (req.user.role === "clipper") {
        const clipperCampaigns = await storage.getClipperCampaignsByClipper(req.user.id);
        res.json(clipperCampaigns);
      } else if (req.user.role === "creator") {
        // Get all clipper campaigns for creator's campaigns
        const campaigns = await storage.getCampaignsByCreator(req.user.id);
        const allClipperCampaigns = [];
        
        for (const campaign of campaigns) {
          const clipperCampaigns = await storage.getClipperCampaignsByCampaign(campaign.id);
          allClipperCampaigns.push(...clipperCampaigns);
        }
        
        res.json(allClipperCampaigns);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clipper campaigns" });
    }
  });

  app.post("/api/clipper-campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "clipper") {
      return res.status(403).json({ message: "Only clippers can join campaigns" });
    }

    try {
      // Check if clipper already joined this campaign
      const existing = await storage.getClipperCampaign(req.user.id, req.body.campaignId);
      if (existing) {
        return res.status(400).json({ message: "Already joined this campaign" });
      }

      // Generate unique tracking code
      const trackingCode = `${req.user.username}-${randomBytes(4).toString('hex')}`;

      const validatedData = insertClipperCampaignSchema.parse({
        clipperId: req.user.id,
        campaignId: req.body.campaignId,
        trackingCode,
      });

      const clipperCampaign = await storage.createClipperCampaign(validatedData);
      res.status(201).json(clipperCampaign);
    } catch (error) {
      res.status(400).json({ message: "Failed to join campaign", error });
    }
  });

  // Tracking routes
  app.get("/api/tracking-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      if (req.user.role === "clipper") {
        const events = await storage.getTrackingEventsByClipper(req.user.id);
        res.json(events);
      } else if (req.user.role === "creator") {
        // Get events for creator's campaigns
        const campaigns = await storage.getCampaignsByCreator(req.user.id);
        const allEvents = [];
        
        for (const campaign of campaigns) {
          const events = await storage.getTrackingEventsByCampaign(campaign.id);
          allEvents.push(...events);
        }
        
        res.json(allEvents);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tracking events" });
    }
  });

  app.post("/api/tracking-events", async (req, res) => {
    try {
      const validatedData = insertTrackingEventSchema.parse(req.body);
      const event = await storage.createTrackingEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid tracking event data", error });
    }
  });

  // Analytics routes
  app.get("/api/analytics/clipper/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only allow clippers to view their own analytics or creators to view their clippers' analytics
    if (req.user.role === "clipper" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const earnings = await storage.getClipperEarnings(req.params.id);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/campaign/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Only campaign creator can view analytics
      if (req.user.role === "creator" && campaign.creatorId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getCampaignStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign analytics" });
    }
  });

  // Payout routes
  app.get("/api/payouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "clipper") {
      return res.status(403).json({ message: "Only clippers can view payouts" });
    }

    try {
      const payouts = await storage.getPayoutsByClipper(req.user.id);
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  app.post("/api/payouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "clipper") {
      return res.status(403).json({ message: "Only clippers can request payouts" });
    }

    try {
      const earnings = await storage.getClipperEarnings(req.user.id);
      const requestedAmount = parseFloat(req.body.amount);

      if (requestedAmount > earnings.pending) {
        return res.status(400).json({ message: "Insufficient available balance" });
      }

      const payout = await storage.createPayout({
        clipperId: req.user.id,
        amount: req.body.amount,
        mpesaNumber: req.body.mpesaNumber || req.user.mpesaNumber,
        status: "pending",
      });

      res.status(201).json(payout);
    } catch (error) {
      res.status(400).json({ message: "Failed to create payout request", error });
    }
  });

  // Metrics endpoints
  app.get("/api/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { metricsSyncService } = await import("./services/metrics-sync");
      const metrics = await metricsSyncService.getUserMetrics(req.user.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.post("/api/metrics/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { metricsSyncService } = await import("./services/metrics-sync");
      const result = await metricsSyncService.syncUserMetrics(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to sync metrics" });
    }
  });

  app.post("/api/metrics/sync-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { metricsSyncService } = await import("./services/metrics-sync");
      const result = await metricsSyncService.syncAllUsersMetrics();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to sync all metrics" });
    }
  });

  app.put("/api/user/integrations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { socialAccounts, tradingAccounts, businessIntegration } = req.body;
      
      const updatedUser = await storage.updateUserIntegrations(req.user.id, {
        socialAccounts,
        tradingAccounts,
        businessIntegration,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update integrations" });
    }
  });

  // Public tracking endpoint (for link clicks)
  app.get("/track/:trackingCode", async (req, res) => {
    try {
      // TODO: Implement tracking logic here
      // This would redirect to the actual destination while logging the click
      res.redirect("https://deriv.com");
    } catch (error) {
      res.status(500).json({ message: "Tracking failed" });
    }
  });

  // Enhanced tracking endpoints
  app.post("/api/tracking/record", async (req, res) => {
    try {
      const result = await trackingService.recordTrackingEvent(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/tracking/view", async (req, res) => {
    try {
      const { clipperCampaignId, duration, platform, contentId, metadata } = req.body;
      const result = await trackingService.recordViewEvent(
        clipperCampaignId, 
        duration, 
        platform, 
        contentId, 
        metadata
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/tracking/engagement", async (req, res) => {
    try {
      const { clipperCampaignId, engagementType, platform, contentId, metadata } = req.body;
      const result = await trackingService.recordEngagementEvent(
        clipperCampaignId,
        engagementType,
        platform,
        contentId,
        metadata
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Social media integration endpoints  
  app.post("/api/users/:id/social-integration", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only allow users to update their own social accounts or admins
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const result = await trackingService.updateSocialMediaIntegration(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Campaign management endpoints
  app.post("/api/campaigns/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "creator") {
      return res.status(403).json({ message: "Only creators can end campaigns" });
    }

    try {
      const result = await trackingService.endCampaign(req.params.id, req.user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/campaigns/:id/performance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const performance = await trackingService.getCampaignPerformance(req.params.id);
      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tracking callback endpoint (public)
  app.get("/track/:trackingCode", async (req, res) => {
    try {
      const result = await trackingService.handleTrackingCallback(req.params.trackingCode, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers['referer'],
        platform: req.query.platform as string,
        contentId: req.query.contentId as string,
        viewDuration: req.query.duration ? parseInt(req.query.duration as string) : undefined,
      });

      // Redirect to campaign landing page or creator content
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/tracking-success?event=${result.eventId}`);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // Initialize automatic metrics synchronization
  setTimeout(async () => {
    try {
      const { autoSyncService } = await import("./services/auto-sync");
      await autoSyncService.initialize();
    } catch (error) {
      console.error("Failed to initialize auto-sync service:", error);
    }
  }, 5000); // 5 second delay to allow server to start

  return httpServer;
}
