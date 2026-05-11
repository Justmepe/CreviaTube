// Phase 6 Slice E — advanced analytics for Premium creators.
//
// Premium-gated aggregate read across all of a creator's campaigns.
// Free creators get a 403 with { requiresPremium: true } so the
// frontend can render a teaser card with an upgrade CTA. Premium
// creators get the full payload:
//
//   {
//     totals: { campaigns, applications, approved, completed, paidOut },
//     timeToFirstApproval: { medianSeconds, p90Seconds, sampleSize },
//     topClippersPerGoal: Array<{
//       goalType, clipperId, clipperName, approvedCount, generated
//     }>,
//     perCampaign: Array<{
//       campaignId, campaignName, applications, approved,
//       completed, conversionRate
//     }>
//   }
//
// All counts use correlated subqueries — fine for typical creator
// campaign volumes. Caches in clipperStats and payouts are not used
// because we want application-level granularity, not just success
// rollups.

import type { Express, Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { campaigns, clipperCampaigns, payouts, users } from "../../shared/schema";
import { getPremiumStatus } from "../lib/premium";

export function setupCreatorAnalyticsAPI(app: Express): void {
  app.get("/api/creator/analytics", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "creator") {
      return res.status(403).json({ message: "Creators only" });
    }

    // Premium gate. Frontend reads requiresPremium and routes the
    // creator to /premium with the upgrade CTA.
    const premium = await getPremiumStatus(user.id);
    if (!premium.isPremium) {
      return res.status(403).json({ requiresPremium: true });
    }

    try {
      // ── Top-line totals
      const [totals] = await db
        .select({
          campaignsCount: sql<number>`COUNT(DISTINCT ${campaigns.id})::int`,
          applications: sql<number>`COUNT(${clipperCampaigns.id})::int`,
          approved: sql<number>`SUM(CASE WHEN ${clipperCampaigns.isApproved} = true THEN 1 ELSE 0 END)::int`,
          completed: sql<number>`SUM(CASE WHEN ${clipperCampaigns.isCompleted} = true THEN 1 ELSE 0 END)::int`,
        })
        .from(campaigns)
        .leftJoin(clipperCampaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(campaigns.creatorId, user.id));

      const [paid] = await db
        .select({
          paidOut: sql<string>`COALESCE(SUM(${payouts.amount}), 0)::text`,
        })
        .from(payouts)
        .innerJoin(campaigns, eq(payouts.campaignId, campaigns.id))
        .where(eq(campaigns.creatorId, user.id));

      // ── Time-to-first-approval — median + p90 of (reviewedAt -
      // joinedAt) across approved rows. PERCENTILE_CONT gives us a
      // proper interpolated median; the count guards against
      // divide-by-zero pretty-printing on the UI side.
      const [timing] = await db
        .select({
          medianSeconds: sql<number | null>`PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (${clipperCampaigns.reviewedAt} - ${clipperCampaigns.joinedAt}))
          )::float`,
          p90Seconds: sql<number | null>`PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (${clipperCampaigns.reviewedAt} - ${clipperCampaigns.joinedAt}))
          )::float`,
          sampleSize: sql<number>`COUNT(*)::int`,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(
          and(
            eq(campaigns.creatorId, user.id),
            eq(clipperCampaigns.isApproved, true),
            sql`${clipperCampaigns.reviewedAt} IS NOT NULL`,
          ),
        );

      // ── Top clippers per primary goal. Group by goal + clipper,
      // rank within each goal, return top 3 per. Window function
      // would be cleaner but Drizzle doesn't expose ROW_NUMBER nicely;
      // do it with a simple ORDER BY + JS slicing.
      const topClippersRaw = await db
        .select({
          goalType: sql<string | null>`(${campaigns.campaignGoals}->>'primaryGoal')`,
          clipperId: clipperCampaigns.clipperId,
          clipperName: users.fullName,
          approvedCount: sql<number>`COUNT(*)::int`,
        })
        .from(clipperCampaigns)
        .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
        .where(
          and(
            eq(campaigns.creatorId, user.id),
            eq(clipperCampaigns.isApproved, true),
          ),
        )
        .groupBy(
          sql`(${campaigns.campaignGoals}->>'primaryGoal')`,
          clipperCampaigns.clipperId,
          users.fullName,
        )
        .orderBy(desc(sql`COUNT(*)`));

      // Top 3 per goalType in JS — cheap because the result set is
      // already bounded (typically <100 rows).
      const topPerGoal = new Map<string, typeof topClippersRaw>();
      for (const row of topClippersRaw) {
        const key = row.goalType ?? "other";
        const list = topPerGoal.get(key) ?? [];
        if (list.length < 3) {
          list.push(row);
          topPerGoal.set(key, list);
        }
      }
      const topClippersPerGoal = Array.from(topPerGoal.entries()).flatMap(
        ([goalType, list]) => list.map((r) => ({ ...r, goalType })),
      );

      // ── Per-campaign breakdown — applications / approved /
      // completed / conversion rate. Lets the creator see which
      // campaigns are actually doing the work.
      const perCampaign = await db
        .select({
          campaignId: campaigns.id,
          campaignName: campaigns.name,
          applications: sql<number>`COUNT(${clipperCampaigns.id})::int`,
          approved: sql<number>`SUM(CASE WHEN ${clipperCampaigns.isApproved} = true THEN 1 ELSE 0 END)::int`,
          completed: sql<number>`SUM(CASE WHEN ${clipperCampaigns.isCompleted} = true THEN 1 ELSE 0 END)::int`,
        })
        .from(campaigns)
        .leftJoin(clipperCampaigns, eq(clipperCampaigns.campaignId, campaigns.id))
        .where(eq(campaigns.creatorId, user.id))
        .groupBy(campaigns.id, campaigns.name)
        .orderBy(desc(sql`COUNT(${clipperCampaigns.id})`));

      const perCampaignWithRates = perCampaign.map((c) => ({
        ...c,
        conversionRate: c.applications === 0 ? null : c.approved / c.applications,
      }));

      res.json({
        totals: {
          campaigns: totals?.campaignsCount ?? 0,
          applications: totals?.applications ?? 0,
          approved: totals?.approved ?? 0,
          completed: totals?.completed ?? 0,
          paidOut: paid?.paidOut ?? "0",
        },
        timeToFirstApproval: {
          medianSeconds: timing?.medianSeconds ?? null,
          p90Seconds: timing?.p90Seconds ?? null,
          sampleSize: timing?.sampleSize ?? 0,
        },
        topClippersPerGoal,
        perCampaign: perCampaignWithRates,
      });
    } catch (err: any) {
      console.error("[creator-analytics] failed", err);
      res.status(500).json({ message: "Failed to compute analytics", error: err.message });
    }
  });
}
