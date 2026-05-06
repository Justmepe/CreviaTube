-- Strip trader_creator user type and the broker/trading subsystem.
-- Safe to run with zero trader_creator users in the database (verified before authoring).

-- 1. Drop broker/trading tables (dependents first)
DROP TABLE IF EXISTS "personalized_broker_links";--> statement-breakpoint
DROP TABLE IF EXISTS "trading_metrics";--> statement-breakpoint
DROP TABLE IF EXISTS "broker_programs";--> statement-breakpoint

-- 2. Drop trading_accounts JSON column from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "trading_accounts";--> statement-breakpoint

-- 3. Drop the broker_type enum (no remaining references after table drops)
DROP TYPE IF EXISTS "public"."broker_type";--> statement-breakpoint

-- 4. Rebuild user_type enum without 'trader_creator'.
--    Postgres cannot remove a value from an enum in-place, so we rename, recreate, swap.
ALTER TYPE "public"."user_type" RENAME TO "user_type__old";--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('influencer', 'entrepreneur', 'enterprise');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "public"."user_type"
  USING (
    CASE "user_type"::text
      WHEN 'trader_creator' THEN 'influencer'
      ELSE "user_type"::text
    END
  )::"public"."user_type";--> statement-breakpoint
DROP TYPE "public"."user_type__old";--> statement-breakpoint

-- 5. Rebuild event_type enum without 'deposit' and 'trade'.
ALTER TYPE "public"."event_type" RENAME TO "event_type__old";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('click', 'signup', 'view', 'conversion', 'outreach_contact', 'outreach_response');--> statement-breakpoint
ALTER TABLE "tracking_events" ALTER COLUMN "event_type" TYPE "public"."event_type"
  USING (
    CASE "event_type"::text
      WHEN 'deposit' THEN 'conversion'
      WHEN 'trade'   THEN 'conversion'
      ELSE "event_type"::text
    END
  )::"public"."event_type";--> statement-breakpoint
DROP TYPE "public"."event_type__old";
