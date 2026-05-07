-- Lightweight metrics pipe. One row per significant platform event so we
-- can answer "how many signups today, by persona?" or "what's the funded-
-- campaign throughput?" without shipping a full StatsD / OpenTelemetry
-- stack yet.
--
-- The event name is a stable identifier, props is event-specific JSON,
-- user_id ties to the user when relevant.

CREATE TABLE IF NOT EXISTS metric_events (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT NOT NULL,
  user_id     VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  props       JSON,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metric_events_name_created_idx
  ON metric_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS metric_events_user_idx
  ON metric_events (user_id, created_at DESC);
