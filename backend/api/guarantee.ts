// Phase 6 Slice D — guarantee API surface.
//
// Three endpoints split by audience:
//
//   GET  /api/subscription/guarantee-status      (creator-only, self)
//     Returns the creator's progress toward clearing the guarantee.
//     Drives the dashboard widget that says "12 of 20 applications
//     to clear — 14 days remaining."
//
//   POST /api/admin/guarantees/sweep             (admin-only)
//     Runs the evaluator. Manual today; wire to a daily cron once
//     volume justifies it. Returns a summary the admin can eyeball.
//
//   GET  /api/admin/guarantees/pending-refunds   (admin-only)
//     Lists subscriptions whose guarantee triggered and haven't been
//     refunded yet. Includes the amount owed + the wallet address
//     to refund to.
//
//   POST /api/admin/guarantees/:userId/mark-refunded   (admin-only)
//     Stamps the refund_tx_hash + flips status to 'refunded'. Audit
//     trail for the manual USDC payout out of the treasury wallet.

import type { Express, Request, Response } from "express";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { paymentIntents, subscriptions, users } from "../../shared/schema";
import { getProgress, sweepGuarantees } from "../lib/guarantee";

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return false;
  }
  if ((req.user as any).role !== "admin") {
    res.status(403).json({ message: "Admin only" });
    return false;
  }
  return true;
}

export function setupGuaranteeAPI(app: Express): void {
  // ── Creator-facing progress widget ───────────────────────────────
  app.get("/api/subscription/guarantee-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const progress = await getProgress((req.user as any).id);
      res.json(progress); // null when no guarantee window is active
    } catch (err: any) {
      console.error("[guarantee-status] failed", err);
      res.status(500).json({ message: "Failed to load guarantee status" });
    }
  });

  // ── Admin: run the sweep ─────────────────────────────────────────
  app.post("/api/admin/guarantees/sweep", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const result = await sweepGuarantees();

      // Fire-and-forget emails for each triggered guarantee. Done
      // outside the request lifecycle so a slow SMTP doesn't stall
      // the admin's "run sweep" click.
      void (async () => {
        for (const detail of result.details) {
          if (!detail.cleared) {
            try {
              await sendGuaranteeTriggeredEmail(detail.userId);
            } catch (e) {
              console.error("[guarantee] email failed", e);
            }
          }
        }
      })();

      res.json(result);
    } catch (err: any) {
      console.error("[guarantee-sweep] failed", err);
      res.status(500).json({ message: "Sweep failed", error: err.message });
    }
  });

  // ── Admin: pending refunds queue ─────────────────────────────────
  app.get("/api/admin/guarantees/pending-refunds", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      // Join: subscription that triggered + its last payment intent
      // (so we have the sender wallet to refund to + the exact USDC
      // amount that was paid) + the user's email for outreach.
      const rows = await db
        .select({
          userId: subscriptions.userId,
          userEmail: users.email,
          userFullName: users.fullName,
          triggeredAt: subscriptions.guaranteeEvaluatedAt,
          baseline: subscriptions.baselineApplicationCount,
          lastIntentId: subscriptions.lastPaymentIntentId,
          refundToAddress: paymentIntents.senderAddress,
          expectedUsdcUnits: paymentIntents.expectedUsdcUnits,
          txHash: paymentIntents.txHash,
        })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.userId, users.id))
        .leftJoin(paymentIntents, eq(subscriptions.lastPaymentIntentId, paymentIntents.id))
        .where(
          and(
            eq(subscriptions.guaranteeTriggered, true),
            eq(subscriptions.status, "refund_pending"),
          ),
        );

      const queue = rows.map((r) => ({
        userId: r.userId,
        userEmail: r.userEmail,
        userFullName: r.userFullName,
        triggeredAt: r.triggeredAt,
        baseline: r.baseline,
        refundToAddress: r.refundToAddress,
        refundAmountUsdc:
          r.expectedUsdcUnits !== null
            ? (Number(r.expectedUsdcUnits) / 1_000_000).toFixed(2)
            : null,
        originalTxHash: r.txHash,
      }));

      res.json({ pending: queue });
    } catch (err: any) {
      console.error("[pending-refunds] failed", err);
      res.status(500).json({ message: "Failed to load pending refunds" });
    }
  });

  // ── Admin: mark a refund as paid ─────────────────────────────────
  // The admin sends USDC manually from the treasury wallet and pastes
  // the resulting txHash here. We stamp it for the audit trail and
  // flip the subscription to status='refunded'.
  app.post("/api/admin/guarantees/:userId/mark-refunded", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const { txHash } = req.body as { txHash?: string };
    if (!txHash || typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ message: "txHash must be a valid 0x… 32-byte hex string" });
    }
    try {
      const [updated] = await db
        .update(subscriptions)
        .set({
          status: "refunded",
          refundTxHash: txHash,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.userId, req.params.userId),
            eq(subscriptions.guaranteeTriggered, true),
            eq(subscriptions.status, "refund_pending"),
          ),
        )
        .returning();
      if (!updated) {
        return res.status(404).json({
          message: "No pending refund found for this user (already paid or never triggered)",
        });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[mark-refunded] failed", err);
      res.status(500).json({ message: "Failed to mark refunded" });
    }
  });
}

// ── Email side-effect for triggered guarantees ─────────────────────
async function sendGuaranteeTriggeredEmail(userId: string): Promise<void> {
  const [u] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return;

  const [{ sendEmail, APP_URL }, React] = await Promise.all([
    import("../lib/email"),
    import("react"),
  ]);
  const { GuaranteeTriggered } = await import("../emails/guarantee-triggered");
  await sendEmail({
    kind: "guarantee_triggered",
    to: u.email,
    subject: "Your Founding Creator guarantee — refund in progress",
    react: React.createElement(GuaranteeTriggered, {
      fullName: u.fullName,
      appUrl: APP_URL,
    }),
    dedupeKey: `guarantee_triggered:${u.id}`,
    userId: u.id,
  });
}
