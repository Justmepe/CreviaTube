import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Reown project ID from cloud.reown.com. Free tier; safe to ship in client bundle.
const projectId = (import.meta as any).env?.VITE_REOWN_PROJECT_ID || "REPLACE_ME_WITH_REOWN_PROJECT_ID";

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base, baseSepolia];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata: {
    name: "CreviaTube",
    description: "Creator + clipper marketplace with USDC payouts",
    url: typeof window !== "undefined" ? window.location.origin : "https://creviatube.com",
    icons: [],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});
