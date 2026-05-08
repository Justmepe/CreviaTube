// Persona KYC integration. Real provider integration when PERSONA_API_KEY
// is set; falls through to a deterministic stub when it isn't, so the
// flow is usable in dev without a Persona account.
//
// Persona API docs we follow:
//   - Create inquiry: POST https://api.withpersona.com/api/v1/inquiries
//   - Webhook signature: HMAC-SHA256 of `${timestamp}.${rawBody}` keyed by
//     PERSONA_WEBHOOK_SECRET; header format `t=TIMESTAMP,v1=HMAC`.
//
// When real keys are set, the only production-facing concerns are:
//   1. The webhook URL is reachable from the public internet
//   2. The redirect_uri returns the user to your app cleanly
//   3. The template id matches the inquiry template you created in
//      Persona's dashboard.

import { createHmac, timingSafeEqual } from "crypto";

export type KycStatus = "pending" | "approved" | "rejected";

const PERSONA_API_BASE = "https://api.withpersona.com/api/v1";

function isConfigured(): boolean {
  return !!process.env.PERSONA_API_KEY;
}

/**
 * Create a Persona inquiry for the user. Returns the hosted-flow URL the
 * user navigates to in order to complete verification.
 *
 * In dev (no PERSONA_API_KEY), returns a deterministic stub so the flow
 * is testable end-to-end without an account.
 */
export async function createInquiry(opts: {
  userId: string;
  email: string;
  redirectUrl: string;
}): Promise<{ inquiryId: string; hostedUrl: string }> {
  if (!isConfigured()) {
    // Dev-mode stub. Inquiry id + URL are deterministic by user id so
    // tests + manual QA produce repeatable artifacts.
    return {
      inquiryId: `stub_inq_${opts.userId}`,
      hostedUrl: `${opts.redirectUrl}?stub=1&user=${opts.userId}`,
    };
  }

  const templateId = process.env.PERSONA_TEMPLATE_ID;
  if (!templateId) {
    throw new Error("PERSONA_TEMPLATE_ID not set — required when PERSONA_API_KEY is configured");
  }

  const res = await fetch(`${PERSONA_API_BASE}/inquiries`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERSONA_API_KEY}`,
      "Persona-Version": "2023-01-05",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          "inquiry-template-id": templateId,
          "reference-id": opts.userId,
          "redirect-uri": opts.redirectUrl,
          // Pass the user's email so Persona pre-fills it in the hosted flow.
          fields: { "email-address": opts.email },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Persona inquiry create failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = await res.json();
  const inquiryId = body?.data?.id as string | undefined;
  if (!inquiryId) throw new Error("Persona inquiry response missing data.id");

  // Persona's hosted-flow URL pattern (when using hosted experience):
  // https://withpersona.com/verify?inquiry-id=INQ123&template-id=TPL123
  const hostedUrl = `https://withpersona.com/verify?inquiry-id=${inquiryId}&template-id=${templateId}`;
  return { inquiryId, hostedUrl };
}

/**
 * Verify a Persona webhook signature. Persona signs the timestamp + body
 * with HMAC-SHA256, sends it in the Persona-Signature header as
 * `t=<timestamp>,v1=<hmac-hex>`.
 *
 * Constant-time comparison prevents timing attacks.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  secret: string,
  toleranceSeconds = 300, // Reject signatures older than 5 minutes by default
): boolean {
  if (!signatureHeader || !secret) return false;

  // Parse `t=...,v1=...`
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > toleranceSeconds) return false;

  const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const payload = `${parts.t}.${bodyStr}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  // Length-stable comparison
  if (parts.v1.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(parts.v1, "hex"), Buffer.from(expected, "hex"));
}

/**
 * Map a Persona inquiry status to our KycStatus enum. Persona's lifecycle:
 *   created → pending → completed/approved/declined/expired
 * Anything not approved/declined we collapse to "pending" so the UI can
 * show a sensible "in review" state.
 */
export function mapPersonaStatus(personaStatus: string): KycStatus | null {
  if (!personaStatus) return null;
  const s = personaStatus.toLowerCase().trim();
  if (s === "approved" || s === "completed") return "approved";
  if (s === "declined" || s === "rejected" || s === "expired") return "rejected";
  if (s === "created" || s === "pending" || s === "started") return "pending";
  return null;
}
