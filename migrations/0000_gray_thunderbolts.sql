CREATE TYPE "public"."broker_type" AS ENUM('forex', 'crypto', 'stocks', 'futures', 'options', 'cfds');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('active', 'paused', 'completed', 'draft');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('content_promotion', 'cold_outreach');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('pending', 'verified', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('click', 'signup', 'deposit', 'trade', 'view', 'conversion', 'outreach_contact', 'outreach_response');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('creator', 'clipper', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('trader_creator', 'influencer', 'entrepreneur', 'enterprise');--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" json,
	"read" boolean DEFAULT false,
	"urgent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auto_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_id" varchar NOT NULL,
	"clipper_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text NOT NULL,
	"payment_details" text,
	"scheduled_at" timestamp NOT NULL,
	"processed_at" timestamp,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"signup_bonus" integer DEFAULT 0 NOT NULL,
	"deposit_bonus" integer DEFAULT 0 NOT NULL,
	"volume_rate" real DEFAULT 0 NOT NULL,
	"description" text,
	"base_affiliate_link" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"region" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_escrow" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"creator_id" varchar NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"escrow_amount" numeric(10, 2) NOT NULL,
	"platform_fee_amount" numeric(10, 2) NOT NULL,
	"available_balance" numeric(10, 2) NOT NULL,
	"locked_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"payment_method" text NOT NULL,
	"transaction_id" text,
	"is_locked" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"budget" numeric(10, 2) NOT NULL,
	"budget_used" numeric(10, 2) DEFAULT '0' NOT NULL,
	"escrow_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"funding_status" text DEFAULT 'pending' NOT NULL,
	"funded_at" timestamp,
	"reward_rates" text NOT NULL,
	"target_platforms" text NOT NULL,
	"requirements" text,
	"duration" integer DEFAULT 30 NOT NULL,
	"campaign_type" text DEFAULT 'content_promotion' NOT NULL,
	"campaign_goals" json,
	"outreach_config" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clipper_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clipper_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"tracking_code" text NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completion_metrics" json,
	"submitted_content" text,
	"content_type" text,
	"content_description" text,
	"ai_detection_result" json,
	"ai_confidence" numeric(3, 2),
	"ai_flags" json,
	"application_status" text DEFAULT 'content_pending',
	"creator_review_notes" text,
	"rejection_reason" text,
	"reviewed_at" timestamp,
	CONSTRAINT "clipper_campaigns_tracking_code_unique" UNIQUE("tracking_code")
);
--> statement-breakpoint
CREATE TABLE "clipper_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clipper_id" varchar NOT NULL,
	"creator_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"clipper_campaign_id" varchar NOT NULL,
	"overall_rating" numeric(2, 1) NOT NULL,
	"quality_rating" numeric(2, 1) NOT NULL,
	"communication_rating" numeric(2, 1) NOT NULL,
	"timeliness" numeric(2, 1) NOT NULL,
	"creativity" numeric(2, 1) NOT NULL,
	"professionalism" numeric(2, 1) NOT NULL,
	"review_title" text NOT NULL,
	"review_text" text NOT NULL,
	"metrics_achieved" json,
	"would_hire_again" boolean NOT NULL,
	"recommend_to_others" boolean NOT NULL,
	"tags" json,
	"clipper_response" text,
	"clipper_responded_at" timestamp,
	"is_verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clipper_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clipper_id" varchar NOT NULL,
	"average_rating" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"quality_average" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"communication_average" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"timeliness_average" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"creativity_average" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"professionalism_average" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"total_campaigns_completed" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"average_completion_time" integer DEFAULT 0 NOT NULL,
	"total_views_generated" integer DEFAULT 0 NOT NULL,
	"total_clicks_generated" integer DEFAULT 0 NOT NULL,
	"total_signups_generated" integer DEFAULT 0 NOT NULL,
	"total_deposits_generated" integer DEFAULT 0 NOT NULL,
	"total_trades_generated" integer DEFAULT 0 NOT NULL,
	"total_conversions_generated" integer DEFAULT 0 NOT NULL,
	"positive_recommendations" integer DEFAULT 0 NOT NULL,
	"response_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"ranking_score" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"tier" text DEFAULT 'bronze' NOT NULL,
	"last_active_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clipper_stats_clipper_id_unique" UNIQUE("clipper_id")
);
--> statement-breakpoint
CREATE TABLE "enterprise_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"custom_domain" text,
	"branding_config" json,
	"pricing_config" json,
	"features" json,
	"status" text DEFAULT 'setup' NOT NULL,
	"activated_at" timestamp,
	"billing_cycle" text,
	"contract_details" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"company_name" text NOT NULL,
	"company_size" text NOT NULL,
	"request_type" text NOT NULL,
	"message" text NOT NULL,
	"preferred_meeting_time" text NOT NULL,
	"urgency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" text,
	"meeting_scheduled" boolean DEFAULT false,
	"meeting_date" timestamp,
	"meeting_time" text,
	"meeting_notes" text,
	"meeting_type" text,
	"meeting_link" text,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clipper_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"clipper_campaign_id" varchar NOT NULL,
	"contact_method" text NOT NULL,
	"contact_target" text NOT NULL,
	"contact_name" text,
	"contact_company" text,
	"contact_job_title" text,
	"message_subject" text,
	"message_content" text NOT NULL,
	"has_response" boolean DEFAULT false NOT NULL,
	"response_content" text,
	"response_at" timestamp,
	"lead_quality" text,
	"contact_reward" numeric(10, 2),
	"response_reward" numeric(10, 2),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_proof" text,
	"compliance_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_records" (
	"id" text PRIMARY KEY NOT NULL,
	"clipper_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verification" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clipper_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"mpesa_number" text NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"mpesa_transaction_id" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personalized_broker_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"broker_name" text NOT NULL,
	"broker_type" "broker_type" NOT NULL,
	"affiliate_link" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"overall_rating" numeric(2, 1) NOT NULL,
	"ease_of_use" numeric(2, 1) NOT NULL,
	"payment_reliability" numeric(2, 1) NOT NULL,
	"campaign_quality" numeric(2, 1) NOT NULL,
	"clipper_quality" numeric(2, 1),
	"customer_support" numeric(2, 1) NOT NULL,
	"platform_features" numeric(2, 1) NOT NULL,
	"review_title" text NOT NULL,
	"review_text" text NOT NULL,
	"review_trigger" text NOT NULL,
	"user_experience" json,
	"improvement_suggestions" text,
	"features_requested" json,
	"nps_score" integer NOT NULL,
	"would_recommend" boolean NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"moderation_notes" text,
	"admin_response" text,
	"admin_responded_at" timestamp,
	"admin_response_by" varchar,
	"helpful_votes" integer DEFAULT 0 NOT NULL,
	"total_votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"date" timestamp NOT NULL,
	"source" text NOT NULL,
	"campaign_id" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_prompts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_value" text NOT NULL,
	"prompted_at" timestamp DEFAULT now() NOT NULL,
	"user_response" text,
	"review_id" varchar,
	"dismissed_at" timestamp,
	"follow_up_sent" boolean DEFAULT false NOT NULL,
	"follow_up_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "social_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"metrics" json NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_health_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"service_name" text NOT NULL,
	"status" text NOT NULL,
	"uptime" text,
	"response_time" text,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clipper_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"clipper_campaign_id" varchar NOT NULL,
	"event_type" "event_type" NOT NULL,
	"event_value" numeric(10, 2),
	"reward_amount" numeric(10, 2),
	"status" "event_status" DEFAULT 'pending' NOT NULL,
	"metadata" text,
	"user_agent" text,
	"ip_address" text,
	"bot_score" numeric(3, 2) DEFAULT '0.00',
	"flagged_as_bot" boolean DEFAULT false,
	"device_fingerprint" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"broker_id" text NOT NULL,
	"metrics" json NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'clipper' NOT NULL,
	"user_type" "user_type",
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"full_name" text NOT NULL,
	"phone_number" text,
	"mpesa_number" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"social_accounts" json,
	"trading_accounts" json,
	"business_integration" json,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "website_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"website_url" text NOT NULL,
	"metrics" json NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auto_payments" ADD CONSTRAINT "auto_payments_escrow_id_budget_escrow_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."budget_escrow"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_payments" ADD CONSTRAINT "auto_payments_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_payments" ADD CONSTRAINT "auto_payments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_escrow" ADD CONSTRAINT "budget_escrow_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_escrow" ADD CONSTRAINT "budget_escrow_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_campaigns" ADD CONSTRAINT "clipper_campaigns_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_campaigns" ADD CONSTRAINT "clipper_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_reviews" ADD CONSTRAINT "clipper_reviews_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_reviews" ADD CONSTRAINT "clipper_reviews_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_reviews" ADD CONSTRAINT "clipper_reviews_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_reviews" ADD CONSTRAINT "clipper_reviews_clipper_campaign_id_clipper_campaigns_id_fk" FOREIGN KEY ("clipper_campaign_id") REFERENCES "public"."clipper_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipper_stats" ADD CONSTRAINT "clipper_stats_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_clipper_campaign_id_clipper_campaigns_id_fk" FOREIGN KEY ("clipper_campaign_id") REFERENCES "public"."clipper_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personalized_broker_links" ADD CONSTRAINT "personalized_broker_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_reviews" ADD CONSTRAINT "platform_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_reviews" ADD CONSTRAINT "platform_reviews_admin_response_by_users_id_fk" FOREIGN KEY ("admin_response_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_prompts" ADD CONSTRAINT "review_prompts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_prompts" ADD CONSTRAINT "review_prompts_review_id_platform_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."platform_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_metrics" ADD CONSTRAINT "social_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_clipper_campaign_id_clipper_campaigns_id_fk" FOREIGN KEY ("clipper_campaign_id") REFERENCES "public"."clipper_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_metrics" ADD CONSTRAINT "trading_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_metrics" ADD CONSTRAINT "website_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;