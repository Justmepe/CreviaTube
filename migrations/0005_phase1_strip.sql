-- Phase 1 strip: remove community, cold-outreach, white-label/enterprise.
-- Drops 16 tables and narrows 2 enums. Pure removal — no data to preserve.

-- 1. Drop community tables (12 tables across community + community-monetization).
DROP TABLE IF EXISTS "community_marketplace_orders" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_marketplace" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event_attendees" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_features" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_commissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_subscriptions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_events" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_reviews" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "community_members" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "communities" CASCADE;--> statement-breakpoint

-- 2. Drop white-label / enterprise tables.
DROP TABLE IF EXISTS "enterprise_accounts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "enterprise_requests" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "admin_notifications" CASCADE;--> statement-breakpoint

-- 3. Drop cold-outreach tracking.
DROP TABLE IF EXISTS "outreach_contacts" CASCADE;--> statement-breakpoint

-- 4. Narrow event_type enum: drop outreach_contact + outreach_response values.
--    Postgres can't remove enum values in-place, so rebuild and cast.
ALTER TYPE "public"."event_type" RENAME TO "event_type__old";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('click', 'signup', 'view', 'conversion');--> statement-breakpoint
ALTER TABLE "tracking_events" ALTER COLUMN "event_type" TYPE "public"."event_type"
  USING (
    CASE "event_type"::text
      WHEN 'outreach_contact'  THEN 'conversion'
      WHEN 'outreach_response' THEN 'conversion'
      ELSE "event_type"::text
    END
  )::"public"."event_type";--> statement-breakpoint
DROP TYPE "public"."event_type__old";--> statement-breakpoint

-- 5. Drop the campaign_type enum entirely (was only used by the now-deleted
--    cold_outreach campaign branch; the column is being dropped below).
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "campaign_type";--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "outreach_config";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."campaign_type";
