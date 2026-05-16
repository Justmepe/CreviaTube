import type { Express } from "express";
import { eq, and, lt } from "drizzle-orm";
import * as React from "react";
import { db } from "../db";
import { paymentIntents, subscriptions, campaigns, budgetEscrow, users } from "../../shared/schema.js";
import { RECEIVE_ADDRESS, toUsdcUnits, verifyUsdcTransfer, isSameAddress } from "../lib/web3";
import { sendEmail, APP_URL } from "../lib/email";
import { SubscriptionPaid } from "../emails/subscription-paid";
import { CampaignFunded } from "../emails/campaign-funded";
import { maybePromoteStage } from "../core/services/stage-promotion";
import { emit } from "../lib/metrics";

function basescanTxUrl(txHash: string): string {
  const chainId = Number(process.env.WEB3_CHAIN_ID || 84532);
  const base = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
  return `${base}/tx/${txHash}`;
}

// Phase 6 — Founding Creator tier.
//
// The plan price is dynamic: while the founding seat cap isn't full
// (founding_seats has unclaimed rows), new subscribers pay the
// configured founding price and get a seat locking their price for
// life. Once the cap is hit, new subscribers pay the post-founding
// price. Phase 7 Slice H — both values are now sourced from
// platform_config so they're tunable without a deploy.
const PREMIUM_DURATION_DAYS = 30;

// resolveCreatorPrice — returns the price this specific user should
// pay right now. If they already hold a founding seat, they keep the
// founding price forever (renewals). Otherwise they pay the founding
// price if seats are still available, else post-founding. Anonymous
// callers (no userId) get the public price. Pulls both prices from
// platform_config so they can be tuned at runtime.
async function resolveCreatorPrice(userId?: string): Promise<string> {
  const [{ getFoundingSeatStats }, { getFoundingPriceUsdc, getPostFoundingPriceUsdc }] =
    await Promise.all([
      import("./founding-seats"),
      import("../lib/platform-config"),
    ]);
  const [stats, foundingPrice, postFoundingPrice] = await Promise.all([
    getFoundingSeatStats(userId),
    getFoundingPriceUsdc(),
    getPostFoundingPriceUsdc(),
  ]);
  if (stats.isUserFounder) return foundingPrice;
  const seatsLeft = stats.total - stats.taken;
  return seatsLeft > 0 ? foundingPrice : postFoundingPrice;
}

const INTENT_TTL_MINUTES = 15;

