import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Calendar,
  Globe,
  Building,
  Zap,
  Crown,
  Plus,
  ArrowUpRight,
  Activity,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface Campaign {
  id: string;
  name: string;
  title?: string; // For backward compatibility
  description: string;
  budget: number;
  budgetUsed: number;
  status: string;
  fundingStatus: string;
  targetPlatforms: string;
  rewardRates: string;
  duration: number;
  createdAt: string;
  _count?: {
    clipperCampaigns: number;
    trackingEvents: number;
  };
}

interface Analytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpent: number;
  totalReach: number;
  conversionRate: number;
  topPerformingCampaigns: Campaign[];
  recentActivity: any[];
}

const navigation = [
  { name: "Brand Campaigns", href: "/campaigns", icon: Crown },
  { name: "Creator Network", href: "/marketplace", icon: Users },
  { name: "Brand Analytics", href: "/metrics", icon: BarChart3 },
  { name: "Multi-Channel", href: "/channels", icon: Globe },
  { name: "Enterprise Payouts", href: "/payouts", icon: Building },
];

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num || 0);
};

export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/analytics/enterprise"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.budgetUsed, 0);
  const totalClippers = campaigns.reduce((sum, c) => sum + (c._count?.clipperCampaigns || 0), 0);
  const totalEngagements = campaigns.reduce((sum, c) => sum + (c._count?.trackingEvents || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (campaignsLoading) {
    return (
      <DashboardLayout title="Enterprise Dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      
      <DashboardLayout title="Enterprise Command Center">
        <div className="relative z-10 space-y-8">
          {/* Modern Enterprise Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Enterprise Command Center
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">Manage your global creator marketing campaigns</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-purple-100/80 text-purple-700 border-purple-200/50 backdrop-blur-sm px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                Enterprise Account
              </Badge>
              <Button className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>

          {/* Modern Enterprise Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Campaigns Card */}
            <div className="bg-gradient-to-br from-purple-100/80 to-violet-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Crown className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-600">Active Campaigns</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{activeCampaigns.length}</p>
                  <p className="text-sm text-purple-600 font-medium">Global reach</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Total Budget Card */}
            <div className="bg-gradient-to-br from-blue-100/80 to-indigo-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Building className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-600">Total Budget</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalBudget)}</p>
                  <p className="text-sm text-blue-600 font-medium">{formatCurrency(totalSpent)} spent</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Creator Network Card */}
            <div className="bg-gradient-to-br from-green-100/80 to-emerald-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Creator Network</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalClippers}</p>
                  <p className="text-sm text-green-600 font-medium">Active creators</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Total Engagements Card */}
            <div className="bg-gradient-to-br from-orange-100/80 to-amber-200/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-medium text-slate-600">Total Engagements</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{totalEngagements.toLocaleString()}</p>
                  <p className="text-sm text-orange-600 font-medium">Multi-platform</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
