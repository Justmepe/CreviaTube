import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

// Phase 7 Slice A — internal admin notice that a new user signed up.
// Terse: who, what, when, where to look. Not for the user.

export interface AdminNewSignupProps {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  accountType: string | null;
  country: string | null;
  appUrl: string;
}

export function AdminNewSignup(p: AdminNewSignupProps) {
  return (
    <Layout preview={`New signup: ${p.username} (${p.role})`}>
      <Heading as="h1" className="text-lg font-semibold text-slate-900 m-0">
        New signup
      </Heading>
      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-sm text-slate-700 m-0">
          <strong>{p.fullName}</strong> (@{p.username})
        </Text>
        <Text className="text-xs text-slate-600 m-0 mt-1">
          {p.email} · role: {p.role}
          {p.accountType ? ` · ${p.accountType}` : ""}
          {p.country ? ` · ${p.country}` : ""}
        </Text>
        <Text className="text-xs text-slate-400 m-0 mt-1 font-mono">{p.userId}</Text>
      </Section>
      <Section className="text-center my-6">
        <Button
          href={`${p.appUrl}/admin/users`}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium no-underline"
        >
          Open admin users
        </Button>
      </Section>
    </Layout>
  );
}
export default AdminNewSignup;
