import { db } from "../../core/database/connection";
import { campaigns, trackingEvents, type Campaign, type InsertCampaign } from "../../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class CampaignService {
  async createCampaign(campaignData: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values(campaignData)
      .returning();
    return campaign;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.creatorId, creatorId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.status, "active"))
      .orderBy(desc(campaigns.createdAt));
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount! > 0;
  }

  async getCampaignMetrics(campaignId: string) {
    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.campaignId, campaignId));

    const metrics = {
      totalClicks: events.filter(e => e.eventType === 'click').length,
      totalSignups: events.filter(e => e.eventType === 'signup').length,
      totalDeposits: events.filter(e => e.eventType === 'deposit').length,
      totalTrades: events.filter(e => e.eventType === 'trade').length,
      totalRevenue: events.reduce((sum, e) => sum + (e.rewardAmount || 0), 0),
    };

    return metrics;
  }
}