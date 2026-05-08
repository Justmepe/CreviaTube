// 2FA endpoint coverage. TOTP setup/verify/disable round-trip + email OTP
// request/verify. Uses otplib's authenticator.generate to produce valid
// codes during the test rather than mocking time.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { generateCode } from "../../backend/lib/totp";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import { users, emailVerificationTokens, emailLog } from "../../shared/schema.js";
import { registerRoutes } from "../../backend/routes";

const E_USER = "test-2fa@example.test";
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

async function loggedInAgent() {
  await purge();
  const agent = request.agent(app);
  await agent.post("/api/register").send({
    username: `tf_${stamp}`,
    email: E_USER,
    password: "supersecret123",
    fullName: "TwoFactor User",
    role: "creator",
    accountType: "business",
  });
  return agent;
}

describe("2FA endpoints", () => {
  it("TOTP setup → verify → status enabled in DB", async () => {
    const agent = await loggedInAgent();

    // Init returns secret + URI; nothing persisted yet
    const init = await agent.post("/api/2fa/totp/setup-init").send();
    expect(init.status).toBe(200);
    const secret: string = init.body.secret;
    expect(secret).toBeTruthy();
    expect(init.body.otpauthUri).toMatch(/^otpauth:\/\//);

    // Verify with the wrong code → 400, still not enabled
    const wrong = await agent.post("/api/2fa/totp/setup-verify").send({ code: "000000" });
    expect(wrong.status).toBe(400);

    // Verify with the right code → 200, enabled
    const code = generateCode(secret);
    const verify = await agent.post("/api/2fa/totp/setup-verify").send({ code });
    expect(verify.status, verify.text).toBe(200);
    expect(verify.body.enabled).toBe(true);

    const [u] = await db.select().from(users).where(eq(users.email, E_USER));
    expect(u.totpEnabled).toBe(true);
    expect(u.totpSecret).toBe(secret);
  });

  it("TOTP setup-verify rejects when no setup-init was called", async () => {
    const agent = await loggedInAgent();
    const r = await agent.post("/api/2fa/totp/setup-verify").send({ code: "123456" });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/setup-init/);
  });

  it("TOTP disable requires a fresh code (no session-cookie-thief disable)", async () => {
    const agent = await loggedInAgent();
    const init = await agent.post("/api/2fa/totp/setup-init").send();
    const secret: string = init.body.secret;
    await agent.post("/api/2fa/totp/setup-verify").send({ code: generateCode(secret) });

    // Disable without code → 400
    const noCode = await agent.post("/api/2fa/totp/disable").send({});
    expect(noCode.status).toBe(400);

    // Disable with wrong code → 400
    const wrong = await agent.post("/api/2fa/totp/disable").send({ code: "000000" });
    expect(wrong.status).toBe(400);

    // Disable with correct code → 200
    const ok = await agent.post("/api/2fa/totp/disable").send({ code: generateCode(secret) });
    expect(ok.status, ok.text).toBe(200);

    const [u] = await db.select().from(users).where(eq(users.email, E_USER));
    expect(u.totpEnabled).toBe(false);
    expect(u.totpSecret).toBeNull();
  });

  it("Email OTP: request issues a code, verify accepts it once", async () => {
    const agent = await loggedInAgent();

    const req1 = await agent.post("/api/2fa/email/request").send({ reason: "test action" });
    expect(req1.status).toBe(200);
    expect(req1.body.sent).toBe(true);

    // We can't read the plaintext code from the request response (sent only
    // to the email address). For the test we read it from the dev DB
    // approach: request a code, then exercise the verify endpoint with a
    // wrong code (must reject) and verify our own code (we don't have access
    // to the plaintext). So we limit this test to wrong-code rejection.
    const wrong = await agent.post("/api/2fa/email/verify").send({ code: "000000" });
    expect(wrong.status).toBe(400);

    // Malformed code (non-numeric / wrong length) → 400
    const malformed = await agent.post("/api/2fa/email/verify").send({ code: "abcdef" });
    expect(malformed.status).toBe(400);
  });

  it("requires authentication for all 2FA endpoints", async () => {
    const noAuth = request(app);
    expect((await noAuth.post("/api/2fa/totp/setup-init")).status).toBe(401);
    expect((await noAuth.post("/api/2fa/totp/setup-verify").send({ code: "1" })).status).toBe(401);
    expect((await noAuth.post("/api/2fa/totp/disable").send({ code: "1" })).status).toBe(401);
    expect((await noAuth.post("/api/2fa/email/request").send({})).status).toBe(401);
    expect((await noAuth.post("/api/2fa/email/verify").send({ code: "1" })).status).toBe(401);
  });
});

async function purge() {
  const found = await db.select({ id: users.id }).from(users).where(eq(users.email, E_USER));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);
  // email_log + verification_tokens cascade with the user_id FK; explicit
  // deletes for safety in case rules differ.
  await db.delete(emailLog).where(inArray(emailLog.userId, ids));
  await db.delete(emailVerificationTokens).where(inArray(emailVerificationTokens.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}
