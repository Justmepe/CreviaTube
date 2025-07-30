import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, UserCheck, DollarSign, Activity } from "lucide-react";

export default function TraderCreatorDashboard() {
  const { user } = useAuth();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    enabled: !!user && user.role === "creator",
  });

  const { data: clipperCampaigns = [] } = useQuery({
    queryKey: ["/api/clipper-campaigns"],
    enabled: !!user && user.role === "creator",
  });

  const { data: trackingEvents = [] } = useQuery({
    queryKey: ["/api/tracking-events"],
    enabled: !!user && user.role === "creator",
  });

  // Calculate trader-specific stats
  const totalSignups = (trackingEvents as any[]).filter((e: any) => e.eventType === "signup").length;
  const totalDeposits = (trackingEvents as any[]).filter((e: any) => e.eventType === "deposit").length;
  const totalTrades = (trackingEvents as any[]).filter((e: any) => e.eventType === "trade").length;
  const activeClippers = (clipperCampaigns as any[]).filter((cc: any) => cc.isApproved).length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Clippers", href: "/clippers", icon: Users },
    { name: "Broker Integration", href: "/broker", icon: Activity },
    { name: "Payouts", href: "/payouts", icon: DollarSign },
  ];

  // Deriv-specific activities
  const recentTraderActivities = [
    {
      id: 1,
      type: "signup",
      clipper: "Kevin Mwangi",
      description: "generated new Deriv account signup",
      amount: "+KES 100",
      timestamp: "5 minutes ago",
      icon: UserCheck,
      iconBg: "bg-success-50 text-success-500"
    },
    {
      id: 2,
      type: "deposit",
      clipper: "Grace Wanjiku", 
      description: "user deposited $50 and completed first trade",
      amount: "+KES 200",
      timestamp: "25 minutes ago",
      icon: DollarSign,
      iconBg: "bg-primary-50 text-primary-500"
    },
    {
      id: 3,
      type: "volume",
      clipper: "Brian Kimani",
      description: "user traded 1.5 standard lots this week",
      amount: "+KES 450", 
      timestamp: "2 hours ago",
      icon: Activity,
      iconBg: "bg-accent-50 text-accent-500"
    }
  ];

  const topTradingClippers = [
    { name: "Kevin Mwangi", specialty: "TikTok Deriv Content", signups: 23, volume: "12.5 lots", earnings: "KES 8,450" },
    { name: "Grace Wanjiku", specialty: "Instagram Trading Tips", signups: 19, volume: "9.8 lots", earnings: "KES 7,120" },
    { name: "Brian Kimani", specialty: "YouTube Analysis", signups: 15, volume: "7.2 lots", earnings: "KES 5,890" },
  ];

  return (
    <DashboardLayout navigation={navigation} user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trading Educator Dashboard</h1>
            <p className="text-gray-600">Track referral signups, deposits, and trading volume</p>
          </div>
          <Button className="bg-primary-500 hover:bg-primary-600">
            <Plus className="w-4 h-4 mr-2" />
            New Trading Campaign
          </Button>
        </div>

        {/* Trading Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Signups</p>
                  <p className="text-2xl font-bold text-blue-700">{totalSignups}</p>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12.5% this month
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <UserCheck className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Active Traders</p>
                  <p className="text-2xl font-bold text-green-700">{totalDeposits}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {Math.round((totalDeposits / totalSignups) * 100) || 0}% conversion rate
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Trading Volume</p>
                  <p className="text-2xl font-bold text-purple-700">{totalTrades} lots</p>
                  <p className="text-sm text-purple-600 flex items-center mt-1">
                    <Activity className="w-4 h-4 mr-1" />
                    Last 30 days
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Active Clippers</p>
                  <p className="text-2xl font-bold text-orange-700">{activeClippers}</p>
                  <p className="text-sm text-orange-600 flex items-center mt-1">
                    <Users className="w-4 h-4 mr-1" />
                    Promoting your content
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Broker Integration Status */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Broker Integration</CardTitle>
                <Badge className="bg-success-100 text-success-800">Connected</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded flex items-center justify-center text-white font-bold">
                      D
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Deriv API</p>
                      <p className="text-sm text-gray-500">Real-time tracking enabled</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-success-600">Active</p>
                    <p className="text-xs text-gray-500">Last sync: 2 min ago</p>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Commission Structure</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Account Signup:</span>
                      <span className="font-medium">KES 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>First Deposit + Trade:</span>
                      <span className="font-medium">KES 200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Per Standard Lot:</span>
                      <span className="font-medium">KES 300</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Trading Clippers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Top Trading Promoters</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topTradingClippers.map((clipper, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {clipper.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{clipper.name}</p>
                      <p className="text-sm text-gray-500">{clipper.specialty}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{clipper.earnings}</p>
                    <p className="text-sm text-success-600">{clipper.signups} signups • {clipper.volume}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Trading Activity */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Trading Activity</CardTitle>
              <Button variant="ghost" size="sm">View All Activity</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTraderActivities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`p-2 ${activity.iconBg} rounded-lg mt-1`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.clipper}</span> {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                  <span className="text-sm font-medium text-success-600">{activity.amount}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}