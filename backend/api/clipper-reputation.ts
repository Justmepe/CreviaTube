// Phase 5 — Slice E. Cross-campaign reputation profile for a clipper.
//
// Endpoint:
//   GET /api/clippers/:id/reputation
//     Public read (no auth gate) — the clipper directory and creator
//     profile pages both link here, and creators evaluating an
//     application should be able to see this without first joining a
//     campaign together. Returns aggregate counts:
//
//       {
//         totalApproved,
//         totalRejected,
//         totalApplications,
//         approvalRate,                 // approved / (approved + rejected)
//         avgTimeToApprovalSeconds,     // mean (reviewedAt - joinedAt) over approved rows
//         totalCompleted,               // approved AND isCompleted
//         completionRate,               // completed / approved
//         topCreators: [                // up to 5 by approved count
//           { creatorId, creatorName, approvedCount, lastApprovedAt }
//         ]
//       }
//
// Computed in two SQL hits (one aggregate roll-up + one top-5 join);
// we avoid a single mega-query so each piece is readable. Volume per
// clipper is low (<10k rows on the high end) so the cost is fine.

import type { Express, Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { campaigns, clipperCampaigns, users } from "../../shared/schema";

interface TopCreator {
  creatorId: string;
  creatorName: string | null;
  approvedCount: number;
  lastApprovedAt: string | null;
}

export function setupClipperReputationAPI(app: Express): void {
  app.get("/api/clippers/:id/reputation", async (req: Request, res: Response) => {
    const clipperId = req.params.id;

    // Cheap existence check — return 404 instead of zero-stats so the
    // UI can distinguish "no track record yet" from "wrong URL".
    const [clipperRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, clipperId))
      .limit(1);
    if (!clipperRow) {
      return res.status(404).json({ message: "Clipper not found" });
    }

    // Aggregate roll-up across every clipper_campaigns row for this
    // clipper. Counts gate on application_status / is_approved /
    // is_completed; the avg time-to-approval is computed on the
    // server in seconds (EXTRACT(EPOCH …)) so the client can format.
    const [agg] = await db
      .select({
        totalApplications: sql<number>`COUNT(*)::int`,
        totalApproved: sql<number>`SUM(CASE WHEN ${clipperCampaigns.isApproved} = true THEN 1 ELSE 0 END)::int`,
        totalRejected: sql<number>`SUM(CASE WHEN ${clipperCampaigns.applicationStatus} = 'rejected' THEN 1 ELSE 0 END)::int`,
        totalCompleted: sql<number>`SUM(CASE WHEN ${clipperCampaigns.isCompleted} = true THEN 1 ELSE 0 END)::int`,
        avgTimeToApprovalSeconds: sql<number | null>`AVG(
          CASE
            WHEN ${clipperCampaigns.isApproved} = true
              AND ${clipperCampaigns.reviewedAt} IS NOT NULL
            THEN EXTRACT(EPOCH FROM (${clipperCampaigns.reviewedAt} - ${clipperCampaigns.joinedAt}))
            ELSE NULL
          END
        )::float`,
      })
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.clipperId, clipperId));

    // Top creators by approved count for this clipper. Joins through
    // campaigns to get creator_id, then through users for the public
    // display name. ORDER BY approved DESC, last_approved DESC so a
    // tie breaks toward the more recent collaborator.
    const topCreatorsRaw = await db
      .select({
        creatorId: campaigns.creatorId,
        creatorName: users.fullName,
        approvedCount: sql<number>`COUNT(*)::int`,
        lastApprovedAt: sql<Date | null>`MAX(${clipperCampaigns.reviewedAt})`,
      })
      .from(clipperCampaigns)
      .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .where(
        and(
          eq(clipperCampaigns.clipperId, clipperId),
          eq(clipperCampaigns.isApproved, true),
        ),
      )
      .groupBy(campaigns.creatorId, users.fullName)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`MAX(${clipperCampaigns.reviewedAt})`),
      )
      .limit(5);

    const topCreators: TopCreator[] = topCreatorsRaw.map((r) => ({
      creatorId: r.creatorId,
      creatorName: r.creatorName,
      approvedCount: r.approvedCount,
      lastApprovedAt: r.lastApprovedAt ? new Date(r.lastApprovedAt).toISOString() : null,
    }));

    const totalApproved = agg?.totalApproved ?? 0;
    const totalRejected = agg?.totalRejected ?? 0;
    const decisionTotal = totalApproved + totalRejected;

    res.json({
      totalApplications: agg?.totalApplications ?? 0,
      totalApproved,
      totalRejected,
      totalCompleted: agg?.totalCompleted ?? 0,
      // null when no creator has ever made a decision — UI should
      // render "No track record yet" rather than "0%".
      approvalRate: decisionTotal === 0 ? null : totalApproved / decisionTotal,
      // null when no approval has ever been timestamped (older rows
      // pre-Phase 5 may have isApproved=true but no reviewedAt).
      avgTimeToApprovalSeconds: agg?.avgTimeToApprovalSeconds ?? null,
      completionRate: totalApproved === 0 ? null : (agg?.totalCompleted ?? 0) / totalApproved,
      topCreators,
    });
  });
}
