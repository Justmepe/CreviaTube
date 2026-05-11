// Phase 6 — Premium subscription helpers shared across the backend.
//
// Single source of truth for "is this user a paying Premium creator
// right now". Used by:
//   - Marketplace queries (Slice B) — featured-sort campaigns whose
//     creator is currently Premium
//   - Founding Creator badge endpoint (Slice F) — surfaces { isPremium,
//     isFounder } so client components can render a crown
//   - 30-day guarantee evaluator (Slice D) — needs to know who's still
//     active when running the daily sweep
//   - Analytics gate (Slice E) — 403s free creators
//
// Premium is "active" when subscriptions.status === 'active' AND
// current_period_end > NOW(). The status column gets set to 'expired'
// by a cron sweep in a separate concern; this helper also defensively
// checks the date in case the sweep is behind.

import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, foundingSeats } from "../../shared/schema";

export interface PremiumStatus {
  isPremium: boolean;
  // True when the user is among the first 50 to claim Founding
  // pricing. Founder pricing locks for life — they keep $15/mo even
  // after the cap raises to $29/mo. Computed by the founding-seats
  // module (Slice C); for now we expose the field so consumers can
  // wire to it without a future signature change.
  isFounder: boolean;
  currentPeriodEnd: Date | null;
}

const INACTIVE: PremiumStatus = {
  isPremium: false,
  isFounder: false,
  currentPeriodEnd: null,
};

// Single-user lookup. Returns INACTIVE when there's no row, or when
// the row is past its period end / not status='active'.
export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
  const [row] = await db
    .select({
      tier: subscriptions.tier,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!row) return INACTIVE;
  if (row.status !== "active") return INACTIVE;
  if (row.currentPeriodEnd.getTime() <= Date.now()) return INACTIVE;

  // Founder flag — they hold one of the first 50 seats. Read in
  // parallel rather than blocking the main lookup.
  const [seatRow] = await db
    .select({ id: foundingSeats.id })
    .from(foundingSeats)
    .where(eq(foundingSeats.userId, userId))
    .limit(1);

  return {
    isPremium: row.tier === "premium",
    isFounder: !!seatRow,
    currentPeriodEnd: row.currentPeriodEnd,
  };
}

// Bulk lookup. Returns a Set of userIds that are currently active
// Premium subscribers. Used by marketplace queries to avoid an N+1.
// Empty set on empty input or zero matches.
export async function getActivePremiumUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      and(
        sql`${subscriptions.userId} = ANY(${userIds})`,
        eq(subscriptions.tier, "premium"),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    );
  return new Set(rows.map((r) => r.userId));
}
