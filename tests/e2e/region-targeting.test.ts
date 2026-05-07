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

// Three deterministic test wallets so creator + KE clipper + US clipper
// each have distinct signatures.
const CREATOR_PRIV = "0x3333333333333333333333333333333333333333333333333333333333333333" as const;
const KE_CLIPPER_PRIV = "0x4444444444444444444444444444444444444444444444444444444444444444" as const;
const US_CLIPPER_PRIV = "0x5555555555555555555555555555555555555555555555555555555555555555" as const;
const creatorAccount = privateKeyToAccount(CREATOR_PRIV);
const keAccount = privateKeyToAccount(KE_CLIPPER_PRIV);
const usAccount = privateKeyToAccount(US_CLIPPER_PRIV);

const E_CREATOR = "test-region-creator@example.test";
const E_KE_CLIPPER = "test-region-clipper-ke@example.test";
const E_US_CLIPPER = "test-region-clipper-us@example.test";
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

describe("Phase 3.5 — regional targeting enforcement", () => {
  it("blocks out-of-region clipper, allows in-region clipper, and surfaces region coverage", async () => {
    await purge();

    // ---- Creator sets up a KE-only campaign ----
    const creator = request.agent(app);

    const creatorReg = await creator.post("/api/register").set("CF-IPCountry", "KE").send({
      username: `region_creator_${stamp}`,
      email: E_CREATOR,
      password: "supersecret123",
      fullName: "Region Test Creator",
      role: "creator",
      accountType: "business",
      campaignerStage: "established_brand",
    });
    expect(creatorReg.status, creatorReg.text).toBe(201);
    const creatorId: string = creatorReg.body.user.id;

    const cToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, creatorId)).limit(1);
      return r;
    });
    await creator.post("/api/email/verify").send({ token: cToken.token });

    const cAddr = creatorAccount.address;
    const cNonce = await creator.get("/api/wallet/nonce").query({ address: cAddr });
    const cSig = await creatorAccount.signMessage({ message: cNonce.body.message });
    await creator.post("/api/wallet/bind").send({ address: cAddr, signature: cSig });

    const createRes = await creator.post("/api/campaigns").send({
      name: "Kenya-only campaign",
      description: "Targeting Kenya specifically for the Phase 3.5 region check.",
      budget: "10.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04, click: 0.05, signup: 2.0 }),
      // requirements.geography is the campaign's targetRegions — KE only
      requirements: JSON.stringify({ minFollowers: 0, geography: ["KE"] }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
    });
    expect(createRes.status, createRes.text).toBe(201);
    const campaignId: string = createRes.body.id;

    // Fund it so it goes active
    const intentRes = await creator.post("/api/payments/intent").send({
      kind: "campaign_funding",
      referenceId: campaignId,
      senderAddress: cAddr,
    });
    const fakeTx = "0x" + "c".repeat(64);
    await creator.post("/api/payments/verify").send({ intentId: intentRes.body.intentId, txHash: fakeTx });

    // ---- KE clipper applies → should succeed ----
    const keClipper = request.agent(app);
    const keReg = await keClipper.post("/api/register").set("CF-IPCountry", "KE").send({
      username: `region_ke_${stamp}`,
      email: E_KE_CLIPPER,
      password: "supersecret123",
      fullName: "KE Clipper",
      role: "clipper",
      accountType: "influencer",
    });
    expect(keReg.status).toBe(201);
    const keId: string = keReg.body.user.id;

    const keToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, keId)).limit(1);
      return r;
    });
    await keClipper.post("/api/email/verify").send({ token: keToken.token });

    const keAddr = keAccount.address;
    const keNonce = await keClipper.get("/api/wallet/nonce").query({ address: keAddr });
    const keSig = await keAccount.signMessage({ message: keNonce.body.message });
    await keClipper.post("/api/wallet/bind").send({ address: keAddr, signature: keSig });

    const keApply = await keClipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@ke/video/1",
      contentType: "video",
      contentDescription: "From KE",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(keApply.status, keApply.text).toBe(201);

    // ---- US clipper applies → should be 403 with helpful payload ----
    const usClipper = request.agent(app);
    const usReg = await usClipper.post("/api/register").set("CF-IPCountry", "US").send({
      username: `region_us_${stamp}`,
      email: E_US_CLIPPER,
      password: "supersecret123",
      fullName: "US Clipper",
      role: "clipper",
      accountType: "influencer",
    });
    expect(usReg.status).toBe(201);
    const usId: string = usReg.body.user.id;

    const usToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, usId)).limit(1);
      return r;
    });
    await usClipper.post("/api/email/verify").send({ token: usToken.token });

    const usAddr = usAccount.address;
    const usNonce = await usClipper.get("/api/wallet/nonce").query({ address: usAddr });
    const usSig = await usAccount.signMessage({ message: usNonce.body.message });
    await usClipper.post("/api/wallet/bind").send({ address: usAddr, signature: usSig });

    const usApply = await usClipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@us/video/1",
      contentType: "video",
      contentDescription: "From US",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(usApply.status).toBe(403);
    expect(usApply.body.clipperCountry).toBe("US");
    expect(usApply.body.targetRegions).toEqual(["KE"]);

    // ---- Region coverage shows 1 clipper in AF (Kenya) ----
    const cov = await creator.get(`/api/campaigns/${campaignId}/region-coverage`);
    expect(cov.status, cov.text).toBe(200);
    expect(cov.body.totalClippers).toBe(1);
    expect(cov.body.byContinent.AF).toBe(1);
    expect(cov.body.byCountry.KE).toBe(1);
  }, 30_000);

  it("global campaigns (no targetRegions) accept any clipper", async () => {
    await purge();

    const creator = request.agent(app);
    await creator.post("/api/register").set("CF-IPCountry", "US").send({
      username: `global_creator_${stamp}`,
      email: E_CREATOR,
      password: "supersecret123",
      fullName: "Global Creator",
      role: "creator",
      accountType: "business",
      campaignerStage: "established_brand",
    });
    const [cu] = await db.select().from(users).where(eq(users.email, E_CREATOR));
    const cToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, cu.id)).limit(1);
      return r;
    });
    await creator.post("/api/email/verify").send({ token: cToken.token });

    const cAddr = creatorAccount.address;
    const cNonce = await creator.get("/api/wallet/nonce").query({ address: cAddr });
    const cSig = await creatorAccount.signMessage({ message: cNonce.body.message });
    await creator.post("/api/wallet/bind").send({ address: cAddr, signature: cSig });

    const createRes = await creator.post("/api/campaigns").send({
      name: "Global campaign",
      description: "No region restrictions, anyone can apply globally.",
      budget: "10.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04, click: 0.05, signup: 2.0 }),
      // No geography array → global
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
    });
    const campaignId: string = createRes.body.id;
    const intentRes = await creator.post("/api/payments/intent").send({
      kind: "campaign_funding",
      referenceId: campaignId,
      senderAddress: cAddr,
    });
    await creator.post("/api/payments/verify").send({
      intentId: intentRes.body.intentId,
      txHash: "0x" + "d".repeat(64),
    });

    // US clipper can apply
    const usClipper = request.agent(app);
    await usClipper.post("/api/register").set("CF-IPCountry", "US").send({
      username: `global_us_${stamp}`,
      email: E_US_CLIPPER,
      password: "supersecret123",
      fullName: "Global US Clipper",
      role: "clipper",
      accountType: "influencer",
    });
    const [uu] = await db.select().from(users).where(eq(users.email, E_US_CLIPPER));
    const usToken = await waitFor(async () => {
      const [r] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, uu.id)).limit(1);
      return r;
    });
    await usClipper.post("/api/email/verify").send({ token: usToken.token });

    const usAddr = usAccount.address;
    const usNonce = await usClipper.get("/api/wallet/nonce").query({ address: usAddr });
    const usSig = await usAccount.signMessage({ message: usNonce.body.message });
    await usClipper.post("/api/wallet/bind").send({ address: usAddr, signature: usSig });

    const usApply = await usClipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@usglobal/video/1",
      contentType: "video",
      contentDescription: "From US, applying to global",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(usApply.status, usApply.text).toBe(201);
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
    .where(inArray(users.email, [E_CREATOR, E_KE_CLIPPER, E_US_CLIPPER]));
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
