-- Phase 5 — creator-clipper trust table.
--
-- One row per (creator, clipper) pair. Tracks how many times the
-- creator has approved this clipper across their campaigns and lets
-- the creator opt into auto-approving future applications from
-- clippers they've already vetted.
--
-- Maintained by:
--   - storage.reviewClipperApplication on approve (upsert + increment)
--   - PUT /api/creator/clipper-trust/:clipperId (creator toggles
--     auto_approve and tunes threshold)
--
-- Read by:
--   - the application-submission handler (POST /api/campaigns/:id/apply)
--     to decide if the new application should skip creator_review and
--     land directly in 'approved'
--   - the review-modal UI to render the "Trust @alice" toggle when
--     approvedCount >= auto_approve_threshold
--
-- auto_approve_threshold is per-row so each creator picks their own
-- bar. Default 5 from the locked design conversation; a brand running
-- a one-off can drop to 3, a high-volume creator can raise to 10.

CREATE TABLE IF NOT EXISTS creator_clipper_trust (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clipper_id  VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- How many of this clipper's applications the creator has approved.
  -- Maintained on every approve via upsert.
  approved_count INTEGER NOT NULL DEFAULT 0,

  -- Per-creator threshold for the "Trust" toggle to even appear in the
  -- UI. Default 5; tunable by the creator.
  auto_approve_threshold INTEGER NOT NULL DEFAULT 5,

  -- The toggle itself. When true, future applications from this
  -- clipper to this creator's campaigns skip creator_review and go
  -- straight to 'approved'.
  auto_approve BOOLEAN NOT NULL DEFAULT false,

  -- When the creator most recently approved this clipper. Drives the
  -- "Last approved 12 days ago" copy in the chip.
  last_approved_at TIMESTAMP,

  -- Set the first time auto_approve fires for this pair so we know
  -- whether to send the celebratory "you're trusted" milestone email
  -- (first time only) versus the standard application_approved email
  -- (subsequent auto-approvals).
  first_auto_approve_notified_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  -- One row per pair.
  CONSTRAINT creator_clipper_trust_pair_unique UNIQUE (creator_id, clipper_id)
);

-- Index lookups by (creator_id, clipper_id) — every apply call hits
-- this when checking whether to auto-approve.
CREATE INDEX IF NOT EXISTS creator_clipper_trust_pair_idx
  ON creator_clipper_trust (creator_id, clipper_id);

-- Lookups by creator_id alone for the "list of trusted clippers" UI.
CREATE INDEX IF NOT EXISTS creator_clipper_trust_creator_idx
  ON creator_clipper_trust (creator_id)
  WHERE auto_approve = true;
