// Phase 7 follow-up — admin campaigns list with operational
// buttons. Hooks the existing GET /api/admin/campaigns endpoint
// (which was previously orphan) plus the new force-fund and
// cancel endpoints, plus the "run view-poll sweep" button for
// end-to-end metrics testing.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  Zap,
  XCircle,
  Activity,
  RefreshCcw,
  UserPlus,
} from "lucide-react";

interface AdminCampaign {
  id: string;
  name: string;
  status: string;
  fundingStatus: string;
  budget: string;
  creatorId: string;
  createdAt: string;
  campaignGoals?: { primaryGoal?: string } | null;
}

export default function AdminCampaignsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery<AdminCampaign[]>({
    queryKey: ["/api/admin/campaigns"],
  });

  const forceFundMutation = useMutation({
    mutationFn: async (args: { id: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/campaigns/${args.id}/force-fund`, {
        reason: args.reason,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Force-funded",
        description: "Campaign flipped to funded + active. Test fixture only — no USDC moved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Force-fund failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (args: { id: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/campaigns/${args.id}/cancel`, {
        reason: args.reason,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Campaign cancelled",
        description: data?.refundPending
          ? `Escrow flipped to refund_pending (${data.refundUsdc} USDC). Process from /admin/refunds.`
          : "No escrow balance to refund.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Cancel failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Test fixture: drop a clipper_campaigns row in approved + postUrl set,
  // so the view-polling sweep + /api/metrics/submissions both pick it up.
  // Idempotent on (clipper, campaign) — re-runs update postUrl in place.
  const forceAssignMutation = useMutation({
    mutationFn: async (args: {
      id: string;
      clipperId: string;
      postUrl: string;
      reason: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/campaigns/${args.id}/force-assign-clipper`,
        { clipperId: args.clipperId, postUrl: args.postUrl, reason: args.reason },
      );
      return await res.json();
    },
    onSuccess: (data: any) => {
      const warn = (data?.warnings ?? []).join(" ");
      toast({
        title: data?.action === "created" ? "Clipper assigned" : "Submission updated",
        description: `@${data?.clipperUsername} → ${data?.postUrl}${warn ? " · " + warn : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Force-assign failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const pollViewsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/poll-views", {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "View poll complete",
        description: data?.message ?? "Swept all eligible campaigns.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Poll failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const items = campaigns ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-700" />
              Admin campaigns
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Platform-wide campaign view with admin actions. Force-fund
              is a test fixture — does not move USDC.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => pollViewsMutation.mutate()}
            disabled={pollViewsMutation.isPending}
            data-testid="button-run-poll-views"
          >
            <Activity className="h-4 w-4 mr-2" />
            {pollViewsMutation.isPending ? "Polling…" : "Run view-poll now"}
          </Button>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Testing the metrics pipeline?</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-900 space-y-1 pt-0">
            <p>
              <strong>Long path:</strong> Create campaign · Force fund · Sign in as clipper
              (incognito) · Apply · Submit post URL · Approve · Run view-poll.
            </p>
            <p>
              <strong>Short path (this admin tool):</strong> Create campaign · Force fund ·{" "}
              <strong>Force-assign clipper</strong> on the row (clipper email + post URL) ·{" "}
              Run view-poll. Then check the clipper's /metrics → Social Media tab.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading campaigns…
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No campaigns yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <Card key={c.id} data-testid={`admin-campaign-${c.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">{c.id}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          c.fundingStatus === "funded"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }
                      >
                        {c.fundingStatus}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          c.status === "active"
                            ? "bg-blue-50 text-blue-900 border-blue-200"
                            : c.status === "cancelled"
                            ? "bg-rose-50 text-rose-900 border-rose-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }
                      >
                        {c.status}
                      </Badge>
                      {c.campaignGoals?.primaryGoal && (
                        <Badge variant="outline" className="text-xs">
                          goal: {c.campaignGoals.primaryGoal}
                        </Badge>
                      )}
                      <span className="text-sm font-medium text-slate-700 ml-1">
                        ${parseFloat(c.budget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-2 flex-wrap pt-1">
                  {c.fundingStatus !== "funded" && c.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => {
                        const reason = window.prompt(
                          "Reason for force-funding? (test only, min 5 chars)",
                        );
                        if (!reason || reason.trim().length < 5) return;
                        forceFundMutation.mutate({ id: c.id, reason: reason.trim() });
                      }}
                      data-testid={`button-force-fund-${c.id}`}
                    >
                      <Zap className="h-4 w-4 mr-1.5" />
                      Force fund
                    </Button>
                  )}
                  {c.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => {
                        const clipper = window.prompt(
                          "Clipper (UUID, username, or email)?",
                        );
                        if (!clipper || !clipper.trim()) return;
                        const postUrl = window.prompt(
                          "Post URL? (must start with https://, e.g. https://www.youtube.com/watch?v=...)",
                        );
                        if (!postUrl || !/^https?:\/\//i.test(postUrl.trim())) return;
                        const reason = window.prompt(
                          "Reason for force-assigning? (test only, min 5 chars)",
                        );
                        if (!reason || reason.trim().length < 5) return;
                        forceAssignMutation.mutate({
                          id: c.id,
                          clipperId: clipper.trim(),
                          postUrl: postUrl.trim(),
                          reason: reason.trim(),
                        });
                      }}
                      data-testid={`button-force-assign-${c.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Force-assign clipper
                    </Button>
                  )}
                  {c.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        const reason = window.prompt(
                          "Reason for cancelling? (min 5 chars)",
                        );
                        if (!reason || reason.trim().length < 5) return;
                        cancelMutation.mutate({ id: c.id, reason: reason.trim() });
                      }}
                      data-testid={`button-cancel-${c.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Cancel
                    </Button>
                  )}
                  <Link href={`/campaigns/${c.id}`}>
                    <Button size="sm" variant="ghost">
                      <RefreshCcw className="h-4 w-4 mr-1.5" />
                      View on creator side
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
