import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface ApplicationDecisionProps {
  fullName: string;
  campaignName: string;
  campaignId: string;
  approved: boolean;
  notes?: string;
  appUrl: string;
}

export function ApplicationDecision(p: ApplicationDecisionProps) {
  if (p.approved) {
    return (
      <Layout preview={`Approved: you're in for "${p.campaignName}"`}>
        <Heading as="h1" className="text-xl font-semibold text-emerald-700 m-0">
          You're approved ✅
        </Heading>
        <Text className="text-slate-700 mt-3">
          Hi {p.fullName}, the creator of <strong>{p.campaignName}</strong> has
          approved your application. Start producing content using your tracking
          code — every verified view, click, signup, or conversion earns from
          escrow.
        </Text>

        {p.notes && (
          <Section className="bg-slate-50 rounded-md p-3 my-3 border border-slate-200">
            <Text className="text-xs text-slate-500 m-0">Note from creator</Text>
            <Text className="text-sm text-slate-800 m-0 italic">"{p.notes}"</Text>
          </Section>
        )}

        <Section className="text-center my-6">
          <Button
            href={`${p.appUrl}/marketplace`}
            className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
          >
            Open my campaigns
          </Button>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout preview={`Application closed: "${p.campaignName}"`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Application closed
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, the creator of <strong>{p.campaignName}</strong> chose
        not to move forward with your application this time.
      </Text>

      {p.notes && (
        <Section className="bg-slate-50 rounded-md p-3 my-3 border border-slate-200">
          <Text className="text-xs text-slate-500 m-0">Note from creator</Text>
          <Text className="text-sm text-slate-800 m-0 italic">"{p.notes}"</Text>
        </Section>
      )}

      <Text className="text-slate-700 mt-3 text-sm">
        Plenty of other campaigns are looking for clippers with your platforms.
      </Text>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/marketplace`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Browse campaigns
        </Button>
      </Section>
    </Layout>
  );
}
export default ApplicationDecision;
