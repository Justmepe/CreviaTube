-- Collapse `entrepreneur` and `enterprise` userTypes into a single `business` type.
-- White-label-ness is now derived from the existence of an `enterprise_accounts`
-- row for the user, so no schema column is needed for it.

-- Rebuild user_type enum: drop entrepreneur + enterprise, add business.
ALTER TYPE "public"."user_type" RENAME TO "user_type__old";--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('influencer', 'business');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "public"."user_type"
  USING (
    CASE "user_type"::text
      WHEN 'entrepreneur' THEN 'business'
      WHEN 'enterprise'   THEN 'business'
      ELSE "user_type"::text
    END
  )::"public"."user_type";--> statement-breakpoint
DROP TYPE "public"."user_type__old";
