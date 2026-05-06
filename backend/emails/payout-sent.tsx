import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface PayoutSentProps {
  fullName: string;
  amountUsdc: string;
  walletAddress: string;
  txHash: string;
  basescanUrl: string;
}

export function PayoutSent(p: PayoutSentProps) {
  return (
    <Layout preview={`${p.amountUsdc} USDC sent to your wallet`}>
      <Heading as="h1" className="text-xl font-semibold text-emerald-700 m-0">
        Payout sent 💸
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, your payout of <strong>{p.amountUsdc} USDC</strong> is
        on its way. It should land in your wallet within a few seconds.
      </Text>

      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-xs text-slate-500 m-0">Sent to</Text>
        <Text className="font-mono text-sm text-slate-900 m-0 break-all">
          {p.walletAddress}
        </Text>
        <Text className="text-xs text-slate-500 m-0 mt-3">Transaction</Text>
        <Text className="text-sm m-0">
          <a href={p.basescanUrl} className="text-blue-600 break-all font-mono">
            {p.txHash.slice(0, 14)}…{p.txHash.slice(-10)}
          </a>
        </Text>
      </Section>

      <Text className="text-xs text-slate-500">
        If this wasn't you, contact support immediately — and review your wallet
        binding from settings.
      </Text>
    </Layout>
  );
}
export default PayoutSent;