export function setupPaymentsAPI(app: Express): void {
  // Phase 6 — returns the price for THIS user. Anonymous callers
  // get the public price (founding while seats remain, else
  // post-founding). Existing founders see their locked $15.
  app.get("/api/subscription/plan", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
    const price = await resolveCreatorPrice(userId);
    res.json({
      id: "premium",
      priceUsdc: price,
      durationDays: PREMIUM_DURATION_DAYS,
    });
  });

  app.get("/api/subscription/current", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, req.user.id)).limit(1);
    if (!sub) return res.json({ tier: null, status: "none" });
    const expired = sub.currentPeriodEnd.getTime() < Date.now();
    res.json({
      tier: sub.tier,
      status: expired ? "expired" : sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
    });
  });

  // Create a pending payment intent. Returns the receive address + expected
  // amount + intent id, all of which the client needs to drive the wallet tx.
  app.post("/api/payments/intent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!RECEIVE_ADDRESS) {
      return res.status(500).json({ message: "PAYMENT_RECEIVE_WALLET not configured" });
    }

    const { kind, referenceId, senderAddress } = req.body as {
      kind?: string;
      referenceId?: string;
      senderAddress?: string;
    };

    let expectedUsdcUnits: bigint;
    let resolvedKind: string;
    let resolvedReference: string | null = null;
    let displayAmount: string;

    if (kind === "subscription") {
      resolvedKind = "subscription";
      resolvedReference = "premium";
      // Re-evaluate price at intent-creation time so the amount the
      // wallet asks the user to sign matches the current state of the
      // founding seat cap.
      const price = await resolveCreatorPrice(req.user.id);
      expectedUsdcUnits = toUsdcUnits(price);
      displayAmount = price;
    } else if (kind === "campaign_funding") {
      if (!referenceId) {
        return res.status(400).json({ message: "campaign_funding requires referenceId (campaign id)" });
      }
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, referenceId)).limit(1);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      if (campaign.creatorId !== req.user.id) {
        return res.status(403).json({ message: "You can only fund your own campaigns" });
      }
      if (campaign.fundingStatus === "funded") {
        return res.status(409).json({ message: "Campaign already funded" });
      }
      if (campaign.status !== "draft") {
        return res.status(409).json({ message: `Cannot fund campaign in status '${campaign.status}'` });
      }
      // budget is decimal-string (e.g. "10000.00"); 1 USDC == $1
      resolvedKind = "campaign_funding";
      resolvedReference = campaign.id;
      expectedUsdcUnits = toUsdcUnits(campaign.budget);
      displayAmount = campaign.budget;
    } else {
      return res.status(400).json({ message: "Unsupported intent kind (use 'subscription' or 'campaign_funding')" });
    }

    const expiresAt = new Date(Date.now() + INTENT_TTL_MINUTES * 60_000);
    const [row] = await db.insert(paymentIntents).values({
      userId: req.user.id,
      kind: resolvedKind,
      pathway: "usdc_direct",
      referenceId: resolvedReference,
      expectedUsdcUnits: expectedUsdcUnits.toString(),
      senderAddress: senderAddress?.toLowerCase() || null,
      receiveAddress: RECEIVE_ADDRESS.toLowerCase(),
      expiresAt,
      status: "pending",
    }).returning();

    res.status(201).json({
      intentId: row.id,
      kind: row.kind,
      pathway: row.pathway,
      referenceId: row.referenceId,
      receiveAddress: row.receiveAddress,
      expectedUsdcUnits: row.expectedUsdcUnits,
      expectedUsdc: displayAmount,
      expiresAt: row.expiresAt,
    });
  });

  // Verify an on-chain transfer against a pending intent. Idempotent on tx_hash.
  app.post("/api/payments/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { intentId, txHash } = req.body as { intentId?: string; txHash?: string };
    if (!intentId || !txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return res.status(400).json({ message: "Missing intentId or invalid txHash" });
    }

    // Idempotency: if tx_hash was already settled on any intent, return that result.
    const [existingByTx] = await db.select().from(paymentIntents).where(eq(paymentIntents.txHash, txHash)).limit(1);
    if (existingByTx && existingByTx.status === "paid") {
      return res.json({ status: "already_processed", intentId: existingByTx.id });
    }

    const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, intentId)).limit(1);
    if (!intent) return res.status(404).json({ message: "Intent not found" });
    if (intent.userId !== req.user.id) return res.sendStatus(403);
    if (intent.status !== "pending") {
      return res.status(409).json({ message: `Intent is ${intent.status}, not pending` });
    }
    if (intent.expiresAt.getTime() < Date.now()) {
      await db.update(paymentIntents)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(paymentIntents.id, intent.id));
      return res.status(410).json({ message: "Intent expired" });
    }

    const verification = await verifyUsdcTransfer({
      txHash: txHash as `0x${string}`,
      expectedTo: intent.receiveAddress as `0x${string}`,
      expectedFrom: intent.senderAddress ? (intent.senderAddress as `0x${string}`) : undefined,
      minValue: BigInt(intent.expectedUsdcUnits),
    });

    if (!verification.ok) {
      return res.status(400).json({ message: `Transfer verification failed: ${verification.reason}` });
    }

    // Mark intent paid (atomic via unique tx_hash constraint — racing verifies are safe)
    try {
      await db.update(paymentIntents).set({
        status: "paid",
        txHash,
        senderAddress: verification.from.toLowerCase(),
        paidAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(paymentIntents.id, intent.id));
    } catch (e: any) {
      // If unique violation on tx_hash, another verify call won the race
      return res.status(409).json({ message: "tx_hash already settled" });
    }

    if (intent.kind === "subscription") {
      const periodEnd = await activateSubscription(intent.userId, intent.id, PREMIUM_DURATION_DAYS);
      // Fire-and-forget confirmation email. We compute the dollar
      // amount from intent.expectedUsdcUnits so the email reflects
      // exactly what the user paid (founding $15 vs post-founding $29).
      const amountPaid = (Number(intent.expectedUsdcUnits) / 1_000_000).toFixed(2);
      void notifySubscriptionPaid({
        userId: intent.userId,
        intentId: intent.id,
        txHash,
        amountUsdc: amountPaid,
        periodEnd,
      });
    } else if (intent.kind === "campaign_funding" && intent.referenceId) {
      await fundCampaign(intent.referenceId);
      emit("campaign_funded", {
        campaignId: intent.referenceId,
        intentId: intent.id,
        txHash,
      }, intent.userId);
      void notifyCampaignFunded({
        campaignId: intent.referenceId,
        intentId: intent.id,
        txHash,
      });
      // Auto-promote campaigner stage if they crossed a milestone.
      void maybePromoteStage(intent.userId).then(async (r) => {
        if (!r.changed) return;
        emit("stage_promoted", { from: r.from, to: r.to, reason: r.reason }, intent.userId);

        // Celebration email — fire-and-forget, swallow errors. Lazy import
        // to avoid a hard email dep in the payments path on startup.
        try {
          const [u] = await db.select().from(users).where(eq(users.id, intent.userId)).limit(1);
          if (!u) return;
          const [{ StagePromoted }, _React] = await Promise.all([
            import("../emails/stage-promoted"),
            import("react"),
          ]);
          const ReactLib = await import("react");
          await sendEmail({
            kind: "stage_promoted",
            to: u.email,
            subject: `You graduated to ${r.to.replace(/_/g, " ")}`,
            react: ReactLib.createElement(StagePromoted, {
              fullName: u.fullName,
              fromStage: r.from,
              toStage: r.to,
              reason: r.reason,
              appUrl: APP_URL,
            }),
            // Allow re-send if a user hits the same threshold again after
            // a manual demotion, but not on the same exact transition.
            dedupeKey: `stage_promoted:${intent.userId}:${r.from}:${r.to}`,
            userId: intent.userId,
          });
        } catch (err) {
          console.error("stage-promoted email failed:", err);
        }
      }).catch((e) => console.error("Stage promotion failed:", e));
    }

    res.json({ status: "paid", intentId: intent.id, txHash });
  });
}

