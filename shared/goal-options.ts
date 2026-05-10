// Phase 4 — campaign goal catalog. Single source of truth for which goals
// are offered to which user type during campaign creation, what we ask the
// campaigner to provide at setup, what the clipper provides on submission,
// and how we verify the goal was hit.
//
// This file is read by:
//   - the campaign-creation UI (filter goals by accountType)
//   - the integration-setup form (which campaign_integrations fields are
//     required for the chosen primary goal)
//   - the verification pipeline (which signal source to listen for)
//
// Keep the strings here aligned with:
//   - campaigns.campaignGoals.primaryGoal in shared/schema.ts
//   - account_type enum in shared/schema.ts
//   - event_type enum in shared/schema.ts

import type { CampaignIntegration } from "./schema";

export type AccountType = "influencer" | "founder" | "business";

export type PrimaryGoal =
  | "views"
  | "clicks"
  | "signups"
  | "conversions"
  | "follows"
  | "subscribes"
  | "installs"
  | "revenue"
  | "leads"
  | "code_redemptions"
  | "ugc_volume";

// Where the verification signal comes from. Drives the integration-setup
// form: each source tells the campaigner which campaign_integrations
// columns they need to populate.
export type VerificationSource =
  // Public platform API on the clipper's post (no OAuth required for
  // read-only public counters: view count, like count, comment count).
  | "platform_api_public"
  // Platform API on a creator-owned channel/post — requires the *campaigner*
  // to OAuth-connect that platform so we can read owner-only data.
  | "platform_api_oauth_campaigner"
  // Platform API on the clipper's own post for owner-only metrics
  // (impressions, reach) — requires *clipper* OAuth.
  | "platform_api_oauth_clipper"
  // Our /track/{trackingCode} redirect — already in the codebase.
  | "tracking_link"
  // Conversion pixel embedded on the campaigner's thank-you page.
  // Needs campaign_integrations.pixel_id.
  | "conversion_pixel"
  // Server-to-server postback from the campaigner's backend.
  // Needs campaign_integrations.postback_secret.
  | "server_postback"
  // Shopify webhook (orders/create or orders/paid).
  // Needs campaign_integrations.shopify_domain + shopify_webhook_secret.
  | "shopify_webhook"
  // Stripe webhook (checkout.session.completed, charge.succeeded).
  // Needs campaign_integrations.stripe_webhook_secret.
  | "stripe_webhook"
  // Mobile Measurement Partner postback (AppsFlyer / Adjust / Firebase).
  // Needs campaign_integrations.mmp_provider + mmp_app_id + mmp_api_key.
  | "mmp_postback"
  // Internal — derived purely from clipper submissions (e.g., UGC volume
  // counts approved submissions whose post_url verified live).
  | "internal_submission_count";

// Which campaign_integrations columns the campaigner must populate to
// activate verification for this goal. Used by the integration-setup UI
// to render the right form.
export type IntegrationField = keyof Pick<
  CampaignIntegration,
  | "postbackSecret"
  | "pixelId"
  | "shopifyDomain"
  | "shopifyWebhookSecret"
  | "stripeWebhookSecret"
  | "mmpProvider"
  | "mmpAppId"
  | "mmpApiKey"
>;

