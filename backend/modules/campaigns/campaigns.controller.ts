import { Request, Response, NextFunction } from "express";
import { CampaignService } from "./campaigns.service";
import { insertCampaignSchema } from "../../../shared/schema";

export class CampaignController {
  private campaignService = new CampaignService();

  createCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campaignData = insertCampaignSchema.parse({
        ...req.body,
        creatorId: req.user.id,
      });

      const campaign = await this.campaignService.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  };

  getActiveCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaigns = await this.campaignService.getActiveCampaigns();
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  };

  getMyCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campaigns = await this.campaignService.getCampaignsByCreator(req.user.id);
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  };

  getCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await this.campaignService.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  };

  updateCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campaign = await this.campaignService.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.creatorId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update this campaign" });
      }

      const updatedCampaign = await this.campaignService.updateCampaign(req.params.id, req.body);
      res.json(updatedCampaign);
    } catch (error) {
      next(error);
    }
  };

  deleteCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campaign = await this.campaignService.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.creatorId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this campaign" });
      }

      const deleted = await this.campaignService.deleteCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  };

  getCampaignMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.campaignService.getCampaignMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  };

  applyToCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Implementation for clipper application to campaign
      res.json({ message: "Application submitted successfully" });
    } catch (error) {
      next(error);
    }
  };
}