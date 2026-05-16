-- Phase 7 Slice G — admin action audit log.
--
-- Every state-changing admin endpoint writes a row here so the
-- platform has a paper trail of who suspended whom / who refunded
-- what / who flipped which trust toggle. Distinct from metric_events
-- (product analytics, rolling retention) — this table is
-- adversarial-grade: append-only, indexed for security audits, no
-- TTL.
--
-- Schema:
--   actor_id     — the admin who took the action
--   action       — short verb, e.g. 'user.suspend', 'campaign.cancel',
--                  'subscription.refund'. Conventionally
--                  '<resource>.<verb>' so it's easy to filter.
--   target_type  — 'user' | 'campaign' | 'subscription' | 'withdrawal' | etc.
--   target_id    — primary key of the affected row
--   payload      — JSON blob with whatever context the action needs
--                  (reason text, amount, before/after values)
--   ip_address   — caller IP for forensic trace
--   user_agent   — caller UA for forensic trace
--   created_at   — UTC timestamp; queries always order by this DESC

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      VARCHAR NOT NULL REFERENCES users(id),
  action        TEXT    NOT NULL,
  target_type   TEXT    NOT NULL,
  target_id     TEXT,
  payload       JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON admin_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON admin_audit_log (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx
  ON admin_audit_log (action, created_at DESC);
