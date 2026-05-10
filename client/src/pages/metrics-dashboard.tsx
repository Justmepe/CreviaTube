import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  MousePointer,
  RefreshCw,
  Instagram,
  Youtube,
  Twitter,
  Music,
  BarChart3,
  Globe,
  Smartphone,
  Activity,
  Target,
} from "lucide-react";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { goalsForAccountType, type AccountType } from "../../../shared/goal-options";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardTypeExplanation } from "@/components/dashboard-type-explanation";

interface MetricsData {
  social: Record<string, {
    metrics: any;
    lastSyncAt: string;
  }>;
  trading: Record<string, {
    metrics: any;
    lastSyncAt: string;
  }>;
  website: Record<string, {
    metrics: any;
    lastSyncAt: string;
  }>;
}

// Aggregate campaign-side metrics for a creator. Returned by
// GET /api/metrics/campaigner — bot/test filters applied so numbers
// match the per-campaign progress bars on /my-campaigns.
interface CampaignerMetrics {
  campaigns: { active: number; draft: number; completed: number; total: number };
  budget: { total: number; funded: number };
  revenue: number;
  events: {
    views: number;
    clicks: number;
    signups: number;
    conversions: number;
    purchases: number;
    leads: number;
    installs: number;
    subscribes: number;
    follows: number;
    codeRedemptions: number;
  };
  clippers: { approved: number; goalsHit: number; pendingApplications: number };
}

const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  tiktok: Music,
  facebook: Users
};

