// Phase 7 Slice G — admin action audit log writer.
//
// Single helper called from every state-changing admin endpoint:
//
//   await logAdminAction(req, {
//     action: "campaign.cancel",
//     targetType: "campaign",
//     targetId: campaign.id,
//     payload: { reason, refundUsdc },
//   });
//
// Pulls actor + IP + UA off the Express request so call sites don't
// have to. Swallows errors — admin actions must not fail because we
// couldn't write a log row, but we DO log the failure to stderr so
// it's visible.
//
// The audit table is append-only by convention. There's no update or
// delete helper. If we ever need GDPR-driven erasure, we'd add a
// scrubbing column rather than mutating rows.

import type { Request } from "express";
import { db } from "../db";
import { adminAuditLog } from "../../shared/schema";

// Verbs are intentionally a closed string-set rather than a generic
// string param so accidental typos don't fragment the audit history
// across slightly different action names ("user.suspend" vs.
// "user.suspended" vs. "suspend"). Add new verbs here as the admin
// surface grows.
export type AdminAction =
  | "user.suspend"
  | "user.activate"
  | "user.deactivate"
  | "user.delete"
  | "user.kyc_update"
  | "user.test_mode_toggle"
  | "campaign.cancel"
  | "campaign.refund_marked"
  | "campaign.force_fund"
  | "subscription.cancel"
  | "subscription.refund_marked"
  | "withdrawal.approve"
  | "withdrawal.reject"
  | "credit.manual_post"
  | "guarantee.sweep_run"
  | "guarantee.refund_marked"
  | "config.update";

export interface LogAdminActionArgs {
  action: AdminAction;
  targetType: string;
  targetId?: string | null;
  payload?: Record<string, unknown>;
}

export async function logAdminAction(req: Request, args: LogAdminActionArgs): Promise<void> {
  try {
    const actor = req.user as any;
    if (!actor?.id) {
      console.warn("[audit] called without authenticated actor", args.action);
      return;
    }
    await db.insert(adminAuditLog).values({
      actorId: actor.id,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId ?? null,
      payload: (args.payload as any) ?? null,
      ipAddress: extractIp(req),
      userAgent: typeof req.headers["user-agent"] === "string"
        ? (req.headers["user-agent"] as string).slice(0, 500)
        : null,
    });
  } catch (err: any) {
    // Don't fail the action because the audit insert failed —
    // log loudly so it's noticed in the server log.
    console.error("[audit] failed to write log row:", err?.message ?? err);
  }
}

// Extract the caller IP, preferring forwarded headers in order of
// trust (CF > X-Real-IP > X-Forwarded-For). Falls back to socket.
function extractIp(req: Request): string | null {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string") return cf;
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") return realIp;
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}
