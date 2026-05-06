import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

type ClipperProfileResponse = {
  stats: {
    averageRating: string;
    totalReviews: number;
    totalCampaignsCompleted: number;
    tier: string;
  } | null;
  recentReviews: unknown[];
};

interface ClipperRatingProps {
  clipperId: string;
  /** Render as a link to the clipper profile page. */
  asLink?: boolean;
  className?: string;
}

/**
 * Compact rating badge: ★ 4.8 · 12 reviews
 * Renders nothing if the clipper has no reviews yet (avoids confusing 0.0 stars).
 */
export function ClipperRating({ clipperId, asLink = false, className = "" }: ClipperRatingProps) {
  const { data, isLoading } = useQuery<ClipperProfileResponse>({
    queryKey: [`/api/clippers/${clipperId}/profile`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!clipperId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <Skeleton className={`h-4 w-20 ${className}`} />;

  const stats = data?.stats;
  if (!stats || stats.totalReviews === 0) {
    return <span className={`text-xs text-muted-foreground ${className}`}>No reviews yet</span>;
  }

  const rating = parseFloat(stats.averageRating || "0");

  const content = (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">· {stats.totalReviews} review{stats.totalReviews === 1 ? "" : "s"}</span>
    </span>
  );

  if (asLink) {
    return (
      <Link href={`/clippers/${clipperId}`} className="hover:underline">
        {content}
      </Link>
    );
  }
  return content;
}
