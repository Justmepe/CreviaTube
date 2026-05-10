-- Phase 5 — structured rejection reason on clipper applications.
--
-- The legacy review flow stored only freeform `rejection_reason` (text)
-- + `creator_review_notes`. That works for human review but doesn't
-- aggregate — we can't tell whether a clipper has a pattern of being
-- rejected for "off-brief" content versus "low quality" versus
-- "watermark detected", which is exactly the signal a reputation
-- system needs. This adds a closed-vocabulary code alongside the
-- existing freeform field. Notes still apply.
--
-- The rejection code list is canonical here AND mirrored in
-- shared/rejection-reasons.ts so backend validation and the UI
-- dropdown stay in lockstep. When extending: add to both, ship
-- a migration that drops + re-adds the CHECK with the new value.

ALTER TABLE clipper_campaigns
  ADD COLUMN IF NOT EXISTS rejection_reason_code TEXT;

ALTER TABLE clipper_campaigns
  DROP CONSTRAINT IF EXISTS clipper_campaigns_rejection_reason_code_check;
ALTER TABLE clipper_campaigns
  ADD CONSTRAINT clipper_campaigns_rejection_reason_code_check
  CHECK (rejection_reason_code IS NULL OR rejection_reason_code IN (
    'off_brief',
    'low_quality',
    'wrong_format',
    'watermark',
    'ai_generated',
    'brand_mismatch',
    'duplicate_submission',
    'other'
  ));
