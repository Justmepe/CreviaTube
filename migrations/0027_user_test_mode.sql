-- Phase 7 follow-up — per-user test mode.
--
-- Use case: a real-user E2E test where the platform owner wants to
-- walk through the creator funnel (campaign create → fund → clipper
-- applies → metrics) without actually paying USDC every time.
--
-- When test_mode = true on a user row, any campaign that user creates
-- is automatically force-funded on insertion. The auto-fund writes
-- an admin_audit_log row tagged 'campaign.force_fund' with
-- reason='auto: creator test_mode', so the trail is identical to a
-- manual force-fund click.
--
-- Scoped to specific accounts (an admin flips it on per user from
-- /admin/users). Defaults to false; no behavioural change for
-- accounts that don't have it explicitly set. Reversible — the
-- admin flips it back off.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- Quick index for the campaign-creation hook lookup; the column is
-- read once per campaign-create call. Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS users_test_mode_idx
  ON users (test_mode)
  WHERE test_mode = TRUE;
