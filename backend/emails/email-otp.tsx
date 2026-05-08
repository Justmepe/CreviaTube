import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface EmailOtpProps {
  fullName: string;
  code: string;
  expiresInMinutes: number;
  reason?: string;
}

export function EmailOtp(p: EmailOtpProps) {
  return (
    <Layout preview={`Your CreviaTube verification code: ${p.code}`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Your verification code
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, here's the one-time code you requested
        {p.reason ? ` for ${p.reason}` : ""}:
      </Text>

      <Section className="bg-slate-50 rounded-md p-6 my-4 border border-slate-200 text-center">
        <Text className="text-3xl font-mono tracking-[0.4em] text-slate-900 m-0">
          {p.code}
        </Text>
      </Section>

      <Text className="text-xs text-slate-500">
        Valid for {p.expiresInMinutes} minute{p.expiresInMinutes === 1 ? "" : "s"}.
        Single-use — once you enter it, it's spent.
      </Text>

      <Text className="text-xs text-slate-500 mt-4">
        If you didn't request this code, ignore this email and consider
        changing your password. Someone may know your login.
      </Text>
    </Layout>
  );
}
export default EmailOtp;
