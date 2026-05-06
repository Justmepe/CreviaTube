import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface PayoutFailedProps {
  fullName: string;
  amountUsdc: string;
  reason: string;
  appUrl: string;
}

export function PayoutFailed(p: PayoutFailedProps) {
  return (
    <Layout preview={`Payout of ${p.amountUsdc} USDC failed`}>
      <Heading as="h1" className="text-xl font-semibold text-red-700 m-0">
        Payout failed
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, your withdrawal of <strong>{p.amountUsdc} USDC</strong>{" "}
        could not be processed. Your balance was <strong>not</strong> deducted —
        you can retry from the payouts page.
      </Text>

      <Section className="bg-red-50 rounded-md p-3 my-4 border border-red-200">
        <Text className="text-xs text-red-700 m-0">Error</Text>
        <Text className="text-sm font-mono text-red-900 m-0 break-words">
          {p.reason}
        </Text>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/payouts`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Retry payout
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        Common causes: low gas balance on the platform payout wallet, network
        congestion, or a temporarily incorrect recipient address. If this keeps
        failing, please reach out to support.
      </Text>
    </Layout>
  );
}
export default PayoutFailed;
