// Negative-path API tests. These guard against authz regressions —
// the kind of bugs that don't surface until someone exploits them.
// Easy to forget when refactoring; cheap to test.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import {
  users,
  campaigns,
  paymentIntents,
  emailVerificationTokens,
  emailLog,
  budgetEscrow,
  clipperCampaigns,
  trackingEvents,
} from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";

const E_CREATOR = "test-authz-creator@example.test";
const E_OTHER = "test-authz-other@example.test";
const E_CLIPPER = "test-authz-clipper@example.test";
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

describe("Authz negative paths", () => {
  it("clipper cannot create campaigns (403)", async () => {
    await purge();
    const clipper = await registerVerify(E_CLIPPER, `authz_clipper_${stamp}`, "clipper", "influencer");

    const res = await clipper
      .post("/api/campaigns")
      .send({
        name: "Clipper trying to create",
        description: "This should be rejected because clippers can't run campaigns.",
        budget: "5.00",
        duration: 7,
        targetPlatforms: JSON.stringify(["tiktok"]),
        rewardRates: JSON.stringify({ view: 0.04 }),
        requirements: JSON.stringify({ minFollowers: 0 }),
        campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only creators/i);
  });

  it("non-owner creator cannot view another creator's campaign region-coverage (403)", async () => {
    await purge();
    const ownerAgent = await registerVerify(E_CREATOR, `authz_owner_${stamp}`, "creator", "business");
    const otherAgent = await registerVerify(E_OTHER, `authz_other_${stamp}`, "creator", "business");

    // Owner creates a campaign
    const create = await ownerAgent.post("/api/campaigns").send({
      name: "Authz owner campaign",
      description: "Owned by the first creator; second creator should not see coverage.",
      budget: "5.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
    });
    expect(create.status).toBe(201);
    const campaignId = create.body.id;

    // Other creator tries to read coverage — should be denied
    const cov = await otherAgent.get(`/api/campaigns/${campaignId}/region-coverage`);
    expect(cov.status).toBe(403);
  });

  it("verify-email rejects bogus token (404)", async () => {
    const res = await request(app).post("/api/email/verify").send({ token: "not-a-real-token" });
    expect(res.status).toBe(404);
  });

  it("wallet/bind without prior nonce returns 400", async () => {
    await purge();
    const agent = await registerVerify(E_CREATOR, `authz_nonce_${stamp}`, "creator", "business");
    const res = await agent.post("/api/wallet/bind").send({
      address: "0x1111111111111111111111111111111111111111",
      signature: "0x" + "0".repeat(130),
    });
    expect(res.status).toBe(400);
  });

  it("apply endpoint blocks clipper without ai detection result (400)", async () => {
    await purge();
    const owner = await registerVerify(E_CREATOR, `authz_apply_owner_${stamp}`, "creator", "business");
    const clipper = await registerVerify(E_CLIPPER, `authz_apply_clipper_${stamp}`, "clipper", "influencer");

    const create = await owner.post("/api/campaigns").send({
      name: "Apply guard test",
      description: "AI detection result must be present, this verifies that.",
      budget: "5.00",
      duration: 7,
      targetPlatforms: JSON.stringify(["tiktok"]),
      rewardRates: JSON.stringify({ view: 0.04 }),
      requirements: JSON.stringify({ minFollowers: 0 }),
      campaignGoals: { primaryGoal: "views", viewsGoal: 100 },
    });
    const cid = create.body.id;

    const res = await clipper.post(`/api/campaigns/${cid}/apply`).send({
      submittedContent: "https://example.test/clip",
      contentType: "video",
      contentDescription: "no ai result attached",
      // intentionally omitting aiDetectionResult
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/AI detection/i);
  });

  it("unauthenticated requests to protected endpoints return 401", async () => {
    const res1 = await request(app).post("/api/campaigns").send({});
    expect(res1.status).toBe(401);

    const res2 = await request(app).get("/api/wallet/nonce").query({ address: "0x" + "1".repeat(40) });
    expect(res2.status).toBe(401);

    const res3 = await request(app).post("/api/payments/intent").send({});
    expect(res3.status).toBe(401);
  });
});

// ===== Helpers =====

async function registerVerify(
  email: string,
  username: string,
  role: "creator" | "clipper",
  accountType: "business" | "influencer",
) {
  const agent = request.agent(app);
  await agent.post("/api/register").send({
    username,
    email,
    password: "supersecret123",
    fullName: `Authz ${role}`,
    role,
    accountType,
    campaignerStage: role === "creator" && accountType === "business" ? "established_brand" : undefined,
  });

  const [u] = await db.select().from(users).where(eq(users.email, email));
  // Wait briefly for the fire-and-forget verification token row.
  for (let i = 0; i < 50; i++) {
    const [tok] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.userId, u.id)).limit(1);
    if (tok) {
      await agent.post("/api/email/verify").send({ token: tok.token });
      break;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return agent;
}

async function purge() {
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, [E_CREATOR, E_OTHER, E_CLIPPER]));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);

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
