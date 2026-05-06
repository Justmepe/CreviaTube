import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface WelcomeVerificationProps {
  fullName: string;
  verifyUrl: string;
  expiresInHours: number;
}

export function WelcomeVerification({
  fullName,
  verifyUrl,
  expiresInHours,
}: WelcomeVerificationProps) {
  return (
    <Layout preview={`Verify your CreviaTube email — link expires in ${expiresInHours}h`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Welcome, {fullName} 👋
      </Heading>
      <Text className="text-slate-700 mt-3">
        Thanks for signing up for CreviaTube. Confirm your email so you can fund
        campaigns, receive payouts, and submit clipper applications.
      </Text>

      <Section className="text-center my-8">
        <Button
          href={verifyUrl}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Verify my email
        </Button>
      </Section>

      <Text className="text-sm text-slate-600">
        If the button doesn't work, paste this link into your browser:
      </Text>
      <Text className="text-xs text-slate-500 break-all">{verifyUrl}</Text>

      <Text className="text-xs text-slate-500 mt-6">
        This link expires in {expiresInHours} hours. If it expires, you can
        request a new one from your account settings.
      </Text>
    </Layout>
  );
}

export default WelcomeVerification;
