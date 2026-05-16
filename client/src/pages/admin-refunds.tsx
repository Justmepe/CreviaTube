// Phase 7 Slice B — admin refund queue.
//
// Surfaces the Phase 6 Slice D guarantee-pipeline that's been
// running headless: every subscription whose 30-day lift threshold
// failed is sitting in status='refund_pending' waiting for an
// admin to manually send USDC out of the treasury wallet.
//
// Two actions per row:
//   - Copy the recipient wallet address (for the manual USDC send).
//   - Mark refunded: paste the on-chain txHash; we stamp it +
//     flip the subscription to status='refunded'.
//
// Plus a "Run sweep now" button that triggers the evaluator
// against the full subscription table. Useful before a deploy or
// when adding a new admin to the rota — but the sweep is also
// safe to call repeatedly (idempotent on already-evaluated rows).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { ShieldCheck, Play, Clipboard, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PendingRefund {
  userId: string;
  userEmail: string;
  userFullName: string;
  triggeredAt: string;
  baseline: number;
  refundToAddress: string | null;
  refundAmountUsdc: string | null;
  originalTxHash: string | null;
}

interface SweepResult {
  evaluated: number;
  triggered: number;
}

export default function AdminRefundsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [markingUserId, setMarkingUserId] = useState<string | null>(null);
  const [txHashInput, setTxHashInput] = useState("");

  const { data, isLoading } = useQuery<{ pending: PendingRefund[] }>({
    queryKey: ["/api/admin/guarantees/pending-refunds"],
  });

  const sweepMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/guarantees/sweep");
      return res.json() as Promise<SweepResult>;
    },
    onSuccess: (result) => {
      toast({
        title: "Sweep complete",
        description: `Evaluated ${result.evaluated} subscriptions, triggered ${result.triggered} refund(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guarantees/pending-refunds"] });
    },
    onError: (err: any) => {
      toast({
        title: "Sweep failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const markRefundedMutation = useMutation({
    mutationFn: async (params: { userId: string; txHash: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/guarantees/${params.userId}/mark-refunded`,
        { txHash: params.txHash },
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Refund recorded",
        description: "Subscription marked as refunded. On-chain tx logged for audit.",
      });
      setMarkingUserId(null);
      setTxHashInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guarantees/pending-refunds"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't mark refunded",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const pending = data?.pending ?? [];

  return (
    <DashboardLayout title="Refunds">
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              Guarantee refund queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Subscriptions whose 30-day lift threshold failed. Send USDC from
              the treasury wallet, then paste the txHash to clear the row.
            </p>
          </div>
          <Button
            onClick={() => sweepMutation.mutate()}
            disabled={sweepMutation.isPending}
            variant="outline"
            data-testid="button-run-sweep"
          >
            <Play className="h-4 w-4 mr-2" />
            {sweepMutation.isPending ? "Running sweep…" : "Run sweep now"}
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading queue…
            </CardContent>
          </Card>
        ) : pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium text-slate-800">Nothing to refund</p>
              <p className="text-sm text-muted-foreground mt-1">
                Either no guarantees have triggered, or every refund has already
                been processed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                <strong>{pending.length}</strong> pending refund
                {pending.length === 1 ? "" : "s"}. Process each one manually
                from the treasury wallet; paste the on-chain tx hash to mark
                done.
              </AlertDescription>
            </Alert>

            {pending.map((row) => (
              <Card key={row.userId} data-testid={`refund-row-${row.userId}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        {row.userFullName ?? "Unknown user"}
                      </CardTitle>
                      <CardDescription>
                        {row.userEmail} · triggered{" "}
                        {new Date(row.triggeredAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">
                      {row.refundAmountUsdc
                        ? `${row.refundAmountUsdc} USDC`
                        : "amount unknown"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Refund to wallet</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-slate-100 rounded px-2 py-1 font-mono break-all flex-1">
                          {row.refundToAddress ?? "(no sender on intent — check manually)"}
                        </code>
                        {row.refundToAddress && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(row.refundToAddress!);
                              toast({ title: "Copied", description: "Wallet address copied." });
                            }}
                            data-testid={`button-copy-${row.userId}`}
                          >
                            <Clipboard className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Baseline applications</Label>
                      <div className="mt-1 text-sm font-medium">
                        {row.baseline} (30d before they subscribed)
                      </div>
                    </div>
                  </div>

                  {row.originalTxHash && (
                    <div className="text-xs text-muted-foreground">
                      Original payment tx:{" "}
                      <a
                        href={`https://basescan.org/tx/${row.originalTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {row.originalTxHash.slice(0, 10)}…{row.originalTxHash.slice(-8)}
                      </a>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        setMarkingUserId(row.userId);
                        setTxHashInput("");
                      }}
                      size="sm"
                      data-testid={`button-mark-${row.userId}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Mark refunded
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Mark-refunded dialog */}
        <Dialog
          open={markingUserId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setMarkingUserId(null);
              setTxHashInput("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark refund as paid</DialogTitle>
              <DialogDescription>
                Paste the on-chain transaction hash from the treasury USDC
                send. We'll stamp it on the subscription row for the audit
                trail and flip status to <code>refunded</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="txHash">Transaction hash</Label>
              <Input
                id="txHash"
                placeholder="0x…"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value.trim())}
                data-testid="input-tx-hash"
              />
              <p className="text-xs text-muted-foreground">
                32-byte hex string starting with 0x. Find it in your wallet
                after sending the USDC.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setMarkingUserId(null);
                  setTxHashInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!markingUserId) return;
                  if (!/^0x[a-fA-F0-9]{64}$/.test(txHashInput)) {
                    toast({
                      title: "Invalid txHash",
                      description: "Must be 0x + 64 hex chars.",
                      variant: "destructive",
                    });
                    return;
                  }
                  markRefundedMutation.mutate({
                    userId: markingUserId,
                    txHash: txHashInput,
                  });
                }}
                disabled={markRefundedMutation.isPending}
                data-testid="button-confirm-mark-refunded"
              >
                {markRefundedMutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
