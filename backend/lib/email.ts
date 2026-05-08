import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { emailLog } from "../../shared/schema.js";
import { render } from "@react-email/components";

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
export const EMAIL_FROM = process.env.EMAIL_FROM_ADDRESS?.trim() || "CreviaTube <onboarding@resend.dev>";
export const APP_URL = process.env.APP_URL?.trim() || "http://localhost:5000";

let _resend: Resend | undefined;
function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(RESEND_API_KEY);
  return _resend;
}

export type EmailKind =
  | "welcome_verification"
  | "password_reset"
  | "subscription_paid"
  | "subscription_expiring"
  | "campaign_funded"
  | "campaign_goal_reached"
  | "campaign_completed_creator"
  | "application_approved"
  | "application_rejected"
  | "payout_sent"
  | "payout_failed"
  | "review_received"
  | "wallet_bound"
  | "stage_promoted";

export interface SendEmailArgs {
  kind: EmailKind;
  to: string;
  subject: string;
  /** A React Email element (or any JSX). Will be rendered to HTML + text. */
  react: React.ReactElement;
  /**
   * Optional idempotency key. If a previous send used the same dedupeKey,
   * the call is a no-op (status 'skipped' on the new row).
   * Convention: "<kind>:<resource-id>" — e.g. "subscription_paid:<intentId>"
   */
  dedupeKey?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  status: "sent" | "skipped" | "failed" | "queued_no_provider";
  emailLogId?: string;
  resendId?: string;
  error?: string;
}

/**
 * Send a transactional email and record the attempt to email_log.
 * - If RESEND_API_KEY is unset, logs the would-be-sent email and returns
 *   `queued_no_provider` so dev/test environments don't crash.
 * - If dedupeKey matches an already-sent row, returns `skipped`.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const { kind, to, subject, react, dedupeKey, userId, metadata } = args;

  // Dedupe: if a row with this key already succeeded, skip.
  if (dedupeKey) {
    const [existing] = await db
      .select({ id: emailLog.id, status: emailLog.status })
      .from(emailLog)
      .where(eq(emailLog.dedupeKey, dedupeKey))
      .limit(1);
    if (existing && existing.status === "sent") {
      return { status: "skipped", emailLogId: existing.id };
    }
  }

  const html = await render(react);
  const text = await render(react, { plainText: true });

  // Insert pending log row first so we always have a paper trail
  const [logRow] = await db.insert(emailLog).values({
    userId: userId || null,
    kind,
    recipient: to,
    subject,
    dedupeKey: dedupeKey || null,
    status: "queued",
    metadata: (metadata as any) || null,
  }).returning({ id: emailLog.id });

  const resend = getResend();
  if (!resend) {
    // Dev mode without API key: mark as queued_no_provider, leave row as 'queued'
    console.log(`[email:${kind}] would send to ${to} — RESEND_API_KEY not configured`);
    await db.update(emailLog)
      .set({ status: "skipped", error: "RESEND_API_KEY not configured" })
      .where(eq(emailLog.id, logRow.id));
    return { status: "queued_no_provider", emailLogId: logRow.id };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message || JSON.stringify(error));
    await db.update(emailLog)
      .set({ status: "sent", resendId: data?.id || null, sentAt: new Date() })
      .where(eq(emailLog.id, logRow.id));
    return { status: "sent", emailLogId: logRow.id, resendId: data?.id };
  } catch (e: any) {
    const message = e?.message || String(e);
    console.error(`[email:${kind}] send failed:`, message);
    await db.update(emailLog)
      .set({ status: "failed", error: message })
      .where(eq(emailLog.id, logRow.id));
    return { status: "failed", emailLogId: logRow.id, error: message };
  }
}
