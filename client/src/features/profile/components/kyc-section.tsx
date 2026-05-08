// Settings card: KYC verification. Shows current status, lets user start
// verification (opens the Persona hosted flow in a new tab), refreshes
// status when they return.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShieldAlert, ShieldCheck, ShieldOff, Hourglass } from "lucide-react";

type KycStatus = {
  status: "pending" | "approved" | "rejected" | null;
  provider: string | null;
  reference: string | null;
  updatedAt: string | null;
};

export function KycSection() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<KycStatus>({
    queryKey: ["/api/kyc/status"],
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 5_000 : false),
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/kyc/start", {});
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Couldn't start verification");
      }
      return res.json() as Promise<{ status: string; inquiryId?: string; hostedUrl?: string }>;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      if (r.hostedUrl) {
        window.open(r.hostedUrl, "_blank", "noopener,noreferrer");
        toast({
          title: "Verification opened in a new tab",
          description: "Complete the steps there. We'll update your status when the provider sends results.",
        });
      } else if (r.status === "approved") {
        toast({ title: "Already verified", description: "You're all set." });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't start verification", description: e.message, variant: "destructive" });
    },
  });

  const status = data?.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === "approved" ? (
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
          ) : status === "rejected" ? (
            <ShieldOff className="w-5 h-5 text-red-700" />
          ) : status === "pending" ? (
            <Hourglass className="w-5 h-5 text-amber-700" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-slate-500" />
          )}
          Identity verification (KYC)
        </CardTitle>
        <CardDescription>
          Some campaigns require KYC-verified clippers. Complete it once and unlock those higher-paying campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-700">Status:</span>
              {status === "approved" ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>
              ) : status === "rejected" ? (
                <Badge className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
              ) : status === "pending" ? (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">In review</Badge>
              ) : (
                <Badge variant="outline">Not started</Badge>
              )}
              {data?.provider && status && (
                <span className="text-xs text-slate-500">via {data.provider}</span>
              )}
            </div>

            {status === "rejected" && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                Your last attempt was declined. You can try again — make sure your document is clear,
                in-frame, and unexpired.
              </p>
            )}

            {(status === null || status === undefined || status === "rejected") && (
              <Button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? "Opening…" : status === "rejected" ? "Try again" : "Start verification"}
              </Button>
            )}

            {status === "pending" && (
              <p className="text-xs text-slate-500">
                We'll update this card automatically when the provider sends results.
                You can close the verification tab and come back later.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
