import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity
} from "lucide-react";

// Type definitions for admin analytics data
interface AdminStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeCampaigns: number;
  totalRevenue: string;
  totalEvents: number;
  eventsToday: number;
  systemHealth: string;
  uptime: number;
  monthlyStats?: MonthlyStats[];
  userDistribution?: UserDistribution[];
}

interface MonthlyStats {
  month: string;
  users: number;
  revenue: string;
  campaigns: number;
}

interface UserDistribution {
  role: string;
  count: number;
}

interface Transaction {
  type: string;
  user: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function AdminAnalytics() {
  // Fetch admin statistics with real data
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Analytics Dashboard">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics Dashboard">
      <div className="space-y-6">
        {/* Real-Time Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{stats?.totalUsers}</div>
              <p className="text-xs text-blue-600">
                +{stats?.newUsersThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Active Campaigns</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{stats?.activeCampaigns}</div>
              <p className="text-xs text-green-600">
                Real database data
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">${stats?.totalRevenue}</div>
              <p className="text-xs text-purple-600">
                20% of campaign budgets
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Tracking Events</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{stats?.totalEvents}</div>
              <p className="text-xs text-orange-600">
                +{stats?.eventsToday} today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-50 to-teal-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-800">System Health</CardTitle>
              <BarChart3 className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-teal-900">{stats?.systemHealth}</div>
              <p className="text-xs text-teal-600">
                {stats?.uptime}% uptime
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Current Month Stats
              </CardTitle>
              <CardDescription>Live data from your database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(stats?.monthlyStats) && stats.monthlyStats.length > 0 ? stats.monthlyStats.map((month: MonthlyStats, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{month.month}</div>
                      <div className="text-xs text-gray-500">{month.users} total users</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">${month.revenue}</div>
                      <div className="text-xs text-blue-500">{month.campaigns} campaigns</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>Monthly analytics will appear here</p>
                    <p className="text-sm">Data updates automatically</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Distribution
              </CardTitle>
              <CardDescription>Real user role breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(stats?.userDistribution) && stats.userDistribution.length > 0 ? stats.userDistribution.map((userRole: UserDistribution, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">{userRole.role}s</span>
                      <span className="text-sm font-semibold text-purple-600">{userRole.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${(userRole.count / (stats?.totalUsers || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2" />
                    <p>User distribution loading...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Live transaction data from campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(transactions) && transactions.length > 0 ? transactions.slice(0, 5).map((transaction: Transaction, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{transaction.type}</div>
                    <div className="text-sm text-gray-500">User: {transaction.user}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${transaction.amount}</div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-600' : 
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-2" />
                  <p>Transaction history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}