export interface GoalDefinition {
  id: PrimaryGoal;
  label: string;
  // Short user-facing description. Shown under the radio option in the
  // campaign-creation form.
  description: string;
  // The audiences this goal is offered to. A single goal can apply to
  // multiple types (e.g., "views" makes sense for influencer + founder +
  // business).
  audiences: AccountType[];
  // Unit shown next to the numeric target input ("views", "$", "redemptions").
  targetUnit: string;
  // Which campaignGoals.* JSON field stores the numeric target.
  targetField:
    | "viewsGoal"
    | "clicksGoal"
    | "signupsGoal"
    | "conversionsGoal"
    | "followsGoal"
    | "subscribesGoal"
    | "installsGoal"
    | "revenueGoal"
    | "leadsGoal"
    | "codeRedemptionsGoal"
    | "ugcVolumeGoal";
  // The event_type values whose count (or summed event_value, for revenue)
  // accumulates progress toward this goal.
  contributingEventTypes: ReadonlyArray<
    | "click"
    | "signup"
    | "view"
    | "conversion"
    | "follow"
    | "subscribe"
    | "install"
    | "purchase"
    | "lead"
    | "code_redemption"
  >;
  // For revenue-style goals: sum event_value rather than count rows.
  aggregation: "count" | "sum_event_value";
  // Where the signal comes from — drives the integration-setup form.
  verificationSource: VerificationSource;
  // Which fields on campaign_integrations the campaigner must fill in.
  // Empty array means "no campaigner-provided integration needed"
  // (e.g., tracking-link clicks work out of the box).
  requiredIntegrationFields: ReadonlyArray<IntegrationField>;
  // What the clipper has to submit on top of the existing trackingCode.
  // post_url is required for any goal that polls a public post; promo
  // code is required for code-redemption flows.
  clipperMustProvide: ReadonlyArray<"post_url" | "promo_code">;
  // v1 = ship now, v2 = needs additional infra (creator OAuth, clipper
  // OAuth, or community-bot integration), v3 = manual / out-of-scope.
  phase: "v1" | "v2" | "v3";
}