async function notifySubscriptionPaid(opts: {
  userId: string; intentId: string; txHash: string; amountUsdc: string; periodEnd: Date;
}) {
  try {
    const [u] = await db.select().from(users).where(eq(users.id, opts.userId)).limit(1);
    if (!u) return;
    await sendEmail({
      kind: "subscription_paid",
      to: u.email,
      subject: "Your CreviaTube subscription is active",
      react: React.createElement(SubscriptionPaid, {
        fullName: u.fullName,
        planName: "Premium",
        amountUsdc: opts.amountUsdc,
        periodEnd: opts.periodEnd.toLocaleDateString(),
        txHash: opts.txHash,
        basescanUrl: basescanTxUrl(opts.txHash),
        appUrl: APP_URL,
      }),
      dedupeKey: `subscription_paid:${opts.intentId}`,
      userId: u.id,
    });

    // Phase 7 Slice A — admin notice. Pulls the current
    // founding-seat stats so the email can show the running tally.
    try {
      const { notifyAdmin } = await import("../lib/admin-notify");
      const { AdminSubscriptionPaid } = await import("../emails/admin-subscription-paid");
      const { getFoundingSeatStats } = await import("./founding-seats");
      const stats = await getFoundingSeatStats(u.id);
      await notifyAdmin({
        kind: "admin_subscription_paid",
        subject: `${stats.isUserFounder ? "Founding seat claimed" : "Sub paid"} · ${opts.amountUsdc} USDC · @${u.username}`,
        react: React.createElement(AdminSubscriptionPaid, {
          userId: u.id,
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          amountUsdc: opts.amountUsdc,
          periodEnd: opts.periodEnd.toISOString(),
          isFounder: stats.isUserFounder,
          foundingSeatsTaken: stats.taken,
          foundingSeatsTotal: stats.total,
          txHash: opts.txHash,
          basescanUrl: basescanTxUrl(opts.txHash),
          appUrl: APP_URL,
        }),
        dedupeKey: `admin_subscription_paid:${opts.intentId}`,
      });
    } catch (e) {
      console.error("admin notify subscription-paid failed:", e);
    }
  } catch (e) {
    console.error("notifySubscriptionPaid failed:", e);
  }
}

async function notifyCampaignFunded(opts: { campaignId: string; intentId: string; txHash: string }) {
  try {
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, opts.campaignId)).limit(1);
    if (!c) return;
    const [u] = await db.select().from(users).where(eq(users.id, c.creatorId)).limit(1);
    if (!u) return;
    await sendEmail({
      kind: "campaign_funded",
      to: u.email,
      subject: `Campaign funded: ${c.name}`,
      react: React.createElement(CampaignFunded, {
        fullName: u.fullName,
        campaignName: c.name,
        campaignId: c.id,
        totalUsdc: parseFloat(c.budget).toFixed(2),
        escrowUsdc: c.escrowBalance,
        platformFeeUsdc: c.platformFee,
        txHash: opts.txHash,
        basescanUrl: basescanTxUrl(opts.txHash),
        appUrl: APP_URL,
      }),
      dedupeKey: `campaign_funded:${opts.intentId}`,
      userId: u.id,
    });

    // Phase 7 Slice A — admin notice. Parallel send (don't block the
    // creator's confirmation on the admin one).
    try {
      const { notifyAdmin } = await import("../lib/admin-notify");
      const { AdminCampaignFunded } = await import("../emails/admin-campaign-funded");
      await notifyAdmin({
        kind: "admin_campaign_funded",
        subject: `Campaign funded · ${parseFloat(c.budget).toFixed(2)} USDC · ${c.name}`,
        react: React.createElement(AdminCampaignFunded, {
          campaignId: c.id,
          campaignName: c.name,
          creatorUsername: u.username,
          creatorEmail: u.email,
          amountUsdc: parseFloat(c.budget).toFixed(2),
          platformFeeUsdc: c.platformFee,
          escrowUsdc: c.escrowBalance,
          txHash: opts.txHash,
          basescanUrl: basescanTxUrl(opts.txHash),
          appUrl: APP_URL,
        }),
        dedupeKey: `admin_campaign_funded:${opts.intentId}`,
      });
    } catch (e) {
      console.error("admin notify campaign-funded failed:", e);
    }
  } catch (e) {
    console.error("notifyCampaignFunded failed:", e);
  }
}

