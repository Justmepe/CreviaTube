import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, MousePointer, ShoppingCart, Target, Globe, Zap } from "lucide-react";

export default function EntrepreneurDashboard() {
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

  // Calculate entrepreneur-specific stats
  const totalClicks = (trackingEvents as any[]).filter((e: any) => e.eventType === "click").length;
  const totalConversions = (trackingEvents as any[]).filter((e: any) => e.eventType === "conversion").length;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";
  const activeClippers = (clipperCampaigns as any[]).filter((cc: any) => cc.isApproved).length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Lead Clippers", href: "/clippers", icon: Users },
    { name: "Conversion Analytics", href: "/analytics", icon: Target },
    { name: "Payouts", href: "/payouts", icon: Wallet },
  ];

  // Business-specific activities
  const recentBusinessActivities = [
    {
      id: 1,
      type: "conversion",
      clipper: "Kevin Mwangi",
      description: "generated 3 qualified leads for your SaaS product",
      amount: "+KES 450",
      timestamp: "15 minutes ago",
      icon: Target,
      iconBg: "bg-green-50 text-green-500"
    },
    {
      id: 2,
      type: "clicks",
      clipper: "Grace Wanjiku", 
      description: "drove 250 clicks to your landing page",
      amount: "+KES 125",
      timestamp: "1 hour ago",
      icon: MousePointer,
      iconBg: "bg-blue-50 text-blue-500"
    },
    {
      id: 3,
      type: "sale",
      clipper: "Brian Kimani",
      description: "referred customer completed purchase (KES 15,000)",
      amount: "+KES 750", 
      timestamp: "4 hours ago",
      icon: ShoppingCart,
      iconBg: "bg-purple-50 text-purple-500"
    }
  ];

  const topBusinessClippers = [
    { 
      name: "Kevin Mwangi", 
      specialty: "B2B Lead Generation", 
      clicks: 1247, 
      conversions: 23,
      conversionRate: "1.8%",
      earnings: "KES 8,450" 
    },
    { 
      name: "Grace Wanjiku", 
      specialty: "E-commerce Promotion", 
      clicks: 987, 
      conversions: 19,
      conversionRate: "1.9%",
      earnings: "KES 7,120" 
    },
    { 
      name: "Brian Kimani", 
      specialty: "Service Marketing", 
      clicks: 756, 
      conversions: 15,
      conversionRate: "2.0%",
      earnings: "KES 5,890" 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-red-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout navigation={navigation} user={user}>
        <div className="relative z-10 space-y-8">
          {/* Modern Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 via-amber-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent">
                  Business Growth Hub
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">Track clicks, leads, and sales conversions</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-slate-700 font-medium">Business Active</span>
              </div>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Business Campaign
              </Button>
            </div>
          </div>

          {/* Modern Business Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Clicks Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-indigo-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <MousePointer className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Total Clicks</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalClicks.toLocaleString()}</p>
                  <p className="text-sm text-blue-600 font-medium">+15.3% this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <MousePointer className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Conversions Card */}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Target className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Conversions</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalConversions}</p>
                  <p className="text-sm text-green-600 font-medium">{conversionRate}% conversion rate</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="bg-gradient-to-br from-purple-100/80 to-violet-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-600">Revenue Generated</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">KES 245K</p>
                  <p className="text-sm text-purple-600 font-medium">This quarter</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
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
                  <p className="text-sm text-orange-600 font-medium">Lead generators</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}