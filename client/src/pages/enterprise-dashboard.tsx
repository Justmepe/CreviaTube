import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EnterpriseBrandingModal } from "@/components/enterprise-branding-modal";
import { EnterpriseContactModal } from "@/components/enterprise-contact-modal";
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

interface EnterpriseDashboardData {
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalRevenue: number;
    totalEvents: number;
  };
  campaigns: Campaign[];
  account: {
    id: string;
    companyName: string;
    customDomain: string;
    pricingConfig: {
      commissionRate: number;
    };
    status: string;
  };
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

function EnterpriseDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Fetch enterprise account data first
  const { data: enterpriseData } = useQuery<EnterpriseDashboardData>({
    queryKey: ["/api/enterprise/dashboard"],
  });

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
      
      <DashboardLayout navigation={navigation}>
        <div className="relative z-10 space-y-8">
          {/* Enterprise White-Label Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    {enterpriseData?.account?.companyName ? `${enterpriseData.account.companyName} Enterprise` : 'Enterprise Command Center'}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="bg-purple-100/80 text-purple-700 border-purple-200/50 text-xs">
                      White-Label Access
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-200/50 text-xs">
                      Full Platform Control
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-slate-600 text-lg font-medium">
                {enterpriseData?.account?.customDomain 
                  ? `White-label platform at ${enterpriseData.account.customDomain} with ${(enterpriseData.account.pricingConfig.commissionRate * 100).toFixed(1)}% commission rate`
                  : 'Complete CreoCash platform with custom branding and enterprise features'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700">Enterprise Active</span>
                </div>
              </div>
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

          {/* Enterprise White-Label Features Section */}
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/30 shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Enterprise White-Label Features</h2>
              <p className="text-slate-600">Your enterprise subscription provides complete platform access with custom branding and advanced controls</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Custom Branding */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border border-purple-200/50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Custom Branding</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Replace CreoCash branding with your company logo</li>
                  <li>• Custom color schemes and themes</li>
                  <li>• White-label URL and domain</li>
                  <li>• Branded email templates and communications</li>
                </ul>
              </div>

              {/* Full Platform Access */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200/50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Complete Platform</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• All creator types (trader, influencer, entrepreneur)</li>
                  <li>• Advanced campaign management tools</li>
                  <li>• Real-time analytics and reporting</li>
                  <li>• Multi-platform integrations</li>
                </ul>
              </div>

              {/* Enterprise Controls */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200/50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Enterprise Controls</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• User management and permissions</li>
                  <li>• Custom payout settings and thresholds</li>
                  <li>• Advanced fraud detection</li>
                  <li>• Priority support and onboarding</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Custom Pricing Section */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6 border border-green-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Enterprise Custom Pricing</h3>
                    <p className="text-slate-600 text-sm">Your enterprise account has custom pricing rates negotiated with CreoCash. No standard 20% platform fees apply.</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-200/50">
                    Custom Rates Active
                  </Badge>
                </div>
              </div>

              {/* Branding Configuration */}
              <div className="bg-gradient-to-r from-purple-100 to-violet-100 rounded-xl p-6 border border-purple-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">White-Label Branding</h3>
                    <p className="text-slate-600 text-sm">Customize your platform with company branding, colors, and domain.</p>
                  </div>
                  <Button 
                    onClick={() => setBrandingModalOpen(true)}
                    className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                  >
                    Configure Branding
                  </Button>
                </div>
              </div>

              {/* Contact Enterprise Team */}
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-6 border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Need Custom Configuration?</h3>
                    <p className="text-slate-600 text-sm">Contact CreoCash enterprise team for custom pricing, advanced features, and dedicated support.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => setContactModalOpen(true)}
                  >
                    Contact Enterprise Team
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Enterprise Branding Configuration Modal */}
      <EnterpriseBrandingModal
        open={brandingModalOpen}
        onOpenChange={setBrandingModalOpen}
        currentBranding={enterpriseData?.account?.companyName ? { companyName: enterpriseData.account.companyName } : undefined}
      />

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        userInfo={{
          fullName: user?.fullName,
          email: user?.email,
          companyName: enterpriseData?.account?.companyName,
        }}
      />
    </div>
  );
}

export default EnterpriseDashboard;
