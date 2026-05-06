import { Sparkles, Target } from "lucide-react";

interface CampaignMatchBadgeProps {
  matchScore?: number; // 0..1
  matchedPlatforms?: string[];
  className?: string;
}

/**
 * Compact match indicator for campaign cards.
 * - 100%   → green "Perfect match" pill
 * - 50–99% → blue "{X}% match" pill
 * - 1–49%  → amber "{X}% match" pill
 * - 0%     → grey "Outside your platforms" pill
 *
 * Renders nothing if matchScore is undefined (e.g. data fetched from a non-matching endpoint).
 */
export function CampaignMatchBadge({ matchScore, matchedPlatforms, className = "" }: CampaignMatchBadgeProps) {
  if (matchScore === undefined || matchScore === null) return null;
  const pct = Math.round(matchScore * 100);

  const tone =
    pct >= 100 ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : pct >= 50 ? "bg-blue-100 text-blue-800 border-blue-200"
    : pct > 0   ? "bg-amber-100 text-amber-800 border-amber-200"
    :             "bg-slate-100 text-slate-600 border-slate-200";

  const label =
    pct >= 100 ? "Perfect match"
    : pct > 0  ? `${pct}% match`
    :            "Outside your platforms";

  const Icon = pct >= 100 ? Sparkles : Target;
  const platformNote = matchedPlatforms && matchedPlatforms.length > 0
    ? matchedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${tone} ${className}`}
      title={platformNote ? `Matched on: ${platformNote}` : "No platform overlap with this campaign"}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {platformNote && <span className="opacity-75 ml-1">· {platformNote}</span>}
    </span>
  );
}
