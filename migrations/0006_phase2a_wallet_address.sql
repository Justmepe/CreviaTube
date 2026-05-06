-- Phase 2a: Add Web3 wallet binding to users.
-- Stores the EVM address (lowercase 0x...) the user signed-and-proved ownership of via Reown AppKit.
-- Unique so one wallet maps to one account.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" varchar(42);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_address_unique" ON "users"("wallet_address");
