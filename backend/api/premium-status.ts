// Phase 6 Slice F — public endpoint for reading a user's Premium /
// Founding Creator status. Used by the FoundingCreatorBadge component
// to render a crown next to creator names across the app.
//
// Public-read: anyone can ask if user X is Premium. Nothing private
// is exposed — just whether they pay for the badge. Same pattern as
// Phase 5's reputation endpoint.
//
// Endpoint:
//   GET /api/users/:id/premium-status → { isPremium, isFounder }

import type { Express, Request, Response } from "express";
import { getPremiumStatus } from "../lib/premium";

export function setupPremiumStatusAPI(app: Express): void {
  app.get("/api/users/:id/premium-status", async (req: Request, res: Response) => {
    try {
      const status = await getPremiumStatus(req.params.id);
      res.json({
        isPremium: status.isPremium,
        isFounder: status.isFounder,
      });
    } catch (err: any) {
      console.error("[premium-status] failed", err);
      res.status(500).json({ message: "Failed to fetch premium status" });
    }
  });
}
