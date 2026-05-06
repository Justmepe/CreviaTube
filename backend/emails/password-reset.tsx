import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface PasswordResetProps {
  fullName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function PasswordReset(p: PasswordResetProps) {
  return (
    <Layout preview={`Reset your CreviaTube password — link expires in ${p.expiresInMinutes} minutes`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Reset your password 🔐
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, we received a request to reset the password on your
        CreviaTube account. Click the button below to choose a new one.
      </Text>

      <Section className="text-center my-8">
        <Button
          href={p.resetUrl}
          className="bg-slate-900 text-white px-5 py-3 rounded-md text-sm font-medium no-underline"
        >
          Reset my password
        </Button>
      </Section>

      <Text className="text-sm text-slate-600">
        If the button doesn't work, paste this link into your browser:
      </Text>
      <Text className="text-xs text-slate-500 break-all">{p.resetUrl}</Text>

      <Text className="text-xs text-slate-500 mt-6">
        This link expires in {p.expiresInMinutes} minutes for your security.
      </Text>

      <Text className="text-sm text-slate-700 mt-4">
        <strong>Didn't request this?</strong> You can safely ignore this email —
        your password won't change unless someone uses the link above.
      </Text>
    </Layout>
  );
}
export default PasswordReset;
