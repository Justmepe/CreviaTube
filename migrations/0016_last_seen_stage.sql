-- One column to track the last stage the user has seen acknowledged in
-- the UI. When users.campaigner_stage != users.last_seen_stage, the
-- dashboard shows a celebration toast and the frontend POSTs to
-- /api/me/acknowledge-stage to sync them. Pure UI bookkeeping.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_stage TEXT;

-- email_log.user_id originally had no ON DELETE rule, which caused FK
-- violations during test cleanup when async email writes raced with
-- user-row deletion. Cascade is the right semantics — when a user is
-- gone, their email log goes with them.
ALTER TABLE email_log
  DROP CONSTRAINT IF EXISTS email_log_user_id_fkey;
ALTER TABLE email_log
  ADD CONSTRAINT email_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
