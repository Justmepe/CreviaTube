// Phase 6 Slice D — 30-day money-back guarantee evaluator.
//
// Compares each subscription's "30 days before activation" application
// count to "30 days after activation" and fires a refund if the lift
// is insufficient. Two thresholds because zero-baseline creators need
// a different rule than established ones:
//
//   - baseline > 0 → current must be >= baseline × LIFT_MULTIPLIER (1.5×)
//   - baseline == 0 → current must be >= ABSOLUTE_FLOOR_NEW_CREATOR (5)
//
// We fire the guarantee EXACTLY once per subscription. The
// guarantee_evaluated_at column gets stamped whether or not it fired,
// so the evaluator is idempotent — running it twice doesn't double-
// refund.
//
// The actual USDC refund is processed manually by an admin against
// the platform treasury. This module produces the *decision* and the
// queue; the human signs the transaction. Mark-paid stamps
// refund_tx_hash so we have an audit trail.

import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaigns,
  clipperCampaigns,
  subscriptions,
  users,
} from "../../shared/schema";

const LIFT_MULTIPLIER = 1.5;
const ABSOLUTE_FLOOR_NEW_CREATOR = 5;
const EVALUATION_WINDOW_DAYS = 30;

// Trailing-30-days application count across a creator's campaigns.
// Used both as the BASELINE (called at activation) and the CURRENT
// (called by the evaluator at day 30). Same query, different window.
export async function countApplicationsInWindow(
  creatorId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<number> {
  const [row] = await db
    .select({
      n: sql<number>`COUNT(${clipperCampaigns.id})::int`,
    })
    .from(clipperCampaigns)
    .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.creatorId, creatorId),
        gte(clipperCampaigns.joinedAt, windowStart),
        lte(clipperCampaigns.joinedAt, windowEnd),
      ),
    );
  return Number(row?.n ?? 0);
}

// Snapshot the trailing-30-day application count for a creator.
// Called at first subscription activation; the result is stored on
// the subscription row as `baseline_application_count`.
export async function snapshotBaselineApplicationCount(creatorId: string): Promise<number> {
  const now = new Date();
  const start = new Date(now.getTime() - EVALUATION_WINDOW_DAYS * 24 * 60 * 60_000);
  return countApplicationsInWindow(creatorId, start, now);
}

// Decide whether a given (baseline, current) pair clears the
// guarantee. Returns true when the creator should NOT get a refund.
export function clearsGuarantee(baseline: number, current: number): boolean {
  if (baseline > 0) {
    return current >= baseline * LIFT_MULTIPLIER;
  }
  return current >= ABSOLUTE_FLOOR_NEW_CREATOR;
}

export interface GuaranteeEvaluation {
  userId: string;
  baseline: number;
  current: number;
  cleared: boolean;
  // Only set when cleared=false — the amount we owe the user, in USDC.
  // Pulled from the subscription's last payment intent (founding $15
  // vs. post-founding $29) so renewals refund the right amount.
  refundAmountUsdc?: string;
}

// Evaluate the guarantee for one subscription. Idempotent — if
// guarantee_evaluated_at is already stamped, returns null.
// Caller writes the resulting state back to the row.
export async function evaluateOne(userId: string): Promise<GuaranteeEvaluation | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!sub) return null;
  if (sub.guaranteeEvaluatedAt) return null; // already evaluated
  if (!sub.baselineSnapshottedAt || sub.baselineApplicationCount === null) {
    return null; // legacy row without a snapshot — skip
  }

  const windowEnd = new Date(
    sub.baselineSnapshottedAt.getTime() + EVALUATION_WINDOW_DAYS * 24 * 60 * 60_000,
  );
  if (windowEnd.getTime() > Date.now()) {
    return null; // not yet 30 days since snapshot
  }

  const current = await countApplicationsInWindow(
    userId,
    sub.baselineSnapshottedAt,
    windowEnd,
  );
  const baseline = sub.baselineApplicationCount;
  const cleared = clearsGuarantee(baseline, current);

  return {
    userId,
    baseline,
    current,
    cleared,
  };
}

// Sweep — find every subscription whose baseline is >= 30 days old
// and hasn't been evaluated yet, evaluate each, and write the result.
// Designed for invocation from a cron/admin endpoint. Returns the
// list so callers can email + log.
export interface SweepResult {
  evaluated: number;
  triggered: number;
  details: GuaranteeEvaluation[];
}

export async function sweepGuarantees(): Promise<SweepResult> {
  const thirtyDaysAgo = new Date(Date.now() - EVALUATION_WINDOW_DAYS * 24 * 60 * 60_000);
  const due = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      and(
        isNull(subscriptions.guaranteeEvaluatedAt),
        lte(subscriptions.baselineSnapshottedAt, thirtyDaysAgo),
      ),
    );

  const details: GuaranteeEvaluation[] = [];
  let triggered = 0;
  for (const row of due) {
    const result = await evaluateOne(row.userId);
    if (!result) continue;
    details.push(result);

    if (result.cleared) {
      // Stamp evaluated_at so we don't recheck; status stays 'active'.
      await db
        .update(subscriptions)
        .set({
          guaranteeEvaluatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, result.userId));
    } else {
      // Fire — move into refund-pending state. The admin queue
      // picks it up; once they process USDC out of the treasury they
      // stamp refund_tx_hash and the subscription moves to 'refunded'.
      await db
        .update(subscriptions)
        .set({
          guaranteeEvaluatedAt: new Date(),
          guaranteeTriggered: true,
          status: "refund_pending",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, result.userId));
      triggered++;
    }
  }

  return { evaluated: details.length, triggered, details };
}

// Lightweight progress reader — used by the creator-facing
// guarantee-status endpoint. Returns null when there's nothing to
// show (no snapshot, or already evaluated and cleared).
export interface GuaranteeProgress {
  baseline: number;
  current: number;
  threshold: number;          // what current needs to reach
  daysRemaining: number;      // until evaluation
  willTriggerIfEvaluatedNow: boolean;
}

export async function getProgress(userId: string): Promise<GuaranteeProgress | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!sub) return null;
  if (!sub.baselineSnapshottedAt || sub.baselineApplicationCount === null) return null;
  if (sub.guaranteeEvaluatedAt) return null;

  const windowEnd = new Date(
    sub.baselineSnapshottedAt.getTime() + EVALUATION_WINDOW_DAYS * 24 * 60 * 60_000,
  );
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((windowEnd.getTime() - now.getTime()) / (24 * 60 * 60_000)),
  );

  const current = await countApplicationsInWindow(
    userId,
    sub.baselineSnapshottedAt,
    now,
  );
  const baseline = sub.baselineApplicationCount;
  const threshold = baseline > 0
    ? Math.ceil(baseline * LIFT_MULTIPLIER)
    : ABSOLUTE_FLOOR_NEW_CREATOR;

  return {
    baseline,
    current,
    threshold,
    daysRemaining,
    willTriggerIfEvaluatedNow: !clearsGuarantee(baseline, current),
  };
}
