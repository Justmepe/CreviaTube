import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

// Phase 7 Slice A — internal admin notice that a campaign was funded
// (USDC received, escrow loaded). Tells the operator how much hit
// the treasury so they can reconcile against on-chain receipts
// without having to dig through Basescan.

export interface AdminCampaignFundedProps {
  campaignId: string;
  campaignName: string;
  creatorUsername: string;
  creatorEmail: string;
  amountUsdc: string;
  platformFeeUsdc: string;
  escrowUsdc: string;
  txHash: string;
  basescanUrl: string;
  appUrl: string;
}

export function AdminCampaignFunded(p: AdminCampaignFundedProps) {
  return (
    <Layout preview={`Campaign funded: ${p.amountUsdc} USDC from @${p.creatorUsername}`}>
      <Heading as="h1" className="text-lg font-semibold text-emerald-700 m-0">
        Campaign funded · {p.amountUsdc} USDC
      </Heading>
      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-sm text-slate-700 m-0">
          <strong>{p.campaignName}</strong>
        </Text>
        <Text className="text-xs text-slate-600 m-0 mt-1">
          by @{p.creatorUsername} ({p.creatorEmail})
        </Text>
        <Text className="text-xs text-slate-400 m-0 mt-1 font-mono">{p.campaignId}</Text>

        <Section className="mt-3 pt-3 border-t border-slate-200">
          <Text className="text-xs text-slate-600 m-0">
            Total funded: <strong>{p.amountUsdc} USDC</strong>
          </Text>
          <Text className="text-xs text-slate-600 m-0 mt-1">
            Platform fee: <strong>{p.platformFeeUsdc} USDC</strong>
          </Text>
          <Text className="text-xs text-slate-600 m-0 mt-1">
            To escrow: <strong>{p.escrowUsdc} USDC</strong>
          </Text>
          <Text className="text-xs text-slate-400 m-0 mt-2 font-mono break-all">
            tx: {p.txHash}
          </Text>
        </Section>
      </Section>
      <Section className="text-center my-6">
        <Button
          href={p.basescanUrl}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium no-underline mr-2"
        >
          View on Basescan
        </Button>
        <Button
          href={`${p.appUrl}/admin/revenue`}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium no-underline"
        >
          Admin revenue
        </Button>
      </Section>
    </Layout>
  );
}
export default AdminCampaignFunded;
