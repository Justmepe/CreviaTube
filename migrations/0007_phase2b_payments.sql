-- Phase 2b: payment_intents + subscriptions for USDC-on-Base flows.

CREATE TABLE IF NOT EXISTS "payment_intents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "kind" text NOT NULL,
  "pathway" text NOT NULL DEFAULT 'usdc_direct',
  "reference_id" text,
  "expected_usdc_units" text NOT NULL,
  "sender_address" varchar(42),
  "receive_address" varchar(42) NOT NULL,
  "nexapay_order_id" text,
  "tx_hash" varchar(66) UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "paid_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_intents_user_status_idx" ON "payment_intents"("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_intents_status_expires_idx" ON "payment_intents"("status","expires_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "user_id" varchar PRIMARY KEY REFERENCES "users"("id"),
  "tier" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "current_period_end" timestamp NOT NULL,
  "last_payment_intent_id" varchar REFERENCES "payment_intents"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
