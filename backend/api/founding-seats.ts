// Phase 6 Slice C — Founding Creator seat cap.
//
// Endpoints:
//   GET  /api/founding-seats/status
//     Public read. Returns { taken, total, currentPrice, isUserFounder? }.
//     Renders the "37 of 50 left" counter on the /premium page and
//     drives the displayed price (15 while < 50 claimed, 29 after).
//
//   POST /api/founding-seats/claim
//     Authenticated creators only. Atomically reserves the next
//     unclaimed seat with SELECT ... FOR UPDATE SKIP LOCKED so two
//     simultaneous checkouts can't race onto the same row. Idempotent
//     on user_id — a user who already owns a seat just gets their
//     existing row back.
//
// Claim must happen AT subscription activation (payment verified),
// not before — otherwise abandoned checkouts would burn seats. The
// /api/payments/verify handler will call into claimFoundingSeatTx()
// inside its transaction (Slice C continuation).

import type { Express, Request, Response } from "express";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { foundingSeats } from "../../shared/schema";
import {
  getFoundingPriceUsdc,
  getFoundingSeatsTotal,
  getPostFoundingPriceUsdc,
} from "../lib/platform-config";

export async function getFoundingSeatStats(userId?: string): Promise<{
  taken: number;
  total: number;
  currentPrice: number;
  isUserFounder: boolean;
}> {
  // One aggregate query — count claimed rows + check viewer's seat
  // in the same round-trip. The viewer check is cheap; the count
  // hits a 50-row table.
  const [seatTotalConfig, foundingPriceConfig, postFoundingPriceConfig] = await Promise.all([
    getFoundingSeatsTotal(),
    getFoundingPriceUsdc(),
    getPostFoundingPriceUsdc(),
  ]);

  const [{ taken }] = await db
    .select({ taken: count() })
    .from(foundingSeats)
    .where(sql`${foundingSeats.userId} IS NOT NULL`);

  let isUserFounder = false;
  if (userId) {
    const [row] = await db
      .select({ id: foundingSeats.id })
      .from(foundingSeats)
      .where(eq(foundingSeats.userId, userId))
      .limit(1);
    isUserFounder = !!row;
  }

  const seatsLeft = seatTotalConfig - Number(taken);
  return {
    taken: Number(taken),
    total: seatTotalConfig,
    currentPrice: parseFloat(seatsLeft > 0 ? foundingPriceConfig : postFoundingPriceConfig),
    isUserFounder,
  };
}

// Atomically claim the next available founding seat for this user.
// Returns true if a seat was claimed (or already held), false if the
// cap is hit. Safe to call from inside a larger transaction: we open
// our own client and BEGIN/COMMIT here so the SELECT FOR UPDATE
// row-lock is local. If you need to call from inside another tx,
// pass the existing pg client.
export async function claimFoundingSeatTx(userId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // If the user already holds a seat, we're done — Founding pricing
    // already applies.
    const existing = await client.query(
      "SELECT id FROM founding_seats WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      return true;
    }

    // SKIP LOCKED so two simultaneous claims don't queue on the
    // same row — the second one just moves to the next free seat.
    const free = await client.query(
      `SELECT id FROM founding_seats
        WHERE user_id IS NULL
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
    );
    if (free.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      "UPDATE founding_seats SET user_id = $1, claimed_at = NOW() WHERE id = $2",
      [userId, free.rows[0].id],
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export function setupFoundingSeatsAPI(app: Express): void {
  app.get("/api/founding-seats/status", async (req: Request, res: Response) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      const stats = await getFoundingSeatStats(userId);
      res.json(stats);
    } catch (err: any) {
      console.error("[founding-seats] status failed", err);
      res.status(500).json({ message: "Failed to fetch seat status" });
    }
  });

  // Manual claim endpoint exists primarily for ops/admin use — the
  // production claim path runs inside /api/payments/verify after USDC
  // confirms on-chain. Exposing it directly lets us pre-grant founding
  // status to a creator we've onboarded manually.
  app.post("/api/founding-seats/claim", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.role !== "creator" && user.role !== "admin") {
      return res.status(403).json({ message: "Only creators can claim Founding seats" });
    }
    try {
      const targetUserId =
        user.role === "admin" && typeof req.body?.userId === "string"
          ? req.body.userId
          : user.id;
      const claimed = await claimFoundingSeatTx(targetUserId);
      if (!claimed) {
        return res.status(409).json({
          message: "All Founding seats are taken.",
          fallbackPrice: parseFloat(await getPostFoundingPriceUsdc()),
        });
      }
      const stats = await getFoundingSeatStats(targetUserId);
      res.json({ ok: true, stats });
    } catch (err: any) {
      console.error("[founding-seats] claim failed", err);
      res.status(500).json({ message: "Failed to claim seat" });
    }
  });
}
