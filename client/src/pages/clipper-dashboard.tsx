import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Wallet, Link as LinkIcon, Copy, ExternalLink, DollarSign, MessageSquare, Quote, Star } from "lucide-react";

export default function ClipperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: clipperCampaigns = [] } = useQuery({
    queryKey: ["/api/clipper-campaigns"],
    enabled: !!user && user.role === "clipper",
  });

  const { data: trackingEvents = [] } = useQuery({
    queryKey: ["/api/tracking-events"],
    enabled: !!user && user.role === "clipper",
  });

  // Fetch featured platform reviews for homepage
  const { data: featuredReviews = [] } = useQuery({
    queryKey: ["/api/platform-reviews", { status: "published", limit: 3 }],
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["/api/payouts"],
    enabled: !!user && user.role === "clipper",
  });

  const { data: earnings } = useQuery({
    queryKey: ["/api/analytics/clipper", user?.id],
    enabled: !!user && user.role === "clipper",
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const getTrackingUrl = (trackingCode: string) => {
    return `${window.location.origin}/track/${trackingCode}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-teal-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout title="CreoCash Clipper Hub">
        <div className="relative z-10 space-y-8">
          {/* Modern Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  CreoCash Clipper Hub
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">Your performance dashboard and earnings center</p>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-slate-700 font-medium">Active Status</span>
            </div>
          </div>

          {/* Modern Clipper Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Earnings Card */}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Total Earnings</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">
                    KES {(earnings as any)?.total?.toLocaleString() || "0"}
                  </p>
                  <p className="text-sm text-green-600 font-medium">+18.5% this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Active Links Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-blue-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Active Links</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{(clipperCampaigns as any[]).length}</p>
                  <p className="text-sm text-blue-600 font-medium">Campaigns active</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <LinkIcon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Pending Earnings Card */}
            <div className="bg-gradient-to-br from-orange-100/80 to-amber-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-medium text-slate-600">Pending</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">
                    KES {(earnings as any)?.pending?.toLocaleString() || "0"}
                  </p>
                  <p className="text-sm text-orange-600 font-medium">Processing payouts</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Modern Tracking Links Section */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">My Tracking Links</h2>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Active campaigns</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {(clipperCampaigns as any[]).map((cc: any) => (
                <div key={cc.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">Campaign: {cc.campaignId}</h4>
                    <div className="flex items-center space-x-2 mt-2">
                      <p className="text-sm text-slate-600 font-mono bg-white px-3 py-2 rounded-lg flex-1 border border-slate-200">
                        {getTrackingUrl(cc.trackingCode)}
                      </p>
                      <Badge variant={cc.isApproved ? "default" : "secondary"} className={cc.isApproved ? "bg-green-100 text-green-800 border-green-200" : "bg-slate-100 text-slate-600"}>
                        {cc.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => copyToClipboard(getTrackingUrl(cc.trackingCode))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => window.open(getTrackingUrl(cc.trackingCode), '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {(clipperCampaigns as any[]).length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LinkIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-lg font-medium text-slate-700 mb-2">No campaigns joined yet</p>
                  <p className="text-slate-500 mb-4">Start earning by joining available campaigns</p>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Browse Available Campaigns
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Featured Customer Reviews Section */}
          {featuredReviews.length > 0 && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  What Our Users Say
                </h2>
                <p className="text-slate-600">Real feedback from creators and clippers using CreoCash</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredReviews.slice(0, 3).map((review: any) => (
                  <div key={review.id} className="bg-gradient-to-br from-slate-50 to-teal-50 rounded-2xl p-6 border border-teal-100 shadow-lg hover:shadow-xl transition-all duration-300">
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
                      <Quote className="w-5 h-5 text-teal-400" />
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