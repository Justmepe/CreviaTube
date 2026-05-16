// Phase 7 Slices E + F + G + I — admin-only state-change endpoints.
//
// Endpoints:
//
//   POST /api/admin/campaigns/:id/cancel      (Slice E)
//     body: { reason: string }
//     Flips the campaign to status='cancelled', marks the escrow row
//     status='refund_pending', and writes an audit row. The refunds
//     queue picks it up the same way the guarantee mechanism does
//     (Phase 6 Slice D): an admin sends USDC manually from the
//     treasury wallet, then stamps the txHash via mark-refunded.
//
//   POST /api/admin/subscriptions/:userId/cancel  (Slice F)
//     body: { reason: string, refundAmountUsdc?: string }
//     If refundAmountUsdc > 0, flips subscription to
//     status='refund_pending' (admin processes manually like the
//     campaign cancel). If 0 or omitted, flips straight to
//     status='cancelled'. Either way, audit row written.
//
//   POST /api/admin/withdrawals/:id/approve       (Slice I)
//   POST /api/admin/withdrawals/:id/reject        (Slice I)
//     Toggles withdrawal status. Audit row written.
//
//   GET  /api/admin/audit-log                     (Slice G)
//     query: { actor?, action?, targetType?, targetId?, limit? }
//     Returns the latest N rows, default 100, max 500. Filters are
//     all optional and combine with AND.

import type { Express, Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  campaigns,
  subscriptions,
  users,
  budgetEscrow,
  adminAuditLog,
} from "../../shared/schema";
import { logAdminAction, type AdminAction } from "../lib/audit";

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

