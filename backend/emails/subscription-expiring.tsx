import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface SubscriptionExpiringProps {
  fullName: string;
  planName: string;
  expiresOn: string;       // human-readable date
  daysRemaining: number;
  appUrl: string;
}

export function SubscriptionExpiring(p: SubscriptionExpiringProps) {
  return (
    <Layout preview={`Your ${p.planName} expires in ${p.daysRemaining} days`}>
      <Heading as="h1" className="text-xl font-semibold text-amber-700 m-0">
        Your subscription expires soon
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, a heads up — your <strong>{p.planName}</strong> plan
        expires on <strong>{p.expiresOn}</strong> ({p.daysRemaining} days from now).
      </Text>

      <Section className="bg-amber-50 rounded-md p-4 my-4 border border-amber-200">
        <Text className="text-xs text-amber-800 m-0">If you don't renew</Text>
        <Text className="text-sm text-amber-900 m-0">
          You'll lose premium-only features at the end of the current period.
          Your account stays active — just at the standard tier.
        </Text>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/premium`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Renew now
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        Renewals are paid in USDC on Base — same flow as your initial subscription.
      </Text>
    </Layout>
  );
}
export default SubscriptionExpiring;
