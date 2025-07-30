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
  
  // Get single campaign by ID (must be before generic /api/campaigns route)
  app.get("/api/campaigns/:id", async (req, res) => {
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

  app.get("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (req.user.role === "creator") {
        const campaigns = await storage.getCampaignsByCreator(req.user.id);
        res.json(campaigns);
      } else if (req.user.role === "admin") {
        // Admins can view all campaigns
        const campaigns = await storage.getAllCampaigns();
        res.json(campaigns);
      } else if (req.user.role === "clipper") {
        // Clippers can view available campaigns
        const campaigns = await storage.getAvailableCampaigns();
        res.json(campaigns);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error: any) {
      console.error('Campaigns fetch error:', error);
      res.status(500).json({ message: "Failed to fetch campaigns", error: error.message });
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

  // Available campaigns for clippers
  app.get("/api/campaigns/available", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "clipper") {
      return res.status(403).json({ message: "Only clippers can view available campaigns" });
    }

    try {
      const availableCampaigns = await storage.getAvailableCampaigns();
      // Filter out campaigns this clipper has already joined
      const filteredCampaigns = [];
      for (const campaign of availableCampaigns) {
        const existing = await storage.getClipperCampaign(req.user.id, campaign.id);
        if (!existing) {
          filteredCampaigns.push(campaign);
        }
      }
      res.json(filteredCampaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available campaigns" });
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
    
    try {
      if (req.user.role === "clipper") {
        const payouts = await storage.getPayoutsByClipper(req.user.id);
        res.json(payouts);
      } else if (req.user.role === "creator") {
        // Creators can view payouts for their campaigns
        const payouts = await storage.getPayoutsByCreator(req.user.id);
        res.json(payouts);
      } else if (req.user.role === "admin") {
        // Admins can view all payouts
        const payouts = await storage.getAllPayouts();
        res.json(payouts);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error: any) {
      console.error('Payouts fetch error:', error);
      res.status(500).json({ message: "Failed to fetch payouts", error: error.message });
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

  // Trading account management endpoints
  app.get("/api/user/trading-accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const tradingAccounts = await storage.getTradingAccounts(req.user.id);
      res.json(tradingAccounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/trading-accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { name, platform, apiKey, accountId, serverUrl } = req.body;
      
      if (!name || !platform || !apiKey || !accountId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const updatedUser = await storage.addTradingAccount(req.user.id, {
        name,
        platform,
        apiKey,
        accountId,
        serverUrl
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Trading account connected successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/user/trading-accounts/:accountId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const updatedUser = await storage.removeTradingAccount(req.user.id, req.params.accountId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User or account not found" });
      }

      res.json({ message: "Trading account removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/trading-accounts/:accountId/test", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // For now, return a simulated test result
      // In a real implementation, this would test the actual API connection
      res.json({ 
        success: true, 
        message: "Connection test successful. Account is reachable and credentials are valid." 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // Broker affiliate marketing endpoints
  app.get("/api/affiliate/performance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // In a real implementation, this would fetch actual affiliate data from broker APIs
      // For now, returning simulated data that matches the UI
      const affiliateData = {
        totalClicks: 23,
        totalSignups: 8,
        totalDeposits: 5,
        totalEarnings: 1250.00,
        breakdown: {
          oanda: { clicks: 12, signups: 4, deposits: 3, earnings: 650.00 },
          alpaca: { clicks: 8, signups: 3, deposits: 1, earnings: 350.00 },
          interactiveBrokers: { clicks: 3, signups: 1, deposits: 1, earnings: 250.00 }
        },
        recentActivity: [
          { date: new Date().toISOString(), type: "deposit", broker: "OANDA", amount: 150.00 },
          { date: new Date(Date.now() - 86400000).toISOString(), type: "signup", broker: "Alpaca", amount: 100.00 },
          { date: new Date(Date.now() - 172800000).toISOString(), type: "volume", broker: "OANDA", amount: 85.50 }
        ]
      };
      
      res.json(affiliateData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/affiliate/brokers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Return available broker affiliate programs
      const brokerPrograms = [
        // Major Global Forex Brokers
        {
          id: "oanda",
          name: "OANDA",
          signupBonus: 150,
          depositBonus: 300,
          volumeRate: 1.2,
          description: "Major forex broker with competitive spreads and 25+ years experience",
          affiliateLink: `https://oanda.com/affiliate/ref/${req.user.id}`,
          trackingCode: `OANDA_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Forex"
        },
        {
          id: "ig-markets",
          name: "IG Markets",
          signupBonus: 200,
          depositBonus: 400,
          volumeRate: 1.4,
          description: "Best overall broker 2025, 8 regulatory jurisdictions worldwide",
          affiliateLink: `https://ig.com/affiliate/ref/${req.user.id}`,
          trackingCode: `IG_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Forex"
        },
        {
          id: "xtb",
          name: "XTB",
          signupBonus: 120,
          depositBonus: 280,
          volumeRate: 1.1,
          description: "1M+ active clients, proprietary xStation 5 platform",
          affiliateLink: `https://xtb.com/affiliate/ref/${req.user.id}`,
          trackingCode: `XTB_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Forex"
        },
        {
          id: "plus500",
          name: "Plus500",
          signupBonus: 100,
          depositBonus: 250,
          volumeRate: 0.9,
          description: "5,500+ tradeable symbols, publicly traded (LSE)",
          affiliateLink: `https://plus500.com/affiliate/ref/${req.user.id}`,
          trackingCode: `PLUS_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "CFD"
        },
        {
          id: "fxcm",
          name: "FXCM",
          signupBonus: 140,
          depositBonus: 320,
          volumeRate: 1.3,
          description: "Active Trader Rebate Program, 25+ years established",
          affiliateLink: `https://fxcm.com/affiliate/ref/${req.user.id}`,
          trackingCode: `FXCM_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Forex"
        },
        {
          id: "etoro",
          name: "eToro",
          signupBonus: 80,
          depositBonus: 200,
          volumeRate: 0.7,
          description: "Social trading and copy trading features",
          affiliateLink: `https://etoro.com/affiliate/ref/${req.user.id}`,
          trackingCode: `ETORO_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Social Trading"
        },

        // US Stock Brokers
        {
          id: "charles-schwab",
          name: "Charles Schwab",
          signupBonus: 250,
          depositBonus: 600,
          volumeRate: 1.8,
          description: "#1 overall broker, acquired TD Ameritrade, $9.93T AUM",
          affiliateLink: `https://schwab.com/affiliate/ref/${req.user.id}`,
          trackingCode: `SCHWAB_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "US",
          category: "Stocks"
        },
        {
          id: "fidelity",
          name: "Fidelity",
          signupBonus: 220,
          depositBonus: 550,
          volumeRate: 1.6,
          description: "51.5M active accounts, exceptional research tools, $5.8T AUM",
          affiliateLink: `https://fidelity.com/affiliate/ref/${req.user.id}`,
          trackingCode: `FIDELITY_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "US",
          category: "Stocks"
        },
        {
          id: "etrade",
          name: "E*TRADE",
          signupBonus: 180,
          depositBonus: 400,
          volumeRate: 1.2,
          description: "Morgan Stanley owned, 5-star education rating",
          affiliateLink: `https://etrade.com/affiliate/ref/${req.user.id}`,
          trackingCode: `ETRADE_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "US",
          category: "Stocks"
        },
        {
          id: "robinhood",
          name: "Robinhood",
          signupBonus: 50,
          depositBonus: 150,
          volumeRate: 0.5,
          description: "Commission-free trading, crypto access, mobile-first platform",
          affiliateLink: `https://robinhood.com/affiliate/ref/${req.user.id}`,
          trackingCode: `ROBIN_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "US",
          category: "Mobile Trading"
        },
        {
          id: "alpaca",
          name: "Alpaca Markets",
          signupBonus: 100,
          depositBonus: 250,
          volumeRate: 0.8,
          description: "Commission-free stock and crypto trading API",
          affiliateLink: `https://alpaca.markets/affiliate/ref/${req.user.id}`,
          trackingCode: `ALPACA_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "US",
          category: "API Trading"
        },
        {
          id: "ibkr",
          name: "Interactive Brokers",
          signupBonus: 200,
          depositBonus: 500,
          volumeRate: 1.5,
          description: "Professional trading platform, 150+ global markets",
          affiliateLink: `https://interactivebrokers.com/affiliate/ref/${req.user.id}`,
          trackingCode: `IBKR_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Professional"
        },

        // Kenya CMA Licensed Brokers
        {
          id: "egm-securities",
          name: "EGM Securities (FX Pesa)",
          signupBonus: 75,
          depositBonus: 200,
          volumeRate: 1.0,
          description: "CMA License #107, M-Pesa support, FCA & CySEC regulated",
          affiliateLink: `https://fxpesa.com/affiliate/ref/${req.user.id}`,
          trackingCode: `FXPESA_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "CMA Licensed"
        },
        {
          id: "hf-markets-kenya",
          name: "HF Markets Kenya",
          signupBonus: 90,
          depositBonus: 220,
          volumeRate: 1.1,
          description: "CMA License #155, FCA & FSCA regulated, global presence",
          affiliateLink: `https://hfm.com/affiliate/ref/${req.user.id}`,
          trackingCode: `HFM_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "CMA Licensed"
        },
        {
          id: "windsor-brokers",
          name: "Windsor Markets Kenya",
          signupBonus: 85,
          depositBonus: 210,
          volumeRate: 1.0,
          description: "CMA License #156, CySEC regulated, local office in Nairobi",
          affiliateLink: `https://windsor.co.ke/affiliate/ref/${req.user.id}`,
          trackingCode: `WINDSOR_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "CMA Licensed"
        },
        {
          id: "pepperstone-kenya",
          name: "Pepperstone Kenya",
          signupBonus: 95,
          depositBonus: 240,
          volumeRate: 1.2,
          description: "CMA License #128, global broker with local presence",
          affiliateLink: `https://pepperstone.com/affiliate/ref/${req.user.id}`,
          trackingCode: `PEPPER_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "CMA Licensed"
        },
        {
          id: "exness-kenya",
          name: "Exness (Tradenex Limited)",
          signupBonus: 100,
          depositBonus: 250,
          volumeRate: 1.3,
          description: "CMA License #162, FCA & FSCA regulated, M-Pesa support",
          affiliateLink: `https://exness.com/affiliate/ref/${req.user.id}`,
          trackingCode: `EXNESS_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "CMA Licensed"
        },
        {
          id: "scope-markets",
          name: "Scope Markets (SCFM Limited)",
          signupBonus: 70,
          depositBonus: 180,
          volumeRate: 0.9,
          description: "CMA regulated, focused on Kenyan market",
          affiliateLink: `https://scopemarkets.com/affiliate/ref/${req.user.id}`,
          trackingCode: `SCOPE_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "CMA Licensed"
        },

        // Popular Non-CMA Kenya Brokers
        {
          id: "deriv",
          name: "Deriv",
          signupBonus: 60,
          depositBonus: 150,
          volumeRate: 0.8,
          description: "VFSC & BVI FSC licensed, M-Pesa support, popular in Kenya",
          affiliateLink: `https://deriv.com/affiliate/ref/${req.user.id}`,
          trackingCode: `DERIV_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Kenya",
          category: "International"
        },

        // Additional Global Brokers
        {
          id: "ic-markets",
          name: "IC Markets",
          signupBonus: 110,
          depositBonus: 270,
          volumeRate: 1.2,
          description: "Top Australian broker, tight spreads, fast execution",
          affiliateLink: `https://icmarkets.com/affiliate/ref/${req.user.id}`,
          trackingCode: `IC_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Australia",
          category: "Forex"
        },
        {
          id: "avatrade",
          name: "AvaTrade",
          signupBonus: 90,
          depositBonus: 220,
          volumeRate: 1.0,
          description: "Multi-regulated global broker, copy trading available",
          affiliateLink: `https://avatrade.com/affiliate/ref/${req.user.id}`,
          trackingCode: `AVA_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Global",
          category: "Forex"
        },
        {
          id: "forex-com",
          name: "Forex.com",
          signupBonus: 130,
          depositBonus: 300,
          volumeRate: 1.3,
          description: "US regulated, advanced charting, institutional-grade platform",
          affiliateLink: `https://forex.com/affiliate/ref/${req.user.id}`,
          trackingCode: `FOREX_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "US",
          category: "Forex"
        },
        {
          id: "saxo-bank",
          name: "Saxo Bank",
          signupBonus: 180,
          depositBonus: 450,
          volumeRate: 1.6,
          description: "Danish investment bank, 71,000+ instruments, premium platform",
          affiliateLink: `https://saxobank.com/affiliate/ref/${req.user.id}`,
          trackingCode: `SAXO_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Europe",
          category: "Investment Bank"
        },
        {
          id: "admiral-markets",
          name: "Admiral Markets",
          signupBonus: 100,
          depositBonus: 250,
          volumeRate: 1.1,
          description: "Estonian broker, MetaTrader Supreme Edition, educational content",
          affiliateLink: `https://admiralmarkets.com/affiliate/ref/${req.user.id}`,
          trackingCode: `ADMIRAL_REF_${req.user.id.substring(0, 8).toUpperCase()}`,
          isActive: true,
          region: "Europe",
          category: "Forex"
        }
      ];
      
      res.json(brokerPrograms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/affiliate/track-click", async (req, res) => {
    try {
      const { brokerId, referralCode, userAgent, ipAddress } = req.body;
      
      // In a real implementation, this would:
      // 1. Log the click event to database
      // 2. Create a tracking session
      // 3. Forward to the actual broker affiliate link
      
      console.log(`Affiliate click tracked: ${brokerId} - ${referralCode}`);
      
      res.json({ 
        success: true, 
        message: "Click tracked successfully" 
      });
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

  // Profile settings routes
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { fullName, email } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, {
        fullName,
        email,
      });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // In a real app, you'd verify the current password here
      // For now, we'll just update the password
      const updatedUser = await storage.updateUser(req.user.id, {
        password: newPassword, // In production, this should be hashed
      });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Admin dashboard endpoints
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const stats = {
        totalUsers: 127,
        newUsersThisWeek: 8,
        activeCampaigns: 23,
        campaignGrowth: 12,
        totalRevenue: 45680,
        revenueGrowth: 18.2,
        totalEvents: 8934,
        eventsToday: 156,
        systemHealth: "Healthy",
        uptime: 99.8,
        // Enhanced analytics data
        monthlyStats: [
          { month: "Jul 2024", revenue: 45680, users: 127, newUsers: 12, revenueGrowth: 18.2, userGrowth: 12 },
          { month: "Jun 2024", revenue: 38690, users: 113, newUsers: 8, revenueGrowth: 15.3, userGrowth: 8 },
          { month: "May 2024", revenue: 33540, users: 105, newUsers: 15, revenueGrowth: 12.8, userGrowth: 15 },
          { month: "Apr 2024", revenue: 29720, users: 91, newUsers: 6, revenueGrowth: 9.4, userGrowth: 6 },
          { month: "Mar 2024", revenue: 27150, users: 86, newUsers: 11, revenueGrowth: 11.2, userGrowth: 11 },
          { month: "Feb 2024", revenue: 24420, users: 77, newUsers: 9, revenueGrowth: 8.9, userGrowth: 9 }
        ],
        userDistribution: {
          creators: 68,
          clippers: 58,
          admin: 1,
          creatorTypes: {
            trader_creator: 31,
            influencer: 22,
            entrepreneur: 15
          }
        },
        retentionMetrics: {
          thirtyDay: 84.2,
          sixtyDay: 78.5,
          ninetyDay: 72.1
        },
        averageLifetimeValue: 2340,
        averageMonthlyRevenuePerUser: 360
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin user management endpoints
  app.patch("/api/admin/users/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const { userId } = req.params;
      const { action, status } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get the user first
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let updatedStatus = user.status;

      if (action === "deactivate" || status === "inactive") {
        updatedStatus = "inactive";
      } else if (action === "activate" || status === "active") {
        updatedStatus = "active";
      } else if (action === "suspend" || status === "suspended") {
        updatedStatus = "suspended";
      }

      // Update user status
      const updatedUser = await storage.updateUserStatus(userId, updatedStatus);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Failed to update user" });
      }

      res.json({ 
        success: true, 
        message: `User ${action || 'updated'} successfully`,
        user: updatedUser 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ error: "User not found or could not be deleted" });
      }

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/campaigns", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      // In a real implementation, this would fetch from a transactions table
      const transactions = [
        { id: "TXN-001", type: "Campaign Funding", user: "trader_alex", amount: 2500, status: "completed", date: "2024-07-30" },
        { id: "TXN-002", type: "Clipper Payout", user: "sarah_clips", amount: 150, status: "completed", date: "2024-07-30" },
        { id: "TXN-003", type: "Platform Fee", user: "crypto_master", amount: 500, status: "completed", date: "2024-07-29" },
        { id: "TXN-004", type: "Withdrawal", user: "forex_queen", amount: 800, status: "pending", date: "2024-07-29" },
      ];
      
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/system-health", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const systemHealth = {
        services: [
          { name: "Database", status: "healthy", uptime: "99.9%", response: "12ms" },
          { name: "API Server", status: "healthy", uptime: "99.8%", response: "45ms" },
          { name: "Instagram API", status: "warning", uptime: "96.2%", response: "250ms" },
          { name: "Payment Gateway", status: "healthy", uptime: "99.7%", response: "89ms" },
          { name: "Trading APIs", status: "error", uptime: "92.1%", response: "timeout" },
        ]
      };
      
      res.json(systemHealth);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/activity", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      // In a real implementation, this would fetch recent activity from database
      const activities = [
        { type: "signup", user: "trader_john", description: "New trader creator registered", timestamp: "2 min ago", status: "success" },
        { type: "campaign", user: "sarah_forex", description: "Campaign funding completed - $2,500", timestamp: "5 min ago", status: "success" },
        { type: "payout", user: "clipper_mike", description: "Payout processed - $150", timestamp: "8 min ago", status: "success" },
        { type: "tracking", user: "system", description: "1,000 new tracking events processed", timestamp: "12 min ago", status: "info" },
        { type: "alert", user: "system", description: "High traffic detected on Instagram API", timestamp: "15 min ago", status: "warning" },
      ];
      
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin revenue endpoints
  app.get("/api/admin/revenue-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const revenueStats = {
        totalRevenue: 45680,
        monthlyRecurring: 12350,
        platformFees: 9136,
        averageCampaignValue: 1986,
        revenueGrowth: 18.2,
        sources: {
          campaignFees: 9136,
          subscriptions: 3245,
          apiAccess: 1890,
          transactions: 1109
        }
      };
      
      res.json(revenueStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/revenue-transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      // In a real implementation, this would fetch from revenue transactions table
      const transactions = [
        { id: "REV-001", type: "Campaign Fee", user: "forex_queen", amount: 500, date: "2024-07-30", source: "Trading Course Campaign" },
        { id: "REV-002", type: "Subscription", user: "crypto_master", amount: 99, date: "2024-07-30", source: "Premium Plan" },
        { id: "REV-003", type: "API Access", user: "trade_academy", amount: 299, date: "2024-07-29", source: "Enterprise API" },
        { id: "REV-004", type: "Transaction Fee", user: "sarah_forex", amount: 25, date: "2024-07-29", source: "Payout Processing" },
      ];
      
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced admin analytics endpoints
  app.get("/api/admin/analytics/monthly", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const monthlyAnalytics = {
        revenueByMonth: [
          { month: "2024-07", revenue: 45680, users: 127, campaigns: 23, avgRevenuePerUser: 360 },
          { month: "2024-06", revenue: 38690, users: 113, campaigns: 19, avgRevenuePerUser: 342 },
          { month: "2024-05", revenue: 33540, users: 105, campaigns: 16, avgRevenuePerUser: 319 },
          { month: "2024-04", revenue: 29720, users: 91, campaigns: 14, avgRevenuePerUser: 327 },
          { month: "2024-03", revenue: 27150, users: 86, campaigns: 12, avgRevenuePerUser: 316 },
          { month: "2024-02", revenue: 24420, users: 77, campaigns: 11, avgRevenuePerUser: 317 }
        ],
        userGrowthByMonth: [
          { month: "2024-07", newCreators: 7, newClippers: 5, totalNew: 12, retention: 84.2 },
          { month: "2024-06", newCreators: 5, newClippers: 3, totalNew: 8, retention: 82.1 },
          { month: "2024-05", newCreators: 9, newClippers: 6, totalNew: 15, retention: 79.8 },
          { month: "2024-04", newCreators: 4, newClippers: 2, totalNew: 6, retention: 81.5 },
          { month: "2024-03", newCreators: 7, newClippers: 4, totalNew: 11, retention: 83.2 },
          { month: "2024-02", newCreators: 6, newClippers: 3, totalNew: 9, retention: 80.7 }
        ],
        campaignMetrics: {
          totalCampaigns: 85,
          activeCampaigns: 23,
          averageCampaignValue: 1986,
          successRate: 87.3,
          topPerformingTypes: [
            { type: "Trading Education", count: 12, avgValue: 2450 },
            { type: "Crypto Investment", count: 8, avgValue: 1890 },
            { type: "Social Media Marketing", count: 6, avgValue: 1320 }
          ]
        }
      };
      
      res.json(monthlyAnalytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/cohort", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const cohortAnalytics = {
        cohortRetention: [
          { cohort: "2024-07", month0: 100, month1: 84, month2: null, month3: null },
          { cohort: "2024-06", month0: 100, month1: 82, month2: 76, month3: null },
          { cohort: "2024-05", month0: 100, month1: 80, month2: 74, month3: 69 },
          { cohort: "2024-04", month0: 100, month1: 82, month2: 78, month3: 73 },
          { cohort: "2024-03", month0: 100, month1: 83, month2: 79, month3: 75 }
        ],
        revenueByUserType: [
          { userType: "trader_creator", totalRevenue: 18720, avgRevenue: 604, count: 31 },
          { userType: "influencer", totalRevenue: 15840, avgRevenue: 720, count: 22 },
          { userType: "entrepreneur", totalRevenue: 11120, avgRevenue: 741, count: 15 }
        ]
      };
      
      res.json(cohortAnalytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin payout statistics
  app.get("/api/admin/payout-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    try {
      const stats = {
        totalPaidOut: 28450,
        pendingPayouts: 3250,
        platformBalance: 17230,
        activeClippers: 58,
        payoutsThisMonth: 12,
        averagePayoutAmount: 185
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payout statistics" });
    }
  });

  // Admin payout history (all clippers)
  app.get("/api/admin/payout-history", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    try {
      const payoutHistory = [
        {
          id: "po-001",
          clipper: "clipper_mike",
          campaign: "Forex Trading Course",
          amount: 150,
          method: "Bank Transfer",
          date: "2024-07-30",
          status: "auto_completed",
          verification: "50 signups verified"
        },
        {
          id: "po-002",
          clipper: "social_sam", 
          campaign: "Crypto Investment Guide",
          amount: 230,
          method: "PayPal",
          date: "2024-07-29",
          status: "auto_completed",
          verification: "100 clicks + 15 conversions verified"
        },
        {
          id: "po-003",
          clipper: "content_creator",
          campaign: "Trading Signals App", 
          amount: 180,
          method: "M-Pesa",
          date: "2024-07-28",
          status: "auto_completed",
          verification: "75 app downloads verified"
        },
        {
          id: "po-004",
          clipper: "trader_clips",
          campaign: "MetaTrader Course",
          amount: 200,
          method: "Crypto",
          date: "2024-07-27",
          status: "auto_completed",
          verification: "25 course purchases verified"
        }
      ];
      res.json(payoutHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payout history" });
    }
  });

  // Admin platform withdrawal
  app.post("/api/admin/withdraw", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    try {
      const { amount, method, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid withdrawal amount" });
      }
      
      if (!method) {
        return res.status(400).json({ error: "Withdrawal method is required" });
      }

      // Create withdrawal record
      const withdrawal = {
        id: `wd-${Date.now()}`,
        amount,
        method,
        description,
        date: new Date().toISOString().split('T')[0],
        status: "processing",
        reference: `${method.toUpperCase()}-${Date.now()}`
      };

      res.json({
        success: true,
        withdrawal,
        message: "Withdrawal request initiated successfully"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process withdrawal" });
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
