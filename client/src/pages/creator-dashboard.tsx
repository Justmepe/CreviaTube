import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, UserCheck, DollarSign } from "lucide-react";

export default function CreatorDashboard() {
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

  // Calculate stats
  const totalEarnings = trackingEvents.reduce((sum: number, event: any) => {
    return sum + (parseFloat(event.rewardAmount) || 0);
  }, 0);

  const activeClippers = clipperCampaigns.filter((cc: any) => cc.isApproved).length;
  const totalConversions = trackingEvents.filter((e: any) => e.eventType === "conversion").length;
  const activeCampaign = campaigns.find((c: any) => c.status === "active");
  const budgetRemaining = activeCampaign ? 
    parseFloat(activeCampaign.budget) - parseFloat(activeCampaign.budgetUsed) : 0;

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Clippers", href: "/clippers", icon: Users },
    { name: "Analytics", href: "/analytics", icon: Eye },
    { name: "Payouts", href: "/payouts", icon: DollarSign },
  ];

  // Recent activity mock data (since we don't have real activity tracking yet)
  const recentActivities = [
    {
      id: 1,
      type: "signup",
      clipper: "Kevin Mwangi",
      description: "generated a new signup via Deriv referral link",
      amount: "+KES 100",
      timestamp: "2 minutes ago",
      icon: UserCheck,
      iconBg: "bg-success-50 text-success-500"
    },
    {
      id: 2,
      type: "views",
      clipper: "Grace Wanjiku", 
      description: "reached 1,000 verified views on TikTok",
      amount: "+KES 50",
      timestamp: "15 minutes ago",
      icon: Eye,
      iconBg: "bg-accent-50 text-accent-500"
    },
    {
      id: 3,
      type: "deposit",
      clipper: "Brian Kimani",
      description: "earned deposit + trade bonus from new user",
      amount: "+KES 200", 
      timestamp: "1 hour ago",
      icon: DollarSign,
      iconBg: "bg-primary-50 text-primary-500"
    }
  ];

  const topClippers = [
    { name: "Kevin Mwangi", platform: "TikTok Creator", earnings: "KES 8,450", conversions: 23 },
    { name: "Grace Wanjiku", platform: "Instagram Influencer", earnings: "KES 7,120", conversions: 19 },
    { name: "Brian Kimani", platform: "YouTube Creator", earnings: "KES 5,890", conversions: 15 },
  ];

  return (
    <DashboardLayout navigation={navigation} user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600">Monitor your campaigns and clipper performance</p>
          </div>
          <Button className="bg-primary-500 hover:bg-primary-600">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">KES {totalEarnings.toLocaleString()}</p>
                  <p className="text-sm text-success-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12.5% from last month
                  </p>
                </div>
                <div className="p-3 bg-success-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-success-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Clippers</p>
                  <p className="text-2xl font-bold text-gray-900">{activeClippers}</p>
                  <p className="text-sm text-primary-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    3 new this week
                  </p>
                </div>
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Users className="w-6 h-6 text-primary-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Conversions</p>
                  <p className="text-2xl font-bold text-gray-900">{totalConversions}</p>
                  <p className="text-sm text-accent-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8.3% from last week
                  </p>
                </div>
                <div className="p-3 bg-accent-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-accent-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Campaign Budget</p>
                  <p className="text-2xl font-bold text-gray-900">KES {budgetRemaining.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Wallet className="w-4 h-4 mr-1" />
                    75% remaining
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Wallet className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart Placeholder */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Performance Overview</CardTitle>
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <p>Performance Chart</p>
                  <p className="text-sm">Views, Clicks & Conversions Over Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Clippers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Top Performing Clippers</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topClippers.map((clipper, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {clipper.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{clipper.name}</p>
                      <p className="text-sm text-gray-500">{clipper.platform}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{clipper.earnings}</p>
                    <p className="text-sm text-success-600">{clipper.conversions} conversions</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Activity</CardTitle>
                <Button variant="ghost" size="sm">View All Activity</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => {
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

          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Active Campaigns</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((campaign: any) => (
                <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                    <Badge 
                      variant={campaign.status === "active" ? "default" : "secondary"}
                      className={campaign.status === "active" ? "bg-success-100 text-success-800" : ""}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Budget Used</span>
                      <span className="font-medium">
                        KES {parseFloat(campaign.budgetUsed).toLocaleString()} / KES {parseFloat(campaign.budget).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full" 
                        style={{ width: `${(parseFloat(campaign.budgetUsed) / parseFloat(campaign.budget)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Clippers</span>
                      <span className="font-medium">{activeClippers} active</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {campaigns.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No campaigns yet</p>
                  <Button size="sm">Create Your First Campaign</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
