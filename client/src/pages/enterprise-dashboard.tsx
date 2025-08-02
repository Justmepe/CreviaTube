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
    <DashboardLayout title="Enterprise Dashboard">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Manage your global creator marketing campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Crown className="w-4 h-4 mr-1" />
              Enterprise Account
            </Badge>
            <Link href="/campaigns/new">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Campaigns</p>
                  <p className="text-3xl font-bold text-gray-900">{activeCampaigns.length}</p>
                  <p className="text-sm text-purple-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Global reach
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Crown className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {formatCurrency(totalSpent)} spent
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Creator Network</p>
                  <p className="text-3xl font-bold text-gray-900">{totalClippers}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <Users className="w-4 h-4 mr-1" />
                    Active creators
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Engagements</p>
                  <p className="text-3xl font-bold text-gray-900">{totalEngagements.toLocaleString()}</p>
                  <p className="text-sm text-orange-600 flex items-center mt-1">
                    <Activity className="w-4 h-4 mr-1" />
                    Multi-platform
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Zap className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-purple-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-purple-50 transition-colors">
                        <item.icon className="w-6 h-6 text-gray-600 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item.name === "Brand Campaigns" && "Manage your marketing campaigns"}
                          {item.name === "Creator Network" && "Browse and connect with creators"}
                          {item.name === "Brand Analytics" && "View performance metrics"}
                          {item.name === "Multi-Channel" && "Cross-platform management"}
                          {item.name === "Enterprise Payouts" && "Bulk payment processing"}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">Recent Campaigns</CardTitle>
                <CardDescription>Your latest brand marketing initiatives</CardDescription>
              </div>
              <Link href="/campaigns">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.slice(0, 5).map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{campaign.name || campaign.title}</h3>
                      <Badge className={
                        campaign.status === "active" ? "bg-green-100 text-green-800" :
                        campaign.status === "draft" ? "bg-gray-100 text-gray-800" :
                        campaign.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{campaign.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500">
                        Budget: {formatCurrency(campaign.budget)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Creators: {campaign._count?.clipperCampaigns || 0}
                      </span>
                      <span className="text-sm text-gray-500">
                        Duration: {campaign.duration} days
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {campaign.status === "draft" && campaign.fundingStatus === "pending" ? (
                      <Link href={`/campaigns/${campaign.id}/funding`}>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                          <CreditCard className="w-3 h-3 mr-2" />
                          Fund Now
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-purple-600">
                          {formatCurrency(campaign.budgetUsed)}
                        </div>
                        <div className="text-sm text-gray-500">spent</div>
                        <Progress 
                          value={(campaign.budgetUsed / campaign.budget) * 100} 
                          className="w-24 h-2 mt-1"
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {campaigns.length === 0 && (
                <div className="text-center py-8">
                  <Crown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-4">Create your first enterprise marketing campaign to get started.</p>
                  <Link href="/campaigns/new">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}