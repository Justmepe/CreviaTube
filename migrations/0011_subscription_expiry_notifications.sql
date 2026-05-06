-- Stamped after T-3 subscription expiry warning is sent; cleared on each renewal
-- so every billing cycle gets at most one notification.

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "notified_expiry_at" timestamp;
