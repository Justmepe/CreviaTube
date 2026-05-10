// Phase 5 — single source of truth for the rejection-reason catalog.
//
// Mirrored in two places:
//   - DB CHECK constraint (migration 0020). When extending: drop + re-add
//     the constraint with the new value as part of a new migration.
//   - clipper_campaigns.rejectionReasonCode column type
//
// Read by:
//   - the review-action validator on POST /api/clipper-applications/:id/review
//   - the dropdown on the creator /applications review modal
//   - the rejection email template (label, not code)
//   - the clipper assignment page (label rendered when their submission
//     was rejected)

export const REJECTION_REASONS = [
  {
    code: "off_brief",
    label: "Off-brief",
    description: "Doesn't match the campaign's description, target, or content angles.",
  },
  {
    code: "low_quality",
    label: "Low quality",
    description: "Production / clarity / audio / framing issues.",
  },
  {
    code: "wrong_format",
    label: "Wrong format",
    description: "Duration, aspect ratio, or platform mismatch (e.g., landscape for a Reels campaign).",
  },
  {
    code: "watermark",
    label: "Competitor watermark",
    description: "Visible watermark from a competitor or third-party tool.",
  },
  {
    code: "ai_generated",
    label: "AI-generated content",
    description: "Content appears synthesized or copy-pasted from an AI tool.",
  },
  {
    code: "brand_mismatch",
    label: "Brand mismatch",
    description: "Tone, visuals, or framing don't fit the brand.",
  },
  {
    code: "duplicate_submission",
    label: "Duplicate submission",
    description: "Same clip already submitted to this or another campaign.",
  },
  {
    code: "other",
    label: "Other",
    description: "Use the notes field to explain.",
  },
] as const;

export type RejectionReasonCode = (typeof REJECTION_REASONS)[number]["code"];

const CODE_SET = new Set(REJECTION_REASONS.map((r) => r.code));

export function isValidRejectionReason(v: unknown): v is RejectionReasonCode {
  return typeof v === "string" && CODE_SET.has(v as RejectionReasonCode);
}

export function getRejectionReasonLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const r = REJECTION_REASONS.find((x) => x.code === code);
  return r?.label ?? null;
}
