// Phase 6 Slice E — Premium creator analytics dashboard.
//
// Premium-gated. Free creators see a teaser card that links to
// /premium with the upgrade CTA. The API returns 403 with
// { requiresPremium: true } for non-Premium, which we detect via
// the React Query error shape.

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Crown,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Analytics {
  totals: {
    campaigns: number;
    applications: number;
    approved: number;
    completed: number;
    paidOut: string;
  };
  timeToFirstApproval: {
    medianSeconds: number | null;
    p90Seconds: number | null;
    sampleSize: number;
  };
  topClippersPerGoal: Array<{
    goalType: string;
    clipperId: string;
    clipperName: string | null;
    approvedCount: number;
  }>;
  perCampaign: Array<{
    campaignId: string;
    campaignName: string;
    applications: number;
    approved: number;
    completed: number;
    conversionRate: number | null;
  }>;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function CreatorAnalyticsPage() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<Analytics>({
    queryKey: ["/api/creator/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/creator/analytics", { credentials: "include" });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.requiresPremium ? "PREMIUM_REQUIRED" : "FORBIDDEN");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    retry: false,
  });

  // Teaser state — free creator hitting a Premium-gated page.
  if (error?.message === "PREMIUM_REQUIRED") {
    return (
      <DashboardLayout title="Analytics">
        <div className="max-w-2xl mx-auto py-10">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-700" />
                Advanced analytics is a Founding Creator perk
              </CardTitle>
              <CardDescription>
                Per-campaign breakouts, time-to-conversion, top-performing
                clippers per goal. Locked at $15/mo for life if you claim a
                Founding seat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => setLocation("/premium")}
              >
                <Crown className="h-4 w-4 mr-2" />
                See the Founding offer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics">
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold">Advanced analytics</h1>
          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">
            Premium
          </Badge>
        </div>

        {isLoading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Top-line totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat icon={<BarChart3 className="h-4 w-4 text-blue-600" />} label="Campaigns" value={String(data.totals.campaigns)} />
              <Stat icon={<Users className="h-4 w-4 text-purple-600" />} label="Applications" value={data.totals.applications.toLocaleString()} />
              <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Approved" value={data.totals.approved.toLocaleString()} />
              <Stat icon={<TrendingUp className="h-4 w-4 text-amber-600" />} label="Completed" value={data.totals.completed.toLocaleString()} />
              <Stat
                icon={<Crown className="h-4 w-4 text-rose-600" />}
                label="Paid out"
                value={`$${Number(data.totals.paidOut).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              />
            </div>

            {/* Time-to-approval */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Time to first approval
                </CardTitle>
                <CardDescription>
                  How long it takes you to review and approve a clipper after they apply.
                  Sample of {data.timeToFirstApproval.sampleSize} approved applications.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat
                  icon={<Clock className="h-4 w-4 text-blue-600" />}
                  label="Median"
                  value={formatDuration(data.timeToFirstApproval.medianSeconds)}
                />
                <Stat
                  icon={<Clock className="h-4 w-4 text-amber-600" />}
                  label="90th percentile"
                  value={formatDuration(data.timeToFirstApproval.p90Seconds)}
                />
              </CardContent>
            </Card>

            {/* Top clippers per goal */}
            {data.topClippersPerGoal.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top clippers by goal</CardTitle>
                  <CardDescription>
                    Who delivers the most for each campaign goal type you've run.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-600 uppercase">
                      <tr>
                        <th className="py-2">Goal</th>
                        <th className="py-2">Clipper</th>
                        <th className="py-2 text-right">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topClippersPerGoal.map((row, i) => (
                        <tr key={`${row.goalType}-${row.clipperId}-${i}`} className="border-t">
                          <td className="py-2">
                            <Badge variant="outline" className="text-xs">{row.goalType}</Badge>
                          </td>
                          <td className="py-2">{row.clipperName ?? "—"}</td>
                          <td className="py-2 text-right font-medium">{row.approvedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Per-campaign breakdown */}
            {data.perCampaign.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Per campaign</CardTitle>
                  <CardDescription>
                    Application → approval funnel for each of your campaigns.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-600 uppercase">
                      <tr>
                        <th className="py-2">Campaign</th>
                        <th className="py-2 text-right">Applications</th>
                        <th className="py-2 text-right">Approved</th>
                        <th className="py-2 text-right">Completed</th>
                        <th className="py-2 text-right">Conv. rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perCampaign.map((c) => (
                        <tr key={c.campaignId} className="border-t">
                          <td className="py-2 max-w-[300px] truncate">{c.campaignName}</td>
                          <td className="py-2 text-right">{c.applications}</td>
                          <td className="py-2 text-right">{c.approved}</td>
                          <td className="py-2 text-right">{c.completed}</td>
                          <td className="py-2 text-right">
                            {c.conversionRate === null
                              ? "—"
                              : `${(c.conversionRate * 100).toFixed(0)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border p-3 space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}
