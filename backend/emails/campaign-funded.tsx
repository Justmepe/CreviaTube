import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface CampaignFundedProps {
  fullName: string;
  campaignName: string;
  campaignId: string;
  totalUsdc: string;
  escrowUsdc: string;
  platformFeeUsdc: string;
  txHash: string;
  basescanUrl: string;
  appUrl: string;
}

export function CampaignFunded(p: CampaignFundedProps) {
  return (
    <Layout preview={`Your campaign "${p.campaignName}" is funded — clippers can now apply`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Campaign is funded 🎯
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, <strong>{p.campaignName}</strong> is now live and clippers
        can apply.
      </Text>

      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-xs text-slate-500 m-0">Total funded</Text>
        <Text className="text-base font-semibold text-slate-900 m-0">{p.totalUsdc} USDC</Text>

        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <Text className="text-xs text-slate-500 m-0">Escrow (clipper rewards)</Text>
            <Text className="text-sm font-semibold text-emerald-700 m-0">{p.escrowUsdc} USDC</Text>
          </div>
          <div style={{ flex: 1 }}>
            <Text className="text-xs text-slate-500 m-0">Platform fee (20%)</Text>
            <Text className="text-sm font-semibold text-slate-700 m-0">{p.platformFeeUsdc} USDC</Text>
          </div>
        </div>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/my-campaigns`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Review applications
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        On-chain receipt: <a href={p.basescanUrl} className="text-blue-600 break-all">{p.txHash.slice(0, 14)}…{p.txHash.slice(-10)}</a>
      </Text>
    </Layout>
  );
}
export default CampaignFunded;