// Exported so the admin force-fund endpoint (test fixture) can call
// the same fund logic the on-chain verify path uses. The function is
// idempotent on `fundingStatus === 'funded'`.
export async function fundCampaign(campaignId: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return; // intent referenced a now-deleted campaign; the payment is still recorded
  if (campaign.fundingStatus === "funded") return; // idempotent — another verify won the race

  const { getPlatformFeeRate } = await import("../lib/platform-config");
  const feeRate = await getPlatformFeeRate();
  const total = parseFloat(campaign.budget);
  const platformFee = (total * feeRate).toFixed(2);
  const escrowBalance = (total * (1 - feeRate)).toFixed(2);

  await db.update(campaigns).set({
    fundingStatus: "funded",
    fundedAt: new Date(),
    status: "active",
    platformFee,
    escrowBalance,
    updatedAt: new Date(),
  }).where(eq(campaigns.id, campaignId));

  // Mirror to budgetEscrow so existing escrow-aware reads (auto-payments, /funding-status) keep working.
  await db.insert(budgetEscrow).values({
    campaignId: campaign.id,
    creatorId: campaign.creatorId,
    totalAmount: total.toFixed(2),
    escrowAmount: escrowBalance,
    platformFeeAmount: platformFee,
    availableBalance: escrowBalance,
    lockedBalance: "0",
    status: "active",
    paymentMethod: "usdc_base",
    isLocked: true,
  });
}

async function activateSubscription(userId: string, intentId: string, durationDays: number): Promise<Date> {
  const now = new Date();
  const newEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60_000);

  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (!existing) {
    // Phase 6 Slice D — snapshot the baseline application count
    // for the 30-day guarantee. We count applications across the
    // creator's campaigns received in the 30 days BEFORE they
    // subscribed; the evaluator will compare against the 30 days
    // AFTER. Computed before the insert so we have a clean baseline.
    let baselineApplicationCount: number | null = null;
    try {
      const { snapshotBaselineApplicationCount } = await import("../lib/guarantee");
      baselineApplicationCount = await snapshotBaselineApplicationCount(userId);
    } catch (err) {
      console.error("[activateSubscription] baseline snapshot failed", err);
    }

    await db.insert(subscriptions).values({
      userId,
      tier: "premium",
      status: "active",
      currentPeriodEnd: newEnd,
      lastPaymentIntentId: intentId,
      baselineApplicationCount,
      baselineSnapshottedAt: baselineApplicationCount !== null ? now : null,
    });
    // Phase 6 Slice C — claim a Founding Creator seat on the first
    // subscription activation. claimFoundingSeatTx is idempotent and
    // returns false when the cap is hit; we swallow that result
    // because subscribers past seat #50 simply pay the post-founding
    // price (the payment intent already locked the right amount).
    try {
      const { claimFoundingSeatTx } = await import("./founding-seats");
      await claimFoundingSeatTx(userId);
    } catch (err) {
      // Non-fatal: subscription still activates, the user just
      // doesn't get the founding-seat row. Surfaces in logs for
      // manual reconciliation.
      console.error("[activateSubscription] founding seat claim failed", err);
    }
    return newEnd;
  }

  // Extend from later of (now, current end) so renewals stack.
  const baseTime = existing.currentPeriodEnd.getTime() > now.getTime()
    ? existing.currentPeriodEnd
    : now;
  const extendedEnd = new Date(baseTime.getTime() + durationDays * 24 * 60 * 60_000);

  await db.update(subscriptions).set({
    tier: "premium",
    status: "active",
    currentPeriodEnd: extendedEnd,
    lastPaymentIntentId: intentId,
    notifiedExpiryAt: null, // Reset so we re-notify near the *next* expiry
    updatedAt: now,
  }).where(eq(subscriptions.userId, userId));
  return extendedEnd;
}
