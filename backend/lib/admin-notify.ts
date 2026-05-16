// Phase 7 Slice A — admin notification helper.
//
// Thin wrapper around sendEmail() that targets process.env.ADMIN_EMAIL.
// Short-circuits with a console log when ADMIN_EMAIL is unset, so dev
// and CI environments don't try to email a hardcoded recipient.
//
// Used by signup, campaign-funding, and subscription-activation
// paths to keep the platform operator in the loop without us having
// to babysit a dashboard.
//
// Multi-admin distribution lists can plug in later by changing the
// resolver here — every call site already routes through this
// single function.

import * as React from "react";
import { sendEmail, type EmailKind, type SendEmailResult } from "./email";

interface NotifyAdminArgs {
  // Must be an admin_* kind. Type-narrowed against the EmailKind union
  // so accidental cross-pollination with user-facing kinds fails at
  // compile time.
  kind: Extract<EmailKind, `admin_${string}`>;
  subject: string;
  react: React.ReactElement;
  // Optional idempotency key. Same convention as sendEmail —
  // typically "<kind>:<resource-id>" so retries don't double-send.
  dedupeKey?: string;
}

export async function notifyAdmin(args: NotifyAdminArgs): Promise<SendEmailResult | null> {
  const recipient = process.env.ADMIN_EMAIL?.trim();
  if (!recipient) {
    // Don't fail the request — just log. Most dev/test environments
    // run without ADMIN_EMAIL set; we only want this firing on prod.
    console.log(`[admin-notify:${args.kind}] skipped (ADMIN_EMAIL not configured)`);
    return null;
  }
  try {
    return await sendEmail({
      kind: args.kind,
      to: recipient,
      subject: args.subject,
      react: args.react,
      dedupeKey: args.dedupeKey,
    });
  } catch (err: any) {
    // Admin notifications are observability, not part of the
    // critical request path. Log and swallow so a flaky SMTP
    // doesn't 500 a user-facing signup or payment.
    console.error(`[admin-notify:${args.kind}] failed`, err);
    return null;
  }
}
