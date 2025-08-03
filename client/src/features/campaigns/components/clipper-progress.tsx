import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target, TrendingUp } from "lucide-react";

interface ClipperProgressProps {
  clipperCampaignId: string;
}

interface ClipperProgress {
  totalViews: number;
  totalClicks: number;
  totalSignups: number;
  totalDeposits: number;
  totalTrades: number;
  totalConversions: number;
  isCompleted: boolean;
  goalProgress: {
    type: string;
    target: number;
    current: number;
    percentage: number;
    isReached: boolean;
  } | null;
}

export function ClipperProgress({ clipperCampaignId }: ClipperProgressProps) {
  const { data: progress, isLoading, error } = useQuery<ClipperProgress>({
    queryKey: ['/api/clipper-campaigns', clipperCampaignId, 'progress'],
    enabled: !!clipperCampaignId,
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !progress) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-red-500">Failed to load progress data</p>
        </CardContent>
      </Card>
    );
  }

  const getGoalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      views: 'Views',
      clicks: 'Clicks', 
      signups: 'Sign-ups',
      deposits: 'Deposits',
      trades: 'Trades',
      conversions: 'Conversions'
    };
    return labels[type] || type;
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'views':
      case 'clicks':
        return <TrendingUp className="h-4 w-4" />;
      case 'signups':
      case 'deposits':
      case 'trades':
      case 'conversions':
        return <Target className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Campaign Progress</CardTitle>
            <CardDescription>Track your performance towards campaign goals</CardDescription>
          </div>
          {progress.isCompleted && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Goal Progress */}
        {progress.goalProgress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getGoalIcon(progress.goalProgress.type)}
                <span className="font-medium">
                  Primary Goal: {getGoalTypeLabel(progress.goalProgress.type)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {progress.goalProgress.current.toLocaleString()} / {progress.goalProgress.target.toLocaleString()}
              </div>
            </div>
            
            <Progress 
              value={progress.goalProgress.percentage} 
              className="h-2"
            />
            
            <div className="text-xs text-muted-foreground text-center">
              {progress.goalProgress.percentage.toFixed(1)}% Complete
              {progress.goalProgress.isReached && (
                <span className="text-green-600 font-medium ml-2">Goal Reached! 🎉</span>
              )}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{progress.totalViews.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Views</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{progress.totalClicks.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Clicks</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{progress.totalSignups.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Sign-ups</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{progress.totalDeposits.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Deposits</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{progress.totalTrades.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Trades</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-indigo-600">{progress.totalConversions.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Conversions</div>
          </div>
        </div>

        {/* Completion Status */}
        {progress.isCompleted && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Campaign Goal Achieved!</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Congratulations! You've successfully completed this campaign. Payouts will be processed automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}