import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, Crown, Building2, Palette, Globe, Zap, Star, Folder } from "lucide-react";

export default function EnterpriseDashboard() {
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Metrics", href: "/metrics", icon: BarChart3 },
    { name: "Campaigns", href: "/campaigns", icon: Folder },
    { name: "My Campaigns", href: "/my-campaigns", icon: TrendingUp },
    { name: "Clippers", href: "/clippers", icon: Users },
    { name: "Clipper Directory", href: "/clipper-directory", icon: Users },
    { name: "Payouts", href: "/payouts", icon: Wallet },
    { name: "Settings", href: "/settings", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout navigation={navigation}>
        <div className="relative z-10 space-y-8">
          {/* Modern Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Enterprise Control Center
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">White-label platform management and analytics</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-slate-700 font-medium">Enterprise Active</span>
              </div>
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Customize Platform
              </Button>
            </div>
          </div>

          {/* Enterprise Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users Card */}
            <div className="bg-gradient-to-br from-purple-100/80 to-indigo-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">2,547</p>
                  <p className="text-sm text-purple-600 font-medium">+12% this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Platform Revenue Card */}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Platform Revenue</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">$89,432</p>
                  <p className="text-sm text-green-600 font-medium">15% commission rate</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Active Campaigns Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-indigo-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Active Campaigns</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">156</p>
                  <p className="text-sm text-blue-600 font-medium">Cross-platform reach</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Brand Reach Card */}
            <div className="bg-gradient-to-br from-orange-100/80 to-amber-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-medium text-slate-600">Global Reach</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">47</p>
                  <p className="text-sm text-orange-600 font-medium">Countries served</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Globe className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Features */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Enterprise Features</h2>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">White-Label Platform</h3>
                    <p className="text-sm text-slate-600">Full customization</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700">Complete control over branding, domain, and user experience with your company identity.</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Custom Pricing</h3>
                    <p className="text-sm text-slate-600">Flexible rates</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700">Set your own commission rates and pricing structure tailored to your business model.</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Advanced Analytics</h3>
                    <p className="text-sm text-slate-600">Deep insights</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700">Comprehensive analytics and reporting with custom dashboards and data exports.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}