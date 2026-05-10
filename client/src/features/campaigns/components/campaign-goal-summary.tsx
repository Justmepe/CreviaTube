// Phase 4 — compact summary of a campaign's goal + verification status.
// Rendered on marketplace cards (clipper sees what they're applying to)
// and on the application page (clipper sees the full goal context
// before submitting). Reads from the shared goal catalog so labels stay
// consistent with the campaign-creation form and the integration page.

import { Badge } from "@/components/ui/badge";
import { Target, ShieldCheck, AlertCircle } from "lucide-react";
import { getGoalDefinition, type PrimaryGoal, type IntegrationField } from "../../../../../shared/goal-options";

export interface IntegrationStatus {
  pixelId: string | null;
  hasPostbackSecret: boolean;
  shopifyDomain: string | null;
  hasShopifyWebhookSecret: boolean;
  hasStripeWebhookSecret: boolean;
  mmpProvider: string | null;
  mmpAppId: string | null;
  hasMmpApiKey: boolean;
}

// Reusable predicate: true iff every requiredIntegrationField for the
// campaign's primary goal is set on its integration row. Goals with no
// required fields (views via tracking link, follows via clipper-OAuth,
// etc.) always return true. Used by the marketplace "verified only"
// filter and the per-card configured/awaiting badge.
export function isCampaignVerified(
  campaignGoals: Record<string, any> | null | undefined,
  integration: IntegrationStatus | null | undefined,
): boolean {
  const primaryGoal = campaignGoals?.primaryGoal as PrimaryGoal | undefined;
  if (!primaryGoal) return false;
  let goalDef;
  try {
    goalDef = getGoalDefinition(primaryGoal);
  } catch {
    return false;
  }
  const required: ReadonlyArray<IntegrationField> = goalDef.requiredIntegrationFields;
  if (required.length === 0) return true;
  if (!integration) return false;
  return required.every((f) => {
    switch (f) {
      case "postbackSecret":         return integration.hasPostbackSecret;
      case "pixelId":                return Boolean(integration.pixelId);
      case "shopifyDomain":          return Boolean(integration.shopifyDomain);
      case "shopifyWebhookSecret":   return integration.hasShopifyWebhookSecret;
      case "stripeWebhookSecret":    return integration.hasStripeWebhookSecret;
      case "mmpProvider":            return Boolean(integration.mmpProvider);
      case "mmpAppId":               return Boolean(integration.mmpAppId);
      case "mmpApiKey":              return integration.hasMmpApiKey;
      default:                       return false;
    }
  });
}

export interface CampaignGoalSummaryProps {
  // The campaign's campaignGoals JSON. We pull out primaryGoal +
  // {goalType}Goal target.
  campaignGoals?: Record<string, any> | null;
  // Redacted integration block from the API. Null when the campaigner
  // hasn't created an integration row yet.
  integration?: IntegrationStatus | null;
  // "compact" trims the verification line out for tight card layouts;
  // "full" includes everything for detail pages.
  variant?: "compact" | "full";
}

// Map verificationSource (catalog) → human-friendly description shown
// on the marketplace card. Same wording the campaigner saw when picking
// the goal so clippers and creators are looking at the same vocabulary.
const VERIFICATION_SOURCE_LABEL: Record<string, string> = {
  platform_api_public: "Public platform API",
  platform_api_oauth_campaigner: "Creator-OAuth platform API",
  platform_api_oauth_clipper: "Clipper-OAuth platform API",
  tracking_link: "Per-clipper tracking link",
  conversion_pixel: "Conversion pixel",
  server_postback: "Server postback",
  shopify_webhook: "Shopify webhook",
  stripe_webhook: "Stripe webhook",
  mmp_postback: "Mobile Measurement Partner",
  internal_submission_count: "Approved submission count",
};

export function CampaignGoalSummary({
  campaignGoals,
  integration,
  variant = "compact",
}: CampaignGoalSummaryProps) {
  const primaryGoal = campaignGoals?.primaryGoal as PrimaryGoal | undefined;
  if (!primaryGoal) return null;

  const goalDef = (() => {
    try {
      return getGoalDefinition(primaryGoal);
    } catch {
      return null;
    }
  })();

  // Read the target from the goal-specific JSON key. Mirrors the map in
  // campaign-creation.tsx and goal-completion.service.ts.
  const targetKey = goalDef?.targetField ?? `${primaryGoal}Goal`;
  const target = campaignGoals?.[targetKey];
  const targetUnit = goalDef?.targetUnit ?? "";

  const formatTarget = (v: number) =>
    primaryGoal === "revenue"
      ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
      : v.toLocaleString();

  // Reuses the shared isCampaignVerified predicate so the badge and the
  // marketplace "verified only" filter never disagree.
  const isConfigured = isCampaignVerified(campaignGoals, integration);

  const verificationLabel = goalDef
    ? VERIFICATION_SOURCE_LABEL[goalDef.verificationSource]
    : null;

  return (
    <div className="rounded-md bg-blue-50/60 border border-blue-100 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-4 w-4 text-blue-700 flex-shrink-0" />
          <span className="text-xs uppercase tracking-wider font-medium text-blue-700">
            Goal
          </span>
          <span className="text-sm font-semibold text-slate-900 truncate">
            {goalDef?.label ?? primaryGoal}
          </span>
        </div>
        {isConfigured ? (
          <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] flex-shrink-0">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] flex-shrink-0">
            <AlertCircle className="h-3 w-3 mr-1" />
            Awaiting setup
          </Badge>
        )}
      </div>

      {typeof target === "number" && target > 0 && (
        <div className="text-xs text-slate-700">
          <span className="font-medium">Target:</span> {formatTarget(target)}
          {primaryGoal !== "revenue" && targetUnit ? ` ${targetUnit}` : ""}
        </div>
      )}

      {variant === "full" && verificationLabel && (
        <div className="text-xs text-slate-500">
          Verified via {verificationLabel}
        </div>
      )}
    </div>
  );
}