export function setupAdminActionsAPI(app: Express): void {
  // ── Slice E: cancel a campaign + mark escrow for refund ─────────
  app.post("/api/admin/campaigns/:id/cancel", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < 5) {
      return res.status(400).json({ message: "reason is required (min 5 chars)" });
    }
    try {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, req.params.id))
        .limit(1);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      if (campaign.status === "cancelled") {
        return res.status(409).json({ message: "Campaign is already cancelled" });
      }

      // Flip campaign state. We don't delete; the row stays for
      // historical aggregates and the audit log refers to it by id.
      await db
        .update(campaigns)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(campaigns.id, campaign.id));

      // If there's an escrow row with money still locked, flip it
      // to refund_pending so the admin can process it. Funded but
      // not started → full refund; partially used → whatever's left.
      const [escrow] = await db
        .select()
        .from(budgetEscrow)
        .where(eq(budgetEscrow.campaignId, campaign.id))
        .limit(1);
      let refundUsdc = "0";
      if (escrow && parseFloat(escrow.availableBalance) > 0) {
        refundUsdc = escrow.availableBalance;
        await db
          .update(budgetEscrow)
          .set({ status: "refund_pending", updatedAt: new Date() })
          .where(eq(budgetEscrow.id, escrow.id));
      }

      await logAdminAction(req, {
        action: "campaign.cancel",
        targetType: "campaign",
        targetId: campaign.id,
        payload: {
          reason,
          campaignName: campaign.name,
          creatorId: campaign.creatorId,
          refundUsdc,
        },
      });

      res.json({
        ok: true,
        campaignId: campaign.id,
        refundUsdc,
        refundPending: parseFloat(refundUsdc) > 0,
      });
    } catch (err: any) {
      console.error("[campaign.cancel] failed", err);
      res.status(500).json({ message: "Cancel failed", error: err.message });
    }
  });

  // ── Slice F: cancel a subscription (with optional refund) ───────
  app.post("/api/admin/subscriptions/:userId/cancel", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const refundAmount = typeof req.body?.refundAmountUsdc === "string"
      ? parseFloat(req.body.refundAmountUsdc)
      : 0;
    if (reason.length < 5) {
      return res.status(400).json({ message: "reason is required (min 5 chars)" });
    }
    if (!Number.isFinite(refundAmount) || refundAmount < 0) {
      return res.status(400).json({ message: "refundAmountUsdc must be a non-negative number" });
    }
    try {
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.params.userId))
        .limit(1);
      if (!sub) return res.status(404).json({ message: "Subscription not found" });
      if (sub.status === "cancelled" || sub.status === "refunded") {
        return res.status(409).json({ message: `Subscription is already ${sub.status}` });
      }

      const refundIsPending = refundAmount > 0;
      await db
        .update(subscriptions)
        .set({
          status: refundIsPending ? "refund_pending" : "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, sub.userId));

      await logAdminAction(req, {
        action: "subscription.cancel",
        targetType: "subscription",
        targetId: sub.userId,
        payload: {
          reason,
          refundAmountUsdc: refundAmount.toFixed(2),
          previousStatus: sub.status,
          newStatus: refundIsPending ? "refund_pending" : "cancelled",
        },
      });

      res.json({
        ok: true,
        userId: sub.userId,
        refundIsPending,
        refundAmountUsdc: refundAmount.toFixed(2),
      });
    } catch (err: any) {
      console.error("[subscription.cancel] failed", err);
      res.status(500).json({ message: "Cancel failed", error: err.message });
    }
  });

  // ── Slice I: withdrawal approve/reject ──────────────────────────
  // Generic two-handler pattern. Both update the withdrawal row's
  // status, log the action, and return the updated row.
  for (const verb of ["approve", "reject"] as const) {
    app.post(`/api/admin/withdrawals/:id/${verb}`, async (req: Request, res: Response) => {
      if (!requireAdmin(req, res)) return;
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      // Reject must carry a reason; approve doesn't have to.
      if (verb === "reject" && reason.length < 5) {
        return res
          .status(400)
          .json({ message: "reason is required when rejecting (min 5 chars)" });
      }
      try {
        // payoutRecords is the withdrawals table — same shape, named
        // for historical reasons. We import dynamically to dodge
        // circular import concerns in the admin module.
        const { payoutRecords } = await import("../../shared/schema");
        const [row] = await db
          .select()
          .from(payoutRecords)
          .where(eq(payoutRecords.id, req.params.id))
          .limit(1);
        if (!row) return res.status(404).json({ message: "Withdrawal not found" });
        if (row.status !== "pending") {
          return res.status(409).json({
            message: `Withdrawal is already ${row.status}; only pending withdrawals can be ${verb}d.`,
          });
        }

        const newStatus = verb === "approve" ? "approved" : "rejected";
        // payout_records has no updated_at column; use processed_at
        // when transitioning out of 'pending' so we have a timestamp
        // for the action.
        await db
          .update(payoutRecords)
          .set({ status: newStatus, processedAt: new Date() })
          .where(eq(payoutRecords.id, row.id));

        await logAdminAction(req, {
          action: verb === "approve" ? "withdrawal.approve" : "withdrawal.reject",
          targetType: "withdrawal",
          targetId: row.id,
          payload: {
            reason: reason || null,
            amount: row.amount,
            method: (row as any).method ?? (row as any).paymentMethod ?? null,
          },
        });

        res.json({ ok: true, withdrawalId: row.id, status: newStatus });
      } catch (err: any) {
        console.error(`[withdrawal.${verb}] failed`, err);
        res.status(500).json({ message: `${verb} failed`, error: err.message });
      }
    });
  }

  // ── Slice G: read audit log ─────────────────────────────────────
  app.get("/api/admin/audit-log", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const limit = Math.min(
        500,
        Math.max(1, parseInt((req.query.limit as string) ?? "100", 10) || 100),
      );

      const filters = [];
      if (typeof req.query.actor === "string") {
        filters.push(eq(adminAuditLog.actorId, req.query.actor));
      }
      if (typeof req.query.action === "string") {
        filters.push(eq(adminAuditLog.action, req.query.action));
      }
      if (typeof req.query.targetType === "string") {
        filters.push(eq(adminAuditLog.targetType, req.query.targetType));
      }
      if (typeof req.query.targetId === "string") {
        filters.push(eq(adminAuditLog.targetId, req.query.targetId));
      }

      const rows = await db
        .select({
          id: adminAuditLog.id,
          actorId: adminAuditLog.actorId,
          actorUsername: users.username,
          action: adminAuditLog.action,
          targetType: adminAuditLog.targetType,
          targetId: adminAuditLog.targetId,
          payload: adminAuditLog.payload,
          ipAddress: adminAuditLog.ipAddress,
          createdAt: adminAuditLog.createdAt,
        })
        .from(adminAuditLog)
        .innerJoin(users, eq(adminAuditLog.actorId, users.id))
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(limit);

      res.json({ rows });
    } catch (err: any) {
      console.error("[audit-log] read failed", err);
      res.status(500).json({ message: "Failed to load audit log" });
    }
  });
}
