import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../backend/db";
import { users, campaigns } from "../../shared/schema.js";
import { maybePromoteStage } from "../../backend/core/services/stage-promotion";

const TEST_EMAIL = "test-stage-promote@example.test";

async function setupUser(stage: string): Promise<string> {
  await purge();
  const [u] = await db
    .insert(users)
    .values({
      username: `stage_promo_${Date.now()}`,
      email: TEST_EMAIL,
      password: "x",
      role: "creator",
      accountType: "business",
      campaignerStage: stage,
      fullName: "Stage Promotion Test",
    } as any)
    .returning();
  return u.id;
}

async function insertFundedCampaign(creatorId: string, budget: number): Promise<void> {
  await db.insert(campaigns).values({
    creatorId,
    name: `Stage promo test ${Date.now()}-${Math.random()}`,
    budget: budget.toFixed(2),
    fundingStatus: "funded",
    status: "active",
    rewardRates: "{}",
    targetPlatforms: "[]",
  } as any);
}

async function purge() {
  const found = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL));
  if (found.length === 0) return;
  const ids = found.map((u) => u.id);
  await db.delete(campaigns).where(inArray(campaigns.creatorId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}

describe("maybePromoteStage", () => {
  beforeEach(async () => purge());
  afterAll(async () => purge());

  it("does nothing when user is not a creator", async () => {
    const r = await maybePromoteStage("non-existent-id");
    expect(r.changed).toBe(false);
  });

  it("does nothing when stage is null (legacy user)", async () => {
    const id = await setupUser(null as any);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(false);
  });

  it("does nothing when stage is solo_creator (parallel track)", async () => {
    const id = await setupUser("solo_creator");
    await insertFundedCampaign(id, 1000);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(false);
  });

  it("promotes founder_prelaunch → early_brand on first funded campaign", async () => {
    const id = await setupUser("founder_prelaunch");
    await insertFundedCampaign(id, 100);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.from).toBe("founder_prelaunch");
      expect(r.to).toBe("early_brand");
    }

    const [u] = await db.select().from(users).where(eq(users.id, id));
    expect(u.campaignerStage).toBe("early_brand");
  });

  it("does NOT promote founder_prelaunch with zero funded campaigns", async () => {
    const id = await setupUser("founder_prelaunch");
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(false);
  });

  it("promotes early_brand → established_brand at 3 funded campaigns", async () => {
    const id = await setupUser("early_brand");
    await insertFundedCampaign(id, 100);
    await insertFundedCampaign(id, 100);
    await insertFundedCampaign(id, 100);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.from).toBe("early_brand");
      expect(r.to).toBe("established_brand");
      expect(r.reason).toMatch(/3 funded campaigns/);
    }
  });

  it("promotes early_brand → established_brand at $5,000 cumulative budget (1 big campaign)", async () => {
    const id = await setupUser("early_brand");
    await insertFundedCampaign(id, 6000);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.to).toBe("established_brand");
      expect(r.reason).toMatch(/cumulative/);
    }
  });

  it("does NOT promote early_brand with 2 small campaigns under $5k", async () => {
    const id = await setupUser("early_brand");
    await insertFundedCampaign(id, 100);
    await insertFundedCampaign(id, 100);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(false);
  });

  it("does NOT re-promote established_brand (top of lifecycle)", async () => {
    const id = await setupUser("established_brand");
    await insertFundedCampaign(id, 99999);
    const r = await maybePromoteStage(id);
    expect(r.changed).toBe(false);
  });

  it("is idempotent — re-running doesn't double-promote", async () => {
    const id = await setupUser("founder_prelaunch");
    await insertFundedCampaign(id, 100);

    const first = await maybePromoteStage(id);
    expect(first.changed).toBe(true);

    const second = await maybePromoteStage(id);
    // After first promotion they're early_brand; with only 1 campaign and
    // $100 budget they don't qualify for established_brand yet, so this
    // run is a no-op.
    expect(second.changed).toBe(false);
  });
});
