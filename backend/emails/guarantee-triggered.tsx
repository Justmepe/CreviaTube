import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

// Phase 6 Slice D — sent when the 30-day money-back guarantee fires.
//
// We promise on the /premium page that we'll refund USDC if a
// Founding Creator's campaigns don't see measurably more applications
// in the first 30 days. This email goes out the moment the evaluator
// decides that promise applies — same day, no support ticket needed.
//
// Framing matters: we're refunding because WE said we would, not
// because the creator complained. Lead with the action, not an
// apology — "your refund is being processed" reads stronger than
// "we're sorry it didn't work out."

export interface GuaranteeTriggeredProps {
  fullName: string;
  appUrl: string;
}

export function GuaranteeTriggered(p: GuaranteeTriggeredProps) {
  return (
    <Layout
      preview="Your 30-day guarantee — refund in progress."
    >
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Your refund is on the way
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, our 30-day Founding Creator guarantee evaluated
        your subscription today. Your campaigns didn't see the lift in
        applications we promised, so we're refunding your USDC — back to
        the wallet you paid from.
      </Text>

      <Section className="bg-amber-50 rounded-md p-4 my-4 border border-amber-200">
        <Text className="text-xs text-amber-800 m-0">What happens next</Text>
        <Text className="text-sm text-amber-900 m-0 mt-1">
          We process refunds manually from our treasury wallet within 48
          hours. You'll get an on-chain confirmation as soon as the
          transaction settles. Your subscription is paused — you keep
          access to Featured placement and analytics until the refund
          completes.
        </Text>
      </Section>

      <Text className="text-slate-700 mt-3 text-sm">
        We'd love feedback on what didn't land — reply to this email and
        it goes straight to a human, not a ticket queue. If your
        campaigns weren't getting traction, knowing why helps us fix the
        product for the next Founder.
      </Text>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/dashboard`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Open dashboard
        </Button>
      </Section>
    </Layout>
  );
}
export default GuaranteeTriggered;
