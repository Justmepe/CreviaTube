// Phase 5 — creator-clipper trust CRUD.
//
// Endpoints:
//   GET  /api/creator/clipper-trust/:clipperId
//     Returns the trust row for (current creator, clipperId) or null.
//     Used by the review-modal UI to decide whether to show the
//     auto-approve toggle and what its current state is.
//
//   PUT  /api/creator/clipper-trust/:clipperId
//     Body: { autoApprove: boolean, threshold?: number }
//     Upserts the row. Threshold floors at 1, ceilings at 1000 to
//     prevent typo fat-fingers turning into "auto-approve never".
//
//   GET  /api/creator/clipper-trust
//     Lists all trusted-with-auto-approve clippers for the current
//     creator. Useful for a future "trusted clippers" admin page.
//
// The apply handler at POST /api/campaigns/:id/apply also reads from
// this table to decide whether to skip creator_review on a new
// application — see resolveAutoApproveDecision() below, exported for
// reuse from routes.ts.

import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { creatorClipperTrust, users } from "../../shared/schema";

const MIN_THRESHOLD = 1;
const MAX_THRESHOLD = 1000;

// Inspect the trust state for a (creator, clipper) pair and decide
// whether the apply handler should mark the new application 'approved'
// directly, skipping creator_review. Returns the trust row when it
// fired so the caller can update first_auto_approve_notified_at.
export async function resolveAutoApproveDecision(
  creatorId: string,
  clipperId: string,
): Promise<{ shouldAutoApprove: boolean; trust: typeof creatorClipperTrust.$inferSelect | null }> {
  const [trust] = await db
    .select()
    .from(creatorClipperTrust)
    .where(
      and(
        eq(creatorClipperTrust.creatorId, creatorId),
        eq(creatorClipperTrust.clipperId, clipperId),
      ),
    )
    .limit(1);
  if (!trust) return { shouldAutoApprove: false, trust: null };
  // Auto-approve fires only when BOTH the toggle is on AND the
  // approved_count has actually crossed the threshold. Toggling on
  // before the count is met would be a footgun otherwise — a creator
  // could "trust" someone they've never approved.
  const meets = trust.approvedCount >= trust.autoApproveThreshold;
  return { shouldAutoApprove: trust.autoApprove && meets, trust };
}

// Mark the trust row to indicate the celebratory "you're trusted"
// email has been sent. Idempotent — safe to call multiple times.
export async function markTrustNotified(trustId: string): Promise<void> {
  await db
    .update(creatorClipperTrust)
    .set({ firstAutoApproveNotifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(creatorClipperTrust.id, trustId));
}

export function setupCreatorClipperTrustAPI(app: Express): void {
  // Read trust state for one clipper.
  app.get("/api/creator/clipper-trust/:clipperId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "creator") {
      return res.status(403).json({ message: "Creators only" });
    }
    const { clipperId } = req.params;
    const [trust] = await db
      .select()
      .from(creatorClipperTrust)
      .where(
        and(
          eq(creatorClipperTrust.creatorId, user.id),
          eq(creatorClipperTrust.clipperId, clipperId),
        ),
      )
      .limit(1);
    res.json({ trust: trust ?? null });
  });

  // Upsert trust state. PUT semantics — body is the desired new state.
  app.put("/api/creator/clipper-trust/:clipperId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "creator") {
      return res.status(403).json({ message: "Creators only" });
    }
    const { clipperId } = req.params;

    // Validate the clipper exists + has clipper role.
    const [target] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, clipperId))
      .limit(1);
    if (!target || target.role !== "clipper") {
      return res.status(404).json({ message: "Clipper not found" });
    }

    const autoApprove = Boolean(req.body?.autoApprove);
    let threshold: number | undefined;
    if (req.body?.threshold != null) {
      const n = Number(req.body.threshold);
      if (!Number.isFinite(n) || n < MIN_THRESHOLD || n > MAX_THRESHOLD) {
        return res.status(400).json({
          message: `threshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}`,
        });
      }
      threshold = Math.floor(n);
    }

    const now = new Date();
    const [saved] = await db
      .insert(creatorClipperTrust)
      .values({
        creatorId: user.id,
        clipperId,
        autoApprove,
        ...(threshold !== undefined ? { autoApproveThreshold: threshold } : {}),
      })
      .onConflictDoUpdate({
        target: [creatorClipperTrust.creatorId, creatorClipperTrust.clipperId],
        set: {
          autoApprove,
          ...(threshold !== undefined ? { autoApproveThreshold: threshold } : {}),
          updatedAt: now,
        },
      })
      .returning();

    res.json({ trust: saved });
  });

  // List clippers this creator has actively flagged as auto-approve.
  // Used for a future "trusted clippers" admin page; keep here so
  // the trust API is a single module.
  app.get("/api/creator/clipper-trust", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "creator") {
      return res.status(403).json({ message: "Creators only" });
    }
    const rows = await db
      .select({
        id: creatorClipperTrust.id,
        clipperId: creatorClipperTrust.clipperId,
        clipperUsername: users.username,
        clipperFullName: users.fullName,
        approvedCount: creatorClipperTrust.approvedCount,
        autoApprove: creatorClipperTrust.autoApprove,
        autoApproveThreshold: creatorClipperTrust.autoApproveThreshold,
        lastApprovedAt: creatorClipperTrust.lastApprovedAt,
      })
      .from(creatorClipperTrust)
      .innerJoin(users, eq(creatorClipperTrust.clipperId, users.id))
      .where(eq(creatorClipperTrust.creatorId, user.id));
    res.json({ trusted: rows });
  });
}
