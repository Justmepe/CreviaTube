import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { eq } from "drizzle-orm";
import { db } from "../../backend/db";
import {
  users,
  campaigns,
  paymentIntents,
  emailVerificationTokens,
  emailLog,
  clipperCampaigns,
  trackingEvents,
  payouts,
  budgetEscrow,
} from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";

// Deterministic test wallet so signatures are reproducible. NEVER reuse this
// outside tests.
const TEST_PRIVATE_KEY = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);
const TEST_EMAIL = "test-creator-e2e@example.test";
const TEST_USERNAME = `e2e_creator_${Date.now()}`;

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

describe("Creator end-to-end happy path", () => {
  it("registers → verifies email → binds wallet → creates campaign → funds it", async () => {
    // Clean any prior run before we start so the test is rerunnable.
    await purgeTestData();

    const agent = request.agent(app);

    // -------- 1. Register --------
    const registerRes = await agent.post("/api/register").send({
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: "supersecret123",
      fullName: "E2E Creator",
      role: "creator",
      accountType: "business",
    });
    expect(registerRes.status, registerRes.text).toBe(201);
    const userId: string = registerRes.body.user.id;
    expect(userId).toBeTruthy();
    expect(registerRes.body.user.role).toBe("creator");
    expect(registerRes.body.user.accountType).toBe("business");

    // -------- 2. Email verification --------
    // Wait for the fire-and-forget verification token to land. issueVerificationEmail
    // is async; tiny poll loop instead of arbitrary sleep.
    const tokenRow = await waitFor(async () => {
      const [row] = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, userId))
        .limit(1);
      return row;
    });
    expect(tokenRow.usedAt).toBeNull();

    const verifyRes = await agent.post("/api/email/verify").send({ token: tokenRow.token });
    expect(verifyRes.status, verifyRes.text).toBe(200);

    const [userAfterVerify] = await db.select().from(users).where(eq(users.id, userId));
    expect(userAfterVerify.emailVerified).toBe(true);

    // -------- 3. Bind wallet --------
    const address = testAccount.address;
    const nonceRes = await agent.get(`/api/wallet/nonce`).query({ address });
    expect(nonceRes.status, nonceRes.text).toBe(200);
    const message: string = nonceRes.body.message;
    expect(message).toContain(address.toLowerCase());

    const signature = await testAccount.signMessage({ message });

    const bindRes = await agent.post("/api/wallet/bind").send({ address, signature });
    expect(bindRes.status, bindRes.text).toBe(200);

    const [userAfterBind] = await db.select().from(users).where(eq(users.id, userId));
    expect(userAfterBind.walletAddress).toBe(address.toLowerCase());

    // -------- 4. Create campaign with viewsGoal=1 (so we can trigger completion later) --------
    const createRes = await agent.post("/api/campaigns").send({
      name: "E2E smoke campaign",
      description: "End-to-end smoke test campaign description, longer than 20 chars.",
      budget: "5.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04, click: 0.05, signup: 2.0 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 1 },
    });
    expect(createRes.status, createRes.text).toBe(201);
    const campaignId: string = createRes.body.id;
    expect(campaignId).toBeTruthy();

    const [createdCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    expect(createdCampaign.fundingStatus).toBe("pending");
    expect(createdCampaign.status).toBe("draft");
    expect(createdCampaign.creatorId).toBe(userId);
    expect((createdCampaign.campaignGoals as any)?.viewsGoal).toBe(1);

    // -------- 5. Create payment intent --------
    const intentRes = await agent.post("/api/payments/intent").send({
      kind: "campaign_funding",
      referenceId: campaignId,
      senderAddress: address,
    });
    expect(intentRes.status, intentRes.text).toBe(201);
    const intentId: string = intentRes.body.intentId;
    expect(intentRes.body.expectedUsdc).toBe("5.00");

    // -------- 6. Verify payment (web3 mocked via WEB3_MOCK_VERIFY) --------
    const fakeTxHash = "0x" + "a".repeat(64);
    const verifyPayRes = await agent.post("/api/payments/verify").send({
      intentId,
      txHash: fakeTxHash,
    });
    expect(verifyPayRes.status, verifyPayRes.text).toBe(200);
    expect(verifyPayRes.body.status).toBe("paid");

    // -------- 7. Assert campaign is now funded + active + escrow split correctly --------
    const [fundedCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    expect(fundedCampaign.fundingStatus).toBe("funded");
    expect(fundedCampaign.status).toBe("active");
    expect(parseFloat(fundedCampaign.escrowBalance)).toBeCloseTo(4.0, 2); // 80%
    expect(parseFloat(fundedCampaign.platformFee)).toBeCloseTo(1.0, 2);   // 20%

    // budget_escrow mirror row was created
    const [escrow] = await db
      .select()
      .from(budgetEscrow)
      .where(eq(budgetEscrow.campaignId, campaignId))
      .limit(1);
    expect(escrow).toBeTruthy();
    expect(parseFloat(escrow.availableBalance)).toBeCloseTo(4.0, 2);
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
  // Find the test user id (if any) so we can cascade-delete by FK.
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
  if (!u) return;
  const uid = u.id;

  // Delete in FK-safe order. Anything that references campaigns or users
  // through this user goes first.
  const userCampaigns = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.creatorId, uid));
  for (const c of userCampaigns) {
    await db.delete(trackingEvents).where(eq(trackingEvents.campaignId, c.id));
    await db.delete(clipperCampaigns).where(eq(clipperCampaigns.campaignId, c.id));
    await db.delete(budgetEscrow).where(eq(budgetEscrow.campaignId, c.id));
  }
  await db.delete(payouts).where(eq(payouts.clipperId, uid));
  await db.delete(paymentIntents).where(eq(paymentIntents.userId, uid));
  await db.delete(emailLog).where(eq(emailLog.userId, uid));
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, uid));
  await db.delete(campaigns).where(eq(campaigns.creatorId, uid));
  await db.delete(users).where(eq(users.id, uid));
}
