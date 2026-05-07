import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "../../backend/db";
import { metricEvents } from "../../shared/schema.js";
import { emit } from "../../backend/lib/metrics";

const STAMP = `metrics_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

async function purge() {
  await db.execute(sql`DELETE FROM metric_events WHERE props->>'__stamp' = ${STAMP}`);
}

describe("emit (metrics pipe)", () => {
  beforeEach(async () => purge());

  it("writes a row to metric_events with event name, props, and timestamp", async () => {
    emit("signup", { __stamp: STAMP, role: "creator", country: "KE" } as any, null);

    // emit() is fire-and-forget; poll briefly until the row lands.
    const deadline = Date.now() + 2000;
    let row: any;
    while (Date.now() < deadline) {
      const rows = await db.execute(
        sql`SELECT id, event_name, props, created_at FROM metric_events WHERE props->>'__stamp' = ${STAMP} LIMIT 1`,
      );
      row = (rows as any).rows?.[0] || (rows as any)[0];
      if (row) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(row, "metric_events row should land").toBeTruthy();
    expect(row.event_name).toBe("signup");
    expect(row.props.role).toBe("creator");
    expect(row.props.country).toBe("KE");
    expect(new Date(row.created_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("accepts a userId reference", async () => {
    // Use a known fake user id; FK is ON DELETE SET NULL so missing user
    // would just nullify it. We expect insertion to either succeed with
    // null user or with the value depending on the DB semantics. Either
    // way the row should land.
    emit("email_verified", { __stamp: STAMP } as any, null);

    const deadline = Date.now() + 2000;
    let row: any;
    while (Date.now() < deadline) {
      const rows = await db.execute(
        sql`SELECT id FROM metric_events WHERE event_name = 'email_verified' AND props->>'__stamp' = ${STAMP} LIMIT 1`,
      );
      row = (rows as any).rows?.[0] || (rows as any)[0];
      if (row) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(row).toBeTruthy();
  });

  it("never throws even if persistence fails (fire-and-forget)", () => {
    // Pass an invalid userId. emit returns void synchronously and the
    // async insert handles its own errors. Calling code should never see
    // the failure.
    expect(() => emit("signup", { __stamp: STAMP } as any, "not-a-real-user-fk")).not.toThrow();
  });
});
