-- Email infrastructure: verification tokens + send-log + email_verified flag on users.
-- Existing users default to email_verified=true so we don't lock them out (only new
-- registrations trigger the verification flow).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false;--> statement-breakpoint
UPDATE "users" SET "email_verified" = true WHERE "created_at" < now();--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "token" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_idx" ON "email_verification_tokens"("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_log" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar REFERENCES "users"("id"),
  "kind" text NOT NULL,
  "recipient" text NOT NULL,
  "subject" text NOT NULL,
  "dedupe_key" varchar(128) UNIQUE,
  "resend_id" text,
  "status" text NOT NULL DEFAULT 'queued',
  "error" text,
  "metadata" json,
  "sent_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_log_user_kind_idx" ON "email_log"("user_id","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_log_kind_status_idx" ON "email_log"("kind","status");
