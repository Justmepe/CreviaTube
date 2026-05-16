-- Phase 7 Slice H — runtime platform config.
--
-- Previously, two numbers were hardcoded across multiple files:
--   - Platform fee: 0.20 (20%), hardcoded in 4 places
--     (escrow service, payments fundCampaign, revenue-stats query)
--   - Founding Creator seat cap: 50, hardcoded in founding-seats API
--
-- Both are levers we want to pull without a deploy:
--   - Negotiate a custom fee for a specific large creator (set their
--     account override later; for now flip the global)
--   - Open more Founding seats if the first 50 fill faster than
--     expected
--
-- This table is the single source of truth. Values are read through
-- backend/lib/platform-config.ts with a 60-second in-memory cache,
-- so the hot path doesn't hit the DB on every request.

CREATE TABLE IF NOT EXISTS platform_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by  VARCHAR REFERENCES users(id)
);

-- Pre-seed with the current hardcoded values so existing behaviour
-- is preserved on day one. Idempotent: only inserts if the row
-- doesn't already exist.
INSERT INTO platform_config (key, value, description)
VALUES
  ('platform_fee_bps',      '2000', 'Platform fee in basis points. 2000 = 20%.'),
  ('founding_seats_total',  '50',   'Total Founding Creator seats available at the locked $15/mo price.'),
  ('founding_price_usdc',   '15.00', 'Founding tier price in USDC.'),
  ('post_founding_price_usdc', '29.00', 'Standard Premium price in USDC after the cap is hit.')
ON CONFLICT (key) DO NOTHING;
