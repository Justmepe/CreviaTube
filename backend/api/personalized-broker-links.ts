import { Express } from "express";
import { db } from "../db";
import { personalizedBrokerLinks, trackingEvents } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

// Type extension for user to include userType and id
interface AuthenticatedUser {
  id: string;
  userType: string;
}

const brokerLinkSchema = z.object({
  brokerName: z.string().min(1, "Broker name is required"),
  brokerType: z.enum([
    "forex", "crypto", "stocks", "futures", "options", "cfds"
  ]),
  affiliateLink: z.string().url("Valid affiliate link required"),
  description: z.string().optional(),
});

export function setupPersonalizedBrokerLinksAPI(app: Express) {
  
  // Get user's personalized broker links
  app.get("/api/broker-links/personal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any as AuthenticatedUser;
    if (user?.userType !== "trader_creator") {
      return res.status(403).json({ message: "Only traders can manage broker links" });
    }
    
    try {
      // First get the broker links
      const links = await db
        .select()
        .from(personalizedBrokerLinks)
        .where(eq(personalizedBrokerLinks.userId, user.id));

      // Get tracking stats separately for each link
      const linksWithStats = await Promise.all(
        links.map(async (link) => {
          const stats = await db
            .select({
              totalClicks: sql<number>`COUNT(CASE WHEN event_type = 'click' THEN 1 END)`,
              totalSignups: sql<number>`COUNT(CASE WHEN event_type = 'signup' THEN 1 END)`,
              totalDeposits: sql<number>`COUNT(CASE WHEN event_type = 'deposit' THEN 1 END)`,
            })
            .from(trackingEvents)
            .where(eq(trackingEvents.clipperId, link.id));

          const stat = stats[0] || { totalClicks: 0, totalSignups: 0, totalDeposits: 0 };
          
          return {
            ...link,
            trackingStats: {
              totalClicks: Number(stat.totalClicks) || 0,
              totalSignups: Number(stat.totalSignups) || 0,
              totalDeposits: Number(stat.totalDeposits) || 0,
              conversionRate: stat.totalClicks > 0 ? (Number(stat.totalSignups) / Number(stat.totalClicks)) * 100 : 0,
              revenue: (Number(stat.totalSignups) || 0) * 50 + (Number(stat.totalDeposits) || 0) * 200,
            }
          };
        })
      );

      res.json(linksWithStats);
    } catch (error: any) {
      console.error('Error fetching personalized broker links:', error);
      res.status(500).json({ message: "Failed to fetch broker links" });
    }
  });

  // Add new personalized broker link
  app.post("/api/broker-links/personal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any as AuthenticatedUser;
    if (user?.userType !== "trader_creator") {
      return res.status(403).json({ message: "Only traders can manage broker links" });
    }
    
    try {
      const validatedData = brokerLinkSchema.parse(req.body);
      
      const [newLink] = await db
        .insert(personalizedBrokerLinks)
        .values({
          userId: user.id,
          brokerName: validatedData.brokerName,
          brokerType: validatedData.brokerType,
          affiliateLink: validatedData.affiliateLink,
          description: validatedData.description || null,
          isActive: true,
        })
        .returning();

      res.status(201).json({
        ...newLink,
        trackingStats: {
          totalClicks: 0,
          totalSignups: 0,
          totalDeposits: 0,
          conversionRate: 0,
          revenue: 0,
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error('Error adding broker link:', error);
      res.status(500).json({ message: "Failed to add broker link" });
    }
  });

  // Update broker link (toggle active status)
  app.patch("/api/broker-links/personal/:linkId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any as AuthenticatedUser;
    if (user?.userType !== "trader_creator") {
      return res.status(403).json({ message: "Only traders can manage broker links" });
    }
    
    try {
      const { linkId } = req.params;
      const { isActive } = req.body;
      
      // Verify ownership
      const [existingLink] = await db
        .select()
        .from(personalizedBrokerLinks)
        .where(
          and(
            eq(personalizedBrokerLinks.id, linkId),
            eq(personalizedBrokerLinks.userId, user.id)
          )
        );

      if (!existingLink) {
        return res.status(404).json({ message: "Broker link not found" });
      }

      const [updatedLink] = await db
        .update(personalizedBrokerLinks)
        .set({ isActive })
        .where(eq(personalizedBrokerLinks.id, linkId))
        .returning();

      res.json(updatedLink);
    } catch (error: any) {
      console.error('Error updating broker link:', error);
      res.status(500).json({ message: "Failed to update broker link" });
    }
  });

  // Delete broker link
  app.delete("/api/broker-links/personal/:linkId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any as AuthenticatedUser;
    if (user?.userType !== "trader_creator") {
      return res.status(403).json({ message: "Only traders can manage broker links" });
    }
    
    try {
      const { linkId } = req.params;
      
      // Verify ownership
      const [existingLink] = await db
        .select()
        .from(personalizedBrokerLinks)
        .where(
          and(
            eq(personalizedBrokerLinks.id, linkId),
            eq(personalizedBrokerLinks.userId, user.id)
          )
        );

      if (!existingLink) {
        return res.status(404).json({ message: "Broker link not found" });
      }

      await db
        .delete(personalizedBrokerLinks)
        .where(eq(personalizedBrokerLinks.id, linkId));

      res.json({ message: "Broker link deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting broker link:', error);
      res.status(500).json({ message: "Failed to delete broker link" });
    }
  });

  // Track broker link clicks (for campaign usage)
  app.post("/api/broker-links/track/:linkId", async (req, res) => {
    try {
      const { linkId } = req.params;
      const { eventType = "click", clipperId, campaignId } = req.body;
      
      // Get broker link details
      const [brokerLink] = await db
        .select()
        .from(personalizedBrokerLinks)
        .where(eq(personalizedBrokerLinks.id, linkId));

      if (!brokerLink || !brokerLink.isActive) {
        return res.status(404).json({ message: "Broker link not found or inactive" });
      }

      // Create tracking event - simplified for now
      await db
        .insert(trackingEvents)
        .values({
          clipperId: clipperId || brokerLink.userId,
          eventType,
          clipperCampaignId: "broker-" + linkId, // Use as reference
          amount: 0,
          status: "verified",
        });

      res.json({ 
        message: "Event tracked successfully",
        redirectUrl: brokerLink.affiliateLink 
      });
    } catch (error: any) {
      console.error('Error tracking broker link:', error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // Get broker link analytics
  app.get("/api/broker-links/analytics/:linkId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { linkId } = req.params;
      const { timeframe = "30d" } = req.query;
      
      // Verify ownership
      const [brokerLink] = await db
        .select()
        .from(personalizedBrokerLinks)
        .where(
          and(
            eq(personalizedBrokerLinks.id, linkId),
            eq(personalizedBrokerLinks.userId, (req.user as any).id)
          )
        );

      if (!brokerLink) {
        return res.status(404).json({ message: "Broker link not found" });
      }

      // Get analytics data
      const [analytics] = await db
        .select({
          totalClicks: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'click' THEN 1 END)`,
          totalSignups: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'signup' THEN 1 END)`,
          totalDeposits: sql<number>`COUNT(CASE WHEN ${trackingEvents.eventType} = 'deposit' THEN 1 END)`,
          uniqueClippers: sql<number>`COUNT(DISTINCT ${trackingEvents.clipperId})`,
        })
        .from(trackingEvents)
        .where(eq(trackingEvents.clipperCampaignId, "broker-" + linkId));

      const totalClicks = analytics?.totalClicks || 0;
      const totalSignups = analytics?.totalSignups || 0;
      const totalDeposits = analytics?.totalDeposits || 0;

      res.json({
        linkId,
        brokerName: brokerLink.brokerName,
        brokerType: brokerLink.brokerType,
        analytics: {
          totalClicks,
          totalSignups,
          totalDeposits,
          uniqueClippers: analytics?.uniqueClippers || 0,
          conversionRate: totalClicks > 0 ? (totalSignups / totalClicks) * 100 : 0,
          depositRate: totalSignups > 0 ? (totalDeposits / totalSignups) * 100 : 0,
          estimatedRevenue: totalSignups * 50 + totalDeposits * 200,
        },
        timeframe
      });
    } catch (error: any) {
      console.error('Error fetching broker link analytics:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
}