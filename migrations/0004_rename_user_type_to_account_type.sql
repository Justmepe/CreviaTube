-- Rename `user_type` enum and column to `account_type` to match the new code naming.
-- Pure rename, no data change.

ALTER TYPE "public"."user_type" RENAME TO "account_type";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "user_type" TO "account_type";
