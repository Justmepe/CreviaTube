import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  Shield, 
  BarChart3,
  Activity,
  Globe,
  Zap,
  Star,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Fetch real-time platform analytics
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time data
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const navigation = [
    { name: "Overview", href: "/", icon: BarChart3, current: true },
    { name: "Users", href: "/users", icon: Users },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Payouts", href: "/payouts", icon: DollarSign },
    { name: "Security", href: "/security", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout title="CreoCash Admin Control Center">
        <div className="relative z-10 space-y-8">
          {/* Modern Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                  CreoCash Admin Control Center
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">Platform overview and management dashboard</p>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                systemHealth?.services?.every(s => s.status === 'healthy') ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-slate-700 font-medium">
                {systemHealth?.services?.every(s => s.status === 'healthy') ? 'System Healthy' : 'System Issues'}
              </span>
            </div>
          </div>

          {/* Modern Admin Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Total Users Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-blue-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{stats?.totalUsers?.toLocaleString() || '0'}</p>
                  <div className="flex items-center space-x-1">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">+{stats?.newUsersThisWeek || 0} this week</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Active Campaigns Card */}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Active Campaigns</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{stats?.activeCampaigns?.toLocaleString() || '0'}</p>
                  <div className="flex items-center space-x-1">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">+{stats?.campaignGrowth || 0}% growth</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Platform Revenue Card */}
            <div className="bg-gradient-to-br from-purple-100/80 to-purple-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-600">Platform Revenue</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">KES {stats?.totalRevenue?.toLocaleString() || '0'}</p>
                  <div className="flex items-center space-x-1">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">+{stats?.revenueGrowth || 0}% growth</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Tracking Events Card */}
            <div className="bg-gradient-to-br from-orange-100/80 to-amber-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-medium text-slate-600">Tracking Events</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{stats?.totalEvents?.toLocaleString() || '0'}</p>
                  <div className="flex items-center space-x-1">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">+{stats?.eventsToday || 0} today</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* System Health Card */}
            <div className="bg-gradient-to-br from-teal-100/80 to-cyan-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <p className="text-sm font-medium text-slate-600">System Health</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 text-xs font-bold rounded-full ${
                      systemHealth?.services?.every(s => s.status === 'healthy') 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {systemHealth?.services?.every(s => s.status === 'healthy') ? 'Healthy' : 'Issues'}
                    </div>
                  </div>
                  <p className="text-sm text-teal-600 font-medium">{systemHealth?.totalUptime || '99.8%'} uptime</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Management Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Live Overview */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">Live Overview</h3>
              </div>
              <div className="text-center py-8 text-slate-500">
                <Globe className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                <p className="font-medium">Real-time Activity</p>
                <p className="text-sm">Monitor platform usage</p>
              </div>
            </div>

            {/* User Management */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">User Management</h3>
              </div>
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="font-medium">User Control</p>
                <p className="text-sm">Manage creators & clippers</p>
              </div>
            </div>

            {/* Campaign Control */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">Campaign Control</h3>
              </div>
              <div className="text-center py-8 text-slate-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p className="font-medium">Campaign Monitor</p>
                <p className="text-sm">Track campaign performance</p>
              </div>
            </div>

            {/* Financial Monitor */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">Financial Monitor</h3>
              </div>
              <div className="text-center py-8 text-slate-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                <p className="font-medium">Revenue Tracking</p>
                <p className="text-sm">Monitor financial metrics</p>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">System Status</h3>
              </div>
              <div className="text-center py-8 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-teal-400" />
                <p className="font-medium">Health Monitor</p>
                <p className="text-sm">System performance</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Live Monthly Report Tracking</h2>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time updates</span>
              </div>
            </div>
            
            <div className="text-center py-12 text-slate-500">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-lg font-medium text-slate-700 mb-2">Analytics Dashboard Coming Soon</p>
              <p className="text-slate-500">Real-time platform metrics and performance insights</p>
            </div>
          </div>

          {/* Platform Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution Chart */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>User Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.userDistribution?.map((userType: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          userType.role === 'admin' ? 'bg-red-500' :
                          userType.role === 'creator' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}></div>
                        <span className="font-medium text-gray-900 capitalize">{userType.role}s</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{userType.count}</p>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              userType.role === 'admin' ? 'bg-red-500' :
                              userType.role === 'creator' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(userType.count / (stats?.totalUsers || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Creator Type Distribution */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  <span>Creator Types</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.creatorTypeDistribution?.map((creatorType: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          creatorType.userType === 'trader' ? 'bg-blue-500' :
                          creatorType.userType === 'entrepreneur' ? 'bg-orange-500' :
                          creatorType.userType === 'influencer' ? 'bg-pink-500' :
                          'bg-purple-500'
                        }`}></div>
                        <span className="font-medium text-gray-900 capitalize">{creatorType.userType}s</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{creatorType.count}</p>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              creatorType.userType === 'trader' ? 'bg-blue-500' :
                              creatorType.userType === 'entrepreneur' ? 'bg-orange-500' :
                              creatorType.userType === 'influencer' ? 'bg-pink-500' :
                              'bg-purple-500'
                            }`}
                            style={{ width: `${(creatorType.count / (stats?.creatorTypeDistribution?.reduce((sum: number, ct: any) => sum + ct.count, 0) || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Financial Overview */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span>Platform Financial Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Campaign Budgets</h3>
                  <p className="text-2xl font-bold text-green-600">
                    KES {((stats?.totalRevenue || 0) / 0.2).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">All funded campaigns</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Platform Revenue (20%)</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    KES {stats?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Platform commission</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Clipper Earnings (80%)</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    KES {((stats?.totalRevenue || 0) * 4).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Distributed to clippers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Activity Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Services Status */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>System Services</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemHealth?.services?.map((service: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium text-gray-900">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          service.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {service.status}
                        </p>
                        <p className="text-xs text-gray-500">{service.uptime} uptime</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <span>Platform Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Average Campaign Budget</h4>
                    <p className="text-xl font-bold text-blue-700">
                      KES {stats?.activeCampaigns > 0 
                        ? Math.round(((stats?.totalRevenue || 0) / 0.2) / stats.activeCampaigns).toLocaleString()
                        : '0'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Per active campaign</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Events per User</h4>
                    <p className="text-xl font-bold text-green-700">
                      {stats?.totalUsers > 0 
                        ? Math.round((stats?.totalEvents || 0) / stats.totalUsers)
                        : 0}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Average engagement</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Growth Rate</h4>
                    <p className="text-xl font-bold text-purple-700">
                      {stats?.totalUsers > 0 
                        ? Math.round(((stats?.newUsersThisWeek || 0) / stats.totalUsers) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-purple-600 mt-1">Weekly user growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
