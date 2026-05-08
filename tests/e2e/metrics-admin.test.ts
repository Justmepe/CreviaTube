// Admin metrics endpoint coverage. Confirms authz boundaries (401/403)
// and the happy path returns the expected shape after generating events.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { sql, eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import { users, emailLog, emailVerificationTokens, metricEvents } from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";
import { emit } from "../../backend/lib/metrics";

const E_ADMIN = "test-metrics-admin@example.test";
const E_USER  = "test-metrics-user@example.test";
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

describe("Admin metrics endpoints", () => {
  it("blocks unauthenticated callers (401)", async () => {
    const r1 = await request(app).get("/api/admin/metrics/summary");
    expect(r1.status).toBe(401);
    const r2 = await request(app).get("/api/admin/metrics/timeseries?event=signup");
    expect(r2.status).toBe(401);
    const r3 = await request(app).get("/api/admin/metrics/persona-mix");
    expect(r3.status).toBe(401);
  });

  it("blocks non-admin callers (403)", async () => {
    await purge();
    const agent = request.agent(app);
    await agent.post("/api/register").send({
      username: `metrics_user_${stamp}`,
      email: E_USER,
      password: "supersecret123",
      fullName: "Non-Admin",
      role: "creator",
      accountType: "business",
    });

    const r = await agent.get("/api/admin/metrics/summary");
    expect(r.status).toBe(403);
  });

  it("admin gets summary + timeseries + persona-mix back, including events we just emitted", async () => {
    await purge();
    const admin = request.agent(app);
    await admin.post("/api/register").send({
      username: `metrics_admin_${stamp}`,
      email: E_ADMIN,
      password: "supersecret123",
      fullName: "Metrics Admin",
      role: "creator",
      accountType: "business",
    });
    const [adminUser] = await db.select().from(users).where(eq(users.email, E_ADMIN));
    await db.update(users).set({ role: "admin" }).where(eq(users.id, adminUser.id));
    await admin.post("/api/login").send({
      username: `metrics_admin_${stamp}`,
      password: "supersecret123",
    });

    // The signup metric for this admin already fired during /api/register.
    // Add a couple of explicit emits and wait for them to land.
    emit("email_verified", {}, adminUser.id);
    emit("wallet_bound", { address: "0xabc" }, adminUser.id);
    // emit() persists fire-and-forget — give it a beat
    await new Promise((r) => setTimeout(r, 250));

    const summary = await admin.get("/api/admin/metrics/summary?days=7");
    expect(summary.status, summary.text).toBe(200);
    expect(summary.body.byEvent.signup).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(summary.body.funnel)).toBe(true);
    // Funnel array should contain the expected events in order
    const funnelEvents = summary.body.funnel.map((f: any) => f.event);
    expect(funnelEvents).toContain("signup");
    expect(funnelEvents).toContain("email_verified");

    const ts = await admin.get("/api/admin/metrics/timeseries?days=7&event=signup");
    expect(ts.status).toBe(200);
    expect(ts.body.event).toBe("signup");
    expect(Array.isArray(ts.body.data)).toBe(true);

    const tsBad = await admin.get("/api/admin/metrics/timeseries?days=7&event=not-an-event");
    expect(tsBad.status).toBe(400);

    const persona = await admin.get("/api/admin/metrics/persona-mix?days=7");
    expect(persona.status).toBe(200);
    expect(Array.isArray(persona.body.data)).toBe(true);
  });
});

async function purge() {
  // metric_events FK is ON DELETE SET NULL so we don't need to scrub here,
  // but clean test users + emails for a clean slate.
  const found = await db.select({ id: users.id }).from(users).where(inArray(users.email, [E_ADMIN, E_USER]));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);
  await db.delete(emailLog).where(inArray(emailLog.userId, ids));
  await db.delete(emailVerificationTokens).where(inArray(emailVerificationTokens.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}
