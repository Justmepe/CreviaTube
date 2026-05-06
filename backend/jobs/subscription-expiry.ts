import { and, eq, gt, lte, isNull, or, sql } from "drizzle-orm";
import * as React from "react";
import { db } from "../db";
import { subscriptions, users } from "../../shared/schema.js";
import { sendEmail, APP_URL } from "../lib/email";
import { SubscriptionExpiring } from "../emails/subscription-expiring";

const WARN_DAYS = 3;

/**
 * Find subscriptions whose currentPeriodEnd is within WARN_DAYS days from now
 * AND we haven't already notified for this period (notifiedExpiryAt is NULL,
 * or was set before the latest renewal).
 *
 * Idempotent — running the job multiple times in a day re-checks but only
 * sends once per cycle thanks to the email_log dedupe key (subscription_id +
 * period_end) plus the notifiedExpiryAt update.
 */
export async function runSubscriptionExpiryJob(): Promise<{ scanned: number; sent: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60_000);

  // Eligible: still active, not expired yet, ends within window, and notifiedExpiryAt is
  // either null OR older than the period (meaning a renewal happened since we last warned).
  const rows = await db
    .select({
      userId: subscriptions.userId,
      tier: subscriptions.tier,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      notifiedExpiryAt: subscriptions.notifiedExpiryAt,
      email: users.email,
      fullName: users.fullName,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(and(
      eq(subscriptions.status, "active"),
      gt(subscriptions.currentPeriodEnd, now),
      lte(subscriptions.currentPeriodEnd, windowEnd),
      or(
        isNull(subscriptions.notifiedExpiryAt),
        // If the last notification was before the period started (i.e., renewed since), notify again.
        // We approximate "period start" as currentPeriodEnd minus a wide window — simpler check:
        // notifiedExpiryAt is older than (currentPeriodEnd - WARN_DAYS*2 days) means we'd warned a previous cycle.
        sql`${subscriptions.notifiedExpiryAt} < ${subscriptions.currentPeriodEnd} - interval '${sql.raw(String(WARN_DAYS * 2))} days'`,
      ),
    ));

  let sent = 0;
  for (const row of rows) {
    const daysRemaining = Math.max(0, Math.ceil((row.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60_000)));
    try {
      const result = await sendEmail({
        kind: "subscription_expiring",
        to: row.email,
        subject: `Your CreviaTube ${row.tier} expires in ${daysRemaining} days`,
        react: React.createElement(SubscriptionExpiring, {
          fullName: row.fullName,
          planName: row.tier.charAt(0).toUpperCase() + row.tier.slice(1),
          expiresOn: row.currentPeriodEnd.toLocaleDateString(),
          daysRemaining,
          appUrl: APP_URL,
        }),
        // Dedupe per (user, period_end) — survives multiple ticks in the same day
        dedupeKey: `subscription_expiring:${row.userId}:${row.currentPeriodEnd.toISOString()}`,
        userId: row.userId,
      });
      if (result.status !== "skipped") sent++;

      // Stamp regardless of provider state — we tried, don't retry until cycle changes
      await db.update(subscriptions)
        .set({ notifiedExpiryAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.userId, row.userId));
    } catch (err) {
      console.error(`subscription-expiry: failed for user ${row.userId}:`, err);
    }
  }

  console.log(`⏰ subscription-expiry: scanned ${rows.length}, sent ${sent}`);
  return { scanned: rows.length, sent };
}
