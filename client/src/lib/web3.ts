import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Reown project ID from cloud.reown.com. Free tier; safe to ship in
// the client bundle. Vite inlines `import.meta.env.VITE_*` at BUILD
// time, not runtime — if the env var isn't set on the build host,
// nothing the server runtime does (.env edit, pm2 reload) can pick
// it up. Must re-run `npm run build`.
const envProjectId = (import.meta as any).env?.VITE_REOWN_PROJECT_ID as string | undefined;
const hasRealProjectId = Boolean(envProjectId && envProjectId.length >= 10);

// Adapter + wagmi config are always created so the WagmiProvider in
// main.tsx works either way. The adapter constructor doesn't network
// — it only sets up wagmi connectors. Networking happens later when
// the user actually opens a wallet modal, which only triggers if
// createAppKit() ran below (gated on hasRealProjectId).
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base, baseSepolia];

export const wagmiAdapter = new WagmiAdapter({
  // Fall back to a placeholder when env is missing — the adapter
  // requires *something*, but the actual wallet UI is gated below.
  projectId: envProjectId || "REPLACE_ME_WITH_REOWN_PROJECT_ID",
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Only init AppKit when we have a real project ID. Without this gate
// AppKit immediately fires fetchProjectConfig + fetchUsage against
// api.web3modal.org with the placeholder, which 403s spam the console
// on every page load. With the gate, the console stays clean and
// wallet features simply don't activate — the build deployer can add
// the env var and rebuild when they're ready to enable wallet flows.
if (hasRealProjectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: envProjectId!,
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
} else if (typeof window !== "undefined") {
  // One-line informational notice (not a warn) — wallet features are
  // off but nothing's broken. The deployer can flip them on later by
  // setting VITE_REOWN_PROJECT_ID + rebuilding.
  // eslint-disable-next-line no-console
  console.info(
    "[web3] Wallet UI disabled — VITE_REOWN_PROJECT_ID not set at build time. Set it on the build host + rerun `npm run build` to enable.",
  );
}

/**
 * Whether the WalletConnect modal is wired up in this deployment.
 * Components that gate wallet-only UI (Connect Wallet button, USDC
 * funding flow) should read this rather than assuming it always works.
 */
export const isWalletEnabled = hasRealProjectId;
