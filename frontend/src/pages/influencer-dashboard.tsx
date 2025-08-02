import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, Heart, Share2, Play, Instagram, Youtube, MessageSquare } from "lucide-react";

export default function InfluencerDashboard() {
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

  // Calculate influencer-specific stats
  const totalViews = (trackingEvents as any[]).filter((e: any) => e.eventType === "view").length * 1000; // Assuming per 1K views
  const totalEngagement = (trackingEvents as any[]).filter((e: any) => e.eventType === "conversion").length;
  const activeClippers = (clipperCampaigns as any[]).filter((cc: any) => cc.isApproved).length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Content Clippers", href: "/clippers", icon: Users },
    { name: "Social Analytics", href: "/analytics", icon: Eye },
    { name: "Payouts", href: "/payouts", icon: Wallet },
  ];

  // Social media specific activities
  const recentSocialActivities = [
    {
      id: 1,
      type: "views",
      clipper: "Kevin Mwangi",
      description: "reached 5,000 verified views on TikTok video",
      amount: "+KES 250",
      timestamp: "10 minutes ago",
      icon: Play,
      iconBg: "bg-pink-50 text-pink-500",
      platform: "TikTok"
    },
    {
      id: 2,
      type: "followers",
      clipper: "Grace Wanjiku", 
      description: "gained 100 new followers milestone",
      amount: "+KES 150",
      timestamp: "45 minutes ago",
      icon: Users,
      iconBg: "bg-purple-50 text-purple-500",
      platform: "Instagram"
    },
    {
      id: 3,
      type: "engagement",
      clipper: "Brian Kimani",
      description: "post went viral with 2K+ engagements",
      amount: "+KES 400", 
      timestamp: "3 hours ago",
      icon: Heart,
      iconBg: "bg-red-50 text-red-500",
      platform: "YouTube"
    }
  ];

  const topInfluencerClippers = [
    { 
      name: "Kevin Mwangi", 
      platform: "TikTok Creator", 
      followers: "45.2K", 
      avgViews: "12.5K",
      engagement: "8.5%",
      earnings: "KES 8,450" 
    },
    { 
      name: "Grace Wanjiku", 
      platform: "Instagram Influencer", 
      followers: "32.1K", 
      avgViews: "8.9K",
      engagement: "11.2%",
      earnings: "KES 7,120" 
    },
    { 
      name: "Brian Kimani", 
      platform: "YouTube Creator", 
      followers: "28.8K", 
      avgViews: "15.2K",
      engagement: "6.8%",
      earnings: "KES 5,890" 
    },
  ];

  return (
    <DashboardLayout navigation={navigation} user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Influencer Dashboard</h1>
            <p className="text-gray-600">Track followers, views, and engagement across platforms</p>
          </div>
          <Button className="bg-primary-500 hover:bg-primary-600">
            <Plus className="w-4 h-4 mr-2" />
            New Social Campaign
          </Button>
        </div>

        {/* Social Media Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-pink-50 to-pink-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-600">Total Views</p>
                  <p className="text-2xl font-bold text-pink-700">{(totalViews / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-pink-600 flex items-center mt-1">
                    <Eye className="w-4 h-4 mr-1" />
                    +18.2% this week
                  </p>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <Play className="w-6 h-6 text-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">New Followers</p>
                  <p className="text-2xl font-bold text-purple-700">2,458</p>
                  <p className="text-sm text-purple-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    This month
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Engagement Rate</p>
                  <p className="text-2xl font-bold text-red-700">9.2%</p>
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <Heart className="w-4 h-4 mr-1" />
                    Above average
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Active Clippers</p>
                  <p className="text-2xl font-bold text-blue-700">{activeClippers}</p>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <Share2 className="w-4 h-4 mr-1" />
                    Content creators
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Share2 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Performance */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Platform Performance</CardTitle>
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-pink-500 rounded flex items-center justify-center text-white">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">TikTok</p>
                      <p className="text-sm text-gray-500">Short-form content</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">125K views</p>
                    <p className="text-sm text-success-600">+12.5% this week</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded flex items-center justify-center text-white">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Instagram</p>
                      <p className="text-sm text-gray-500">Stories & Reels</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">89K views</p>
                    <p className="text-sm text-success-600">+8.3% this week</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded flex items-center justify-center text-white">
                      <Youtube className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">YouTube</p>
                      <p className="text-sm text-gray-500">Long-form content</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">67K views</p>
                    <p className="text-sm text-success-600">+15.7% this week</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Content Clippers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Top Content Clippers</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topInfluencerClippers.map((clipper, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {clipper.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{clipper.name}</p>
                      <p className="text-sm text-gray-500">{clipper.platform} • {clipper.followers} followers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{clipper.earnings}</p>
                    <p className="text-sm text-success-600">{clipper.avgViews} avg views • {clipper.engagement} ER</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Social Activity */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Social Activity</CardTitle>
              <Button variant="ghost" size="sm">View All Activity</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSocialActivities.map((activity) => {
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
                    <p className="text-xs text-gray-500">{activity.timestamp} • {activity.platform}</p>
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