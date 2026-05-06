import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import { users, emailVerificationTokens, emailLog } from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";

// Test emails so we can purge cleanly between runs.
const E_BRAND = "test-phase2-brand@example.test";
const E_FOUNDER = "test-phase2-founder@example.test";
const E_INFLUENCER = "test-phase2-influencer@example.test";
const E_CLIPPER = "test-phase2-clipper@example.test";
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

describe("Registration persona + region capture (Phase 2)", () => {
  it("captures campaigner_stage when supplied + detects country from CF header", async () => {
    await purge();

    const res = await request(app)
      .post("/api/register")
      .set("CF-IPCountry", "KE")
      .send({
        username: `phase2_brand_${stamp}`,
        email: E_BRAND,
        password: "supersecret123",
        fullName: "Phase 2 Established Brand",
        role: "creator",
        accountType: "business",
        campaignerStage: "established_brand",
      });

    expect(res.status, res.text).toBe(201);

    const [u] = await db.select().from(users).where(eq(users.email, E_BRAND));
    expect(u.campaignerStage).toBe("established_brand");
    expect(u.countryIso).toBe("KE");
    expect(u.countryVerifiedAt).toBeNull(); // verification not implemented yet
  });

  it("accepts founder_prelaunch stage", async () => {
    const res = await request(app)
      .post("/api/register")
      .set("CF-IPCountry", "US")
      .send({
        username: `phase2_founder_${stamp}`,
        email: E_FOUNDER,
        password: "supersecret123",
        fullName: "Phase 2 Founder",
        role: "creator",
        accountType: "business",
        campaignerStage: "founder_prelaunch",
      });

    expect(res.status, res.text).toBe(201);

    const [u] = await db.select().from(users).where(eq(users.email, E_FOUNDER));
    expect(u.campaignerStage).toBe("founder_prelaunch");
    expect(u.countryIso).toBe("US");
  });

  it("accepts solo_creator stage from influencer path", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        username: `phase2_influencer_${stamp}`,
        email: E_INFLUENCER,
        password: "supersecret123",
        fullName: "Phase 2 Influencer",
        role: "creator",
        accountType: "influencer",
        campaignerStage: "solo_creator",
      });

    expect(res.status, res.text).toBe(201);

    const [u] = await db.select().from(users).where(eq(users.email, E_INFLUENCER));
    expect(u.campaignerStage).toBe("solo_creator");
  });

  it("rejects bogus stage values silently (writes null, doesn't fail registration)", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        username: `phase2_clipper_${stamp}`,
        email: E_CLIPPER,
        password: "supersecret123",
        fullName: "Phase 2 Clipper",
        role: "clipper",
        accountType: "influencer",
        campaignerStage: "this-is-not-valid",
      });

    expect(res.status, res.text).toBe(201);

    const [u] = await db.select().from(users).where(eq(users.email, E_CLIPPER));
    expect(u.campaignerStage).toBeNull(); // bad value rejected, registration succeeds
  });
});

async function purge() {
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, [E_BRAND, E_FOUNDER, E_INFLUENCER, E_CLIPPER]));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);
  await db.delete(emailLog).where(inArray(emailLog.userId, ids));
  await db.delete(emailVerificationTokens).where(inArray(emailVerificationTokens.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}
