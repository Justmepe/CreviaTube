import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface CampaignGoalReachedProps {
  fullName: string;
  campaignName: string;
  goalType: string;       // 'views' | 'clicks' | 'signups' | 'conversions' | …
  target: number;
  achieved: number;
  completionReward: string; // USDC display (e.g. "50.00")
  appUrl: string;
  // Phase 4 — human-friendly description of which verification source
  // landed the events that crossed the goal (e.g., "Stripe webhook",
  // "TikTok API", "manual admin credit"). Optional so legacy callers
  // and goals without a known source still render cleanly.
  verificationSource?: string;
}

export function CampaignGoalReached(p: CampaignGoalReachedProps) {
  return (
    <Layout preview={`Goal reached on "${p.campaignName}" — completion bonus released`}>
      <Heading as="h1" className="text-xl font-semibold text-emerald-700 m-0">
        Goal reached 🎉
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, you hit the goal on <strong>{p.campaignName}</strong>.
        Your campaign is marked complete and a completion bonus has been released
        from escrow.
      </Text>

      <Section className="bg-emerald-50 rounded-md p-4 my-4 border border-emerald-200">
        <Text className="text-xs text-emerald-800 m-0">Goal</Text>
        <Text className="text-sm text-emerald-900 m-0">
          {p.achieved.toLocaleString()} / {p.target.toLocaleString()} {p.goalType}
        </Text>
        {p.verificationSource && (
          <>
            <Text className="text-xs text-emerald-800 m-0 mt-3">Verified via</Text>
            <Text className="text-sm text-emerald-900 m-0">{p.verificationSource}</Text>
          </>
        )}
        <Text className="text-xs text-emerald-800 m-0 mt-3">Completion bonus</Text>
        <Text className="text-base font-semibold text-emerald-900 m-0">
          {p.completionReward} USDC
        </Text>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/payouts`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Withdraw earnings
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        Per-event rewards continue to accrue from any tracking events that come
        in after this point. Check the campaign page for full performance.
      </Text>
    </Layout>
  );
}
export default CampaignGoalReached;
