import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Calendar,
  Download
} from "lucide-react";

export default function AdminRevenue() {
  const { data: revenueStats, isLoading } = useQuery({
    queryKey: ["/api/admin/revenue-stats"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/admin/revenue-transactions"],
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Platform Revenue Management">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Platform Revenue Management">
      <div className="space-y-6">
        {/* Revenue Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">$45,680</div>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +18.2% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Monthly Recurring Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">$12,350</div>
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +24.5% growth rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Platform Fees Collected</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">$9,136</div>
              <p className="text-xs text-purple-600">
                20% commission rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Average Campaign Value</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">$1,986</div>
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +8.7% increase
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
            <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          </TabsList>

          {/* Revenue Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Revenue Sources
                  </CardTitle>
                  <CardDescription>Breakdown of platform income streams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Campaign Fees (20%)</span>
                      <span className="text-sm font-semibold">$9,136</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Premium Subscriptions</span>
                      <span className="text-sm font-semibold">$3,245</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '21%' }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Access Fees</span>
                      <span className="text-sm font-semibold">$1,890</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Transaction Fees</span>
                      <span className="text-sm font-semibold">$1,109</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '7%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Revenue Generators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Revenue Generators
                  </CardTitle>
                  <CardDescription>Highest contributing users this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { user: "forex_queen", type: "Trader Creator", revenue: 2850, campaigns: 5 },
                      { user: "crypto_master", type: "Influencer", revenue: 2340, campaigns: 3 },
                      { user: "trade_academy", type: "Enterprise", revenue: 1980, campaigns: 2 },
                      { user: "sarah_forex", type: "Trader Creator", revenue: 1560, campaigns: 4 },
                      { user: "biz_mentor", type: "Entrepreneur", revenue: 1230, campaigns: 3 },
                    ].map((creator, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{creator.user}</div>
                          <div className="text-sm text-gray-500">{creator.type} • {creator.campaigns} campaigns</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">${creator.revenue.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">20% fees</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Revenue Breakdown</CardTitle>
                <CardDescription>Comprehensive analysis of all income streams</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revenue Stream</TableHead>
                      <TableHead>This Month</TableHead>
                      <TableHead>Last Month</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { stream: "Campaign Platform Fees", current: 9136, previous: 7823, share: "60.0%" },
                      { stream: "Premium Creator Subscriptions", current: 3245, previous: 2890, share: "21.3%" },
                      { stream: "API Access & Integration", current: 1890, previous: 1654, share: "12.4%" },
                      { stream: "Transaction Processing", current: 1109, previous: 967, share: "7.3%" },
                      { stream: "Enterprise Partnerships", current: 650, previous: 580, share: "4.3%" },
                      { stream: "Affiliate Commissions", current: 420, previous: 380, share: "2.8%" },
                    ].map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.stream}</TableCell>
                        <TableCell>${item.current.toLocaleString()}</TableCell>
                        <TableCell>${item.previous.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={item.current > item.previous ? "default" : "destructive"}>
                            {item.current > item.previous ? "+" : ""}
                            {(((item.current - item.previous) / item.previous) * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{item.share}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Growth</CardTitle>
                  <CardDescription>Platform revenue trend over the last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { month: "July 2024", revenue: 45680, growth: 18.2 },
                      { month: "June 2024", revenue: 38690, growth: 15.3 },
                      { month: "May 2024", revenue: 33540, growth: 12.8 },
                      { month: "April 2024", revenue: 29720, growth: 9.4 },
                      { month: "March 2024", revenue: 27150, growth: 11.2 },
                      { month: "February 2024", revenue: 24420, growth: 8.9 },
                    ].map((month, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">{month.month}</span>
                        <div className="text-right">
                          <div className="font-semibold">${month.revenue.toLocaleString()}</div>
                          <div className={`text-xs ${month.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {month.growth > 0 ? '+' : ''}{month.growth}% growth
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Projections</CardTitle>
                  <CardDescription>Projected income based on current trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-700 font-medium">Q3 2024 Projection</div>
                      <div className="text-2xl font-bold text-green-900">$147,000</div>
                      <div className="text-xs text-green-600">Based on 16% average growth</div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-700 font-medium">Q4 2024 Projection</div>
                      <div className="text-2xl font-bold text-blue-900">$178,000</div>
                      <div className="text-xs text-blue-600">Holiday season boost expected</div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-700 font-medium">Annual 2024 Target</div>
                      <div className="text-2xl font-bold text-purple-900">$620,000</div>
                      <div className="text-xs text-purple-600">87% progress to goal</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Financial Reports</CardTitle>
                    <CardDescription>Generate and download comprehensive financial reports</CardDescription>
                  </div>
                  <Button className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Monthly Revenue Report", description: "Detailed breakdown of all revenue streams", period: "July 2024", size: "2.3 MB" },
                    { title: "Campaign Performance Report", description: "Campaign-wise revenue and fee analysis", period: "Q2 2024", size: "1.8 MB" },
                    { title: "User Revenue Contribution", description: "Top performing creators and revenue analysis", period: "Last 6 months", size: "956 KB" },
                    { title: "Platform Growth Analytics", description: "Revenue growth trends and projections", period: "YTD 2024", size: "1.2 MB" },
                    { title: "Financial Summary", description: "Executive summary of platform finances", period: "July 2024", size: "724 KB" },
                    { title: "Tax Compliance Report", description: "Revenue reporting for tax purposes", period: "Q2 2024", size: "2.1 MB" },
                  ].map((report, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{report.title}</h4>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{report.period}</span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}