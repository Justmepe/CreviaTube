-- Phase 3 — extend event_type enum so influencer + founder personas can
-- express their core goals.
--
-- New values:
--   follow      — used by influencer "Grow my following" template
--   subscribe   — influencer "Drive paid signups" (paid subs / patrons /
--                 course buyers)
--   install     — founder "App installs" template
--
-- Postgres requires ALTER TYPE ... ADD VALUE in its own statement (no
-- transaction). Each ADD is a no-op if the value already exists.

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'follow';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'subscribe';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'install';
