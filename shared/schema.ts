import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["creator", "clipper", "admin"]);
export const userTypeEnum = pgEnum("user_type", ["trader_creator", "influencer", "entrepreneur", "enterprise"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "completed", "draft"]);
export const eventTypeEnum = pgEnum("event_type", ["click", "signup", "deposit", "trade", "view", "conversion"]);
export const eventStatusEnum = pgEnum("event_status", ["pending", "verified", "paid", "rejected"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("clipper"),
  userType: userTypeEnum("user_type"),
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
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull().default("0.20"),
  rewardRates: text("reward_rates").notNull(), // JSON string
  targetPlatforms: text("target_platforms").notNull(), // JSON array
  requirements: text("requirements"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [campaigns.creatorId],
    references: [users.id],
  }),
  clipperCampaigns: many(clipperCampaigns),
  trackingEvents: many(trackingEvents),
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
});

// Types
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
