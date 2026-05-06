import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useWalletBind, useWalletUnbind } from "./use-wallet-bind";

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { user } = useAuth();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const bind = useWalletBind();
  const unbind = useWalletUnbind();

  const boundAddress = (user as any)?.walletAddress as string | undefined;
  const isBoundToCurrent = boundAddress && address && boundAddress.toLowerCase() === address.toLowerCase();

  const open = () => {
    // Reown AppKit injects a global <appkit-button> custom element after createAppKit().
    // Easiest reliable trigger: click a hidden one, or open via the exported modal.
    (window as any).appKit?.open?.() ?? document.querySelector("appkit-button")?.shadowRoot?.querySelector("button")?.click();
  };

  if (boundAddress && !isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Bound: {shorten(boundAddress)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => unbind.mutate(undefined, {
            onSuccess: () => toast({ title: "Wallet unbound" }),
            onError: (e) => toast({ title: "Unbind failed", description: e.message, variant: "destructive" }),
          })}
        >Unbind</Button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <appkit-button />
        <p className="text-xs text-muted-foreground">
          Connect a wallet to receive USDC payouts on Base.
        </p>
      </div>
    );
  }

  if (isBoundToCurrent) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">✓ Bound: {shorten(address!)}</span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>Disconnect</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{shorten(address!)}</span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>Disconnect</Button>
      </div>
      <Button
        onClick={() => bind.mutate(undefined, {
          onSuccess: (r) => toast({ title: "Wallet bound", description: shorten(r.walletAddress) }),
          onError: (e) => toast({ title: "Bind failed", description: e.message, variant: "destructive" }),
        })}
        disabled={bind.isPending}
      >{bind.isPending ? "Signing…" : "Sign to bind this wallet"}</Button>
    </div>
  );
}
