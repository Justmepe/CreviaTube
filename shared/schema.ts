import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum, json, real, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["creator", "clipper", "admin"]);
export const accountTypeEnum = pgEnum("account_type", ["influencer", "founder", "business"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "completed", "draft"]);
export const eventTypeEnum = pgEnum("event_type", [
  "click",
  "signup",
  "view",
  "conversion",
  // Phase 3 additions for influencer + founder personas (migration 0013):
  "follow",
  "subscribe",
  "install",
  // Phase 4 — goal-verification v1 (migration 0018):
  //   purchase        — sales/revenue, $ amount in event_value
  //   lead            — qualified-lead form fill (distinct from signup)
  //   code_redemption — promo-code redeemed at checkout
  "purchase",
  "lead",
  "code_redemption",
]);
export const eventStatusEnum = pgEnum("event_status", ["pending", "verified", "paid", "rejected"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);

// Revenue transactions table
export const revenueTransactions = pgTable("revenue_transactions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // Campaign Fee, Subscription, API Access, Transaction Fee
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  date: timestamp("date").notNull(),
  source: text("source").notNull(),
  campaignId: text("campaign_id"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payout records table
export const payoutRecords = pgTable("payout_records", {
  id: text("id").primaryKey(),
  clipperId: text("clipper_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  method: text("method").notNull(), // Bank Transfer, PayPal, M-Pesa, Crypto
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  verification: text("verification"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System health metrics table  
export const systemHealthMetrics = pgTable("system_health_metrics", {
  id: text("id").primaryKey(),
  serviceName: text("service_name").notNull(),
  status: text("status").notNull(), // healthy, warning, error
  uptime: text("uptime"),
  responseTime: text("response_time"),
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  metadata: json("metadata"),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("clipper"),
  accountType: accountTypeEnum("account_type"),
  status: userStatusEnum("status").notNull().default("active"),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  mpesaNumber: text("mpesa_number"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Web3 wallet (lowercase 0x... EVM address). Null until user binds via Reown AppKit.
  walletAddress: varchar("wallet_address", { length: 42 }).unique(),

  // Persona lifecycle stage. Captured at signup; mutable via Settings.
  // Values are constrained at the DB level (see migration 0012):
  //   founder_prelaunch | early_brand | established_brand | solo_creator
  // Resolved into a Persona (see client/src/features/personas/resolver.ts).
  campaignerStage: text("campaigner_stage"),
  // UI bookkeeping: last stage shown to the user. When this drifts from
  // campaignerStage we surface a celebration toast on dashboard load,
  // then sync via POST /api/me/acknowledge-stage.
  lastSeenStage: text("last_seen_stage"),

  // Region targeting (Phase 3.5). country_iso is ISO 3166-1 alpha-2; auto-detected
  // at signup via IP geolocation, may be self-attested. country_verified_at is
  // stamped when verification (login-IP match, phone country code, KYC) succeeds.
  countryIso: varchar("country_iso", { length: 2 }),
  countryVerifiedAt: timestamp("country_verified_at"),

  // KYC scaffold (migration 0015). Today an admin flips kycStatus manually;
  // when we integrate a provider (Persona / Onfido / Sumsub) the same column
  // is driven by their webhooks. Constrained at the DB level to
  // null | pending | approved | rejected.
  kycStatus: text("kyc_status"),
  kycProvider: text("kyc_provider"),
  kycReference: text("kyc_reference"),
  kycUpdatedAt: timestamp("kyc_updated_at"),

  // 2FA (migration 0017). TOTP secret for Authenticator-app users; email
  // OTP hash + expiry for email-based codes (used for password reset,
  // sensitive actions, optional second factor on login).
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  emailOtpHash: text("email_otp_hash"),
  emailOtpExpiresAt: timestamp("email_otp_expires_at"),

  // Social Media Integration. tiktok block extended in Phase 4 to hold
  // OAuth artifacts so view-polling can call the Display API on behalf
  // of the clipper. accessToken expires (24h), refreshToken lasts ~365d
  // — view-polling refreshes lazily before each call.
  socialAccounts: json("social_accounts").$type<{
    instagram?: {
      username: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;             // ISO 8601
      businessAccountId?: string;     // IG Business account id (for Graph API)
      businessAccount?: boolean;
      connectedAt?: string;           // ISO 8601
    };
    tiktok?: {
      username?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;             // ISO 8601 — when accessToken stops working
      refreshExpiresAt?: string;      // ISO 8601 — when re-OAuth is required
      openId?: string;                // TikTok-stable user identifier
      scope?: string;                 // space-separated granted scopes
      connectedAt?: string;           // ISO 8601
    };
    youtube?: { channelId: string; accessToken?: string };
    twitter?: { username: string; accessToken?: string };
    facebook?: { pageId: string; accessToken?: string };
  }>(),
  
  // Website/Business Integration
  businessIntegration: json("business_integration").$type<{
    website?: string;
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    hubspotApiKey?: string;
    conversionGoals?: Array<{
      name: string;
      type: 'form_submission' | 'purchase' | 'signup' | 'download';
      value: number;
    }>;
  }>(),


});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  budgetUsed: decimal("budget_used", { precision: 10, scale: 2 }).notNull().default("0"),
  escrowBalance: decimal("escrow_balance", { precision: 10, scale: 2 }).notNull().default("0"), // 80% held for clippers
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull().default("0"), // 20% platform fee
  fundingStatus: text("funding_status").notNull().default("pending"), // pending, funded, insufficient
  fundedAt: timestamp("funded_at"),
  rewardRates: text("reward_rates").notNull(), // JSON string
  targetPlatforms: text("target_platforms").notNull(), // JSON array
  requirements: text("requirements"),
  duration: integer("duration").notNull().default(30), // campaign duration in days

  // KYC scaffold (migration 0015). When true, only clippers with
  // users.kycStatus='approved' can apply to this campaign. Use for
  // high-budget / regulated-vertical campaigns.
  requiresKyc: boolean("requires_kyc").notNull().default(false),

  campaignGoals: json("campaign_goals").$type<{
    viewsGoal?: number;
    clicksGoal?: number;
    signupsGoal?: number;
    conversionsGoal?: number;
    // Phase 3 — persona-specific goals
    followsGoal?: number;
    subscribesGoal?: number;
    installsGoal?: number;
    // Phase 4 — goal-verification v1.
    //   revenueGoal           — total $ revenue (purchase events, $-valued)
    //   leadsGoal             — qualified-lead form fills
    //   codeRedemptionsGoal   — promo-code redemptions at checkout
    //   ugcVolumeGoal         — count of approved clipper submissions with verified post URLs
    revenueGoal?: number;
    leadsGoal?: number;
    codeRedemptionsGoal?: number;
    ugcVolumeGoal?: number;
    primaryGoal?:
      | 'views'
      | 'clicks'
      | 'signups'
      | 'conversions'
      | 'follows'
      | 'subscribes'
      | 'installs'
      | 'revenue'
      | 'leads'
      | 'code_redemptions'
      | 'ugc_volume';
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Per-campaign integration creds (migration 0018). Holds the configuration
// the campaigner provides so we can ingest conversion signals — server
// postback secret, conversion pixel id, Shopify/Stripe webhook secrets,
// MMP token for app installs. Each goal type uses a different subset, so
// every field is nullable. One row per campaign (unique index on campaign_id).
export const campaignIntegrations = pgTable("campaign_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }).unique(),

  // Generic server postback. We generate postback_secret and reveal it once;
  // the campaigner's backend HMAC-signs incoming conversions with it.
  postbackSecret: text("postback_secret"),

  // Conversion pixel — campaigner embeds <img src="{base}/pixel/{pixelId}?clipper={code}&event=signup"/>
  // on their thank-you page. No secret because pixels are client-side.
  pixelId: text("pixel_id").unique(),

  // Shopify
  shopifyDomain: text("shopify_domain"),
  shopifyWebhookSecret: text("shopify_webhook_secret"),

  // Stripe
  stripeWebhookSecret: text("stripe_webhook_secret"),

  // Mobile Measurement Partner (for app-install goals).
  // Constrained at the DB level to: appsflyer | adjust | firebase.
  mmpProvider: text("mmp_provider"),
  mmpAppId: text("mmp_app_id"),
  mmpApiKey: text("mmp_api_key"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clipper campaigns (many-to-many relationship)
export const clipperCampaigns = pgTable("clipper_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  trackingCode: text("tracking_code").notNull().unique(),
  isApproved: boolean("is_approved").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  
  // Individual clipper campaign completion tracking
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completionMetrics: json("completion_metrics").$type<{
    totalViews?: number;
    totalClicks?: number;
    totalSignups?: number;
    totalConversions?: number;
    goalReached?: {
      type: 'views' | 'clicks' | 'signups' | 'conversions';
      target: number;
      achieved: number;
      reachedAt: string;
    };
  }>(),
  
  // Phase 4 — goal-verification proof fields (migration 0018).
  // postUrl is the live URL of the clipper's post (YouTube/TikTok/IG/X);
  // required for any goal that verifies against the public post (views,
  // engagement, UGC volume). clipperPromoCode is the per-clipper unique
  // short code used for offline / e-commerce attribution — globally
  // unique (partial unique index), looked up by webhook receivers.
  postUrl: text("post_url"),
  clipperPromoCode: text("clipper_promo_code").unique(),

  // Phase 4 — view-polling snapshot (migration 0019). For "views" goals
  // we periodically hit the post_url's platform API; lastViewCount is
  // the cumulative count we last observed, lastViewPolledAt the time we
  // observed it. We credit (current - lastViewCount) as new view events
  // and roll the snapshot forward.
  lastViewCount: integer("last_view_count").notNull().default(0),
  lastViewPolledAt: timestamp("last_view_polled_at"),

  // UGC Content Submission for AI Detection
  submittedContent: text("submitted_content"), // The actual content submitted by clipper
  contentType: text("content_type"), // text, video, image, audio
  contentDescription: text("content_description"), // Description of the content
  aiDetectionResult: json("ai_detection_result").$type<{
    isAIGenerated: boolean;
    confidence: number;
    flags: string[];
    analysis: {
      textPatterns: number;
      repetitiveStructure: number;
      vocabularyComplexity: number;
      naturalFlow: number;
      personalTone: number;
    };
    recommendation: 'approve' | 'review' | 'reject';
  }>(),
  aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }), // AI confidence score (0-1)
  aiFlags: json("ai_flags").$type<string[]>(), // Array of AI detection flags
  applicationStatus: text("application_status").default("content_pending"), // content_pending, ai_scanning, creator_review, approved, rejected, ai_flagged
  creatorReviewNotes: text("creator_review_notes"), // Creator's review notes
  rejectionReason: text("rejection_reason"), // Reason for rejection (legacy freeform)
  // Phase 5 — structured rejection reason. Closed vocabulary, mirrored in
  // shared/rejection-reasons.ts. Lets us aggregate "why are clippers
  // getting rejected on average" for the reputation system. The freeform
  // rejectionReason / creatorReviewNotes still apply for nuance.
  rejectionReasonCode: text("rejection_reason_code"),
  // Phase 5 — media submission via URL. submissionKind ∈ ('text', 'url')
  // (CHECK in migration 0022); null on legacy rows is treated as 'text'.
  // URL path skips AI detection and lands directly in creator_review;
  // review surface embeds the URL in a player when the host is known.
  submissionUrl: text("submission_url"),
  submissionKind: text("submission_kind"),
  reviewedAt: timestamp("reviewed_at"), // When creator reviewed the application
});

// Tracking events
export const trackingEvents = pgTable("tracking_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  clipperCampaignId: varchar("clipper_campaign_id").notNull().references(() => clipperCampaigns.id),
  eventType: eventTypeEnum("event_type").notNull(),
  eventValue: decimal("event_value", { precision: 10, scale: 2 }),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }),
  status: eventStatusEnum("status").notNull().default("pending"),
  metadata: text("metadata"), // JSON string for additional data
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  // Bot detection fields
  botScore: decimal("bot_score", { precision: 3, scale: 2 }).default("0.00"),
  flaggedAsBot: boolean("flagged_as_bot").default(false),
  deviceFingerprint: text("device_fingerprint"), // JSON string for device info
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clipper ratings and reviews table
export const clipperReviews = pgTable("clipper_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  clipperCampaignId: varchar("clipper_campaign_id").notNull().references(() => clipperCampaigns.id),
  
  // Rating scores (1-5 stars)
  overallRating: decimal("overall_rating", { precision: 2, scale: 1 }).notNull(), // 1.0 to 5.0
  qualityRating: decimal("quality_rating", { precision: 2, scale: 1 }).notNull(), // Content quality
  communicationRating: decimal("communication_rating", { precision: 2, scale: 1 }).notNull(), // Communication
  timeliness: decimal("timeliness", { precision: 2, scale: 1 }).notNull(), // Meeting deadlines
  creativity: decimal("creativity", { precision: 2, scale: 1 }).notNull(), // Creative approach
  professionalism: decimal("professionalism", { precision: 2, scale: 1 }).notNull(), // Professional behavior
  
  // Written review
  reviewTitle: text("review_title").notNull(),
  reviewText: text("review_text").notNull(),
  
  // Performance metrics at time of review
  metricsAchieved: json("metrics_achieved").$type<{
    views: number;
    clicks: number;
    signups: number;
    deposits: number;
    trades: number;
    conversions: number;
    goalCompleted: boolean;
    completionPercentage: number;
  }>(),
  
  // Creator recommendations
  wouldHireAgain: boolean("would_hire_again").notNull(),
  recommendToOthers: boolean("recommend_to_others").notNull(),
  
  // Review tags for filtering
  tags: json("tags").$type<string[]>(), // ["reliable", "creative", "fast", "poor-communication", etc.]
  
  // Response from clipper
  clipperResponse: text("clipper_response"),
  clipperRespondedAt: timestamp("clipper_responded_at"),
  
  // Verification
  isVerified: boolean("is_verified").notNull().default(true), // Reviews from completed campaigns are auto-verified
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clipper profile stats (aggregated from reviews and performance)
// Phase 5 — per (creator, clipper) trust state. One row per pair.
// Maintained by the review-application path (upserts on every approve)
// and by the trust-CRUD endpoints (creator toggles auto_approve and
// tunes the threshold). Read by the apply handler to decide whether
// to skip creator_review on a new application.
export const creatorClipperTrust = pgTable("creator_clipper_trust", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clipperId: varchar("clipper_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  approvedCount: integer("approved_count").notNull().default(0),

  // Per-creator threshold for the "Trust" toggle to appear in the UI.
  // Default 5; tunable per-pair so each creator picks their own bar.
  autoApproveThreshold: integer("auto_approve_threshold").notNull().default(5),

  // The toggle. When true, future applications from this clipper to
  // this creator's campaigns skip creator_review and land directly
  // in 'approved'.
  autoApprove: boolean("auto_approve").notNull().default(false),

  lastApprovedAt: timestamp("last_approved_at"),

  // Set the first time auto_approve fires for this pair so we send
  // the celebratory "you're trusted" email exactly once. Subsequent
  // auto-approvals get the standard application_approved email.
  firstAutoApproveNotifiedAt: timestamp("first_auto_approve_notified_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  pairUnique: unique("creator_clipper_trust_pair_unique").on(table.creatorId, table.clipperId),
}));

export const clipperStats = pgTable("clipper_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipperId: varchar("clipper_id").notNull().references(() => users.id).unique(),
  
  // Overall ratings (averages)
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).notNull().default("0.0"),
  totalReviews: integer("total_reviews").notNull().default(0),
  
  // Individual rating breakdowns
  qualityAverage: decimal("quality_average", { precision: 2, scale: 1 }).notNull().default("0.0"),
  communicationAverage: decimal("communication_average", { precision: 2, scale: 1 }).notNull().default("0.0"),
  timelinessAverage: decimal("timeliness_average", { precision: 2, scale: 1 }).notNull().default("0.0"),
  creativityAverage: decimal("creativity_average", { precision: 2, scale: 1 }).notNull().default("0.0"),
  professionalismAverage: decimal("professionalism_average", { precision: 2, scale: 1 }).notNull().default("0.0"),
  
  // Performance metrics
  totalCampaignsCompleted: integer("total_campaigns_completed").notNull().default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).notNull().default("0.00"), // Percentage of goals achieved
  averageCompletionTime: integer("average_completion_time").notNull().default(0), // Days
  
  // Engagement metrics
  totalViewsGenerated: integer("total_views_generated").notNull().default(0),
  totalClicksGenerated: integer("total_clicks_generated").notNull().default(0),
  totalSignupsGenerated: integer("total_signups_generated").notNull().default(0),
  totalDepositsGenerated: integer("total_deposits_generated").notNull().default(0),
  totalTradesGenerated: integer("total_trades_generated").notNull().default(0),
  totalConversionsGenerated: integer("total_conversions_generated").notNull().default(0),
  
  // Reputation metrics
  positiveRecommendations: integer("positive_recommendations").notNull().default(0), // Would hire again count
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }).notNull().default("0.00"), // Response to messages %
  
  // Platform rankings
  rankingScore: decimal("ranking_score", { precision: 8, scale: 2 }).notNull().default("0.00"), // Weighted ranking
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold, platinum, diamond
  
  // Activity tracking
  lastActiveAt: timestamp("last_active_at"),
  isActive: boolean("is_active").notNull().default(true),
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payouts table
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  // Legacy fiat fields (kept nullable for backwards-compat with old PesaPal records)
  mpesaNumber: text("mpesa_number"),
  mpesaTransactionId: text("mpesa_transaction_id"),
  // Web3 fields (Phase 2e)
  recipientAddress: varchar("recipient_address", { length: 42 }),
  txHash: varchar("tx_hash", { length: 66 }).unique(),
  failureReason: text("failure_reason"),
  status: payoutStatusEnum("status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Social Media Metrics table
export const socialMetrics = pgTable("social_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // instagram, tiktok, youtube, twitter, facebook
  metrics: json("metrics").$type<{
    followers?: number;
    following?: number;
    posts?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    engagementRate?: number;
    // Platform-specific metrics
    subscribers?: number; // YouTube
    watchTime?: number; // YouTube  
    impressions?: number; // Twitter/Instagram
    reach?: number; // Instagram/Facebook
    stories?: number; // Instagram
    reels?: number; // Instagram
  }>().notNull(),
  lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Platform Reviews table - Users rating CreviaTube platform itself
export const platformReviews = pgTable("platform_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Overall platform rating
  overallRating: decimal("overall_rating", { precision: 2, scale: 1 }).notNull(), // 1.0 to 5.0
  
  // Category-specific ratings
  easeOfUse: decimal("ease_of_use", { precision: 2, scale: 1 }).notNull(),
  paymentReliability: decimal("payment_reliability", { precision: 2, scale: 1 }).notNull(),
  campaignQuality: decimal("campaign_quality", { precision: 2, scale: 1 }).notNull(), // For clippers
  clipperQuality: decimal("clipper_quality", { precision: 2, scale: 1 }), // For creators
  customerSupport: decimal("customer_support", { precision: 2, scale: 1 }).notNull(),
  platformFeatures: decimal("platform_features", { precision: 2, scale: 1 }).notNull(),
  
  // Written review
  reviewTitle: text("review_title").notNull(),
  reviewText: text("review_text").notNull(),
  
  // Review context - what triggered this review
  reviewTrigger: text("review_trigger").notNull(), // first_payout, milestone_reached, campaign_completed, voluntary, exit_survey
  userExperience: json("user_experience").$type<{
    daysSinceJoined: number;
    campaignsCompleted: number;
    totalEarnings: number;
    payoutsReceived: number;
    userRole: 'creator' | 'clipper';
    accountType?: string;
  }>(),
  
  // Improvement suggestions
  improvementSuggestions: text("improvement_suggestions"),
  featuresRequested: json("features_requested").$type<string[]>(),
  
  // NPS Score
  npsScore: integer("nps_score").notNull(), // 0-10 (Net Promoter Score)
  wouldRecommend: boolean("would_recommend").notNull(),
  
  // Review status and moderation
  status: text("status").notNull().default("published"), // published, pending, hidden
  isVerified: boolean("is_verified").notNull().default(true), // Auto-verified for active users
  moderationNotes: text("moderation_notes"),
  
  // Response from CreviaTube team
  adminResponse: text("admin_response"),
  adminRespondedAt: timestamp("admin_responded_at"),
  adminResponseBy: varchar("admin_response_by").references(() => users.id),
  
  // Helpful votes from other users
  helpfulVotes: integer("helpful_votes").notNull().default(0),
  totalVotes: integer("total_votes").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Review prompts tracking - when users were prompted to review
export const reviewPrompts = pgTable("review_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  triggerType: text("trigger_type").notNull(), // first_payout, earnings_milestone, campaign_milestone, time_milestone
  triggerValue: text("trigger_value").notNull(), // The milestone value (e.g., "$100", "30_days", "5_campaigns")
  promptedAt: timestamp("prompted_at").defaultNow().notNull(),
  
  // User response to prompt
  userResponse: text("user_response"), // reviewed, dismissed, later
  reviewId: varchar("review_id").references(() => platformReviews.id), // If they left a review
  dismissedAt: timestamp("dismissed_at"),
  
  // Follow-up tracking
  followUpSent: boolean("follow_up_sent").notNull().default(false),
  followUpAt: timestamp("follow_up_at"),
});

// Website Analytics table
export const websiteMetrics = pgTable("website_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  websiteUrl: text("website_url").notNull(),
  metrics: json("metrics").$type<{
    pageViews?: number;
    uniqueVisitors?: number;
    sessions?: number;
    bounceRate?: number;
    avgSessionDuration?: number;
    conversions?: number;
    conversionRate?: number;
    leads?: number;
    purchases?: number;
    revenue?: number;
  }>().notNull(),
  lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  clipperCampaigns: many(clipperCampaigns),
  trackingEvents: many(trackingEvents),
  payouts: many(payouts),
  socialMetrics: many(socialMetrics),
  websiteMetrics: many(websiteMetrics),
  clipperReviewsAsClippper: many(clipperReviews, { relationName: "clipperReviews" }),
  clipperReviewsAsCreator: many(clipperReviews, { relationName: "creatorReviews" }),
  clipperStats: many(clipperStats),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [campaigns.creatorId],
    references: [users.id],
  }),
  clipperCampaigns: many(clipperCampaigns),
  trackingEvents: many(trackingEvents),
  clipperReviews: many(clipperReviews),
  integration: one(campaignIntegrations, {
    fields: [campaigns.id],
    references: [campaignIntegrations.campaignId],
  }),
}));

export const campaignIntegrationsRelations = relations(campaignIntegrations, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignIntegrations.campaignId],
    references: [campaigns.id],
  }),
}));

