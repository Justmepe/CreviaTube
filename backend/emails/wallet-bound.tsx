import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./layout";

export interface WalletBoundProps {
  fullName: string;
  walletAddress: string;
  when: string; // human-readable timestamp
}

export function WalletBound(p: WalletBoundProps) {
  return (
    <Layout preview={`A wallet was bound to your CreviaTube account`}>
      <Heading as="h1" className="text-xl font-semibold text-slate-900 m-0">
        Wallet bound to your account 🔗
      </Heading>
      <Text className="text-slate-700 mt-3">
        Hi {p.fullName}, a Web3 wallet was just bound to your CreviaTube account.
        Future USDC payouts will be sent here.
      </Text>

      <Section className="bg-slate-50 rounded-md p-4 my-4 border border-slate-200">
        <Text className="text-xs text-slate-500 m-0">Wallet address</Text>
        <Text className="font-mono text-sm text-slate-900 m-0 break-all">
          {p.walletAddress}
        </Text>
        <Text className="text-xs text-slate-500 m-0 mt-3">When</Text>
        <Text className="text-sm text-slate-900 m-0">{p.when}</Text>
      </Section>

      <Text className="text-sm text-slate-700">
        <strong>Wasn't you?</strong> Sign in and unbind the wallet from{" "}
        <em>Settings → Web3 Wallet</em> immediately, then change your password.
      </Text>
    </Layout>
  );
}
export default WalletBound;
