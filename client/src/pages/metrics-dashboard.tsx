import { useQuery, useMutation } from "@tanstack/react-query";
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
  Smartphone
} from "lucide-react";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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

  const { data: metrics, isLoading, error } = useQuery<MetricsData>({
    queryKey: ["/api/metrics"],
    queryFn: getQueryFn(),
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
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Failed to load metrics</CardTitle>
            <CardDescription className="text-red-600">
              There was an error loading your metrics data.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics Dashboard</h1>
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
          {user?.userType === 'trader_creator' && (
            <TabsTrigger value="trading">Trading</TabsTrigger>
          )}
          {(user?.userType === 'entrepreneur' || user?.userType === 'enterprise') && (
            <TabsTrigger value="website">Website</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Followers Across Platforms */}
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
                  Across {Object.keys(metrics?.social || {}).length} platforms
                </p>
              </CardContent>
            </Card>

            {/* Total Views/Impressions */}
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
                <p className="text-xs text-muted-foreground">
                  Views & impressions
                </p>
              </CardContent>
            </Card>

            {/* Trading Balance (if trader) */}
            {user?.userType === 'trader_creator' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      Object.values(metrics?.trading || {}).reduce((sum, broker) => {
                        return sum + (broker.metrics.accountBalance || broker.metrics.portfolioValue || 0);
                      }, 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across {Object.keys(metrics?.trading || {}).length} brokers
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Website Traffic (if entrepreneur) */}
            {(user?.userType === 'entrepreneur' || user?.userType === 'enterprise') && (
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
                  <p className="text-xs text-muted-foreground">
                    Unique visitors
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Engagement Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(Object.values(metrics?.social || {}).reduce((sum, platform, _, arr) => {
                    return sum + (platform.metrics.engagementRate || 0);
                  }, 0) / Math.max(Object.keys(metrics?.social || {}).length, 1)).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Engagement rate
                </p>
              </CardContent>
            </Card>
          </div>
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
                <Button variant="outline" className="w-full">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Connect Social Accounts
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {user?.userType === 'trader_creator' && (
          <TabsContent value="trading" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metrics?.trading || {}).map(([brokerId, data]) => {
                const m = data.metrics;
                
                return (
                  <Card key={brokerId}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          {brokerId}
                        </CardTitle>
                        <Badge variant="outline">
                          {new Date(data.lastSyncAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Account Balance</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(m.accountBalance || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total P&L</p>
                          <p className={`text-lg font-semibold ${(m.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(m.profitLoss || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Trades</p>
                          <p className="text-lg font-semibold">{m.totalTrades || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Win Rate</p>
                          <p className="text-lg font-semibold">
                            {(m.winRate || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      {m.winRate && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Performance</p>
                            <Progress value={m.winRate} className="h-2" />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {Object.keys(metrics?.trading || {}).length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No trading accounts connected</CardTitle>
                  <CardDescription>
                    Connect your trading accounts to track your performance and share results with your audience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Connect Trading Accounts
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {(user?.userType === 'entrepreneur' || user?.userType === 'enterprise') && (
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
  );
}