import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Reown project ID from cloud.reown.com. Free tier; safe to ship in client bundle.
//
// IMPORTANT: Vite inlines `import.meta.env.VITE_*` at BUILD time, not
// runtime. The .env file must be present on the server when `npm run
// build` runs — `pm2 reload` doesn't help here. If the placeholder
// fallback below shows up in the deployed bundle, the deploy
// pipeline forgot to export VITE_REOWN_PROJECT_ID before building.
const envProjectId = (import.meta as any).env?.VITE_REOWN_PROJECT_ID as string | undefined;
const projectId = envProjectId || "REPLACE_ME_WITH_REOWN_PROJECT_ID";

// Loud warning at runtime if the placeholder shipped — the network
// 403s to api.web3modal.org are otherwise mysterious and only visible
// to anyone who happens to open the console.
if (projectId === "REPLACE_ME_WITH_REOWN_PROJECT_ID" && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[web3] VITE_REOWN_PROJECT_ID was not set at build time. Wallet features will 403 against api.web3modal.org. Set VITE_REOWN_PROJECT_ID in .env on the build host and re-run `npm run build`.",
  );
}

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
