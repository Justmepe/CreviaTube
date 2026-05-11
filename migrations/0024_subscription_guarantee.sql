-- Phase 6 Slice D — 30-day money-back guarantee mechanism.
--
-- We promise on the /premium page that if a Founding creator's
-- campaigns don't get measurably more applications in 30 days, we
-- refund their USDC. To make that self-enforcing instead of a
-- customer-service burden:
--
--   1. AT activation: snapshot how many applications the creator's
--      campaigns received in the trailing 30 days. That's the
--      baseline number to beat. Stored as
--      `baseline_application_count` so subsequent renewals can
--      re-evaluate.
--   2. AT day 30: a sweep compares current 30-day applications to
--      the baseline. If lift < 50% (or, for creators with no prior
--      activity, fewer than 5 absolute new apps), the guarantee
--      fires.
--   3. ON FIRE: mark `guarantee_triggered=true`, `status='refund_pending'`.
--      The creator gets an email; an admin processes the USDC refund
--      manually and stamps `refund_tx_hash`.
--
-- Columns are nullable because legacy rows predate the snapshot and
-- shouldn't get refunded retroactively — they'd never get evaluated
-- because baseline_snapshotted_at is NULL.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS baseline_application_count INTEGER,
  ADD COLUMN IF NOT EXISTS baseline_snapshotted_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS guarantee_evaluated_at     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS guarantee_triggered        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_tx_hash             TEXT;

-- Index for the daily evaluator sweep. Looks up subscriptions whose
-- baseline is >= 30 days old and haven't been evaluated yet.
CREATE INDEX IF NOT EXISTS subscriptions_guarantee_pending_idx
  ON subscriptions (baseline_snapshotted_at)
  WHERE guarantee_evaluated_at IS NULL AND baseline_snapshotted_at IS NOT NULL;
