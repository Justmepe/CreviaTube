-- Phase 2e: extend payouts for USDC-on-Base payouts.
-- Add wallet recipient + on-chain tx fields, relax mpesa_number to nullable for non-fiat payouts.

ALTER TABLE "payouts" ALTER COLUMN "mpesa_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "recipient_address" varchar(42);--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "tx_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "failure_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payouts_tx_hash_unique" ON "payouts"("tx_hash");
