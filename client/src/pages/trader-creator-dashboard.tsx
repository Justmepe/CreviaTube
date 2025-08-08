import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, UserCheck, DollarSign, Activity, Star, Folder, MessageSquare, Quote } from "lucide-react";

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

  // Get REAL SYSTEM-CALCULATED trader metrics instead of hardcoded values
  const { data: traderMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/trader"],
    enabled: !!user && user.role === "creator",
  });

  // Calculate trader-specific stats from real data
  const totalSignups = (traderMetrics as any)?.totalSignups || 0;
  const totalDeposits = (traderMetrics as any)?.totalDeposits || 0;
  const totalTrades = (traderMetrics as any)?.totalTrades || 0;
  const totalVolume = (traderMetrics as any)?.totalVolume || 0;
  const conversionRate = (traderMetrics as any)?.conversionRate || 0;
  const activeClippers = (clipperCampaigns as any[]).filter((cc: any) => cc.isApproved).length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Metrics", href: "/metrics", icon: Activity },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "My Campaigns", href: "/my-campaigns", icon: Folder },
    { name: "Clippers", href: "/clippers", icon: Users },
    { name: "Clipper Directory", href: "/clipper-directory", icon: Star },
    { name: "Broker Integration", href: "/broker", icon: Wallet },
    { name: "Payouts", href: "/payouts", icon: DollarSign },
  ];

  // Get REAL trading activities and clippers from system-calculated data
  const recentTraderActivities = (traderMetrics as any)?.recentActivities || [];
  const topTradingClippers = (traderMetrics as any)?.topClippers || [];

  // Fetch featured platform reviews for homepage
  const { data: featuredReviews = [] } = useQuery<any[]>({
    queryKey: ["/api/platform-reviews", { status: "published", limit: 3 }],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-green-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout navigation={navigation}>
        <div className="relative z-10 space-y-8">
          {/* Modern Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Trading Educator Hub
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">Track referral signups, deposits, and trading volume</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-slate-700 font-medium">Trading Active</span>
              </div>
              <Button 
                onClick={() => window.location.href = '/campaigns/create-enhanced'}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Trading Campaign
              </Button>
            </div>
          </div>

          {/* Modern Trading Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Signups Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-indigo-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Total Signups</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalSignups}</p>
                  <p className="text-sm text-blue-600 font-medium">{conversionRate}% conversion rate</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Active Traders Card */}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Active Traders</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalDeposits}</p>
                  <p className="text-sm text-green-600 font-medium">{Math.round((totalDeposits / totalSignups) * 100) || 0}% conversion rate</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Trading Volume Card */}
            <div className="bg-gradient-to-br from-purple-100/80 to-violet-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-600">Trading Volume</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalVolume} lots</p>
                  <p className="text-sm text-purple-600 font-medium">Last 30 days</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Active Clippers Card */}
            <div className="bg-gradient-to-br from-orange-100/80 to-amber-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-medium text-slate-600">Active Clippers</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{activeClippers}</p>
                  <p className="text-sm text-orange-600 font-medium">Promoting your content</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Featured Customer Reviews Section */}
          {featuredReviews.length > 0 && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  What Our Users Say
                </h2>
                <p className="text-slate-600">Real feedback from creators and clippers using CreoCash</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredReviews.slice(0, 3).map((review: any) => (
                  <div key={review.id} className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < Math.floor(parseFloat(review.overallRating)) 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "fill-gray-200 text-gray-200"
                            }`} 
                          />
                        ))}
                      </div>
                      <Quote className="w-5 h-5 text-blue-400" />
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{review.reviewTitle}</h3>
                    <p className="text-gray-700 text-sm mb-3 line-clamp-3">
                      {review.reviewText}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{review.user?.fullName || "Anonymous"}</span>
                      <Badge variant="outline" className="text-xs">
                        {review.user?.role === "creator" ? "Creator" : "Clipper"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = "/reviews"}
                  className="bg-white/80 hover:bg-white transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View All Reviews
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </div>
  );
}