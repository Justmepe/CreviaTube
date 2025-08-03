import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  AlertTriangle,
  Clock,
  CheckCircle,
  BarChart3,
  Wallet
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface Campaign {
  id: string;
  name: string;
  budget: number;
  budgetUsed: number;
  escrowBalance: number;
  platformFee: number;
  fundingStatus: "pending" | "funded" | "insufficient";
  status: "draft" | "active" | "paused" | "completed";
  duration: number;
  createdAt: string;
}

interface BudgetMetrics {
  totalSpent: number;
  remainingBudget: number;
  burnRate: number; // spending per day
  estimatedDaysLeft: number;
  clipperCount: number;
  avgSpendPerClipper: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: "reward" | "payout" | "escrow_release";
    description: string;
    timestamp: string;
  }>;
}

interface BudgetTrackerProps {
  campaignId: string;
  showDetails?: boolean;
}

export function BudgetTracker({ campaignId, showDetails = true }: BudgetTrackerProps) {
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("7d");

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<BudgetMetrics>({
    queryKey: ["/api/campaigns", campaignId, "budget-metrics", timeframe],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (campaignLoading || metricsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaign || !metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Budget Data</h3>
            <p className="text-muted-foreground">
              There was an error loading the budget information for this campaign.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const budgetProgress = (campaign.budgetUsed / campaign.budget) * 100;
  const escrowProgress = (campaign.escrowBalance / (campaign.budget * 0.8)) * 100;
  
  const getBudgetStatus = () => {
    if (budgetProgress >= 90) return { color: "text-red-600", status: "Critical" };
    if (budgetProgress >= 75) return { color: "text-yellow-600", status: "Warning" };
    return { color: "text-green-600", status: "Healthy" };
  };

  const budgetStatus = getBudgetStatus();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Budget Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Budget Overview</CardTitle>
            </div>
            <Badge variant={budgetStatus.status === "Healthy" ? "default" : 
                           budgetStatus.status === "Warning" ? "secondary" : "destructive"}>
              {budgetStatus.status}
            </Badge>
          </div>
          <CardDescription>
            Track spending, escrow balance, and budget utilization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Funding Status Alert */}
          {campaign.fundingStatus !== "funded" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {campaign.fundingStatus === "pending" 
                  ? "Campaign funding is pending. Complete the funding process to activate."
                  : "Insufficient funds. Please add more budget to continue the campaign."
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Budget Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Budget Used</span>
              <span className={`text-sm font-semibold ${budgetStatus.color}`}>
                {formatCurrency(campaign.budgetUsed)} / {formatCurrency(campaign.budget)}
              </span>
            </div>
            <Progress value={budgetProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{budgetProgress.toFixed(1)}% used</span>
              <span>{formatCurrency(campaign.budget - campaign.budgetUsed)} remaining</span>
            </div>
          </div>

          {/* Escrow Balance */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Escrow Balance (Clipper Rewards)</span>
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(campaign.escrowBalance)}
              </span>
            </div>
            <Progress value={escrowProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{escrowProgress.toFixed(1)}% allocated</span>
              <span>Available for payouts</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Platform Fee</span>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(campaign.platformFee)}</p>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Daily Burn Rate</span>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(metrics.burnRate)}</p>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Est. Days Left</span>
              </div>
              <p className="text-sm font-semibold">
                {metrics.estimatedDaysLeft > 0 ? `${metrics.estimatedDaysLeft}d` : "∞"}
              </p>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Active Clippers</span>
              </div>
              <p className="text-sm font-semibold">{metrics.clipperCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Spending Analysis</CardTitle>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Spent ({timeframe})</span>
                  <span className="font-semibold">{formatCurrency(metrics.totalSpent)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg per Clipper</span>
                  <span className="font-semibold">{formatCurrency(metrics.avgSpendPerClipper)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Burn Rate Trend</span>
                  <div className="flex items-center gap-1">
                    {metrics.burnRate > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm font-semibold">
                      {metrics.burnRate > 0 ? "+" : ""}{metrics.burnRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget Optimization Tips */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Budget Optimization</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {budgetProgress > 75 && (
                    <li>• Consider increasing budget or adjusting reward rates</li>
                  )}
                  {metrics.burnRate > 10 && (
                    <li>• High burn rate detected - monitor clipper performance</li>
                  )}
                  {metrics.clipperCount < 5 && (
                    <li>• Low clipper participation - consider boosting rewards</li>
                  )}
                  <li>• {escrowProgress.toFixed(0)}% of escrow allocated to clippers</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </div>
              <CardDescription>
                Latest budget activities and payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.recentTransactions.length > 0 ? (
                  metrics.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-full ${
                          transaction.type === "reward" ? "bg-green-100 text-green-600" :
                          transaction.type === "payout" ? "bg-blue-100 text-blue-600" :
                          "bg-orange-100 text-orange-600"
                        }`}>
                          {transaction.type === "reward" ? (
                            <DollarSign className="h-3 w-3" />
                          ) : transaction.type === "payout" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Target className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.timestamp)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent transactions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Compact version for dashboard widgets
export function BudgetTrackerCompact({ campaignId }: { campaignId: string }) {
  const { data: campaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (!campaign) return null;

  const budgetProgress = (campaign.budgetUsed / campaign.budget) * 100;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Budget</span>
        <span className="font-medium">
          {formatCurrency(campaign.budgetUsed)} / {formatCurrency(campaign.budget)}
        </span>
      </div>
      <Progress value={budgetProgress} className="h-1" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{budgetProgress.toFixed(0)}% used</span>
        <Badge variant={campaign.fundingStatus === "funded" ? "default" : "secondary"} className="text-xs">
          {campaign.fundingStatus}
        </Badge>
      </div>
    </div>
  );
}