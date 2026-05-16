import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

// Phase 7 Slice A — internal admin notice that a Premium subscription
// was paid. Carries the Founding-seat number when applicable so the
// operator can track scarcity progress without polling the
// /admin/founding-seats endpoint.

export interface AdminSubscriptionPaidProps {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  amountUsdc: string;
  periodEnd: string;
  isFounder: boolean;
  foundingSeatsTaken?: number;
  foundingSeatsTotal?: number;
  txHash: string;
  basescanUrl: string;
  appUrl: string;
}

export function AdminSubscriptionPaid(p: AdminSubscriptionPaidProps) {
  return (
    <Layout
      preview={`Subscription paid: ${p.amountUsdc} USDC from @${p.username}`}
    >
      <Heading as="h1" className="text-lg font-semibold text-amber-700 m-0">
        {p.isFounder ? "Founding seat claimed" : "Subscription paid"} · {p.amountUsdc} USDC
      </Heading>
      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-sm text-slate-700 m-0">
          <strong>{p.fullName}</strong> (@{p.username})
        </Text>
        <Text className="text-xs text-slate-600 m-0 mt-1">{p.email}</Text>
        <Text className="text-xs text-slate-400 m-0 mt-1 font-mono">{p.userId}</Text>

        <Section className="mt-3 pt-3 border-t border-slate-200">
          <Text className="text-xs text-slate-600 m-0">
            Tier: <strong>{p.isFounder ? "Founding Creator (locked $15/mo)" : "Premium"}</strong>
          </Text>
          <Text className="text-xs text-slate-600 m-0 mt-1">
            Period end: <strong>{new Date(p.periodEnd).toLocaleDateString()}</strong>
          </Text>
          {p.foundingSeatsTaken !== undefined && p.foundingSeatsTotal !== undefined && (
            <Text className="text-xs text-slate-600 m-0 mt-1">
              Founding seats: <strong>{p.foundingSeatsTaken} / {p.foundingSeatsTotal}</strong>
              {" "}({p.foundingSeatsTotal - p.foundingSeatsTaken} remaining)
            </Text>
          )}
          <Text className="text-xs text-slate-400 m-0 mt-2 font-mono break-all">
            tx: {p.txHash}
          </Text>
        </Section>
      </Section>
      <Section className="text-center my-6">
        <Button
          href={p.basescanUrl}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium no-underline mr-2"
        >
          View on Basescan
        </Button>
        <Button
          href={`${p.appUrl}/admin/users`}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium no-underline"
        >
          Open admin
        </Button>
      </Section>
    </Layout>
  );
}
export default AdminSubscriptionPaid;
