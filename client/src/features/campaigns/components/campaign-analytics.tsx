import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Target, 
  DollarSign,
  Eye,
  MousePointer,
  UserPlus,
  Wallet,
  Activity,
  Trophy,
  Calendar,
  Zap
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface CampaignAnalytics {
  overview: {
    totalSpent: number;
    remainingBudget: number;
    burnRate: number;
    estimatedDaysLeft: number;
    roi: number;
    conversionRate: number;
  };
  performance: {
    totalViews: number;
    totalClicks: number;
    totalSignups: number;
    totalDeposits: number;
    totalTrades: number;
    totalConversions: number;
    clickThroughRate: number;
    signupRate: number;
    depositRate: number;
  };
  clippers: {
    totalClippers: number;
    activeClippers: number;
    completedClippers: number;
    avgPerformance: number;
    topPerformers: Array<{
      clipperId: string;
      clipperName: string;
      totalRewards: number;
      totalViews: number;
      totalClicks: number;
      conversionRate: number;
    }>;
  };
  timeline: {
    dailySpending: Array<{
      date: string;
      spending: number;
      rewards: number;
      clippers: number;
    }>;
    goalProgress: Array<{
      goalType: string;
      target: number;
      achieved: number;
      progress: number;
    }>;
  };
}

interface CampaignAnalyticsProps {
  campaignId: string;
  campaignName?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function CampaignAnalytics({ campaignId, campaignName = "Campaign" }: CampaignAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("7d");

  const { data: analytics, isLoading, error } = useQuery<CampaignAnalytics>({
    queryKey: ["/api/campaigns", campaignId, "analytics", timeframe],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Analytics</h3>
            <p className="text-muted-foreground">
              There was an error loading analytics data for this campaign.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{campaignName} Analytics</h2>
        </div>
        <div className="flex gap-2">
          {["24h", "7d", "30d"].map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(period as "24h" | "7d" | "30d")}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold">{formatCurrency(analytics.overview.totalSpent)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Burn rate: {formatCurrency(analytics.overview.burnRate)}/day
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className={`text-xl font-bold ${analytics.overview.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(analytics.overview.roi)}
                </p>
              </div>
              {analytics.overview.roi >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Conversion: {formatPercentage(analytics.overview.conversionRate)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Clippers</p>
                <p className="text-xl font-bold">{analytics.clippers.activeClippers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {analytics.clippers.completedClippers} completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Left</p>
                <p className="text-xl font-bold">
                  {analytics.overview.estimatedDaysLeft > 0 ? 
                    `${analytics.overview.estimatedDaysLeft}d` : "∞"
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Budget remaining: {formatCurrency(analytics.overview.remainingBudget)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="clippers">Clippers</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Views</span>
                    </div>
                    <span className="font-semibold">{formatNumber(analytics.performance.totalViews)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Clicks</span>
                    </div>
                    <span className="font-semibold">{formatNumber(analytics.performance.totalClicks)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Signups</span>
                    </div>
                    <span className="font-semibold">{formatNumber(analytics.performance.totalSignups)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Deposits</span>
                    </div>
                    <span className="font-semibold">{formatNumber(analytics.performance.totalDeposits)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Conversion Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Click-Through Rate</span>
                      <span className="font-semibold">{formatPercentage(analytics.performance.clickThroughRate)}</span>
                    </div>
                    <Progress value={analytics.performance.clickThroughRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Signup Rate</span>
                      <span className="font-semibold">{formatPercentage(analytics.performance.signupRate)}</span>
                    </div>
                    <Progress value={analytics.performance.signupRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Deposit Rate</span>
                      <span className="font-semibold">{formatPercentage(analytics.performance.depositRate)}</span>
                    </div>
                    <Progress value={analytics.performance.depositRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance Trend</CardTitle>
              <CardDescription>Spending and activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.timeline.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'spending' ? formatCurrency(value as number) : value,
                        name === 'spending' ? 'Spending' : name === 'rewards' ? 'Rewards' : 'Clippers'
                      ]}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line type="monotone" dataKey="spending" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="rewards" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clippers Tab */}
        <TabsContent value="clippers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clipper Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{analytics.clippers.totalClippers}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{analytics.clippers.activeClippers}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{analytics.clippers.completedClippers}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Performance</p>
                    <p className="text-xl font-bold">{formatCurrency(analytics.clippers.avgPerformance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.clippers.topPerformers.slice(0, 5).map((performer, index) => (
                    <div key={performer.clipperId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{performer.clipperName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(performer.totalViews)} views • {formatNumber(performer.totalClicks)} clicks
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(performer.totalRewards)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(performer.conversionRate)} CVR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goal Progress
                </CardTitle>
                <CardDescription>
                  Individual clipper completion goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.timeline.goalProgress.map((goal) => (
                    <div key={goal.goalType} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{goal.goalType}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(goal.achieved)} / {formatNumber(goal.target)}
                        </span>
                      </div>
                      <Progress value={Math.min(goal.progress, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatPercentage(goal.progress)} complete</span>
                        <Badge variant={goal.progress >= 100 ? "default" : "secondary"} className="text-xs">
                          {goal.progress >= 100 ? "Goal Reached" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Goal Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.timeline.goalProgress}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ goalType, progress }) => `${goalType}: ${progress.toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="progress"
                      >
                        {analytics.timeline.goalProgress.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Timeline</CardTitle>
              <CardDescription>Daily spending and activity trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.timeline.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'spending' ? formatCurrency(value as number) : value,
                        name === 'spending' ? 'Daily Spending' : name === 'rewards' ? 'Rewards Given' : 'Active Clippers'
                      ]}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="spending" fill="#8884d8" />
                    <Bar dataKey="clippers" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}