export const clipperCampaignsRelations = relations(clipperCampaigns, ({ one, many }) => ({
  clipper: one(users, {
    fields: [clipperCampaigns.clipperId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [clipperCampaigns.campaignId],
    references: [campaigns.id],
  }),
  trackingEvents: many(trackingEvents),
  clipperReviews: many(clipperReviews),
}));

// Clipper reviews relations
export const clipperReviewsRelations = relations(clipperReviews, ({ one }) => ({
  clipper: one(users, {
    fields: [clipperReviews.clipperId],
    references: [users.id],
    relationName: "clipperReviews",
  }),
  creator: one(users, {
    fields: [clipperReviews.creatorId],
    references: [users.id],
    relationName: "creatorReviews",
  }),
  campaign: one(campaigns, {
    fields: [clipperReviews.campaignId],
    references: [campaigns.id],
  }),
  clipperCampaign: one(clipperCampaigns, {
    fields: [clipperReviews.clipperCampaignId],
    references: [clipperCampaigns.id],
  }),
}));

// Clipper stats relations  
export const clipperStatsRelations = relations(clipperStats, ({ one }) => ({
  clipper: one(users, {
    fields: [clipperStats.clipperId],
    references: [users.id],
  }),
}));

export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  clipper: one(users, {
    fields: [trackingEvents.clipperId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [trackingEvents.campaignId],
    references: [campaigns.id],
  }),
  clipperCampaign: one(clipperCampaigns, {
    fields: [trackingEvents.clipperCampaignId],
    references: [clipperCampaigns.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  clipper: one(users, {
    fields: [payouts.clipperId],
    references: [users.id],
  }),
}));

export const socialMetricsRelations = relations(socialMetrics, ({ one }) => ({
  user: one(users, {
    fields: [socialMetrics.userId],
    references: [users.id],
  }),
}));

export const websiteMetricsRelations = relations(websiteMetrics, ({ one }) => ({
  user: one(users, {
    fields: [websiteMetrics.userId],
    references: [users.id],
  }),
}));

// Insert schemas
// SECURITY — omit columns a public signup must never set itself.
// `role`, `status`, `isActive`, `emailVerified`, `kycStatus`,
// `kycProvider`, and `walletAddress` are all privileged state; the
// previous schema let any client send them, which combined with the
// spread-from-body pattern in /api/register meant anyone could mint
// an admin account. The seed script (scripts/seed-admin.ts)
// bypasses this schema and inserts directly via Drizzle when
// minting platform admins. `countryVerifiedAt` stays in the schema
// because the signup handler legitimately sets it server-side
// (phone-country match); the register endpoint destructures req.body
// explicitly so the client still can't sneak it in.
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  status: true,
  isActive: true,
  emailVerified: true,
  kycStatus: true,
  kycProvider: true,
  walletAddress: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  budgetUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignIntegrationSchema = createInsertSchema(campaignIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreatorClipperTrustSchema = createInsertSchema(creatorClipperTrust).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClipperCampaignSchema = createInsertSchema(clipperCampaigns).omit({
  id: true,
  joinedAt: true,
});

export const insertTrackingEventSchema = createInsertSchema(trackingEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  processedAt: true,
  createdAt: true,
}).extend({
  amount: z.number().min(10, "Minimum payout is $10"),
  paymentMethod: z.enum([
    "mobile_money", 
    "bank_transfer", 
    "paypal", 
    "crypto", 
    "wise_transfer",
    "rapyd_bank",
    "rapyd_card",
    "rapyd_cash"
  ]),
});

// Clipper review insert schema
export const insertClipperReviewSchema = createInsertSchema(clipperReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  clipperRespondedAt: true,
}).extend({
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  timeliness: z.number().min(1).max(5),
  creativity: z.number().min(1).max(5),
  professionalism: z.number().min(1).max(5),
  reviewTitle: z.string().min(5, "Title must be at least 5 characters").max(100, "Title too long"),
  reviewText: z.string().min(20, "Review must be at least 20 characters").max(1000, "Review too long"),
});

// Clipper stats insert schema
export const insertClipperStatsSchema = createInsertSchema(clipperStats).omit({
  id: true,
  updatedAt: true,
});

// Types
// Budget escrow transactions table  
export const budgetEscrow = pgTable("budget_escrow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  escrowAmount: decimal("escrow_amount", { precision: 10, scale: 2 }).notNull(),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull(),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull(),
  lockedBalance: decimal("locked_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  status: text("status").notNull().default("active"),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id"),
  isLocked: boolean("is_locked").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auto-payment transactions for clippers
export const autoPayments = pgTable("auto_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escrowId: varchar("escrow_id").notNull().references(() => budgetEscrow.id),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),  
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  eventId: varchar("event_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentDetails: text("payment_details"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type ClipperCampaign = typeof clipperCampaigns.$inferSelect;
export type InsertClipperCampaign = z.infer<typeof insertClipperCampaignSchema>;
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type BudgetEscrow = typeof budgetEscrow.$inferSelect;
export type AutoPayment = typeof autoPayments.$inferSelect;
export type CampaignIntegration = typeof campaignIntegrations.$inferSelect;
export type InsertCampaignIntegration = z.infer<typeof insertCampaignIntegrationSchema>;
export type CreatorClipperTrust = typeof creatorClipperTrust.$inferSelect;
export type InsertCreatorClipperTrust = z.infer<typeof insertCreatorClipperTrustSchema>;

// New review system types
export type ClipperReview = typeof clipperReviews.$inferSelect;
export type InsertClipperReview = z.infer<typeof insertClipperReviewSchema>;
export type ClipperStats = typeof clipperStats.$inferSelect;
export type InsertClipperStats = z.infer<typeof insertClipperStatsSchema>;

// Insert schemas for new tables
export const insertRevenueTransactionSchema = createInsertSchema(revenueTransactions).omit({
  createdAt: true,
});

export const insertPayoutRecordSchema = createInsertSchema(payoutRecords).omit({
  createdAt: true,
});

export const insertSystemHealthMetricSchema = createInsertSchema(systemHealthMetrics).omit({
  lastChecked: true,
});

export type RevenueTransaction = typeof revenueTransactions.$inferSelect;
export type InsertRevenueTransaction = z.infer<typeof insertRevenueTransactionSchema>;
export type PayoutRecord = typeof payoutRecords.$inferSelect;
export type InsertPayoutRecord = z.infer<typeof insertPayoutRecordSchema>;
export type SystemHealthMetric = typeof systemHealthMetrics.$inferSelect;
export type InsertSystemHealthMetric = z.infer<typeof insertSystemHealthMetricSchema>;

// Platform Reviews schemas
export const insertPlatformReviewSchema = createInsertSchema(platformReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  helpfulVotes: true,
  totalVotes: true,
  status: true,
  isVerified: true,
}).extend({
  overallRating: z.number().min(1).max(5),
  easeOfUse: z.number().min(1).max(5),
  paymentReliability: z.number().min(1).max(5),
  campaignQuality: z.number().min(1).max(5),
  clipperQuality: z.number().min(1).max(5).optional(),
  customerSupport: z.number().min(1).max(5),
  platformFeatures: z.number().min(1).max(5),
  npsScore: z.number().min(0).max(10),
  reviewTitle: z.string().min(5).max(100),
  reviewText: z.string().min(20).max(2000),
});

export type InsertPlatformReview = z.infer<typeof insertPlatformReviewSchema>;
export type SelectPlatformReview = typeof platformReviews.$inferSelect;

export const insertReviewPromptSchema = createInsertSchema(reviewPrompts).omit({
  id: true,
  promptedAt: true,
});

export type InsertReviewPrompt = z.infer<typeof insertReviewPromptSchema>;
export type SelectReviewPrompt = typeof reviewPrompts.$inferSelect;

// Geographic data table for analytics
export const geographicData = pgTable("geographic_data", {
  id: text("id").primaryKey(),
  country: text("country").notNull(),
  region: text("region"),
  city: text("city"),
  users: integer("users").notNull().default(0),
  campaigns: integer("campaigns").notNull().default(0),
  revenue: integer("revenue").notNull().default(0), // in cents
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  period: text("period").notNull(), // daily, weekly, monthly
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Industry benchmarks table
export const industryBenchmarks = pgTable("industry_benchmarks", {
  id: text("id").primaryKey(),
  category: text("category").notNull(), // conversion_rates, engagement_rates, revenue_metrics, user_retention
  metric: text("metric").notNull(),
  value: real("value").notNull(),
  unit: text("unit"), // percentage, number, currency
  source: text("source"), // industry_average, platform_data, external_research
  period: text("period").notNull(), // monthly, quarterly, yearly
  date: timestamp("date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform features table
export const platformFeatures = pgTable("platform_features", {
  id: text("id").primaryKey(),
  icon: text("icon").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // core, advanced, enterprise
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Supported platforms table
export const supportedPlatforms = pgTable("supported_platforms", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull(), // social, professional, messaging, web
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Supported countries table
export const supportedCountries = pgTable("supported_countries", {
  id: text("id").primaryKey(),
  value: text("value").notNull(), // ISO country code
  label: text("label").notNull(),
  region: text("region"),
  currency: text("currency"),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Supported languages table
export const supportedLanguages = pgTable("supported_languages", {
  id: text("id").primaryKey(),
  value: text("value").notNull(), // ISO language code
  label: text("label").notNull(),
  nativeName: text("native_name"),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Static pages content table
export const staticPages = pgTable("static_pages", {
  id: text("id").primaryKey(),
  page: text("page").notNull(), // help-center, privacy-policy, terms-of-service, etc.
  title: text("title").notNull(),
  content: json("content").notNull(), // JSON structure for page content
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform events table
export const platformEvents = pgTable("platform_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  time: text("time"),
  location: text("location"),
  type: text("type").notNull(), // conference, webinar, workshop, meetup, launch
  attendees: text("attendees"),
  topics: json("topics"), // JSON array of topics
  registrationOpen: boolean("registration_open").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Metric events — one row per significant platform action (signup,
// campaign_funded, stage_promoted, payout_settled, etc.). Powers in-app
// counters + ad-hoc analytics queries until we stand up a real metrics
// pipe. See backend/lib/metrics.ts for the writer.
export const metricEvents = pgTable("metric_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventName: text("event_name").notNull(),
  userId: varchar("user_id").references(() => users.id),
  props: json("props"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contact information table
export const contactInfo = pgTable("contact_info", {
  id: text("id").primaryKey(),
  department: text("department").notNull(), // support, business, press, technical
  title: text("title").notNull(),
  email: text("email").notNull(),
  description: text("description"),
  hours: text("hours"),
  response: text("response"),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Career positions table
export const careerPositions = pgTable("career_positions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(), // full-time, part-time, contract, internship
  description: text("description").notNull(),
  skills: json("skills"), // JSON array of skills
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Community guidelines table
export const communityGuidelines = pgTable("community_guidelines", {
  id: text("id").primaryKey(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rules: json("rules"), // JSON array of rules
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Payments (Phase 2b) ---
// On-chain USDC payment intents. Created when the user opens the PaymentModal
// (status=pending, 15-min TTL); transitions to paid when the on-chain Transfer is verified.
export const paymentIntents = pgTable("payment_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // 'subscription' | 'campaign_funding'
  pathway: text("pathway").notNull().default("usdc_direct"), // 'usdc_direct' | 'nexapay'
  referenceId: text("reference_id"), // campaign_id (kind=campaign_funding) or plan id (kind=subscription)
  expectedUsdcUnits: text("expected_usdc_units").notNull(), // bigint as string (USDC has 6 decimals)
  senderAddress: varchar("sender_address", { length: 42 }),
  receiveAddress: varchar("receive_address", { length: 42 }).notNull(),
  nexapayOrderId: text("nexapay_order_id"),
  txHash: varchar("tx_hash", { length: 66 }).unique(),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  lastPaymentIntentId: varchar("last_payment_intent_id").references(() => paymentIntents.id),
  // Stamped after we send the T-3 expiry warning email; reset on every renewal
  // (when currentPeriodEnd advances) so each cycle gets at most one notification.
  notifiedExpiryAt: timestamp("notified_expiry_at"),
  // Phase 6 Slice D — 30-day money-back guarantee state. Snapshotted
  // at first activation; the evaluator sweep at day 30 compares
  // current application counts to the baseline and fires a refund if
  // lift is insufficient. See migration 0024 for the full rules.
  baselineApplicationCount: integer("baseline_application_count"),
  baselineSnapshottedAt: timestamp("baseline_snapshotted_at"),
  guaranteeEvaluatedAt: timestamp("guarantee_evaluated_at"),
  guaranteeTriggered: boolean("guarantee_triggered").notNull().default(false),
  refundTxHash: text("refund_tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

// Phase 6 Slice C — Founding Creator seat cap. Pre-seeded with 50
// empty rows in migration 0023; rows get stamped (user_id +
// claimed_at) atomically at subscription activation. A user can
// only hold one seat (unique partial index on user_id).
export const foundingSeats = pgTable("founding_seats", {
  id: integer("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
});
export type FoundingSeat = typeof foundingSeats.$inferSelect;

// --- Email infrastructure ---
// Single-use tokens for email verification (and later: password reset etc).
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One row per outbound email. dedupeKey allows callers to no-op on duplicate sends
// (e.g., if /api/payments/verify fires twice for the same intent we still send only once).
export const emailLog = pgTable("email_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  kind: text("kind").notNull(),                              // 'welcome_verification' | 'subscription_paid' | ...
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  dedupeKey: varchar("dedupe_key", { length: 128 }).unique(), // null = always send
  resendId: text("resend_id"),                               // Resend's message id for webhook correlation
  status: text("status").notNull().default("queued"),        // queued | sent | failed | skipped
  error: text("error"),
  metadata: json("metadata"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type EmailLogEntry = typeof emailLog.$inferSelect;

// Single-use password reset tokens. 1-hour TTL.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Insert schemas for new tables
export const insertGeographicDataSchema = createInsertSchema(geographicData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndustryBenchmarkSchema = createInsertSchema(industryBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformFeatureSchema = createInsertSchema(platformFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportedPlatformSchema = createInsertSchema(supportedPlatforms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportedCountrySchema = createInsertSchema(supportedCountries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportedLanguageSchema = createInsertSchema(supportedLanguages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaticPageSchema = createInsertSchema(staticPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformEventSchema = createInsertSchema(platformEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactInfoSchema = createInsertSchema(contactInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareerPositionSchema = createInsertSchema(careerPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityGuidelineSchema = createInsertSchema(communityGuidelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for new tables
export type GeographicData = typeof geographicData.$inferSelect;
export type InsertGeographicData = z.infer<typeof insertGeographicDataSchema>;
export type IndustryBenchmark = typeof industryBenchmarks.$inferSelect;
export type InsertIndustryBenchmark = z.infer<typeof insertIndustryBenchmarkSchema>;
export type PlatformFeature = typeof platformFeatures.$inferSelect;
export type InsertPlatformFeature = z.infer<typeof insertPlatformFeatureSchema>;
export type SupportedPlatform = typeof supportedPlatforms.$inferSelect;
export type InsertSupportedPlatform = z.infer<typeof insertSupportedPlatformSchema>;
export type SupportedCountry = typeof supportedCountries.$inferSelect;
export type InsertSupportedCountry = z.infer<typeof insertSupportedCountrySchema>;
export type SupportedLanguage = typeof supportedLanguages.$inferSelect;
export type InsertSupportedLanguage = z.infer<typeof insertSupportedLanguageSchema>;
export type StaticPage = typeof staticPages.$inferSelect;
export type InsertStaticPage = z.infer<typeof insertStaticPageSchema>;
export type PlatformEvent = typeof platformEvents.$inferSelect;
export type InsertPlatformEvent = z.infer<typeof insertPlatformEventSchema>;
export type ContactInfo = typeof contactInfo.$inferSelect;
export type InsertContactInfo = z.infer<typeof insertContactInfoSchema>;
export type CareerPosition = typeof careerPositions.$inferSelect;
export type InsertCareerPosition = z.infer<typeof insertCareerPositionSchema>;
export type CommunityGuideline = typeof communityGuidelines.$inferSelect;
export type InsertCommunityGuideline = z.infer<typeof insertCommunityGuidelineSchema>;
