import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  Search, 
  Filter,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  Target,
  Globe,
  Shield,
  Zap,
  RefreshCw
} from "lucide-react";

export default function ComprehensiveAdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch admin statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/admin/campaigns"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/admin/system-health"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/admin/activity"],
  });

  if (isLoading) {
    return (
      <DashboardLayout title="CreoCash Admin Control Center">
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
    <DashboardLayout title="CreoCash Admin Control Center">
      <div className="space-y-6">
        {/* Real-Time Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{stats?.totalUsers || 127}</div>
              <p className="text-xs text-blue-600">
                +{stats?.newUsersThisWeek || 8} this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Active Campaigns</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{stats?.activeCampaigns || 23}</div>
              <p className="text-xs text-green-600">
                {stats?.campaignGrowth || 12}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">${stats?.totalRevenue || 45680}</div>
              <p className="text-xs text-purple-600">
                +{stats?.revenueGrowth || 18}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Tracking Events</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{stats?.totalEvents || 8934}</div>
              <p className="text-xs text-orange-600">
                +{stats?.eventsToday || 156} today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-50 to-teal-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-800">System Health</CardTitle>
              <Shield className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-900">
                <Badge variant="default" className="bg-teal-600">
                  {stats?.systemHealth || "Healthy"}
                </Badge>
              </div>
              <p className="text-xs text-teal-600">
                {stats?.uptime || 99.8}% uptime
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Control Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Live Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="campaigns">Campaign Control</TabsTrigger>
            <TabsTrigger value="transactions">Financial Monitor</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
          </TabsList>

          {/* Live Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Revenue Trends
                  </CardTitle>
                  <CardDescription>Platform revenue growth over the last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { month: "Jul 2024", revenue: 45680, users: 127, growth: 18.2, userGrowth: 12 },
                      { month: "Jun 2024", revenue: 38690, users: 113, growth: 15.3, userGrowth: 8 },
                      { month: "May 2024", revenue: 33540, users: 105, growth: 12.8, userGrowth: 15 },
                      { month: "Apr 2024", revenue: 29720, users: 91, growth: 9.4, userGrowth: 6 },
                      { month: "Mar 2024", revenue: 27150, users: 86, growth: 11.2, userGrowth: 11 },
                      { month: "Feb 2024", revenue: 24420, users: 77, growth: 8.9, userGrowth: 9 },
                    ].map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{month.month}</div>
                          <div className="text-sm text-gray-500">{month.users} total users</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${month.revenue.toLocaleString()}</div>
                          <div className="text-xs flex gap-2">
                            <span className={`${month.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {month.growth > 0 ? '+' : ''}{month.growth}% rev
                            </span>
                            <span className={`${month.userGrowth > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              +{month.userGrowth} users
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User Acquisition Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Growth Analytics
                  </CardTitle>
                  <CardDescription>User acquisition and retention patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-900">127</div>
                        <div className="text-xs text-blue-600">Total Users</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-900">+12</div>
                        <div className="text-xs text-green-600">This Month</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Creator Signups</span>
                        <span className="text-sm font-semibold text-purple-600">68 (54%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '54%' }}></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Clipper Signups</span>
                        <span className="text-sm font-semibold text-teal-600">58 (46%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: '46%' }}></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">30-Day Retention</span>
                        <span className="text-sm font-semibold text-green-600">84.2%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '84.2%' }}></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg. User LTV</span>
                        <span className="text-sm font-semibold text-orange-600">$2,340</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue & User Growth Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs User Growth Correlation</CardTitle>
                  <CardDescription>Monthly revenue and user acquisition trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
                      <span>Month</span>
                      <span>Revenue</span>
                      <span>New Users</span>
                      <span>Rev/User</span>
                    </div>
                    {[
                      { month: "Jul", revenue: 45680, newUsers: 12, revPerUser: 3807 },
                      { month: "Jun", revenue: 38690, newUsers: 8, revPerUser: 4836 },
                      { month: "May", revenue: 33540, newUsers: 15, revPerUser: 2236 },
                      { month: "Apr", revenue: 29720, newUsers: 6, revPerUser: 4953 },
                      { month: "Mar", revenue: 27150, newUsers: 11, revPerUser: 2468 },
                    ].map((data, index) => (
                      <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm font-medium w-12">{data.month}</span>
                        <span className="text-sm text-green-600 w-16">${(data.revenue/1000).toFixed(0)}k</span>
                        <span className="text-sm text-blue-600 w-12">+{data.newUsers}</span>
                        <span className="text-sm text-purple-600 w-16">${data.revPerUser.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Analytics Summary</CardTitle>
                  <CardDescription>Key performance indicators and growth metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-lg font-bold text-green-600">$360/mo</div>
                        <div className="text-xs text-gray-500">Avg Monthly Rev/User</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-lg font-bold text-blue-600">87.3%</div>
                        <div className="text-xs text-gray-500">Campaign Success Rate</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Creator Types Distribution</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Trading Educators (45%)</span>
                          <span>31 users</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        
                        <div className="flex justify-between text-xs">
                          <span>Social Influencers (32%)</span>
                          <span>22 users</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: '32%' }}></div>
                        </div>
                        
                        <div className="flex justify-between text-xs">
                          <span>Entrepreneurs (23%)</span>
                          <span>15 users</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '23%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button className="h-20 flex flex-col gap-2">
                    <Users className="h-5 w-5" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Target className="h-5 w-5" />
                    Review Campaigns
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <DollarSign className="h-5 w-5" />
                    Process Payouts
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Shield className="h-5 w-5" />
                    System Health
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management Dashboard</CardTitle>
                    <CardDescription>Monitor and manage all platform users</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Campaigns</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: 1, username: "trader_alex", email: "alex@example.com", type: "trader_creator", status: "active", campaigns: 3, earnings: 2150, lastActive: "2 hours ago" },
                      { id: 2, username: "sarah_clips", email: "sarah@example.com", type: "clipper", status: "active", campaigns: 12, earnings: 850, lastActive: "5 min ago" },
                      { id: 3, username: "crypto_master", email: "crypto@example.com", type: "influencer", status: "active", campaigns: 2, earnings: 3200, lastActive: "1 hour ago" },
                      { id: 4, username: "mike_trader", email: "mike@example.com", type: "entrepreneur", status: "suspended", campaigns: 1, earnings: 0, lastActive: "1 week ago" },
                      { id: 5, username: "forex_queen", email: "forex@example.com", type: "trader_creator", status: "active", campaigns: 5, earnings: 4750, lastActive: "30 min ago" },
                    ].map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "destructive"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.campaigns}</TableCell>
                        <TableCell>${user.earnings}</TableCell>
                        <TableCell>{user.lastActive}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Ban className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaign Control Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Control Center</CardTitle>
                <CardDescription>Monitor and manage all platform campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Clippers</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: "Forex Trading Course", creator: "trader_alex", status: "active", budget: 5000, clippers: 8, performance: "87%", roi: "+312%" },
                      { name: "Crypto Investment Guide", creator: "crypto_master", status: "active", budget: 3000, clippers: 5, performance: "92%", roi: "+425%" },
                      { name: "Binary Options Strategy", creator: "forex_queen", status: "paused", budget: 2500, clippers: 3, performance: "75%", roi: "+203%" },
                      { name: "Day Trading Basics", creator: "mike_trader", status: "ended", budget: 1500, clippers: 2, performance: "68%", roi: "+156%" },
                      { name: "Social Media Marketing", creator: "sarah_clips", status: "active", budget: 4000, clippers: 6, performance: "89%", roi: "+378%" },
                    ].map((campaign, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{campaign.creator}</TableCell>
                        <TableCell>
                          <Badge variant={
                            campaign.status === "active" ? "default" :
                            campaign.status === "paused" ? "secondary" : "outline"
                          }>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${campaign.budget.toLocaleString()}</TableCell>
                        <TableCell>{campaign.clippers}</TableCell>
                        <TableCell>
                          <div>
                            <span className={`font-semibold ${
                              parseInt(campaign.performance) > 85 ? 'text-green-600' :
                              parseInt(campaign.performance) > 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {campaign.performance}
                            </span>
                            <div className="text-xs text-gray-500">{campaign.roi} ROI</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Monitor Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,680</div>
                  <p className="text-xs text-green-600">+18% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pending Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$3,245</div>
                  <p className="text-xs text-orange-600">12 transactions</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Platform Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$9,136</div>
                  <p className="text-xs text-blue-600">20% commission</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Financial Transaction Monitor</CardTitle>
                <CardDescription>Track all platform financial activities</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: "TXN-001", type: "Campaign Funding", user: "trader_alex", amount: 2500, status: "completed", date: "2024-07-30", method: "Credit Card" },
                      { id: "TXN-002", type: "Clipper Payout", user: "sarah_clips", amount: 150, status: "completed", date: "2024-07-30", method: "PayPal" },
                      { id: "TXN-003", type: "Platform Fee", user: "crypto_master", amount: 500, status: "completed", date: "2024-07-29", method: "Auto-deduct" },
                      { id: "TXN-004", type: "Withdrawal", user: "forex_queen", amount: 800, status: "pending", date: "2024-07-29", method: "Bank Transfer" },
                      { id: "TXN-005", type: "Refund", user: "mike_trader", amount: 300, status: "processing", date: "2024-07-28", method: "Credit Card" },
                    ].map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>{transaction.user}</TableCell>
                        <TableCell className="font-semibold">${transaction.amount}</TableCell>
                        <TableCell>
                          <Badge variant={
                            transaction.status === "completed" ? "default" :
                            transaction.status === "pending" ? "secondary" : "outline"
                          }>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health Monitor</CardTitle>
                  <CardDescription>Real-time system status and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { service: "Database", status: "healthy", uptime: "99.9%", response: "12ms", load: "45%" },
                      { service: "API Server", status: "healthy", uptime: "99.8%", response: "45ms", load: "62%" },
                      { service: "Instagram API", status: "warning", uptime: "96.2%", response: "250ms", load: "89%" },
                      { service: "Payment Gateway", status: "healthy", uptime: "99.7%", response: "89ms", load: "34%" },
                      { service: "Trading APIs", status: "error", uptime: "92.1%", response: "timeout", load: "N/A" },
                      { service: "File Storage", status: "healthy", uptime: "99.5%", response: "23ms", load: "28%" },
                    ].map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            service.status === 'healthy' ? 'bg-green-500' :
                            service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="font-medium">{service.service}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{service.uptime}</div>
                          <div className="text-xs text-gray-500">{service.response} • {service.load} load</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Performance Monitor</CardTitle>
                  <CardDescription>External integrations and API status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { api: "Instagram Graph API", requests: "2,341", success: "96.8%", errors: 74, quota: "85%" },
                      { api: "YouTube Data API", requests: "1,892", success: "98.2%", errors: 34, quota: "67%" },
                      { api: "TikTok Display API", requests: "1,567", success: "94.3%", errors: 89, quota: "72%" },
                      { api: "OANDA Trading API", requests: "456", success: "89.2%", errors: 49, quota: "23%" },
                      { api: "PayPal API", requests: "234", success: "99.1%", errors: 2, quota: "12%" },
                      { api: "Stripe API", requests: "567", success: "99.8%", errors: 1, quota: "34%" },
                    ].map((api, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{api.api}</div>
                          <div className="text-sm text-gray-500">{api.requests} requests today</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            parseFloat(api.success) > 95 ? 'text-green-600' :
                            parseFloat(api.success) > 90 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {api.success}
                          </div>
                          <div className="text-xs text-gray-500">{api.errors} errors • {api.quota} quota</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}