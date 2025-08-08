import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum, json, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["creator", "clipper", "admin"]);
export const userTypeEnum = pgEnum("user_type", ["trader_creator", "influencer", "entrepreneur", "enterprise"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "completed", "draft"]);
export const campaignTypeEnum = pgEnum("campaign_type", ["content_promotion", "cold_outreach"]);
export const eventTypeEnum = pgEnum("event_type", ["click", "signup", "deposit", "trade", "view", "conversion", "outreach_contact", "outreach_response"]);
export const eventStatusEnum = pgEnum("event_status", ["pending", "verified", "paid", "rejected"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);
export const brokerTypeEnum = pgEnum("broker_type", ["forex", "crypto", "stocks", "futures", "options", "cfds"]);

// Users table
// Broker affiliate programs table
export const brokerPrograms = pgTable("broker_programs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  signupBonus: integer("signup_bonus").notNull().default(0),
  depositBonus: integer("deposit_bonus").notNull().default(0),
  volumeRate: real("volume_rate").notNull().default(0),
  description: text("description"),
  baseAffiliateLink: text("base_affiliate_link").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  region: text("region").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Enterprise contact requests table
export const enterpriseRequests = pgTable("enterprise_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  companyName: text("company_name").notNull(),
  companySize: text("company_size").notNull(),
  requestType: text("request_type").notNull(), // pricing, demo, technical, custom_setup, other
  message: text("message").notNull(),
  preferredMeetingTime: text("preferred_meeting_time").notNull(),
  urgency: text("urgency").notNull(), // low, medium, high, urgent
  status: text("status").notNull().default("pending"), // pending, contacted, in_progress, completed
  assignedTo: text("assigned_to"), // admin user id
  meetingScheduled: boolean("meeting_scheduled").default(false),
  meetingDate: timestamp("meeting_date"),
  meetingTime: text("meeting_time"),
  meetingNotes: text("meeting_notes"),
  meetingType: text("meeting_type"), // zoom, google_meet, teams, phone
  meetingLink: text("meeting_link"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin notifications table
export const adminNotifications = pgTable("admin_notifications", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // enterprise_contact, system_alert, user_issue, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: json("data"), // Additional structured data
  read: boolean("read").default(false),
  urgent: boolean("urgent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

// Enterprise accounts table for white-label clients
export const enterpriseAccounts = pgTable("enterprise_accounts", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(), // reference to enterprise_requests
  userId: text("user_id").notNull(), // main contact user ID
  companyName: text("company_name").notNull(),
  customDomain: text("custom_domain"), // e.g., partner.creocash.com
  brandingConfig: json("branding_config").$type<{
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
    companyName?: string;
  }>(),
  pricingConfig: json("pricing_config").$type<{
    commissionRate: number; // e.g., 0.15 for 15%
    payoutThreshold: number; // minimum payout amount
    customRates?: { [key: string]: number }; // per campaign type
  }>(),
  features: json("features").$type<{
    whiteLabel: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    customDomains: boolean;
    prioritySupport: boolean;
    dedicatedManager: boolean;
  }>(),
  status: text("status").notNull().default("setup"), // setup, active, suspended, cancelled
  activatedAt: timestamp("activated_at"),
  billingCycle: text("billing_cycle"), // monthly, quarterly, yearly
  contractDetails: json("contract_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("clipper"),
  userType: userTypeEnum("user_type"),
  status: userStatusEnum("status").notNull().default("active"),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  mpesaNumber: text("mpesa_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Social Media Integration
  socialAccounts: json("social_accounts").$type<{
    instagram?: { username: string; accessToken?: string; businessAccount?: boolean };
    tiktok?: { username: string; accessToken?: string };
    youtube?: { channelId: string; accessToken?: string };
    twitter?: { username: string; accessToken?: string };
    facebook?: { pageId: string; accessToken?: string };
  }>(),
  
  // Trading Integration  
  tradingAccounts: json("trading_accounts").$type<{
    brokers?: Array<{
      name: string;
      accountId: string;
      apiKey?: string;
      platform?: 'mt4' | 'mt5' | 'ctrader' | 'proprietary';
    }>;
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
  
  // Campaign type and goals for individual clipper completion
  campaignType: text("campaign_type").notNull().default("content_promotion"), // content_promotion, cold_outreach
  campaignGoals: json("campaign_goals").$type<{
    viewsGoal?: number;
    clicksGoal?: number;
    signupsGoal?: number;
    depositsGoal?: number;
    tradesGoal?: number;
    conversionsGoal?: number;
    outreachContactsGoal?: number; // For cold outreach campaigns
    outreachResponsesGoal?: number; // For cold outreach campaigns
    primaryGoal?: 'views' | 'clicks' | 'signups' | 'deposits' | 'trades' | 'conversions' | 'outreach_contacts' | 'outreach_responses';
  }>(),
  
  // Cold outreach specific configuration
  outreachConfig: json("outreach_config").$type<{
    type?: 'email' | 'linkedin' | 'phone' | 'instagram_dm' | 'twitter_dm' | 'mixed';
    targetAudience?: string;
    messageTemplate?: string;
    targetIndustries?: string[];
    targetJobTitles?: string[];
    responseRequirements?: string;
    complianceNotes?: string;
    premiumCommissionRate?: number; // Higher rate for outreach (e.g., 0.25-0.30)
  }>(),
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
    totalDeposits?: number;
    totalTrades?: number;
    totalConversions?: number;
    totalOutreachContacts?: number; // For cold outreach campaigns
    totalOutreachResponses?: number; // For cold outreach campaigns
    goalReached?: {
      type: 'views' | 'clicks' | 'signups' | 'deposits' | 'trades' | 'conversions' | 'outreach_contacts' | 'outreach_responses';
      target: number;
      achieved: number;
      reachedAt: string;
    };
  }>(),
  
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
  rejectionReason: text("rejection_reason"), // Reason for rejection
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

// Cold outreach tracking table for business campaigns
export const outreachContacts = pgTable("outreach_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clipperId: varchar("clipper_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  clipperCampaignId: varchar("clipper_campaign_id").notNull().references(() => clipperCampaigns.id),
  
  // Contact details
  contactMethod: text("contact_method").notNull(), // email, linkedin, phone, instagram_dm, twitter_dm
  contactTarget: text("contact_target").notNull(), // email address, linkedin profile, phone number, etc.
  contactName: text("contact_name"), // Name of the person contacted
  contactCompany: text("contact_company"), // Company they work for
  contactJobTitle: text("contact_job_title"), // Their job title
  
  // Outreach content
  messageSubject: text("message_subject"),
  messageContent: text("message_content").notNull(),
  
  // Response tracking
  hasResponse: boolean("has_response").notNull().default(false),
  responseContent: text("response_content"), // Response received
  responseAt: timestamp("response_at"),
  leadQuality: text("lead_quality"), // hot, warm, cold, no_interest
  
  // Reward calculation
  contactReward: decimal("contact_reward", { precision: 10, scale: 2 }), // Payment for making contact
  responseReward: decimal("response_reward", { precision: 10, scale: 2 }), // Bonus for getting response
  
  // Compliance and verification
  isVerified: boolean("is_verified").notNull().default(false),
  verificationProof: text("verification_proof"), // Screenshot or proof of outreach
  complianceNotes: text("compliance_notes"), // GDPR, CAN-SPAM compliance notes
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  mpesaNumber: text("mpesa_number").notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  mpesaTransactionId: text("mpesa_transaction_id"),
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

// Trading Metrics table
export const tradingMetrics = pgTable("trading_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  brokerId: text("broker_id").notNull(),
  metrics: json("metrics").$type<{
    totalDeposits?: number;
    totalWithdrawals?: number;
    totalTrades?: number;
    profitLoss?: number;
    winRate?: number;
    activeClients?: number;
    referredUsers?: number;
    accountBalance?: number;
    tradingVolume?: number;
  }>().notNull(),
  lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Platform Reviews table - Users rating CreoCash platform itself
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
    userType?: string;
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
  
  // Response from CreoCash team
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
  tradingMetrics: many(tradingMetrics),
  websiteMetrics: many(websiteMetrics),
  personalizedBrokerLinks: many(personalizedBrokerLinks),
  clipperReviewsAsClippper: many(clipperReviews, { relationName: "clipperReviews" }),
  clipperReviewsAsCreator: many(clipperReviews, { relationName: "creatorReviews" }),
  clipperStats: many(clipperStats),
  outreachContacts: many(outreachContacts),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [campaigns.creatorId],
    references: [users.id],
  }),
  clipperCampaigns: many(clipperCampaigns),
  trackingEvents: many(trackingEvents),
  clipperReviews: many(clipperReviews),
  outreachContacts: many(outreachContacts),
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
  outreachContacts: many(outreachContacts),
}));

export const outreachContactsRelations = relations(outreachContacts, ({ one }) => ({
  clipper: one(users, {
    fields: [outreachContacts.clipperId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [outreachContacts.campaignId],
    references: [campaigns.id],
  }),
  clipperCampaign: one(clipperCampaigns, {
    fields: [outreachContacts.clipperCampaignId],
    references: [clipperCampaigns.id],
  }),
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

export const tradingMetricsRelations = relations(tradingMetrics, ({ one }) => ({
  user: one(users, {
    fields: [tradingMetrics.userId],
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  budgetUsed: true,
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

// Personalized Broker Links table
export const personalizedBrokerLinks = pgTable("personalized_broker_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  brokerName: text("broker_name").notNull(),
  brokerType: brokerTypeEnum("broker_type").notNull(),
  affiliateLink: text("affiliate_link").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalizedBrokerLinksRelations = relations(personalizedBrokerLinks, ({ one }) => ({
  user: one(users, {
    fields: [personalizedBrokerLinks.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertPersonalizedBrokerLinkSchema = createInsertSchema(personalizedBrokerLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type PersonalizedBrokerLink = typeof personalizedBrokerLinks.$inferSelect;
export type InsertPersonalizedBrokerLink = z.infer<typeof insertPersonalizedBrokerLinkSchema>;

// New review system types
export type ClipperReview = typeof clipperReviews.$inferSelect;
export type InsertClipperReview = z.infer<typeof insertClipperReviewSchema>;
export type ClipperStats = typeof clipperStats.$inferSelect;
export type OutreachContact = typeof outreachContacts.$inferSelect;
export type InsertClipperStats = z.infer<typeof insertClipperStatsSchema>;

export const insertOutreachContactSchema = createInsertSchema(outreachContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOutreachContact = z.infer<typeof insertOutreachContactSchema>;

// Insert schemas for new tables
export const insertBrokerProgramSchema = createInsertSchema(brokerPrograms).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertRevenueTransactionSchema = createInsertSchema(revenueTransactions).omit({
  createdAt: true,
});

export const insertPayoutRecordSchema = createInsertSchema(payoutRecords).omit({
  createdAt: true,
});

export const insertSystemHealthMetricSchema = createInsertSchema(systemHealthMetrics).omit({
  lastChecked: true,
});

export type BrokerProgram = typeof brokerPrograms.$inferSelect;
export type InsertBrokerProgram = z.infer<typeof insertBrokerProgramSchema>;
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
