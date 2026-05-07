import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolvePersona } from "@/features/personas/resolver";
import { getPersonaConfig } from "@/features/personas/registry";
import type { Persona } from "@/features/personas/types";
import { RegionCoverageCard } from "./region-coverage-card";
import {
  Plus,
  ArrowRight,
  Eye,
  MousePointerClick,
  UserPlus,
  TrendingUp,
  Heart,
  Crown,
  Smartphone,
  Wallet,
} from "lucide-react";

// Per-persona stat card configuration. Same skeleton, different framing
// per persona — brand sees a sales funnel, influencer sees audience growth,
// founder sees a validation funnel.
const PERSONA_STATS: Record<Persona, { label: string; icon: any }[]> = {
  brand: [
    { label: "Verified views",   icon: Eye },
    { label: "Clicks",           icon: MousePointerClick },
    { label: "Leads / signups",  icon: UserPlus },
    { label: "Conversions",      icon: TrendingUp },
  ],
  influencer: [
    { label: "Verified views",  icon: Eye },
    { label: "New followers",   icon: Heart },
    { label: "Engagements",     icon: MousePointerClick },
    { label: "Paid subscribers", icon: Crown },
  ],
  founder: [
    { label: "Verified views",  icon: Eye },
    { label: "Waitlist signups", icon: UserPlus },
    { label: "App installs",    icon: Smartphone },
    { label: "Activated users", icon: TrendingUp },
  ],
  clipper: [],
  admin: [],
};

const PERSONA_PILL_TONE: Record<Persona, string> = {
  brand:      "bg-blue-50 text-blue-700 border-blue-100",
  influencer: "bg-emerald-50 text-emerald-700 border-emerald-100",
  founder:    "bg-indigo-50 text-indigo-700 border-indigo-100",
  clipper:    "bg-amber-50 text-amber-700 border-amber-100",
  admin:      "bg-slate-100 text-slate-700 border-slate-200",
};

export default function CampaignerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const persona = resolvePersona(user as any);
  const config = getPersonaConfig(persona);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    enabled: !!user,
  });

  const myCampaigns = (campaigns as any[]).filter((c) => c.creatorId === user?.id);
  const fundedCount = myCampaigns.filter((c) => c.fundingStatus === "funded").length;
  const draftCount = myCampaigns.filter((c) => c.fundingStatus === "pending").length;

  // Most recent funded campaign — drives the region-coverage widget below.
  const featuredCampaign = myCampaigns
    .filter((c) => c.fundingStatus === "funded")
    .sort((a, b) => new Date(b.fundedAt || b.createdAt).getTime() - new Date(a.fundedAt || a.createdAt).getTime())[0];

  const totalEscrow = myCampaigns.reduce(
    (sum, c) => sum + (parseFloat(c.escrowBalance || "0")),
    0,
  );

  const stats = PERSONA_STATS[persona] || PERSONA_STATS.brand;

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${PERSONA_PILL_TONE[persona]}`}
              >
                {config.shortLabel}
              </span>
              <span className="text-xs text-slate-500">{config.oneLiner}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-slate-600 mt-1">
              {fundedCount > 0
                ? `${fundedCount} active campaign${fundedCount === 1 ? "" : "s"} working in your target regions.`
                : "Ready to spin up your first campaign?"}
            </p>
          </div>
          <Button
            onClick={() => setLocation("/campaigns/create")}
            className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 text-white shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New campaign
          </Button>
        </div>

        {/* Top stat strip — escrow + draft/active counts (real data) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</span>
                <Badge variant="secondary" className="text-xs">campaigns</Badge>
              </div>
              <div className="text-2xl font-bold">{fundedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drafts</span>
                <Badge variant="secondary" className="text-xs">awaiting funding</Badge>
              </div>
              <div className="text-2xl font-bold">{draftCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">In escrow</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold">{totalEscrow.toFixed(2)} <span className="text-sm font-normal text-slate-500">USDC</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">On Base</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-2xl font-bold">100<span className="text-sm font-normal text-slate-500">%</span></div>
              <div className="text-xs text-slate-500 mt-0.5">payouts on-chain</div>
            </CardContent>
          </Card>
        </div>

        {/* Persona-specific funnel framing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-slate-400 font-mono">{i + 1}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-500">{s.label}</div>
                    <div className="text-xl font-bold mt-1">—</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Funnel metrics surface here as soon as your campaigns start collecting verified events.
            </p>
          </CardContent>
        </Card>

        {/* Region coverage + recent campaigns */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Recent campaigns
                  <button
                    onClick={() => setLocation("/my-campaigns")}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-3 h-3" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="text-sm text-slate-500">Loading…</div>
                ) : myCampaigns.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-600 mb-4">No campaigns yet. Pick a starting point and run your first one.</p>
                    <Button onClick={() => setLocation("/campaigns/create")} variant="outline">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Create campaign
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {myCampaigns.slice(0, 5).map((c: any) => (
                      <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{c.name}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Badge variant="secondary" className="text-xs capitalize">{c.fundingStatus || "pending"}</Badge>
                            <span>·</span>
                            <span>{parseFloat(c.budget || "0").toFixed(2)} USDC budget</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setLocation(
                              c.fundingStatus === "funded"
                                ? `/campaigns/${c.id}`
                                : `/campaigns/${c.id}/funding`,
                            )
                          }
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          {c.fundingStatus === "funded" ? "View" : "Fund"} <ArrowRight className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Region coverage — only meaningful with a funded campaign to point at */}
          <div>
            {featuredCampaign ? (
              <RegionCoverageCard campaignId={featuredCampaign.id} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Region coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Once you fund a campaign, this card shows the verified geographic distribution of clippers working on it. Provable distribution in your target regions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
