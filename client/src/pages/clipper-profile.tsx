import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  ArrowLeft,
  Eye,
  MousePointer,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";
import { ClipperProfileBlock } from "@/features/reviews/clipper-profile-block";

type Stats = {
  averageRating: string;
  totalReviews: number;
  totalCampaignsCompleted: number;
  totalViewsGenerated: number;
  totalClicksGenerated: number;
  totalSignupsGenerated: number;
};

// Phase 5 Slice E — verified track record aggregate, computed
// server-side from clipper_campaigns. Distinct from clipperStats
// (which is engagement metrics): this is the trust signal a creator
// looks at before approving an application.
type Reputation = {
  totalApplications: number;
  totalApproved: number;
  totalRejected: number;
  totalCompleted: number;
  approvalRate: number | null;
  avgTimeToApprovalSeconds: number | null;
  completionRate: number | null;
  topCreators: Array<{
    creatorId: string;
    creatorName: string | null;
    approvedCount: number;
    lastApprovedAt: string | null;
  }>;
};

type Review = {
  id: string;
  overallRating: string;
  reviewTitle: string;
  reviewText: string;
  wouldHireAgain: boolean;
  tags: string[] | null;
  createdAt: string;
  creatorName: string;
  campaignName: string;
};

export default function ClipperProfilePage() {
  const [, params] = useRoute("/clippers/:id");
  const [, setLocation] = useLocation();
  const clipperId = params?.id;

  const { data: profile, isLoading } = useQuery<{ stats: Stats | null; recentReviews: Review[] }>({
    queryKey: [`/api/clippers/${clipperId}/profile`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clipperId,
  });

  const { data: allReviews } = useQuery<Review[]>({
    queryKey: [`/api/clippers/${clipperId}/reviews`, { limit: 50 }],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clipperId,
  });

  const { data: reputation } = useQuery<Reputation>({
    queryKey: [`/api/clippers/${clipperId}/reputation`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clipperId,
  });

  if (!clipperId) {
    return (
      <DashboardLayout title="Clipper">
        <Card><CardContent className="p-6">Clipper id missing.</CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Clipper Profile">
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/clipper-directory")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to directory
        </Button>

        <ClipperProfileBlock clipperId={clipperId} reviewLimit={5} />

        {/* Phase 5 Slice E — Verified track record. Cross-campaign
            reputation: how often this clipper's submissions get
            approved, how fast creators decide, who they've worked
            with most. Renders even with zero history (the empty
            state is itself a useful signal). */}
        <VerifiedTrackRecord reputation={reputation} />

        {/* Lifetime engagement stats */}
        {profile?.stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifetime engagement generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Eye className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <div className="font-semibold">{profile.stats.totalViewsGenerated.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
                <div>
                  <MousePointer className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                  <div className="font-semibold">{profile.stats.totalClicksGenerated.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Clicks</div>
                </div>
                <div>
                  <UserPlus className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <div className="font-semibold">{profile.stats.totalSignupsGenerated.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Signups</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">All reviews</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="positive">Hire-again</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-2 mt-3">
                <ReviewList reviews={allReviews} loading={isLoading} />
              </TabsContent>
              <TabsContent value="positive" className="space-y-2 mt-3">
                <ReviewList reviews={(allReviews ?? []).filter(r => r.wouldHireAgain)} loading={isLoading} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function VerifiedTrackRecord({ reputation }: { reputation?: Reputation }) {
  if (!reputation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Verified track record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const {
    totalApproved,
    totalRejected,
    totalCompleted,
    approvalRate,
    avgTimeToApprovalSeconds,
    completionRate,
    topCreators,
  } = reputation;

  // Empty state — clipper has no decisions on file. Frame it as
  // "new" rather than "0%" so creators don't read it as failure.
  if (approvalRate === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Verified track record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No decisions on file yet — this clipper hasn't been reviewed
            on any campaign. Their first approval will start the record.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Verified track record
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Approved"
            value={totalApproved.toLocaleString()}
            sub={
              approvalRate !== null
                ? `${(approvalRate * 100).toFixed(0)}% approval rate`
                : undefined
            }
          />
          <Stat
            icon={<XCircle className="h-4 w-4 text-rose-600" />}
            label="Rejected"
            value={totalRejected.toLocaleString()}
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
            label="Completed"
            value={totalCompleted.toLocaleString()}
            sub={
              completionRate !== null
                ? `${(completionRate * 100).toFixed(0)}% of approved`
                : undefined
            }
          />
          <Stat
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            label="Avg approval time"
            value={formatDuration(avgTimeToApprovalSeconds)}
          />
        </div>

        {topCreators.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top creators worked with
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topCreators.map((c) => (
                <Badge
                  key={c.creatorId}
                  variant="outline"
                  className="text-xs"
                  title={
                    c.lastApprovedAt
                      ? `Last approved ${new Date(c.lastApprovedAt).toLocaleDateString()}`
                      : undefined
                  }
                >
                  {c.creatorName ?? "Creator"} · {c.approvedCount}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border p-3 space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// Format a duration in seconds as "12m" / "3.4h" / "2.1d". Returns
// "—" for null so the stat tile renders without a layout jump.
function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

function ReviewList({ reviews, loading }: { reviews?: Review[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!reviews || reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews to show.</p>;
  }
  return (
    <div className="space-y-2">
      {reviews.map((r) => (
        <div key={r.id} className="border rounded p-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{parseFloat(r.overallRating).toFixed(1)}</span>
              <span className="text-muted-foreground">· {r.creatorName} · {r.campaignName}</span>
            </div>
            <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="font-medium text-sm">{r.reviewTitle}</div>
          <div className="text-sm text-muted-foreground">{r.reviewText}</div>
          {r.tags && r.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap pt-1">
              {r.tags.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
