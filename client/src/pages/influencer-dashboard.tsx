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

  // Get REAL SYSTEM-CALCULATED metrics instead of hardcoded values
  const { data: influencerMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/influencer"],
    enabled: !!user && user.role === "creator",
  });

  // Calculate influencer-specific stats from real data
  const totalViews = influencerMetrics?.totalViews || 0;
  const viewGrowth = influencerMetrics?.viewGrowth || 0;
  const totalFollowers = influencerMetrics?.totalFollowers || 0;
  const followerGrowth = influencerMetrics?.followerGrowth || 0;
  const engagementRate = influencerMetrics?.engagementRate || 0;
  const activeClippers = (clipperCampaigns as any[]).filter((cc: any) => cc.isApproved).length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Content Clippers", href: "/clippers", icon: Users },
    { name: "Social Analytics", href: "/analytics", icon: Eye },
    { name: "Payouts", href: "/payouts", icon: Wallet },
  ];

  // Get REAL activities and clippers from system-calculated data
  const recentSocialActivities = influencerMetrics?.recentActivities || [];
  const topInfluencerClippers = influencerMetrics?.topClippers || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-rose-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-rose-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout navigation={navigation} user={user}>
        <div className="relative z-10 space-y-8">
          {/* Modern Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-600 via-rose-600 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 bg-clip-text text-transparent">
                  Influencer Studio
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">Track followers, views, and engagement across platforms</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                <span className="text-slate-700 font-medium">Trending</span>
              </div>
              <Button className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Social Campaign
              </Button>
            </div>
          </div>

          {/* Modern Social Media Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Views Card */}
            <div className="bg-gradient-to-br from-pink-100/80 to-rose-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Play className="w-4 h-4 text-pink-600" />
                    <p className="text-sm font-medium text-slate-600">Total Views</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{(totalViews / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-pink-600 font-medium">{viewGrowth > 0 ? '+' : ''}{viewGrowth}% this week</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* New Followers Card */}
            <div className="bg-gradient-to-br from-purple-100/80 to-violet-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-600">New Followers</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{followerGrowth.toLocaleString()}</p>
                  <p className="text-sm text-purple-600 font-medium">New this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Engagement Rate Card */}
            <div className="bg-gradient-to-br from-red-100/80 to-pink-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Heart className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-slate-600">Engagement Rate</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{engagementRate}%</p>
                  <p className="text-sm text-red-600 font-medium">{engagementRate > 5 ? 'Above average' : 'Growing'}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Active Clippers Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-indigo-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Active Clippers</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{activeClippers}</p>
                  <p className="text-sm text-blue-600 font-medium">Content creators</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
