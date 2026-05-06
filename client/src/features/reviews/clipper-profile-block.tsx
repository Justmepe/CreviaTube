import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp, Award, Users, ThumbsUp, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";

type Stats = {
  averageRating: string;
  totalReviews: number;
  totalCampaignsCompleted: number;
  successRate: string;
  tier: string;
  qualityAverage: string;
  communicationAverage: string;
  timelinessAverage: string;
  creativityAverage: string;
  professionalismAverage: string;
  positiveRecommendations: number;
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

type Profile = { stats: Stats | null; recentReviews: Review[] };

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  bronze:   { label: "🥉 Bronze",   className: "bg-orange-100 text-orange-800" },
  silver:   { label: "🥈 Silver",   className: "bg-gray-100 text-gray-800" },
  gold:     { label: "🥇 Gold",     className: "bg-yellow-100 text-yellow-800" },
  platinum: { label: "💎 Platinum", className: "bg-purple-100 text-purple-800" },
  diamond:  { label: "💫 Diamond",  className: "bg-blue-100 text-blue-800" },
};

interface Props {
  clipperId: string;
  /** Show a "See full profile" link below the recent reviews. */
  showProfileLink?: boolean;
  /** How many recent reviews to surface (capped by API at 5). */
  reviewLimit?: number;
}

/**
 * Block-level clipper rating + reviews card.
 * Drops into the application-review side panel and the dedicated profile page.
 */
export function ClipperProfileBlock({ clipperId, showProfileLink = false, reviewLimit = 3 }: Props) {
  const { data, isLoading } = useQuery<Profile>({
    queryKey: [`/api/clippers/${clipperId}/profile`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clipperId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const stats = data?.stats;
  if (!stats || stats.totalReviews === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">New clipper.</span> No reviews yet.
            {stats && stats.totalCampaignsCompleted > 0 && (
              <> Has completed {stats.totalCampaignsCompleted} campaign{stats.totalCampaignsCompleted === 1 ? "" : "s"}.</>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rating = parseFloat(stats.averageRating);
  const successRate = parseFloat(stats.successRate);
  const tierBadge = TIER_BADGES[stats.tier] ?? { label: stats.tier, className: "bg-gray-100 text-gray-800" };
  const reviews = (data?.recentReviews ?? []).slice(0, reviewLimit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground font-normal">
              · {stats.totalReviews} review{stats.totalReviews === 1 ? "" : "s"}
            </span>
          </CardTitle>
          <Badge className={tierBadge.className}>{tierBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-blue-50 rounded">
            <Users className="h-4 w-4 mx-auto mb-1 text-blue-600" />
            <div className="text-muted-foreground">Campaigns</div>
            <div className="font-semibold">{stats.totalCampaignsCompleted}</div>
          </div>
          <div className="p-2 bg-emerald-50 rounded">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
            <div className="text-muted-foreground">Success rate</div>
            <div className="font-semibold">{Number.isFinite(successRate) ? `${successRate.toFixed(0)}%` : "—"}</div>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-purple-600" />
            <div className="text-muted-foreground">Hire-again</div>
            <div className="font-semibold">{stats.positiveRecommendations}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <Sub label="Quality"        v={stats.qualityAverage} />
          <Sub label="Communication"  v={stats.communicationAverage} />
          <Sub label="Timeliness"     v={stats.timelinessAverage} />
          <Sub label="Creativity"     v={stats.creativityAverage} />
          <Sub label="Professionalism" v={stats.professionalismAverage} />
        </div>

        {reviews.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground">Recent reviews</div>
            {reviews.map((r) => (
              <div key={r.id} className="border rounded p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{parseFloat(r.overallRating).toFixed(1)}</span>
                    <span className="text-muted-foreground">· {r.creatorName}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="font-medium">{r.reviewTitle}</div>
                <div className="text-muted-foreground line-clamp-3">{r.reviewText}</div>
              </div>
            ))}
          </div>
        )}

        {showProfileLink && (
          <Link href={`/clippers/${clipperId}`} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
            See full profile <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function Sub({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        {parseFloat(v || "0").toFixed(1)}
      </span>
    </div>
  );
}
