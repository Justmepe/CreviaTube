-- Phase 5 — media submission via URL.
--
-- The legacy `submitted_content` column was a text field — fine for
-- copy / written content but useless for video clippers who need to
-- share the actual clip pre-publish. This adds a parallel URL path:
--
--   submission_kind = 'text'  → use submitted_content (existing flow)
--   submission_kind = 'url'   → use submission_url (new flow)
--
-- AI detection only runs on the text path. The URL path goes straight
-- to creator_review — review judgment is visual and the creator
-- watches the embedded player on the review page.
--
-- Both columns nullable for backwards-compatibility with rows
-- predating this migration. submission_kind defaults to NULL too;
-- we treat NULL as "text" in code so legacy rows still display.

ALTER TABLE clipper_campaigns
  ADD COLUMN IF NOT EXISTS submission_url  TEXT,
  ADD COLUMN IF NOT EXISTS submission_kind TEXT;

ALTER TABLE clipper_campaigns
  DROP CONSTRAINT IF EXISTS clipper_campaigns_submission_kind_check;
ALTER TABLE clipper_campaigns
  ADD CONSTRAINT clipper_campaigns_submission_kind_check
  CHECK (submission_kind IS NULL OR submission_kind IN ('text', 'url'));
