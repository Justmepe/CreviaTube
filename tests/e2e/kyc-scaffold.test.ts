// KYC scaffold (tier 3 region verification). Today an admin flips
// users.kyc_status manually. When we integrate a provider (Persona /
// Onfido / Sumsub), the same column is driven by webhooks — same
// enforcement applies.

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
  budgetEscrow,
  trackingEvents,
  payouts,
  autoPayments,
} from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";

const CREATOR_PRIV = "0x6666666666666666666666666666666666666666666666666666666666666666" as const;
const CLIPPER_PRIV = "0x7777777777777777777777777777777777777777777777777777777777777777" as const;
const ADMIN_PRIV   = "0x8888888888888888888888888888888888888888888888888888888888888888" as const;
const creatorAccount = privateKeyToAccount(CREATOR_PRIV);
const clipperAccount = privateKeyToAccount(CLIPPER_PRIV);

const E_CREATOR = "test-kyc-creator@example.test";
const E_CLIPPER = "test-kyc-clipper@example.test";
const E_ADMIN   = "test-kyc-admin@example.test";
const stamp = Date.now();

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  await registerRoutes(app);
}, 30_000);

afterAll(async () => {
  await purge();
});

describe("KYC scaffold", () => {
  it("blocks unverified clipper from KYC-required campaign, lets through after admin approves", async () => {
    await purge();

    // Creator with a KYC-required campaign
    const creator = request.agent(app);
    const cReg = await creator.post("/api/register").set("CF-IPCountry", "US").send({
      username: `kyc_creator_${stamp}`,
      email: E_CREATOR,
      password: "supersecret123",
      fullName: "KYC Creator",
      role: "creator",
      accountType: "business",
      campaignerStage: "established_brand",
    });
    expect(cReg.status).toBe(201);
    const creatorId = cReg.body.user.id;

    const cTok = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, creatorId)).limit(1);
      return r;
    });
    await creator.post("/api/email/verify").send({ token: cTok.token });
    const cAddr = creatorAccount.address;
    const cN = await creator.get("/api/wallet/nonce").query({ address: cAddr });
    const cS = await creatorAccount.signMessage({ message: cN.body.message });
    await creator.post("/api/wallet/bind").send({ address: cAddr, signature: cS });

    const create = await creator.post("/api/campaigns").send({
      name: "KYC-required campaign",
      description: "High-budget brand campaign that requires verified clippers.",
      budget: "10.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
    });
    const campaignId = create.body.id;

    // Flip requiresKyc=true directly (no creator UI for this in v1).
    await db.update(campaigns).set({ requiresKyc: true }).where(eq(campaigns.id, campaignId));

    // Fund it
    const intent = await creator.post("/api/payments/intent").send({
      kind: "campaign_funding", referenceId: campaignId, senderAddress: cAddr,
    });
    await creator.post("/api/payments/verify").send({
      intentId: intent.body.intentId,
      txHash: "0x" + "e".repeat(64),
    });

    // Clipper (no KYC yet) tries to apply → 403
    const clipper = request.agent(app);
    const clReg = await clipper.post("/api/register").set("CF-IPCountry", "US").send({
      username: `kyc_clipper_${stamp}`,
      email: E_CLIPPER,
      password: "supersecret123",
      fullName: "KYC Clipper",
      role: "clipper",
      accountType: "influencer",
    });
    const clipperId = clReg.body.user.id;
    const clTok = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, clipperId)).limit(1);
      return r;
    });
    await clipper.post("/api/email/verify").send({ token: clTok.token });
    const clAddr = clipperAccount.address;
    const clN = await clipper.get("/api/wallet/nonce").query({ address: clAddr });
    const clS = await clipperAccount.signMessage({ message: clN.body.message });
    await clipper.post("/api/wallet/bind").send({ address: clAddr, signature: clS });

    const blockedApply = await clipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@kyc/video/1",
      contentType: "video",
      contentDescription: "Trying to apply without KYC",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(blockedApply.status).toBe(403);
    expect(blockedApply.body.requiresKyc).toBe(true);

    // Admin approves the clipper's KYC
    const admin = request.agent(app);
    await admin.post("/api/register").send({
      username: `kyc_admin_${stamp}`,
      email: E_ADMIN,
      password: "supersecret123",
      fullName: "KYC Admin",
      role: "creator", // role can't be set to admin via API; promote in DB after register
      accountType: "business",
    });
    const [adminUser] = await db.select().from(users).where(eq(users.email, E_ADMIN));
    await db.update(users).set({ role: "admin" }).where(eq(users.id, adminUser.id));
    // Re-login since session role won't auto-refresh
    await admin.post("/api/login").send({ username: `kyc_admin_${stamp}`, password: "supersecret123" });

    const kycRes = await admin.patch(`/api/admin/users/${clipperId}/kyc`).send({ status: "approved" });
    expect(kycRes.status, kycRes.text).toBe(200);

    const [verifiedClipper] = await db.select().from(users).where(eq(users.id, clipperId));
    expect(verifiedClipper.kycStatus).toBe("approved");

    // Apply again → succeeds now. passport's deserializeUser reloads
    // the user from DB on every request, so kycStatus reflects the
    // admin's update without a re-login.
    const goodApply = await clipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@kyc/video/2",
      contentType: "video",
      contentDescription: "Now KYC-approved",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(goodApply.status, goodApply.text).toBe(201);
  }, 30_000);

  it("non-KYC campaigns ignore kyc_status entirely", async () => {
    await purge();

    const creator = request.agent(app);
    await creator.post("/api/register").set("CF-IPCountry", "US").send({
      username: `kyc_off_creator_${stamp}`,
      email: E_CREATOR,
      password: "supersecret123",
      fullName: "Non-KYC Creator",
      role: "creator",
      accountType: "business",
      campaignerStage: "established_brand",
    });
    const [cu] = await db.select().from(users).where(eq(users.email, E_CREATOR));
    const cT = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, cu.id)).limit(1);
      return r;
    });
    await creator.post("/api/email/verify").send({ token: cT.token });
    const cA = creatorAccount.address;
    const cN = await creator.get("/api/wallet/nonce").query({ address: cA });
    const cS = await creatorAccount.signMessage({ message: cN.body.message });
    await creator.post("/api/wallet/bind").send({ address: cA, signature: cS });

    const create = await creator.post("/api/campaigns").send({
      name: "Non-KYC campaign",
      description: "Standard campaign — no KYC required, anyone can apply.",
      budget: "10.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
    });
    const cid = create.body.id;
    const intent = await creator.post("/api/payments/intent").send({
      kind: "campaign_funding", referenceId: cid, senderAddress: cA,
    });
    await creator.post("/api/payments/verify").send({
      intentId: intent.body.intentId,
      txHash: "0x" + "f".repeat(64),
    });

    // Clipper without KYC applies → succeeds because requiresKyc is false
    const clipper = request.agent(app);
    await clipper.post("/api/register").set("CF-IPCountry", "US").send({
      username: `kyc_off_clipper_${stamp}`,
      email: E_CLIPPER,
      password: "supersecret123",
      fullName: "No-KYC Clipper",
      role: "clipper",
      accountType: "influencer",
    });
    const [cl] = await db.select().from(users).where(eq(users.email, E_CLIPPER));
    const clT = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, cl.id)).limit(1);
      return r;
    });
    await clipper.post("/api/email/verify").send({ token: clT.token });
    const clA = clipperAccount.address;
    const clN = await clipper.get("/api/wallet/nonce").query({ address: clA });
    const clS = await clipperAccount.signMessage({ message: clN.body.message });
    await clipper.post("/api/wallet/bind").send({ address: clA, signature: clS });

    const apply = await clipper.post(`/api/campaigns/${cid}/apply`).send({
      submittedContent: "https://www.tiktok.com/@nokyc/video/1",
      contentType: "video",
      contentDescription: "Non-KYC campaign, applying without KYC",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(apply.status).toBe(201);
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

async function purge() {
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, [E_CREATOR, E_CLIPPER, E_ADMIN]));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);

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
