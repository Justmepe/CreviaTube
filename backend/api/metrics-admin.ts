// Admin-only metrics rollups. Queries metric_events for funnel + per-event
// time-series + persona breakdowns. All endpoints require role=admin.

import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";

function requireAdmin(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return false;
  }
  if (req.user.role !== "admin") {
    res.sendStatus(403);
    return false;
  }
  return true;
}

// Window in days to look back. Capped to 90 to keep queries fast.
function windowDays(req: any): number {
  const raw = parseInt(String(req.query.days || "30"), 10);
  if (Number.isNaN(raw)) return 30;
  return Math.max(1, Math.min(90, raw));
}

export function setupMetricsAdminAPI(app: Express): void {
  // Funnel + summary counters
  app.get("/api/admin/metrics/summary", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const days = windowDays(req);

    // The full funnel — ordered to match the typical signup → activation
    // → first-campaign → first-payout journey.
    const FUNNEL_ORDER = [
      "signup",
      "email_verified",
      "wallet_bound",
      "campaign_created",
      "campaign_funded",
      "campaign_goal_reached",
    ] as const;

    const counts = await db.execute(sql`
      SELECT event_name, COUNT(*)::int AS count
      FROM metric_events
      WHERE created_at >= NOW() - (${days}::int || ' days')::interval
      GROUP BY event_name
    `);
    const rows: any[] = (counts as any).rows ?? counts ?? [];
    const byEvent: Record<string, number> = {};
    for (const r of rows) byEvent[r.event_name] = Number(r.count);

    const funnel = FUNNEL_ORDER.map((name, i) => {
      const count = byEvent[name] || 0;
      const prev = i > 0 ? byEvent[FUNNEL_ORDER[i - 1]] || 0 : null;
      const conversionFromPrev = prev && prev > 0 ? Math.round((count / prev) * 1000) / 10 : null;
      return { event: name, count, conversionFromPrev };
    });

    res.json({ days, byEvent, funnel });
  });

  // Per-day time series for a single event. Used by the chart.
  app.get("/api/admin/metrics/timeseries", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const days = windowDays(req);
    const event = String(req.query.event || "signup");
    // Allowlist matches MetricEventName so callers can't query arbitrary text.
    const ALLOWED = new Set([
      "signup", "email_verified", "wallet_bound",
      "campaign_created", "campaign_funded", "stage_promoted",
      "application_submitted", "application_decision",
      "campaign_goal_reached", "payout_settled", "subscription_paid",
    ]);
    if (!ALLOWED.has(event)) {
      return res.status(400).json({ message: "Unknown event" });
    }

    const rows = await db.execute(sql`
      SELECT
        date_trunc('day', created_at)::date AS day,
        COUNT(*)::int AS count
      FROM metric_events
      WHERE event_name = ${event}
        AND created_at >= NOW() - (${days}::int || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `);
    const data = ((rows as any).rows ?? rows ?? []).map((r: any) => ({
      day: typeof r.day === "string" ? r.day : (r.day as Date).toISOString().slice(0, 10),
      count: Number(r.count),
    }));
    res.json({ event, days, data });
  });

  // Persona distribution from the signup events. Not all signups carry
  // role + accountType in props (legacy events may differ); the query
  // tolerates missing fields by bucketing into "unknown".
  app.get("/api/admin/metrics/persona-mix", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const days = windowDays(req);

    const rows = await db.execute(sql`
      SELECT
        COALESCE(props->>'role', 'unknown')          AS role,
        COALESCE(props->>'accountType', 'unknown')   AS account_type,
        COALESCE(props->>'stage', 'unknown')         AS stage,
        COALESCE(props->>'country', 'unknown')       AS country,
        COUNT(*)::int                                AS count
      FROM metric_events
      WHERE event_name = 'signup'
        AND created_at >= NOW() - (${days}::int || ' days')::interval
      GROUP BY role, account_type, stage, country
      ORDER BY count DESC
    `);
    const data = ((rows as any).rows ?? rows ?? []).map((r: any) => ({
      role: r.role,
      accountType: r.account_type,
      stage: r.stage,
      country: r.country,
      count: Number(r.count),
    }));
    res.json({ days, data });
  });
}
