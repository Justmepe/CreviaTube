import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, BarChart3, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

interface RevenueAnalyticsData {
  totalRevenue: number;
  monthlyRecurring: number;
  platformFees: number;
  averageCampaignValue: number;
  revenueGrowth: number;
  campaignCount: number;
  avgMonthlyRevPerUser: number;
  campaignSuccessRate: number;
  userGrowthTrend: number;
  correlation: number;
  sources: {
    campaignFees: number;
    subscriptions: number;
    apiAccess: number;
    transactions: number;
  };
  monthlyData: Array<{
    month: string;
    revenue: string;
    newUsers: string;
    revenuePerUser: string;
    campaigns: number;
    rawRevenue: number;
    rawNewUsers: number;
    rawRevenuePerUser: number;
  }>;
  creatorTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
    displayName: string;
  }>;
}

export default function RealRevenueAnalytics() {
  const { data: revenueData, isLoading, error } = useQuery<RevenueAnalyticsData>({
    queryKey: ['/api/admin/revenue-stats'],
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Revenue Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading real analytics data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Revenue Analytics">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <Activity className="w-12 h-12 mx-auto mb-2" />
              <p>Failed to load analytics data</p>
              <p className="text-sm">Check database connection</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Revenue vs User Growth Analytics - Real Data">
      <div className="space-y-6">
        {/* Header with Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                ${revenueData?.totalRevenue?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-green-600">
                {revenueData?.revenueGrowth > 0 ? '+' : ''}{revenueData?.revenueGrowth.toFixed(1)}% this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Avg Monthly Rev/User</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                ${revenueData?.avgMonthlyRevPerUser || 0}/mo
              </div>
              <p className="text-xs text-blue-600">
                Real database calculation
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Campaign Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {revenueData?.campaignSuccessRate.toFixed(1)}%
              </div>
              <p className="text-xs text-purple-600">
                {revenueData?.campaignCount} total campaigns
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Growth Correlation</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {revenueData?.correlation.toFixed(2)}
              </div>
              <p className="text-xs text-orange-600">
                Revenue vs User correlation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue vs User Growth Correlation Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue vs User Growth Correlation
              </CardTitle>
              <CardDescription>Monthly revenue and user acquisition trends (Real Database Data)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                  <span>Month</span>
                  <span>Revenue</span>
                  <span>New Users</span>
                  <span>Rev/User</span>
                </div>
                {revenueData?.monthlyData?.map((month, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-green-600 font-semibold">${month.rawRevenue.toLocaleString()}</span>
                    <span className="text-blue-600">{month.newUsers}</span>
                    <span className="text-purple-600">${Math.round(month.rawRevenuePerUser).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Platform Analytics Summary
              </CardTitle>
              <CardDescription>Key performance indicators and growth metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Monthly Rev/User</h3>
                  <p className="text-2xl font-bold text-green-600">
                    ${revenueData?.avgMonthlyRevPerUser || 0}/mo
                  </p>
                  <p className="text-xs text-gray-500">Calculated from real campaigns</p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Campaign Success Rate</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {revenueData?.campaignSuccessRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">From {revenueData?.campaignCount} campaigns</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Creator Types Distribution</h3>
                  <div className="space-y-2">
                    {revenueData?.creatorTypeDistribution?.map((creator, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{creator.displayName} ({creator.percentage}%)</span>
                        <Badge variant="outline">{creator.count} users</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Growth Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Trends Analysis
            </CardTitle>
            <CardDescription>Month-over-month growth analysis from real data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Revenue Growth</h3>
                <p className="text-2xl font-bold text-green-600">
                  {revenueData?.revenueGrowth > 0 ? '+' : ''}{revenueData?.revenueGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Month-over-month</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-2">User Growth</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {revenueData?.userGrowthTrend > 0 ? '+' : ''}{revenueData?.userGrowthTrend.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Month-over-month</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Revenue-User Correlation</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {revenueData?.correlation.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Statistical correlation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center text-blue-600">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">All data is calculated from real database records</p>
              <p className="text-sm">Revenue from campaign budgets • User growth from registrations • No mock data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}