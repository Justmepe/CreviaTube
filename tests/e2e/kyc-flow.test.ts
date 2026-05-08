// KYC flow: start → status → webhook → status updated.
// Runs in dev-stub mode (no PERSONA_API_KEY set) — createInquiry returns
// a deterministic stub. The webhook endpoint is real; we hand-sign with
// the same secret the endpoint reads from PERSONA_WEBHOOK_SECRET.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createHmac } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import { users, emailLog, emailVerificationTokens } from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";

const E_USER = "test-kyc-flow@example.test";
const stamp = Date.now();
const TEST_WEBHOOK_SECRET = "test-persona-webhook-secret";

let app: express.Express;

beforeAll(async () => {
  process.env.PERSONA_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  // Leave PERSONA_API_KEY unset → start-inquiry uses the stub branch.
  app = express();
  app.use((req, res, next) => {
    // Match the production middleware order: json parses first, then the
    // webhook route uses express.raw on its own.
    if (req.path === "/api/webhooks/kyc/persona") return next();
    return express.json()(req, res, next);
  });
  app.use(express.urlencoded({ extended: false }));
  await registerRoutes(app);
}, 30_000);

afterAll(async () => {
  await purge();
  delete process.env.PERSONA_WEBHOOK_SECRET;
});

async function loggedInUser() {
  await purge();
  const agent = request.agent(app);
  await agent.post("/api/register").send({
    username: `kyc_flow_${stamp}`,
    email: E_USER,
    password: "supersecret123",
    fullName: "KYC Flow User",
    role: "clipper",
    accountType: "influencer",
  });
  const [u] = await db.select().from(users).where(eq(users.email, E_USER));
  return { agent, user: u };
}

function signPersonaWebhook(rawBody: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const hmac = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  return `t=${ts},v1=${hmac}`;
}

describe("KYC flow", () => {
  beforeEach(async () => purge());

  it("start → stamps pending + returns hosted URL (dev stub)", async () => {
    const { agent, user } = await loggedInUser();

    const start = await agent.post("/api/kyc/start").send({});
    expect(start.status, start.text).toBe(200);
    expect(start.body.status).toBe("pending");
    expect(start.body.hostedUrl).toContain("stub=1");

    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect(u.kycStatus).toBe("pending");
    expect(u.kycProvider).toBe("persona");
    expect(u.kycReference).toContain("stub_inq_");
  });

  it("status endpoint returns the current state", async () => {
    const { agent } = await loggedInUser();
    await agent.post("/api/kyc/start").send({});

    const status = await agent.get("/api/kyc/status");
    expect(status.status).toBe(200);
    expect(status.body.status).toBe("pending");
    expect(status.body.provider).toBe("persona");
  });

  it("webhook with valid signature flips status to approved", async () => {
    const { agent, user } = await loggedInUser();
    await agent.post("/api/kyc/start").send({});

    const body = JSON.stringify({
      data: {
        attributes: {
          payload: {
            data: {
              id: "inq_test_123",
              attributes: {
                "reference-id": user.id,
                status: "approved",
              },
            },
          },
        },
      },
    });
    const sig = signPersonaWebhook(body, TEST_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/webhooks/kyc/persona")
      .set("persona-signature", sig)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status, res.text).toBe(200);
    expect(res.body.status).toBe("approved");

    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect(u.kycStatus).toBe("approved");
    expect(u.kycReference).toBe("inq_test_123");
  });

  it("webhook rejects invalid signature (401)", async () => {
    const { user } = await loggedInUser();
    const body = JSON.stringify({
      data: {
        attributes: {
          payload: {
            data: { id: "inq_x", attributes: { "reference-id": user.id, status: "approved" } },
          },
        },
      },
    });
    const sig = signPersonaWebhook(body, "wrong-secret");

    const res = await request(app)
      .post("/api/webhooks/kyc/persona")
      .set("persona-signature", sig)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(401);

    // DB unchanged
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect(u.kycStatus).not.toBe("approved");
  });

  it("webhook with declined status flips to rejected", async () => {
    const { user } = await loggedInUser();
    const body = JSON.stringify({
      data: {
        attributes: {
          payload: {
            data: { id: "inq_y", attributes: { "reference-id": user.id, status: "declined" } },
          },
        },
      },
    });
    const sig = signPersonaWebhook(body, TEST_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/webhooks/kyc/persona")
      .set("persona-signature", sig)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");

    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect(u.kycStatus).toBe("rejected");
  });

  it("requires authentication for /api/kyc/start and /api/kyc/status", async () => {
    expect((await request(app).post("/api/kyc/start").send({})).status).toBe(401);
    expect((await request(app).get("/api/kyc/status")).status).toBe(401);
  });
});

async function purge() {
  const found = await db.select({ id: users.id }).from(users).where(eq(users.email, E_USER));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);
  await db.delete(emailLog).where(inArray(emailLog.userId, ids));
  await db.delete(emailVerificationTokens).where(inArray(emailVerificationTokens.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}
