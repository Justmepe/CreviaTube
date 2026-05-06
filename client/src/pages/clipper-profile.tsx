import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, ArrowLeft, Eye, MousePointer, UserPlus } from "lucide-react";
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
