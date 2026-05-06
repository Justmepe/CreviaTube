import type { Express } from "express";
import { eq, and, lt } from "drizzle-orm";
import * as React from "react";
import { db } from "../db";
import { paymentIntents, subscriptions, campaigns, budgetEscrow, users } from "../../shared/schema.js";
import { RECEIVE_ADDRESS, toUsdcUnits, verifyUsdcTransfer, isSameAddress } from "../lib/web3";
import { sendEmail, APP_URL } from "../lib/email";
import { SubscriptionPaid } from "../emails/subscription-paid";
import { CampaignFunded } from "../emails/campaign-funded";

function basescanTxUrl(txHash: string): string {
  const chainId = Number(process.env.WEB3_CHAIN_ID || 84532);
  const base = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
  return `${base}/tx/${txHash}`;
}

// Single subscription tier for v1.
const PREMIUM_PLAN = {
  id: "premium",
  priceUsdc: "5.00", // 5 USDC for 30 days; easy to test on Sepolia
  durationDays: 30,
};

const INTENT_TTL_MINUTES = 15;

export function setupPaymentsAPI(app: Express): void {
  app.get("/api/subscription/plan", (_req, res) => {
    res.json(PREMIUM_PLAN);
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
      resolvedReference = PREMIUM_PLAN.id;
      expectedUsdcUnits = toUsdcUnits(PREMIUM_PLAN.priceUsdc);
      displayAmount = PREMIUM_PLAN.priceUsdc;
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
      const periodEnd = await activateSubscription(intent.userId, intent.id, PREMIUM_PLAN.durationDays);
      // Fire-and-forget confirmation email
      void notifySubscriptionPaid({
        userId: intent.userId,
        intentId: intent.id,
        txHash,
        amountUsdc: PREMIUM_PLAN.priceUsdc,
        periodEnd,
      });
    } else if (intent.kind === "campaign_funding" && intent.referenceId) {
      await fundCampaign(intent.referenceId);
      void notifyCampaignFunded({
        campaignId: intent.referenceId,
        intentId: intent.id,
        txHash,
      });
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
  } catch (e) {
    console.error("notifyCampaignFunded failed:", e);
  }
}

async function fundCampaign(campaignId: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return; // intent referenced a now-deleted campaign; the payment is still recorded
  if (campaign.fundingStatus === "funded") return; // idempotent — another verify won the race

  const total = parseFloat(campaign.budget);
  const platformFee = (total * 0.20).toFixed(2);
  const escrowBalance = (total * 0.80).toFixed(2);

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
    await db.insert(subscriptions).values({
      userId,
      tier: "premium",
      status: "active",
      currentPeriodEnd: newEnd,
      lastPaymentIntentId: intentId,
    });
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
