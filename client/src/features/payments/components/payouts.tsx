import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, ArrowDownToLine, ExternalLink, AlertTriangle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { ConnectWalletButton } from "@/features/wallet/connect-wallet-button";
import { Link } from "wouter";

type Balance = {
  availableUsdc: string;
  totalEarnedUsdc: string;
  paidOutUsdc: string;
  walletAddress: string | null;
};

type Payout = {
  id: string;
  amount: string;
  status: "pending" | "processing" | "completed" | "failed";
  recipientAddress?: string | null;
  txHash?: string | null;
  failureReason?: string | null;
  createdAt: string;
  processedAt?: string | null;
};

const explorerUrl = (txHash: string) => `https://sepolia.basescan.org/tx/${txHash}`;

function StatusBadge({ status }: { status: Payout["status"] }) {
  const map: Record<Payout["status"], { label: string; className: string }> = {
    pending:    { label: "Pending",    className: "bg-amber-100 text-amber-800" },
    processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
    completed:  { label: "Completed",  className: "bg-emerald-100 text-emerald-800" },
    failed:     { label: "Failed",     className: "bg-red-100 text-red-800" },
  };
  const { label, className } = map[status];
  return <Badge className={className}>{label}</Badge>;
}

export default function Payouts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  const isClipper = user?.role === "clipper";

  const { data: balance, isLoading: balanceLoading } = useQuery<Balance>({
    queryKey: ["/api/payouts/balance"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isClipper,
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<Payout[]>({
    queryKey: ["/api/payouts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isClipper,
  });

  const requestPayout = useMutation({
    mutationFn: async (amt: string) => {
      const res = await apiRequest("POST", "/api/payouts", { amount: amt });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Payout failed");
      return body as { payoutId: string; txHash: string; amount: string; recipient: string };
    },
    onSuccess: (data) => {
      toast({
        title: "Payout sent",
        description: `${data.amount} USDC on its way to ${data.recipient.slice(0, 10)}…`,
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/payouts/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
    },
    onError: (e: Error) => toast({ title: "Payout failed", description: e.message, variant: "destructive" }),
  });

  if (!isClipper) {
    return (
      <DashboardLayout title="Payouts">
        <div className="max-w-2xl mx-auto py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Payouts are only available for clipper accounts.</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const noWallet = !balance?.walletAddress;
  const available = parseFloat(balance?.availableUsdc || "0");
  const requestedAmount = parseFloat(amount || "0");
  const canRequest =
    !noWallet &&
    requestedAmount > 0 &&
    requestedAmount <= available &&
    !requestPayout.isPending;

  return (
    <DashboardLayout title="Payouts">
      <div className="max-w-3xl mx-auto py-6 space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Withdraw earnings as USDC
            </CardTitle>
            <CardDescription>
              Earnings are paid in USDC on Base directly to the wallet you've bound to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Available now" value={`${balance?.availableUsdc ?? "0.00"} USDC`} highlight />
              <Stat label="Total earned"  value={`${balance?.totalEarnedUsdc ?? "0.00"} USDC`} />
              <Stat label="Paid out"      value={`${balance?.paidOutUsdc ?? "0.00"} USDC`} />
            </div>

            {noWallet ? (
              <Alert>
                <AlertDescription>
                  Bind a wallet at <Link href="/settings" className="underline">Settings</Link> to receive payouts.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-sm text-muted-foreground">
                Payouts go to <span className="font-mono">{balance!.walletAddress!.slice(0, 10)}…{balance!.walletAddress!.slice(-8)}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Amount in USDC"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="0.01"
                disabled={noWallet || requestPayout.isPending || balanceLoading}
              />
              <Button onClick={() => requestPayout.mutate(amount)} disabled={!canRequest}>
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                {requestPayout.isPending ? "Sending…" : "Withdraw"}
              </Button>
            </div>
            {requestedAmount > available && available > 0 && (
              <p className="text-xs text-red-600">Amount exceeds available balance ({available.toFixed(2)} USDC).</p>
            )}
            {noWallet && (
              <ConnectWalletButton />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
            <CardDescription>Most recent first.</CardDescription>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : payouts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No payouts yet.</div>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border rounded p-3 text-sm">
                    <div className="space-y-0.5">
                      <div className="font-medium">{parseFloat(p.amount).toFixed(2)} USDC</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString()}
                        {p.recipientAddress && ` · ${p.recipientAddress.slice(0, 8)}…${p.recipientAddress.slice(-6)}`}
                      </div>
                      {p.failureReason && (
                        <div className="text-xs text-red-600">{p.failureReason}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      {p.txHash && (
                        <a
                          href={explorerUrl(p.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          tx <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-md border ${highlight ? "bg-emerald-50 border-emerald-200" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold ${highlight ? "text-emerald-700" : ""}`}>{value}</div>
    </div>
  );
}
