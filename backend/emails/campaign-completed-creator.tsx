import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface CampaignCompletedCreatorProps {
  creatorName: string;
  clipperName: string;
  campaignName: string;
  goalType: string;
  target: number;
  achieved: number;
  appUrl: string;
}

export function CampaignCompletedCreator(p: CampaignCompletedCreatorProps) {
  return (
    <Layout preview={`${p.clipperName} completed your campaign "${p.campaignName}"`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        A clipper completed your campaign
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.creatorName}, <strong>{p.clipperName}</strong> just hit the goal
        on <strong>{p.campaignName}</strong>. The completion bonus has been
        released from escrow automatically.
      </Text>

      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-xs text-slate-500 m-0">Result</Text>
        <Text className="text-sm font-semibold text-slate-900 m-0">
          {p.achieved.toLocaleString()} / {p.target.toLocaleString()} {p.goalType}
        </Text>
        <Text className="text-xs text-slate-500 m-0 mt-2">
          (target met — campaign continues for other clippers and additional events still earn)
        </Text>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/my-campaigns`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Review and rate the clipper
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        Leaving a review helps other creators evaluate this clipper for future campaigns.
      </Text>
    </Layout>
  );
}
export default CampaignCompletedCreator;
