import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface SubscriptionPaidProps {
  fullName: string;
  planName: string;
  amountUsdc: string;
  periodEnd: string; // ISO or readable date
  txHash: string;
  basescanUrl: string;
  appUrl: string;
}

export function SubscriptionPaid(p: SubscriptionPaidProps) {
  return (
    <Layout preview={`Your ${p.planName} subscription is active until ${p.periodEnd}`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Subscription confirmed ✅
      </Heading>
      <Text className="text-slate-700 mt-3">
        Thanks {p.fullName}, your <strong>{p.planName}</strong> plan is active.
      </Text>

      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-xs text-slate-500 m-0">Amount paid</Text>
        <Text className="text-base font-semibold text-slate-900 m-0">{p.amountUsdc} USDC</Text>
        <Text className="text-xs text-slate-500 m-0 mt-3">Active until</Text>
        <Text className="text-base font-semibold text-slate-900 m-0">{p.periodEnd}</Text>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/premium`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          View subscription
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        On-chain receipt: <a href={p.basescanUrl} className="text-blue-600 break-all">{p.txHash.slice(0, 14)}…{p.txHash.slice(-10)}</a>
      </Text>
    </Layout>
  );
}
export default SubscriptionPaid;
