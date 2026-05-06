import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App";
import "./index.css";
import { pwaManager } from "./lib/pwa";
import { wagmiConfig } from "./lib/web3";

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={wagmiConfig}>
    <App />
  </WagmiProvider>,
);
