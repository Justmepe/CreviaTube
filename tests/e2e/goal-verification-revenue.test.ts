// Phase 4 end-to-end scenario: revenue goal verified via the conversion
// pixel. Exercises the new infrastructure that the legacy clipper-flow
// test doesn't touch:
//
//   - founder accountType + server-side goal/audience validation
//     (goalsForAccountType filtering on POST /api/campaigns)
//   - integration CRUD (PUT /api/campaigns/:id/integration generates
//     pixelId + postbackSecret, redacts on subsequent reads)
//   - clipper application -> creator approval -> auto-mint promo code
//   - clipper post-URL submission via /api/clipper-campaigns/:id/post-url
//   - synthetic test event via POST .../integration/test (verifies that
//     metadata.test=true events DON'T move real progress)
//   - real conversion pixel via GET /pixel/:pixelId fires a `purchase`
//     event with eventValue = order amount
//   - revenue goal aggregation sums event_value (not row count)
//   - goal completion fires when the threshold is crossed -> auto-payout
//   - GET /api/clipper-campaigns/:id coverage block
//
// This test stitches the campaigner-side and clipper-side flows for a
// `revenue` goal — the Phase 4 path that didn't exist pre-Phase 4.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../backend/db";
import {
  users,
  campaigns,
  campaignIntegrations,
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

const CREATOR_PRIV =
  "0x3333333333333333333333333333333333333333333333333333333333333333" as const;
const CLIPPER_PRIV =
  "0x4444444444444444444444444444444444444444444444444444444444444444" as const;
const creatorAccount = privateKeyToAccount(CREATOR_PRIV);
const clipperAccount = privateKeyToAccount(CLIPPER_PRIV);

const stamp = Date.now();
const CREATOR_EMAIL = `test-rev-creator-${stamp}@example.test`;
const CLIPPER_EMAIL = `test-rev-clipper-${stamp}@example.test`;
const CREATOR_USERNAME = `e2e_rev_creator_${stamp}`;
const CLIPPER_USERNAME = `e2e_rev_clipper_${stamp}`;

let app: express.Express;

// Schema preflight. The test exercises Phase 4 tables added in
// migrations 0018 + 0019 (campaign_integrations, clipper_campaigns
// columns post_url / clipper_promo_code / last_view_count). Catch a
// missing-schema environment up front with a clear error rather than
// letting the test time out after 60s on a deep stack trace.
async function preflightSchema(): Promise<void> {
  try {
    await db.execute(sql`SELECT 1 FROM campaign_integrations LIMIT 1`);
    await db.execute(sql`SELECT post_url, clipper_promo_code, last_view_count FROM clipper_campaigns LIMIT 1`);
  } catch (err: any) {
    throw new Error(
      `Phase 4 schema not applied to the test database — run \`npm run db:push\` ` +
        `or apply migrations 0018 + 0019 manually before running this test. ` +
        `Underlying error: ${err?.message ?? String(err)}`,
    );
  }
}

beforeAll(async () => {
  await preflightSchema();
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  await registerRoutes(app);
}, 30_000);

afterAll(async () => {
  await purgeTestData();
});

describe("Phase 4 — revenue-goal verification end-to-end", () => {
  it("founder creates revenue campaign, clipper applies, pixel events credit revenue toward the goal", async () => {
    await purgeTestData();

    // ── 1. Founder registers + sets up a funded revenue campaign ──────
    const creator = request.agent(app);

    const creatorReg = await creator.post("/api/register").send({
      username: CREATOR_USERNAME,
      email: CREATOR_EMAIL,
      password: "supersecret123",
      fullName: "E2E Founder",
      // `business` here, not `founder` — `founder` is allowed by the
      // accountType enum (migration 0018) but the goal catalog has
      // some goals scoped to `business` only (revenue, ugc_volume).
      // We pick the audience that owns the `revenue` goal so the
      // server-side validator accepts our campaign.
      role: "creator",
      accountType: "business",
    });
    expect(creatorReg.status, creatorReg.text).toBe(201);
    const creatorId: string = creatorReg.body.user.id;

    const cTok = await waitFor(async () => {
      const [r] = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, creatorId))
        .limit(1);
      return r;
    });
    await creator.post("/api/email/verify").send({ token: cTok.token });

    const creatorAddr = creatorAccount.address;
    const cNonce = await creator.get("/api/wallet/nonce").query({ address: creatorAddr });
    const cSig = await creatorAccount.signMessage({ message: cNonce.body.message });
    await creator.post("/api/wallet/bind").send({ address: creatorAddr, signature: cSig });

    // Revenue goal of $100. Total budget $20 → escrow $16, completion
    // bonus = order_amount * baseRate. We use a small target so a
    // single $150 purchase crosses the threshold.
    const createRes = await creator.post("/api/campaigns").send({
      name: "Phase 4 revenue smoke",
      description: "Phase 4 revenue-goal end-to-end smoke test description (>20 chars).",
      budget: "20.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      // Per-purchase reward 0.01 — completion bonus = base * 10x =
      // 0.01 * achieved * 10 — small enough to fit in escrow comfortably.
      rewardRates: JSON.stringify({ purchase: 0.01 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "revenue", revenueGoal: 100 },
    });
    expect(createRes.status, createRes.text).toBe(201);
    const campaignId: string = createRes.body.id;

    // Server-side validator should reject a goal not in the audience's
    // catalog. Verify with a second campaign attempt.
    const badGoalRes = await creator.post("/api/campaigns").send({
      name: "Should be rejected",
      description: "A campaigner tries a goal scoped to a different audience.",
      budget: "5.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ follow: 0.5 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      // `follows` is an influencer-only goal in the catalog; a business
      // accountType creator should be rejected.
      campaignGoals: { primaryGoal: "follows", followsGoal: 1000 },
    });
    expect(badGoalRes.status).toBe(400);
    expect(badGoalRes.body?.message ?? "").toMatch(/not available for accountType/i);

    // Fund the revenue campaign.
    const intentRes = await creator.post("/api/payments/intent").send({
      kind: "campaign_funding",
      referenceId: campaignId,
      senderAddress: creatorAddr,
    });
    const fakeTx = "0x" + "c".repeat(64);
    const verifyPay = await creator.post("/api/payments/verify").send({
      intentId: intentRes.body.intentId,
      txHash: fakeTx,
    });
    expect(verifyPay.body.status).toBe("paid");

    // ── 2. Generate the integration (pixelId + postbackSecret) ─────────
    const intgRes = await creator.put(`/api/campaigns/${campaignId}/integration`).send({});
    expect(intgRes.status, intgRes.text).toBe(200);
    expect(intgRes.body.generated?.pixelId).toBeTruthy();
    expect(intgRes.body.generated?.postbackSecret).toBeTruthy();
    const pixelId: string = intgRes.body.integration.pixelId;
    expect(pixelId).toBeTruthy();
    expect(pixelId.length).toBeGreaterThanOrEqual(16);

    // Subsequent GET should redact secrets but still return pixelId.
    const intgGet = await creator.get(`/api/campaigns/${campaignId}/integration`);
    expect(intgGet.body.integration.pixelId).toBe(pixelId);
    expect(intgGet.body.integration.hasPostbackSecret).toBe(true);
    expect(intgGet.body.generated).toBeUndefined();

    // ── 3. Clipper registers + applies + gets approved (mints promo code) ─
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

    const clTok = await waitFor(async () => {
      const [r] = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, clipperId))
        .limit(1);
      return r;
    });
    await clipper.post("/api/email/verify").send({ token: clTok.token });

    const clipperAddr = clipperAccount.address;
    const clNonce = await clipper.get("/api/wallet/nonce").query({ address: clipperAddr });
    const clSig = await clipperAccount.signMessage({ message: clNonce.body.message });
    await clipper.post("/api/wallet/bind").send({ address: clipperAddr, signature: clSig });

    const applyRes = await clipper.post(`/api/campaigns/${campaignId}/apply`).send({
      submittedContent: "https://www.tiktok.com/@e2e/video/456",
      contentType: "video",
      contentDescription: "Demo clip for revenue smoke test",
      aiDetectionResult: { recommendation: "approve", confidence: 0.95, flags: [] },
      aiConfidence: 0.95,
      aiFlags: [],
    });
    expect(applyRes.status, applyRes.text).toBe(201);
    const clipperCampaignId: string = applyRes.body.id;
    const trackingCode: string = applyRes.body.trackingCode;
    expect(trackingCode).toBeTruthy();

    // Approve. After approval the row gets a clipperPromoCode minted.
    const reviewRes = await creator
      .post(`/api/clipper-applications/${clipperCampaignId}/review`)
      .send({ action: "approve", notes: "Looks good" });
    expect(reviewRes.status, reviewRes.text).toBe(200);

    const [approved] = await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.id, clipperCampaignId));
    expect(approved.isApproved).toBe(true);
    expect(approved.applicationStatus).toBe("approved");
    expect(approved.clipperPromoCode).toBeTruthy();
    expect(approved.clipperPromoCode!.length).toBe(8);
    // 32-char alphabet excludes I/O/0/1 by design; promo code must too.
    expect(approved.clipperPromoCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);

    // ── 4. Clipper submits their post URL ─────────────────────────────
    const postUrlRes = await clipper
      .post(`/api/clipper-campaigns/${clipperCampaignId}/post-url`)
      .send({ postUrl: "https://www.tiktok.com/@e2e/video/456" });
    expect(postUrlRes.status, postUrlRes.text).toBe(200);
    expect(postUrlRes.body.ok).toBe(true);

    // GET clipper assignment — coverage block should show TikTok with
    // needsClipperOAuth (server isn't configured for TikTok in tests).
    const assignmentRes = await clipper.get(`/api/clipper-campaigns/${clipperCampaignId}`);
    expect(assignmentRes.status, assignmentRes.text).toBe(200);
    expect(assignmentRes.body.assignment.postUrl).toBe(
      "https://www.tiktok.com/@e2e/video/456",
    );
    expect(assignmentRes.body.assignment.clipperPromoCode).toBe(approved.clipperPromoCode);
    expect(assignmentRes.body.coverage.platform).toBe("tiktok");
    expect(assignmentRes.body.coverage.goalType).toBe("revenue");
    // For revenue goals, coverage.relevant is false (post URL isn't the
    // verification source — Shopify/Stripe webhooks / pixel are).
    expect(assignmentRes.body.coverage.relevant).toBe(false);

    // ── 5. Synthetic test event must NOT move real progress ───────────
    const testEv = await creator.post(`/api/campaigns/${campaignId}/integration/test`).send({
      eventType: "purchase",
      value: 999,
    });
    expect(testEv.status, testEv.text).toBe(200);

    // Ensure a synthetic event landed (will show in recent-events) but
    // didn't credit real progress.
    const recentEv = await creator.get(`/api/campaigns/${campaignId}/integration/recent-events`);
    expect(recentEv.status).toBe(200);
    const testEvents = recentEv.body.events.filter((e: any) => e.isTest);
    expect(testEvents.length).toBeGreaterThan(0);

    // Sanity check: the clipper-campaign should NOT be completed yet
    // because the synthetic test event is filtered out of progress.
    const [stillOpen] = await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.id, clipperCampaignId));
    expect(stillOpen.isCompleted).toBe(false);

    // ── 6. Real pixel fire crosses the $100 revenue threshold ─────────
    // Public endpoint; no auth. Returns a 1×1 GIF either way.
    const pixelRes = await request(app)
      .get(`/pixel/${pixelId}`)
      .query({ clipper: trackingCode, event: "purchase", value: "150.00" });
    expect(pixelRes.status).toBe(200);
    expect(pixelRes.headers["content-type"]).toContain("image/gif");

    // Goal completion runs inline via trackingService → check now.
    const [completed] = await db
      .select()
      .from(clipperCampaigns)
      .where(eq(clipperCampaigns.id, clipperCampaignId));
    expect(completed.isCompleted).toBe(true);
    expect(completed.completedAt).not.toBeNull();
    const metrics = completed.completionMetrics as any;
    expect(metrics.goalReached.type).toBe("revenue");
    expect(metrics.goalReached.target).toBe(100);
    expect(metrics.goalReached.achieved).toBeGreaterThanOrEqual(150);

    // The tracking_events row landed, with the right shape.
    const purchaseEvents = await db
      .select()
      .from(trackingEvents)
      .where(
        sql`${trackingEvents.clipperCampaignId} = ${clipperCampaignId}
            AND ${trackingEvents.eventType} = 'purchase'
            AND (${trackingEvents.metadata} IS NULL OR ${trackingEvents.metadata} NOT LIKE '%"test":true%')`,
      );
    expect(purchaseEvents.length).toBeGreaterThan(0);
    expect(parseFloat(purchaseEvents[0].eventValue!)).toBeCloseTo(150, 2);

    // ── 7. Auto-payment row created for the bonus ─────────────────────
    const autoPays = await db
      .select()
      .from(autoPayments)
      .where(eq(autoPayments.clipperId, clipperId));
    expect(autoPays.length).toBeGreaterThan(0);
    expect(parseFloat(autoPays[0].amount)).toBeGreaterThan(0);

    // Goal-reached email was queued (fire-and-forget).
    await waitFor(async () => {
      const rows = await db
        .select({ kind: emailLog.kind })
        .from(emailLog)
        .where(inArray(emailLog.userId, [creatorId, clipperId]));
      const kinds = new Set(rows.map((r) => r.kind));
      return kinds.has("campaign_goal_reached") ? true : undefined;
    }, 8_000);
  }, 60_000);
});

