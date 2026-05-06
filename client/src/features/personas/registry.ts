import type { Persona } from "./types";

// Per-persona configuration. Single place to look up "what does X persona
// see / care about / get as defaults?". Add new personas here by adding
// one entry — no scattered edits across the codebase.

export type CampaignTemplate = {
  id: string;
  name: string;
  description: string;
  primaryGoal: "views" | "clicks" | "signups" | "conversions" | "follows" | "subscribes" | "installs";
  defaultGoalAmount: number;
  defaultRewardRate: number;
  rewardRateUnit: string;       // e.g. "per 1k views", "per click"
  guidance: string;             // What clippers should focus on for this template.
};

export type PersonaConfig = {
  displayName: string;
  shortLabel: string;           // For UI pills / badges (e.g., on clipper marketplace cards)
  pillTone: "blue" | "emerald" | "indigo" | "amber" | "slate";
  oneLiner: string;             // One sentence describing what they're trying to do.
  templates: CampaignTemplate[];
};

const BRAND_TEMPLATES: CampaignTemplate[] = [
  {
    id: "brand_awareness",
    name: "Brand awareness",
    description: "Get our name in front of as many qualified eyeballs as possible.",
    primaryGoal: "views",
    defaultGoalAmount: 100_000,
    defaultRewardRate: 0.04,
    rewardRateUnit: "per 1k verified views",
    guidance: "Focus on the hook and brand recall. CTA optional — recall matters more than clicks.",
  },
  {
    id: "brand_traffic",
    name: "Drive traffic",
    description: "Send qualified visitors to our site or app.",
    primaryGoal: "clicks",
    defaultGoalAmount: 5_000,
    defaultRewardRate: 0.05,
    rewardRateUnit: "per click",
    guidance: "Strong CTA in the clip and pinned comment. Mention the URL on screen.",
  },
  {
    id: "brand_leads",
    name: "Capture leads",
    description: "Get sign-ups, demo requests, or waitlist entries.",
    primaryGoal: "signups",
    defaultGoalAmount: 1_000,
    defaultRewardRate: 2.0,
    rewardRateUnit: "per signup",
    guidance: "Lead with the value of signing up. The lead magnet (free trial / template / cheatsheet) should be the hook.",
  },
  {
    id: "brand_sales",
    name: "Drive sales",
    description: "Convert viewers into paying customers.",
    primaryGoal: "conversions",
    defaultGoalAmount: 100,
    defaultRewardRate: 5.0,
    rewardRateUnit: "per conversion",
    guidance: "Show the product in use. Demonstrate the outcome. Use a discount code unique to the clipper for attribution.",
  },
];

const INFLUENCER_TEMPLATES: CampaignTemplate[] = [
  {
    id: "influencer_reach",
    name: "Reach more viewers",
    description: "Maximize total verified views across platforms.",
    primaryGoal: "views",
    defaultGoalAmount: 100_000,
    defaultRewardRate: 0.04,
    rewardRateUnit: "per 1k verified views",
    guidance: "Focus on shareable moments. Pull a strong clip from a longer video.",
  },
  {
    id: "influencer_followers",
    name: "Grow my following",
    description: "Convert viewers into followers / subscribers on my channel.",
    primaryGoal: "follows",
    defaultGoalAmount: 1_000,
    defaultRewardRate: 0.5,
    rewardRateUnit: "per new follow",
    guidance: "End the clip with a clear 'follow me for more' moment. Tease what they'll get next.",
  },
  {
    id: "influencer_engagement",
    name: "Boost engagement",
    description: "More comments, shares, and saves — feed the algorithm.",
    primaryGoal: "clicks", // engagement events not yet in eventTypeEnum; clicks is the closest proxy until Phase 1 schema lands
    defaultGoalAmount: 2_000,
    defaultRewardRate: 0.05,
    rewardRateUnit: "per engagement",
    guidance: "End with a question or hot take. Pin a follow-up comment to seed the conversation.",
  },
  {
    id: "influencer_monetize",
    name: "Drive paid signups",
    description: "Convert into my paid tier (Patreon, Substack, course, etc.).",
    primaryGoal: "subscribes",
    defaultGoalAmount: 100,
    defaultRewardRate: 3.0,
    rewardRateUnit: "per paid subscriber",
    guidance: "Demonstrate the value of the paid tier. Use a discount code unique to the clipper for attribution.",
  },
];

const FOUNDER_TEMPLATES: CampaignTemplate[] = [
  {
    id: "founder_validation",
    name: "Validate the idea",
    description: "Get strangers reacting to the product so we know if it resonates.",
    primaryGoal: "views",
    defaultGoalAmount: 50_000,
    defaultRewardRate: 0.05,
    rewardRateUnit: "per 1k verified views",
    guidance: "Lead with the problem we're solving. Capture comment sentiment for product feedback.",
  },
  {
    id: "founder_waitlist",
    name: "Build the waitlist",
    description: "Pre-launch — collect emails of people who want this.",
    primaryGoal: "signups",
    defaultGoalAmount: 500,
    defaultRewardRate: 2.0,
    rewardRateUnit: "per waitlist signup",
    guidance: "Make the future product feel inevitable. Tease early-access or founder pricing.",
  },
  {
    id: "founder_installs",
    name: "App installs",
    description: "Mobile launch — drive installs on iOS / Android.",
    primaryGoal: "installs",
    defaultGoalAmount: 1_000,
    defaultRewardRate: 1.5,
    rewardRateUnit: "per install",
    guidance: "Show the app in use, not the icon. Demonstrate the moment of value.",
  },
  {
    id: "founder_activation",
    name: "Drive activation",
    description: "Convert installs / signups into active users (first action).",
    primaryGoal: "conversions",
    defaultGoalAmount: 200,
    defaultRewardRate: 4.0,
    rewardRateUnit: "per activated user",
    guidance: "Walk through the first action explicitly. Lower the activation bar (e.g., template, sample data).",
  },
];

export const PERSONA_REGISTRY: Record<Persona, PersonaConfig> = {
  brand: {
    displayName: "Brand or business",
    shortLabel: "Brand",
    pillTone: "blue",
    oneLiner: "Pay clippers for verified leads, conversions, and sales.",
    templates: BRAND_TEMPLATES,
  },
  influencer: {
    displayName: "Creator / influencer",
    shortLabel: "Creator",
    pillTone: "emerald",
    oneLiner: "Pay other creators to grow your audience and engagement.",
    templates: INFLUENCER_TEMPLATES,
  },
  founder: {
    displayName: "Founder / entrepreneur",
    shortLabel: "Founder",
    pillTone: "indigo",
    oneLiner: "Distribution as a service — pay only when growth metrics hit.",
    templates: FOUNDER_TEMPLATES,
  },
  clipper: {
    displayName: "Clipper",
    shortLabel: "Clipper",
    pillTone: "amber",
    oneLiner: "Earn USDC for verified results on the campaigns you choose.",
    templates: [],
  },
  admin: {
    displayName: "Admin",
    shortLabel: "Admin",
    pillTone: "slate",
    oneLiner: "Platform operations and moderation.",
    templates: [],
  },
};

export function getPersonaConfig(persona: Persona): PersonaConfig {
  return PERSONA_REGISTRY[persona];
}
