// Lightweight structured metrics pipe. Replaces the console.log() stub
// from Phase 5 with something queryable.
//
// Each emit() call does two things:
//   1. Writes a row to metric_events (persistent, queryable)
//   2. Emits a structured stdout JSON line (ingestible by any log
//      aggregator — Loki, Datadog, CloudWatch, etc.)
//
// Stable event names — extend this union (and update callers) when
// adding new emission points so we keep one canonical taxonomy.

import { db } from "../db";
import { metricEvents } from "../../shared/schema.js";

export type MetricEventName =
  | "signup"
  | "email_verified"
  | "wallet_bound"
  | "campaign_created"
  | "campaign_funded"
  | "stage_promoted"
  | "application_submitted"
  | "application_decision"
  | "campaign_goal_reached"
  | "payout_settled"
  | "subscription_paid";

export type MetricProps = Record<string, string | number | boolean | null>;

/**
 * Fire-and-forget emission. Persistence failures don't propagate to the
 * caller — metrics never block business logic.
 */
export function emit(eventName: MetricEventName, props?: MetricProps, userId?: string | null): void {
  // Stdout side: one structured line per event. JSON for easy parsing.
  // The "📊" prefix matches the convention from Phase 5's console.log
  // stub so existing eyeball-grep workflows still work.
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event: eventName,
    userId: userId || null,
    ...(props || {}),
  });
  // eslint-disable-next-line no-console
  console.log(`📊 ${line}`);

  // Persistent side: insert into metric_events. fire-and-forget; we don't
  // want analytics to ever fail a request.
  void db
    .insert(metricEvents)
    .values({
      eventName,
      userId: userId || null,
      props: props || {},
    } as any)
    .catch((err) => console.error("metric_events insert failed:", err?.message || err));
}
