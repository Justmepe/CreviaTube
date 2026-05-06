import type { Express } from "express";
import { storage } from "../storage";

/**
 * Compute a fit score between a clipper's connected platforms and a campaign's
 * targetPlatforms. Returns the score (0..1) and the platforms that overlap.
 *
 * Scoring rule:
 *  - 100% if every campaign target is a platform the clipper owns
 *  - 0% if no overlap (or campaign has no targets — defensive)
 *  - linear in between
 *
 * Platform-name matching is case-insensitive and tolerates a few common
 * synonyms (twitter/x, x.com).
 */
function platformAliases(p: string): string[] {
  const k = p.trim().toLowerCase();
  if (k === "twitter" || k === "x" || k === "x.com") return ["twitter", "x"];
  return [k];
}

function intersects(a: string[], b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

export function computeMatch(
  clipperPlatforms: Set<string>, // already lowercased; includes aliases
  targetPlatforms: string[],
): { matchScore: number; matchedPlatforms: string[] } {
  const targets = (targetPlatforms || []).map(t => t.trim()).filter(Boolean);
  if (targets.length === 0) return { matchScore: 0, matchedPlatforms: [] };

  const matched: string[] = [];
  for (const t of targets) {
    if (intersects(platformAliases(t), clipperPlatforms)) matched.push(t);
  }
  return {
    matchScore: matched.length / targets.length,
    matchedPlatforms: matched,
  };
}

export function setupCampaignMatchingAPI(app: Express): void {
  app.get("/api/campaigns/matched", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "clipper") {
      return res.status(403).json({ message: "Only clippers can use match ranking" });
    }

    try {
      const clipper = req.user as any;
      const social = clipper.socialAccounts || {};
      // Build set of platforms the clipper has (any non-empty entry counts)
      const clipperPlatforms = new Set<string>();
      for (const [name, value] of Object.entries(social)) {
        if (!value) continue;
        for (const alias of platformAliases(name)) clipperPlatforms.add(alias);
      }

      const all = await storage.getAvailableCampaigns();

      // Filter out campaigns this clipper has already joined
      const filtered: typeof all = [];
      for (const c of all) {
        const existing = await storage.getClipperCampaign(req.user.id, c.id);
        if (!existing) filtered.push(c);
      }

      // Enrich + sort
      const enriched = filtered.map(c => {
        let targets: string[] = [];
        try {
          targets = JSON.parse(c.targetPlatforms || "[]");
        } catch {
          targets = [];
        }
        const match = computeMatch(clipperPlatforms, targets);
        return {
          ...c,
          matchScore: match.matchScore,
          matchedPlatforms: match.matchedPlatforms,
        };
      });

      enriched.sort((a, b) => {
        // Primary: match score desc
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        // Tiebreaker: recency
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      res.json({
        clipperPlatforms: Array.from(clipperPlatforms).filter(p => p !== "x"), // hide aliases from response
        hasConnectedPlatforms: clipperPlatforms.size > 0,
        campaigns: enriched,
      });
    } catch (error: any) {
      console.error("Campaign matching error:", error);
      res.status(500).json({ message: "Failed to compute campaign matches", error: error.message });
    }
  });
}
