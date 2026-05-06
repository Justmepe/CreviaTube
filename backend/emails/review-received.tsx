import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface ReviewReceivedProps {
  clipperFullName: string;
  creatorName: string;
  campaignName: string;
  overallRating: number; // 1-5
  reviewTitle: string;
  appUrl: string;
}

export function ReviewReceived(p: ReviewReceivedProps) {
  const stars = "★".repeat(Math.round(p.overallRating)) + "☆".repeat(5 - Math.round(p.overallRating));
  return (
    <Layout preview={`${p.creatorName} left you a ${p.overallRating}★ review`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        New review for you {p.overallRating >= 4 ? "🌟" : ""}
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.clipperFullName}, <strong>{p.creatorName}</strong> left a review
        for your work on <strong>{p.campaignName}</strong>.
      </Text>

      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-xl text-yellow-500 m-0">{stars}</Text>
        <Text className="text-sm font-semibold text-slate-900 m-0 mt-1">
          "{p.reviewTitle}"
        </Text>
        <Text className="text-xs text-slate-500 m-0 mt-1">
          {p.overallRating.toFixed(1)} of 5
        </Text>
      </Section>

      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/clippers`}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          View on your profile
        </Button>
      </Section>

      <Text className="text-xs text-slate-500">
        Reviews shape your visibility in the directory and how creators evaluate
        your applications. Keep up the great work.
      </Text>
    </Layout>
  );
}
export default ReviewReceived;
