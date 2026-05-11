-- Phase 6 Slice C — Founding Creator seat cap.
--
-- We cap the first 50 paid Premium creators at $15/30d, price-locked
-- for life. After 50, new subscribers pay $29/30d. This table is the
-- source of truth for "who got the founding price" — it gets stamped
-- once at subscription activation and never moves.
--
-- Pre-seed 50 empty rows. Atomic seat-claim happens at the API layer
-- with a transaction: SELECT … FOR UPDATE SKIP LOCKED on an unclaimed
-- row, then UPDATE … SET user_id = ?, claimed_at = NOW() WHERE id = ?.
-- The SKIP LOCKED variant avoids two simultaneous checkouts blocking
-- on the same row — the second checker just moves to the next.
--
-- Idempotency: a unique index on user_id prevents the same user from
-- claiming two seats if they double-tap the upgrade button. Combined
-- with the apply-side check (refuse to claim if user already has a
-- founder row) we get safety from both directions.

CREATE TABLE IF NOT EXISTS founding_seats (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  claimed_at  TIMESTAMP
);

-- Only one founding seat per user.
CREATE UNIQUE INDEX IF NOT EXISTS founding_seats_user_unique
  ON founding_seats(user_id)
  WHERE user_id IS NOT NULL;

-- Pre-seed 50 empty rows on first migration. The WHERE NOT EXISTS
-- guard makes re-running idempotent.
INSERT INTO founding_seats (id, user_id, claimed_at)
SELECT g, NULL, NULL FROM generate_series(1, 50) AS g
WHERE NOT EXISTS (SELECT 1 FROM founding_seats);