// The catalog. Order here is the order shown in the UI within each audience.
export const GOAL_CATALOG: ReadonlyArray<GoalDefinition> = [
  // ── Influencer ────────────────────────────────────────────────────────
  {
    id: "views",
    label: "Views on a specific video / post",
    description:
      "Drive measurable views to a target video or post. We poll the platform API for the video's view count.",
    audiences: ["influencer", "founder", "business"],
    targetUnit: "views",
    targetField: "viewsGoal",
    contributingEventTypes: ["view"],
    aggregation: "count",
    verificationSource: "platform_api_public",
    requiredIntegrationFields: [],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
  {
    id: "follows",
    label: "Follower / subscriber growth",
    description:
      "Grow followers on a specific channel. We snapshot the channel at start and measure delta during the campaign window.",
    audiences: ["influencer"],
    targetUnit: "new followers",
    targetField: "followsGoal",
    contributingEventTypes: ["follow"],
    aggregation: "count",
    verificationSource: "platform_api_oauth_campaigner",
    requiredIntegrationFields: [],
    clipperMustProvide: ["post_url"],
    phase: "v2",
  },
  {
    id: "subscribes",
    label: "Paid subscribers / patrons",
    description:
      "Drive paid signups (Patreon, paid YouTube memberships, course buyers).",
    audiences: ["influencer"],
    targetUnit: "subscribers",
    targetField: "subscribesGoal",
    contributingEventTypes: ["subscribe"],
    aggregation: "count",
    verificationSource: "conversion_pixel",
    requiredIntegrationFields: ["pixelId"],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },

  // ── Founder / entrepreneur ────────────────────────────────────────────
  {
    id: "clicks",
    label: "Website traffic / link clicks",
    description:
      "Drive traffic to a landing page, link-in-bio, or store. Each clipper gets a unique tracking link.",
    audiences: ["influencer", "founder", "business"],
    targetUnit: "clicks",
    targetField: "clicksGoal",
    contributingEventTypes: ["click"],
    aggregation: "count",
    verificationSource: "tracking_link",
    requiredIntegrationFields: [],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
  {
    id: "signups",
    label: "Email / waitlist / beta signups",
    description:
      "Verified signups via a conversion pixel on your thank-you page or a server postback.",
    audiences: ["founder", "business"],
    targetUnit: "signups",
    targetField: "signupsGoal",
    contributingEventTypes: ["signup"],
    aggregation: "count",
    verificationSource: "conversion_pixel",
    requiredIntegrationFields: ["pixelId"],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
  {
    id: "installs",
    label: "App installs",
    description:
      "Mobile app installs verified via your Mobile Measurement Partner (AppsFlyer / Adjust / Firebase).",
    audiences: ["founder", "business"],
    targetUnit: "installs",
    targetField: "installsGoal",
    contributingEventTypes: ["install"],
    aggregation: "count",
    verificationSource: "mmp_postback",
    requiredIntegrationFields: ["mmpProvider", "mmpAppId", "mmpApiKey"],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },

  // ── Brand / business ──────────────────────────────────────────────────
  {
    id: "revenue",
    label: "Sales / revenue",
    description:
      "Total $ revenue attributed to this campaign. Verified via Shopify or Stripe webhook.",
    audiences: ["business"],
    targetUnit: "$",
    targetField: "revenueGoal",
    contributingEventTypes: ["purchase"],
    aggregation: "sum_event_value",
    verificationSource: "shopify_webhook", // or stripe — UI lets campaigner pick
    requiredIntegrationFields: ["shopifyDomain", "shopifyWebhookSecret"],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
  {
    id: "leads",
    label: "Lead generation",
    description:
      "Qualified leads (form fills, demo bookings) verified via conversion pixel or server postback.",
    audiences: ["business"],
    targetUnit: "leads",
    targetField: "leadsGoal",
    contributingEventTypes: ["lead"],
    aggregation: "count",
    verificationSource: "conversion_pixel",
    requiredIntegrationFields: ["pixelId"],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
  {
    id: "code_redemptions",
    label: "Promo code redemptions",
    description:
      "Each clipper gets a unique promo code. We attribute redemptions via your Shopify / Stripe webhook.",
    audiences: ["founder", "business"],
    targetUnit: "redemptions",
    targetField: "codeRedemptionsGoal",
    contributingEventTypes: ["code_redemption"],
    aggregation: "count",
    verificationSource: "shopify_webhook",
    requiredIntegrationFields: ["shopifyDomain", "shopifyWebhookSecret"],
    clipperMustProvide: ["promo_code", "post_url"],
    phase: "v1",
  },
  {
    id: "conversions",
    label: "Generic conversions",
    description:
      "Free-form conversion event (cart-adds, downloads, trial starts). Verified via conversion pixel.",
    audiences: ["founder", "business"],
    targetUnit: "conversions",
    targetField: "conversionsGoal",
    contributingEventTypes: ["conversion"],
    aggregation: "count",
    verificationSource: "conversion_pixel",
    requiredIntegrationFields: ["pixelId"],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
  {
    id: "ugc_volume",
    label: "UGC volume (number of clippers posting)",
    description:
      "Goal is hit when N clippers submit approved posts. Verified by us — we check each post URL is live on the platform.",
    audiences: ["founder", "business"],
    targetUnit: "approved posts",
    targetField: "ugcVolumeGoal",
    contributingEventTypes: [], // counts submissions, not events
    aggregation: "count",
    verificationSource: "internal_submission_count",
    requiredIntegrationFields: [],
    clipperMustProvide: ["post_url"],
    phase: "v1",
  },
];

// Helper: filter the catalog to the goals offered to a given account type.
// Used by the campaign-creation UI.
export function goalsForAccountType(
  accountType: AccountType,
  opts?: { includeV2?: boolean; includeV3?: boolean },
): ReadonlyArray<GoalDefinition> {
  const allowV2 = opts?.includeV2 ?? false;
  const allowV3 = opts?.includeV3 ?? false;
  return GOAL_CATALOG.filter((g) => {
    if (!g.audiences.includes(accountType)) return false;
    if (g.phase === "v2" && !allowV2) return false;
    if (g.phase === "v3" && !allowV3) return false;
    return true;
  });
}

// Helper: lookup by primary goal id. Throws if unknown — callers should
// only pass values that came from the catalog.
export function getGoalDefinition(id: PrimaryGoal): GoalDefinition {
  const def = GOAL_CATALOG.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown primary goal: ${id}`);
  return def;
}
