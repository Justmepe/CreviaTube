import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import {
  users,
  campaigns,
  clipperCampaigns,
  paymentIntents,
  emailVerificationTokens,
  emailLog,
  trackingEvents,
  payouts,
  autoPayments,
  budgetEscrow,
} from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";
import { campaignCompletionService } from "../../backend/core/services/campaign-completion";

// Two deterministic test wallets so creator and clipper sign distinct messages.
const CREATOR_PRIV = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;
const CLIPPER_PRIV = "0x2222222222222222222222222222222222222222222222222222222222222222" as const;
const creatorAccount = privateKeyToAccount(CREATOR_PRIV);
const clipperAccount = privateKeyToAccount(CLIPPER_PRIV);

const CREATOR_EMAIL = "test-clipper-flow-creator@example.test";
const CLIPPER_EMAIL = "test-clipper-flow-clipper@example.test";
const stamp = Date.now();
const CREATOR_USERNAME = `e2e_cf_creator_${stamp}`;
const CLIPPER_USERNAME = `e2e_cf_clipper_${stamp}`;

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  await registerRoutes(app);
}, 30_000);

afterAll(async () => {
  await purgeTestData();
});

describe("Clipper end-to-end happy path: apply → approve → goal hit → auto-completion", () => {
  it("walks the full marketplace flow and asserts auto-payout fires when goal is reached", async () => {
    await purgeTestData();

    // ============ A. Creator side: bring a funded campaign into existence ============
    const creator = request.agent(app);

    const creatorReg = await creator.post("/api/register").send({
      username: CREATOR_USERNAME,
      email: CREATOR_EMAIL,
      password: "supersecret123",
      fullName: "E2E Creator (clipper-flow)",
      role: "creator",
      accountType: "business",
    });
    expect(creatorReg.status, creatorReg.text).toBe(201);
    const creatorId: string = creatorReg.body.user.id;

    const creatorToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, creatorId)).limit(1);
      return r;
    });
    await creator.post("/api/email/verify").send({ token: creatorToken.token });

    const creatorAddr = creatorAccount.address;
    const creatorNonce = await creator.get("/api/wallet/nonce").query({ address: creatorAddr });
    const creatorSig = await creatorAccount.signMessage({ message: creatorNonce.body.message });
    await creator.post("/api/wallet/bind").send({ address: creatorAddr, signature: creatorSig });

    const createRes = await creator.post("/api/campaigns").send({
      name: "Clipper-flow smoke campaign",
      description: "End-to-end smoke for the clipper-side flow including auto-completion.",
      // Budget needs to cover the completion-bonus payout. The current code
      // calculates bonus as base*10 with a $10 fallback when rewardRates lookup
      // misses (goalType "views" vs rewardRates key "view" — plural/singular
      // mismatch is a known follow-up). 200 USDC budget => 160 USDC escrow,
      // comfortably above the 100 USDC bonus.
      budget: "200.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04, click: 0.05, signup: 2.0 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 1 },
    });
    expect(createRes.status, createRes.text).toBe(201);
    const campaignId: string = createRes.body.id;

    const intentRes = await creator.post("/api/payments/intent").send({
      kind: "campaign_funding",
      referenceId: campaignId,
      senderAddress: creatorAddr,
    });
    const intentId = intentRes.body.intentId;
    const fakeTx = "0x" + "b".repeat(64);
    const verifyPay = await creator.post("/api/payments/verify").send({ intentId, txHash: fakeTx });
    expect(verifyPay.body.status).toBe("paid");

    // Sanity: campaign is funded + active
    const [funded] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    expect(funded.fundingStatus).toBe("funded");
    expect(funded.status).toBe("active");

    // ============ B. Clipper side: register, verify, bind, apply ============
    const clipper = request.agent(app);

    const clipperReg = await clipper.post("/api/register").send({
      username: CLIPPER_USERNAME,
      email: CLIPPER_EMAIL,
      password: "supersecret123",
      fullName: "E2E Clipper",
      role: "clipper",
      accountType: "influencer",
    });
    expect(clipperReg.status, clipperReg.text).toBe(201);
    const clipperId: string = clipperReg.body.user.id;

    const clipperToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, clipperId)).limit(1);
      return r;
    });
    await clipper.post("/api/email/verify").send({ token: clipperToken.token });

    const clipperAddr = clipperAccount.address;
    const clipperNonce = await clipper.get("/api/wallet/nonce").query({ address: clipperAddr });
    const clipperSig = await clipperAccount.signMessage({ message: clipperNonce.body.message });
    const bindRes = await clipper.post("/api/wallet/bind").send({ address: clipperAddr, signature: clipperSig });
    expect(bindRes.status, bindRes.text).toBe(200);

    // Apply to the campaign. AI detection result is required by the handler;
    // we hand-craft a "approve" recommendation since we're not testing the
    // AI integration here.
    const applyRes = await clipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@e2e/video/123",
      contentType: "video",
      contentDescription: "Demo clip for the smoke test campaign",
      aiDetectionResult: {
        recommendation: "approve",
        confidence: 0.95,
        flags: [],
      },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(applyRes.status, applyRes.text).toBe(201);
    const clipperCampaignId: string = applyRes.body.id;
    expect(clipperCampaignId).toBeTruthy();

    // ============ C. Creator approves the application ============
    const reviewRes = await creator.post(`/api/clipper-applications/${clipperCampaignId}/review`).send({
      action: "approve",
      notes: "Looks great",
    });
    expect(reviewRes.status, reviewRes.text).toBe(200);

    const [afterReview] = await db.select().from(clipperCampaigns).where(eq(clipperCampaigns.id, clipperCampaignId));
    expect(afterReview.isApproved).toBe(true);

    // ============ D. Trigger goal completion ============
    // viewsGoal = 1. Insert a verified tracking event with eventValue = 1
    // and call the completion service directly so we exercise the same
    // auto-completion path the tracking endpoint uses, without having to
    // satisfy bot-detection middleware in tests.
    await db.insert(trackingEvents).values({
      clipperId,
      campaignId,
      clipperCampaignId,
      eventType: "view",
      eventValue: "1",
      status: "verified",
    } as any);

    const completed = await campaignCompletionService.checkAndUpdateClipperCompletion(clipperCampaignId);
    expect(completed).toBe(true);

    // ============ E. Assertions on auto-payout side effects ============
    const [afterCompletion] = await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.id, clipperCampaignId));
    expect(afterCompletion.isCompleted).toBe(true);

    // Auto-payment row created for the clipper. The completion bonus path
    // uses `auto_payments` (not the `payouts` table). Checking this catches
    // the silently-swallowed enum bug we hit earlier.
    const autoPays = await db
      .select()
      .from(autoPayments)
      .where(eq(autoPayments.clipperId, clipperId));
    expect(autoPays.length).toBeGreaterThan(0);
    expect(autoPays[0].campaignId).toBe(campaignId);
    expect(parseFloat(autoPays[0].amount)).toBeGreaterThan(0);

    // Email log: notifyCampaignCompletion + the application-decision email
    // are fire-and-forget. Poll until all three expected kinds land.
    const required = ["application_approved", "campaign_goal_reached", "campaign_completed_creator"];
    await waitFor(async () => {
      const rows = await db
        .select({ kind: emailLog.kind })
        .from(emailLog)
        .where(inArray(emailLog.userId, [creatorId, clipperId]));
      const kinds = new Set(rows.map((r) => r.kind));
      return required.every((k) => kinds.has(k)) ? true : undefined;
    }, 8_000);

    const allEmails = await db.select().from(emailLog).where(inArray(emailLog.userId, [creatorId, clipperId]));
    const kinds = new Set(allEmails.map((e) => e.kind));
    expect(kinds.has("campaign_goal_reached")).toBe(true);
    expect(kinds.has("campaign_completed_creator")).toBe(true);
    expect(kinds.has("application_approved")).toBe(true);
  }, 30_000);
});

