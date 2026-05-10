import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

// Phase 5 — milestone email sent the FIRST TIME a clipper experiences
// auto-approve from a specific creator. The creator has previously
// approved this clipper enough times that they flipped the "trust"
// toggle, and this is the first application to skip creator_review
// because of it. Subsequent auto-approvals get the standard
// ApplicationDecision (approved variant) so we don't spam.
//
// The framing is deliberately celebratory rather than system-style —
// reaching this status means the clipper has built a real reputation
// with this creator, and that's worth marking.

export interface ClipperTrustedProps {
  fullName: string;
  campaignName: string;
  campaignId: string;
  creatorName: string;
  approvedCount: number; // total approved on this creator's campaigns
  appUrl: string;
}

export function ClipperTrusted(p: ClipperTrustedProps) {
  return (
    <Layout
      preview={`You're a trusted clipper for ${p.creatorName}. Your future submissions skip review.`}
    >
      <Heading as="h1" className="text-xl font-semibold text-emerald-700 m-0">
        You're a trusted clipper 🎯
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, this is a milestone worth marking. {p.creatorName} has
        approved your work {p.approvedCount} times across their campaigns and
        just flipped a switch in your favor: from now on, your submissions to
        their campaigns are auto-approved instead of going through manual
        review.
      </Text>

      <Section className="bg-emerald-50 rounded-md p-4 my-4 border border-emerald-200">
        <Text className="text-xs text-emerald-800 m-0">What this means</Text>
        <Text className="text-sm text-emerald-900 m-0 mt-1">
          Your application for{" "}
          <strong>{p.campaignName}</strong> was approved instantly. You can
          start producing content right away — no waiting on review.
        </Text>
      </Section>

      <Text className="text-slate-700 mt-3 text-sm">
        Reputation is portable. A track record on one creator's campaigns is
        a signal other creators look at when filling future briefs. Keep
        delivering at this level and the platform will keep clearing paths
        for you.
      </Text>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/clipper/campaigns/${p.campaignId}`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Open this campaign
        </Button>
      </Section>
    </Layout>
  );
}
export default ClipperTrusted;
