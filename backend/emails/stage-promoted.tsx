import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface StagePromotedProps {
  fullName: string;
  fromStage: string;
  toStage: string;
  reason: string;
  appUrl: string;
}

const STAGE_LABEL: Record<string, string> = {
  founder_prelaunch: "Founder · pre-launch",
  early_brand: "Early-stage brand",
  established_brand: "Established brand",
  solo_creator: "Solo creator",
};

export function StagePromoted(p: StagePromotedProps) {
  const fromLabel = STAGE_LABEL[p.fromStage] || p.fromStage;
  const toLabel = STAGE_LABEL[p.toStage] || p.toStage;
  return (
    <Layout preview={`You've graduated to ${toLabel}`}>
      <Heading as="h1" className="text-xl font-semibold text-emerald-700 m-0">
        You graduated.
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, your CreviaTube account just moved up the lifecycle:
      </Text>

      <Section className="bg-emerald-50 rounded-md p-4 my-4 border border-emerald-200">
        <Text className="text-xs text-emerald-800 m-0 uppercase tracking-wider">From → To</Text>
        <Text className="text-sm text-slate-700 mt-1 m-0">
          <strong>{fromLabel}</strong> &nbsp;→&nbsp; <strong>{toLabel}</strong>
        </Text>
        <Text className="text-xs text-slate-600 mt-2 m-0">{p.reason}</Text>
      </Section>

      <Text className="text-slate-700">
        Your dashboard now reflects the new stage. The new persona pill shows up on your
        profile and on every campaign you run. Stage updates are mutable from Settings if
        you ever want to adjust manually.
      </Text>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          See your dashboard
        </Button>
      </Section>
    </Layout>
  );
}
export default StagePromoted;
