import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe2 } from "lucide-react";

const CONTINENT_NAMES: Record<string, string> = {
  NA: "North America",
  SA: "South America",
  EU: "Europe",
  AF: "Africa",
  AS: "Asia",
  OC: "Oceania",
  AN: "Antarctica",
  unknown: "Unverified",
};

export function RegionCoverageCard({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useQuery<{
    totalClippers: number;
    byContinent: Record<string, number>;
    byCountry: Record<string, number>;
  }>({
    queryKey: [`/api/campaigns/${campaignId}/region-coverage`],
    enabled: !!campaignId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="w-4 h-4 text-blue-700" />
            Region coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">Loading…</CardContent>
      </Card>
    );
  }

  if (!data || data.totalClippers === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="w-4 h-4 text-blue-700" />
            Region coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            Region coverage will appear here once clippers start working on this campaign.
            Each clipper's verified country adds to the breakdown — provable
            distribution in your target regions.
          </div>
        </CardContent>
      </Card>
    );
  }

  const continents = Object.entries(data.byContinent).sort((a, b) => b[1] - a[1]);
  const total = data.totalClippers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-700" />
            Region coverage
          </span>
          <span className="text-xs font-medium text-slate-500">
            {total} clipper{total === 1 ? "" : "s"} active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {continents.map(([code, count]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={code} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{CONTINENT_NAMES[code] || code}</span>
                <span className="text-slate-500">{count} ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-700 to-emerald-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {Object.keys(data.byCountry).length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-1.5">By country</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.byCountry).map(([cc, n]) => (
                <span
                  key={cc}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-slate-50 border border-slate-200"
                >
                  {cc} · {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