export default function MetricsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: metrics, isLoading, error } = useQuery<MetricsData>({
    queryKey: ["/api/metrics"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Phase 4 — campaign-driven metrics. Only loads for creators (the
  // endpoint 403s for clippers/admins) and lights up a "Campaign
  // performance" section on the Overview tab. Same bot/test filters
  // as the per-campaign progress bars on /my-campaigns.
  const { data: campaignerMetrics } = useQuery<CampaignerMetrics>({
    queryKey: ["/api/metrics/campaigner"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user && user.role === "creator",
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/metrics/sync");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Metrics synced successfully",
        description: "Your latest metrics have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Metrics Dashboard">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Metrics Dashboard">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Failed to load metrics</CardTitle>
            <CardDescription className="text-red-600">
              There was an error loading your metrics data.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 5) return "text-green-600";
    if (rate >= 2) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <DashboardLayout title="Metrics Dashboard">
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">
            Track your performance across all platforms
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          {user?.accountType === 'business' && (
            <TabsTrigger value="website">Website</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Phase 4 — campaign-driven metrics. Only renders for creators
              (business / founder / influencer). Sits above the social
              numbers because for a campaigner, what their campaigns are
              doing is the headline; their personal social profile stats
              are secondary. */}
          {user?.role === "creator" && campaignerMetrics && (() => {
            // Resolve the persona's goal catalog so the metric tiles
            // mirror exactly what they can target at campaign creation.
            // A founder doesn't see "Subscribers" or "Follows" tiles
            // (those goals aren't offered to founders); a business sees
            // "Revenue" and "Code redemptions" but not "Follows".
            const accountType = (user.accountType ?? "business") as AccountType;
            const personaGoals = goalsForAccountType(accountType);

            // Map each goal to its current aggregate value from the
            // /api/metrics/campaigner response.
            const eventValueByGoal: Record<string, { value: number; isCurrency: boolean }> = {
              views:            { value: campaignerMetrics.events.views, isCurrency: false },
              clicks:           { value: campaignerMetrics.events.clicks, isCurrency: false },
              signups:          { value: campaignerMetrics.events.signups, isCurrency: false },
              conversions:      { value: campaignerMetrics.events.conversions, isCurrency: false },
              follows:          { value: campaignerMetrics.events.follows, isCurrency: false },
              subscribes:       { value: campaignerMetrics.events.subscribes, isCurrency: false },
              installs:         { value: campaignerMetrics.events.installs, isCurrency: false },
              leads:            { value: campaignerMetrics.events.leads, isCurrency: false },
              code_redemptions: { value: campaignerMetrics.events.codeRedemptions, isCurrency: false },
              revenue:          { value: campaignerMetrics.revenue, isCurrency: true },
              // ugc_volume tracks approved+post_url submissions; we
              // don't expose it on the campaigner aggregate yet, leave 0.
              ugc_volume:       { value: 0, isCurrency: false },
            };

            // Pick the persona's "headline" goal — the one most central
            // to that persona's reason-for-being on the platform.
            const HEADLINE_GOAL_BY_PERSONA: Record<AccountType, string> = {
              business: "revenue",
              founder: "installs",
              influencer: "views",
            };
            const headlineGoalId = HEADLINE_GOAL_BY_PERSONA[accountType] ?? "views";
            const headlineGoal = personaGoals.find((g) => g.id === headlineGoalId);
            const headlineMetric = eventValueByGoal[headlineGoalId];

            return (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Campaign performance</h3>
                  <span className="text-xs text-slate-500">
                    Across {campaignerMetrics.campaigns.total} campaign
                    {campaignerMetrics.campaigns.total === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Headline row — three universal operational stats
                    (Active campaigns / Approved clippers / Goals hit)
                    plus one persona-specific KPI in the 4th slot. */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active campaigns</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{campaignerMetrics.campaigns.active}</div>
                      <p className="text-xs text-muted-foreground">
                        {campaignerMetrics.campaigns.draft} draft ·{" "}
                        {campaignerMetrics.campaigns.completed} completed
                      </p>
                    </CardContent>
                  </Card>

                  {/* Persona-specific KPI: business → revenue, founder
                      → installs, influencer → views. Falls back to a
                      generic Goals-hit count if the persona has no
                      headline goal in the catalog. */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {headlineGoal?.label ?? "Headline goal"}
                      </CardTitle>
                      {headlineMetric?.isCurrency ? (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {headlineMetric?.isCurrency
                          ? formatCurrency(headlineMetric.value)
                          : formatNumber(headlineMetric?.value ?? 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total verified across your campaigns
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved clippers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{campaignerMetrics.clippers.approved}</div>
                      <p className="text-xs text-muted-foreground">
                        {campaignerMetrics.clippers.pendingApplications} pending review
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Goals hit</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{campaignerMetrics.clippers.goalsHit}</div>
                      <p className="text-xs text-muted-foreground">Bonus payouts released</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Per-goal tile row, filtered to this persona's catalog.
                    A founder sees Views/Clicks/Signups/Installs/Leads/
                    Code-redemptions; an influencer sees Views/Follows/
                    Clicks/Subscribes; a business sees their own set —
                    each tile maps 1:1 to a goal they can run, so the
                    metric vocabulary on this page matches the goal
                    vocabulary on the create-campaign form. */}
                {personaGoals.length > 0 && (
                  <>
                    <div className="text-xs uppercase tracking-wider font-medium text-slate-500 pt-3">
                      Verified by goal
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {personaGoals.map((goal) => {
                        const m = eventValueByGoal[goal.id];
                        const isCurrency = m?.isCurrency ?? false;
                        const display = m
                          ? isCurrency
                            ? formatCurrency(m.value)
                            : formatNumber(m.value)
                          : "0";
                        return (
                          <div
                            key={goal.id}
                            className="rounded-md border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="text-xs text-slate-500 truncate" title={goal.label}>
                              {goal.label}
                            </div>
                            <div className="text-lg font-semibold text-slate-900">{display}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Existing social-platform stats — your own profile, not
              your campaigns. Hidden entirely when nothing is connected
              (was rendering all-zero cards which made the page feel
              broken for fresh accounts and any non-influencer persona).
              The "Connect Social Accounts" CTA on the Social Media tab
              and the Settings page is the path back. */}
          {(() => {
            const hasSocial = Object.keys(metrics?.social || {}).length > 0;
            const hasWebsite =
              user?.accountType === "business" &&
              Object.keys(metrics?.website || {}).length > 0;
            if (!hasSocial && !hasWebsite) return null;
            return (
              <>
                <h3 className="text-sm font-semibold text-slate-900 pt-4">
                  {user?.role === "creator" ? "Your social profiles" : "Your channels"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {hasSocial && (
                    <>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatNumber(
                              Object.values(metrics?.social || {}).reduce((sum, platform) => {
                                return sum + (platform.metrics.followers || platform.metrics.subscribers || 0);
                              }, 0)
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Across {Object.keys(metrics?.social || {}).length} platform
                            {Object.keys(metrics?.social || {}).length === 1 ? "" : "s"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatNumber(
                              Object.values(metrics?.social || {}).reduce((sum, platform) => {
                                return sum + (platform.metrics.views || platform.metrics.impressions || 0);
                              }, 0)
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Views & impressions</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {(Object.values(metrics?.social || {}).reduce((sum, platform) => {
                              return sum + (platform.metrics.engagementRate || 0);
                            }, 0) / Math.max(Object.keys(metrics?.social || {}).length, 1)).toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Engagement rate</p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                  {hasWebsite && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Visitors</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatNumber(
                            Object.values(metrics?.website || {}).reduce((sum, site) => {
                              return sum + (site.metrics.uniqueVisitors || 0);
                            }, 0)
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Unique visitors</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(metrics?.social || {}).map(([platform, data]) => {
              const Icon = platformIcons[platform as keyof typeof platformIcons] || Globe;
              const m = data.metrics;
              
              return (
                <Card key={platform}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 capitalize">
                        <Icon className="h-5 w-5" />
                        {platform}
                      </CardTitle>
                      <Badge variant="outline">
                        {new Date(data.lastSyncAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Followers</p>
                        <p className="text-lg font-semibold">
                          {formatNumber(m.followers || m.subscribers || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Posts/Videos</p>
                        <p className="text-lg font-semibold">
                          {formatNumber(m.posts || m.videos || m.tweets || 0)}
                        </p>
                      </div>
                      {m.views && (
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="text-lg font-semibold">{formatNumber(m.views)}</p>
                        </div>
                      )}
                      {m.engagementRate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Engagement</p>
                          <p className={`text-lg font-semibold ${getEngagementColor(m.engagementRate)}`}>
                            {m.engagementRate.toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {(m.impressions || m.reach) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          {m.impressions && (
                            <div>
                              <p className="text-sm text-muted-foreground">Impressions</p>
                              <p className="text-lg font-semibold">{formatNumber(m.impressions)}</p>
                            </div>
                          )}
                          {m.reach && (
                            <div>
                              <p className="text-sm text-muted-foreground">Reach</p>
                              <p className="text-lg font-semibold">{formatNumber(m.reach)}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {Object.keys(metrics?.social || {}).length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No social media accounts connected</CardTitle>
                <CardDescription>
                  Connect your social media accounts to track your performance metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/social-integration")}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Connect Social Accounts
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {user?.accountType === 'business' && (
          <TabsContent value="website" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(metrics?.website || {}).map(([websiteUrl, data]) => {
                const m = data.metrics;
                
                return (
                  <Card key={websiteUrl}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          {websiteUrl === 'analytics-only' ? 'Analytics Data' : websiteUrl}
                        </CardTitle>
                        <Badge variant="outline">
                          {new Date(data.lastSyncAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Page Views</p>
                          <p className="text-lg font-semibold">
                            {formatNumber(m.pageViews || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Unique Visitors</p>
                          <p className="text-lg font-semibold">
                            {formatNumber(m.uniqueVisitors || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Bounce Rate</p>
                          <p className="text-lg font-semibold">
                            {(m.bounceRate || 0).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Conversions</p>
                          <p className="text-lg font-semibold">
                            {m.conversions || 0}
                          </p>
                        </div>
                      </div>
                      
                      {m.conversionRate && (
                        <>
                          <Separator className="my-4" />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Conversion Rate</p>
                              <p className="text-lg font-semibold text-green-600">
                                {m.conversionRate.toFixed(2)}%
                              </p>
                            </div>
                            {m.revenue && (
                              <div>
                                <p className="text-sm text-muted-foreground">Revenue</p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(m.revenue)}
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {Object.keys(metrics?.website || {}).length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No website analytics connected</CardTitle>
                  <CardDescription>
                    Connect Google Analytics and other tools to track your website performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Globe className="h-4 w-4 mr-2" />
                    Connect Analytics
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
      </div>
    </DashboardLayout>
  );
}