// ===== Helpers =====

async function waitFor<T>(probe: () => Promise<T | undefined>, timeoutMs = 5000, intervalMs = 100): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = await probe();
    if (v) return v;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for condition after ${timeoutMs}ms`);
}

async function purgeTestData() {
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, [CREATOR_EMAIL, CLIPPER_EMAIL]));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);

  // FK-safe order. autoPayments → budgetEscrow → trackingEvents → clipperCampaigns
  // → campaigns. autoPayments references budgetEscrow.id, so it MUST go first.
  await db.delete(autoPayments).where(inArray(autoPayments.clipperId, ids));
  await db.delete(payouts).where(inArray(payouts.clipperId, ids));
  const camps = await db.select({ id: campaigns.id }).from(campaigns).where(inArray(campaigns.creatorId, ids));
  for (const c of camps) {
    await db.delete(trackingEvents).where(eq(trackingEvents.campaignId, c.id));
    await db.delete(clipperCampaigns).where(eq(clipperCampaigns.campaignId, c.id));
    await db.delete(budgetEscrow).where(eq(budgetEscrow.campaignId, c.id));
  }
  await db.delete(paymentIntents).where(inArray(paymentIntents.userId, ids));
  await db.delete(emailLog).where(inArray(emailLog.userId, ids));
  await db.delete(emailVerificationTokens).where(inArray(emailVerificationTokens.userId, ids));
  await db.delete(campaigns).where(inArray(campaigns.creatorId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}
