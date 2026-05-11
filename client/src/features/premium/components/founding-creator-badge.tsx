// Phase 6 Slice F — Founding Creator badge.
//
// Drops next to creator names on:
//   - Clipper-side campaign cards (marketplace)
//   - Funding modal header
//   - Application review modal (creator side, on hovering their own
//     profile — minor self-recognition)
//   - Creator profile views
//
// Reads from GET /api/users/:id/premium-status. Cached with React
// Query so a marketplace grid with 30 cards only triggers one fetch
// per distinct creator. The badge renders nothing when the user
// isn't Premium — keeps the layout stable.

import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";

interface PremiumStatusResponse {
  isPremium: boolean;
  isFounder: boolean;
}

interface FoundingCreatorBadgeProps {
  userId: string;
  // "compact" renders just the crown icon, useful next to a username
  // in a tight space. "full" renders the icon + label, used on the
  // funding modal hero where there's room.
  variant?: "compact" | "full";
}

export function FoundingCreatorBadge({
  userId,
  variant = "compact",
}: FoundingCreatorBadgeProps) {
  const { data } = useQuery<PremiumStatusResponse>({
    queryKey: [`/api/users/${userId}/premium-status`],
    queryFn: getQueryFn<PremiumStatusResponse>({ on401: "throw" }),
    enabled: !!userId,
    // Premium status changes ~once a month at most; 5-minute stale
    // window keeps repeat renders cheap without going stale long.
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.isPremium) return null;

  const label = data.isFounder ? "Founding Creator" : "Pro";
  const tone = data.isFounder
    ? "bg-amber-100 text-amber-900 border-amber-300"
    : "bg-blue-100 text-blue-900 border-blue-300";

  if (variant === "compact") {
    return (
      <Badge
        variant="outline"
        className={`inline-flex items-center gap-1 text-xs ${tone}`}
        title={data.isFounder ? "Founding Creator (locked $15/mo for life)" : "Creator Pro"}
        data-testid={`badge-premium-${userId}`}
      >
        <Crown className="h-3 w-3" />
        <span className="hidden sm:inline">{label}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${tone}`}>
      <Crown className="h-4 w-4" />
      {label}
    </Badge>
  );
}
