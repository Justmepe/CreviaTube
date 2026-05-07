// Auto-promote campaigner stages when milestones are hit. Lifecycle:
//
//   founder_prelaunch  →  early_brand          (first funded campaign — they shipped)
//   early_brand        →  established_brand    (3 funded campaigns OR $5,000 cumulative budget)
//   solo_creator       →  solo_creator         (parallel track, no progression on this lane in v1)
//
// Promotion is idempotent and one-way. We don't auto-demote.
//
// Called from the campaign funding success path so it fires the moment a
// brand-side campaigner crosses a threshold, with no cron required.

import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { users, campaigns } from "../../../shared/schema.js";

const ESTABLISHED_BRAND_FUNDED_CAMPAIGNS = 3;
const ESTABLISHED_BRAND_TOTAL_BUDGET = 5000; // USDC

export type StagePromotionResult =
  | { changed: false }
  | { changed: true; from: string; to: string; reason: string };

/**
 * Inspect the user's current stage + their funded campaign history and
 * promote them to the next lifecycle stage if they cross a milestone.
 * Returns details of what changed (or that nothing changed) so the caller
 * can log / notify.
 */
export async function maybePromoteStage(userId: string): Promise<StagePromotionResult> {
  const [user] = await db
    .select({ id: users.id, stage: users.campaignerStage, role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || user.role !== "creator") return { changed: false };
  if (!user.stage || user.stage === "solo_creator") return { changed: false };

  // Funded campaign stats for this creator
  const [stats] = await db
    .select({
      fundedCount: sql<number>`count(*) filter (where ${campaigns.fundingStatus} = 'funded')::int`,
      totalFundedBudget: sql<number>`coalesce(sum(${campaigns.budget}::numeric) filter (where ${campaigns.fundingStatus} = 'funded'), 0)::numeric`,
    })
    .from(campaigns)
    .where(eq(campaigns.creatorId, userId));

  const fundedCount = Number(stats?.fundedCount || 0);
  const totalBudget = Number(stats?.totalFundedBudget || 0);

  // founder_prelaunch → early_brand: any funded campaign means they shipped
  if (user.stage === "founder_prelaunch" && fundedCount >= 1) {
    await applyPromotion(userId, "early_brand");
    return {
      changed: true,
      from: "founder_prelaunch",
      to: "early_brand",
      reason: `First funded campaign (${fundedCount} total)`,
    };
  }

  // early_brand → established_brand: 3 funded OR $5k cumulative spend
  if (user.stage === "early_brand") {
    if (
      fundedCount >= ESTABLISHED_BRAND_FUNDED_CAMPAIGNS ||
      totalBudget >= ESTABLISHED_BRAND_TOTAL_BUDGET
    ) {
      await applyPromotion(userId, "established_brand");
      const reason = fundedCount >= ESTABLISHED_BRAND_FUNDED_CAMPAIGNS
        ? `${fundedCount} funded campaigns`
        : `$${totalBudget.toFixed(2)} cumulative funded budget`;
      return { changed: true, from: "early_brand", to: "established_brand", reason };
    }
  }

  return { changed: false };
}

async function applyPromotion(userId: string, newStage: string): Promise<void> {
  await db
    .update(users)
    .set({ campaignerStage: newStage, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
