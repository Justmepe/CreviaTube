import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from "wagmi";
import { erc20Abi } from "viem";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`; // Base Sepolia
const TARGET_CHAIN_ID = 84532;

type IntentResponse = {
  intentId: string;
  kind: string;
  pathway: string;
  receiveAddress: `0x${string}`;
  expectedUsdcUnits: string;
  expectedUsdc: string;
  expiresAt: string;
};

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "subscription" | "campaign_funding";
  referenceId?: string;
  description: string;
  onSuccess?: () => void;
}

type Stage = "idle" | "creating_intent" | "awaiting_signature" | "awaiting_confirmation" | "verifying" | "done" | "error";

export function PaymentModal({ open, onOpenChange, kind, referenceId, description, onSuccess }: PaymentModalProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("idle");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: pendingTxHash ?? undefined,
    chainId: TARGET_CHAIN_ID,
  });

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStage("idle");
      setIntent(null);
      setPendingTxHash(null);
      setError(null);
    }
  }, [open]);

  // Once receipt lands, call /verify
  useEffect(() => {
    (async () => {
      if (stage !== "awaiting_confirmation" || !receipt || !intent) return;
      setStage("verifying");
      try {
        const res = await apiRequest("POST", "/api/payments/verify", {
          intentId: intent.intentId,
          txHash: receipt.transactionHash,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "Verification failed");
        setStage("done");
        toast({ title: "Payment confirmed", description: `${intent.expectedUsdc} USDC received.` });
        onSuccess?.();
      } catch (e: any) {
        setError(e.message);
        setStage("error");
      }
    })();
  }, [stage, receipt, intent, toast, onSuccess]);

  const start = async () => {
    setError(null);
    if (!isConnected || !address) {
      setError("Connect a wallet first.");
      setStage("error");
      return;
    }
    if (chainId !== TARGET_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: TARGET_CHAIN_ID });
      } catch (e: any) {
        setError(`Please switch to Base Sepolia (chain ${TARGET_CHAIN_ID}).`);
        setStage("error");
        return;
      }
    }

    setStage("creating_intent");
    let intentRes: IntentResponse;
    try {
      const res = await apiRequest("POST", "/api/payments/intent", {
        kind,
        referenceId,
        senderAddress: address,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create intent");
      intentRes = body;
      setIntent(intentRes);
    } catch (e: any) {
      setError(e.message);
      setStage("error");
      return;
    }

    setStage("awaiting_signature");
    try {
      const txHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [intentRes.receiveAddress, BigInt(intentRes.expectedUsdcUnits)],
        chainId: TARGET_CHAIN_ID,
      });
      setPendingTxHash(txHash);
      setStage("awaiting_confirmation");
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "User rejected the transaction");
      setStage("error");
    }
  };

  const button = (() => {
    if (stage === "idle" || stage === "error") {
      return (
        <Button onClick={start} disabled={!isConnected} className="w-full">
          {isConnected ? "Pay with USDC" : "Connect a wallet to pay"}
        </Button>
      );
    }
    const labels: Record<Stage, string> = {
      idle: "Pay with USDC",
      creating_intent: "Preparing…",
      awaiting_signature: "Confirm in your wallet…",
      awaiting_confirmation: "Waiting for on-chain confirmation…",
      verifying: "Verifying transfer…",
      done: "Done ✓",
      error: "Try again",
    };
    return <Button disabled className="w-full">{labels[stage]}</Button>;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay with USDC</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span>Base Sepolia (testnet)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span>USDC</span></div>
            {intent && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{intent.expectedUsdc} USDC</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-mono text-xs">{intent.receiveAddress.slice(0, 10)}…{intent.receiveAddress.slice(-8)}</span></div>
              </>
            )}
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {stage === "done" && <Alert><AlertDescription>Payment confirmed on-chain. Your subscription is active.</AlertDescription></Alert>}
          {button}
          {pendingTxHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${pendingTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-muted-foreground hover:underline"
            >
              View on BaseScan →
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