// ===== Helpers =====

async function waitFor<T>(
  probe: () => Promise<T | undefined>,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<T> {
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

  // FK-safe delete order. autoPayments references budgetEscrow.id and
  // clipperId; do it first. campaign_integrations cascades on
  // campaign delete (ON DELETE CASCADE in migration 0018) but we'll
  // delete it explicitly for clarity.
  await db.delete(autoPayments).where(inArray(autoPayments.clipperId, ids));
  await db.delete(payouts).where(inArray(payouts.clipperId, ids));
  const camps = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(inArray(campaigns.creatorId, ids));
  for (const c of camps) {
    await db.delete(trackingEvents).where(eq(trackingEvents.campaignId, c.id));
    await db.delete(clipperCampaigns).where(eq(clipperCampaigns.campaignId, c.id));
    await db.delete(budgetEscrow).where(eq(budgetEscrow.campaignId, c.id));
    await db.delete(campaignIntegrations).where(eq(campaignIntegrations.campaignId, c.id));
  }
  await db.delete(paymentIntents).where(inArray(paymentIntents.userId, ids));
  await db.delete(emailLog).where(inArray(emailLog.userId, ids));
  await db
    .delete(emailVerificationTokens)
    .where(inArray(emailVerificationTokens.userId, ids));
  await db.delete(campaigns).where(inArray(campaigns.creatorId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}
