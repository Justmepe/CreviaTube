// Admin campaigns list — master view. Each row is clickable and
// routes to /admin/campaigns/:id where all per-campaign actions live
// (Force fund, Force-assign clipper, Cancel, view submissions, view
// audit history). Keeping the list lean means admins can scan the
// platform quickly without visual clutter.

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, Activity, ChevronRight } from "lucide-react";

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

  const { data: campaigns, isLoading } = useQuery<AdminCampaign[]>({
    queryKey: ["/api/admin/campaigns"],
  });

  // Global action — runs the polling sweep across every eligible
  // submission, not scoped to a campaign. Keep it on the list page so
  // admins can trigger it without picking a campaign first.
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
              Click any campaign to open its detail page with admin
              actions (force fund, force-assign clipper, cancel, view
              submissions + audit history).
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
          <div className="space-y-2">
            {items.map((c) => (
              <Link key={c.id} href={`/admin/campaigns/${c.id}`}>
                <Card
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  data-testid={`admin-campaign-row-${c.id}`}
                >
                  <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {c.id}
                      </div>
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
