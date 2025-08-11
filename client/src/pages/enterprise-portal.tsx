import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Crown,
  Plus,
  ArrowUpRight,
  Activity,
  CreditCard,
  Settings,
  Palette,
  Link as LinkIcon,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Link } from "wouter";

interface EnterpriseAccount {
  id: string;
  requestId: string;
  userId: string;
  companyName: string;
  customDomain: string;
  brandingConfig: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
    companyName?: string;
  };
  pricingConfig: {
    commissionRate: number;
    payoutThreshold: number;
    customRates?: { [key: string]: number };
  };
  features: {
    whiteLabel: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    customDomains: boolean;
    prioritySupport: boolean;
    dedicatedManager: boolean;
  };
  status: string;
  activatedAt: string;
  createdAt: string;
}

interface EnterpriseDashboardData {
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalRevenue: number;
    totalEvents: number;
    account: {
      company: string;
      domain: string;
      status: string;
      commissionRate: number;
      features: any;
    };
  };
  campaigns: any[];
  account: EnterpriseAccount;
}

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num || 0);
};

export default function EnterprisePortal() {
  const { user } = useAuth();

  // Fetch enterprise account data
  const { data: enterpriseData, isLoading, error } = useQuery<EnterpriseDashboardData>({
    queryKey: ["/api/enterprise/dashboard"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Simple debug to ensure data is loaded
  if (enterpriseData && !enterpriseData.account?.companyName) {
    console.warn("Enterprise data loaded but missing company name");
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Enterprise Portal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    console.error('Enterprise portal error:', error);
    return (
      <DashboardLayout title="Enterprise Portal">
        <div className="text-center py-12">
          <Building className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Enterprise Account</h3>
          <p className="text-gray-600 mb-6">
            {error?.message || "Failed to load enterprise account data. Please make sure you're logged in with an enterprise account."}
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Debug info: {JSON.stringify({ 
                message: error?.message, 
                isAuthenticated: !!user,
                userType: user?.userType 
              })}
            </p>
            {user?.role !== "admin" && (
              <Link href="/enterprise">
                <Button>Contact Enterprise Team</Button>
              </Link>
            )}
            {user?.role === "admin" && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Admin access detected - use the Enterprise management section</p>
                <Link href="/admin/enterprise">
                  <Button>Manage Enterprise Requests</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!enterpriseData) {
    return (
      <DashboardLayout title="Enterprise Portal">
        <div className="text-center py-12">
          <Building className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Enterprise Account Found</h3>
          <p className="text-gray-600 mb-6">
            {user?.role === "admin" 
              ? "This is the enterprise portal for managing white-label accounts. Use the admin panel to manage enterprise requests."
              : "You don't have an active enterprise account yet. Contact our team to set up your white-label platform."
            }
          </p>
          {user?.role !== "admin" && (
            <Link href="/enterprise">
              <Button>Contact Enterprise Team</Button>
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/enterprise">
              <Button>Manage Enterprise Accounts</Button>
            </Link>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const { stats, campaigns, account } = enterpriseData;
  const commissionDisplay = (account.pricingConfig.commissionRate * 100).toFixed(1);

  return (
    <DashboardLayout title={`${account.companyName} Portal`} key={account.id}>
      <div className="space-y-6">
        {/* Enterprise Account Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Crown className="w-8 h-8 text-yellow-300" />
                <h1 className="text-2xl font-bold">{account.companyName}</h1>
                <Badge className="bg-white text-blue-600 font-semibold">
                  Enterprise Account
                </Badge>
              </div>
              <p className="text-blue-100 mb-3">
                White-label CreoCash platform with custom branding and {commissionDisplay}% commission rate
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>{account.customDomain}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Status: {account.status.charAt(0).toUpperCase() + account.status.slice(1)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <div className="text-blue-200">Total Revenue</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>of {stats.totalCampaigns} total</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEvents.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>Tracking across all campaigns</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Commission Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{commissionDisplay}%</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-purple-600">
                  <Crown className="h-4 w-4 mr-1" />
                  <span>Custom enterprise rate</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Features</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Object.values(account.features).filter(Boolean).length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-orange-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Enterprise features</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your enterprise platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/campaigns/create">
                    <Button className="w-full h-16 flex flex-col items-center justify-center space-y-2">
                      <Plus className="w-6 h-6" />
                      <span>Create Campaign</span>
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center space-y-2">
                      <Users className="w-6 h-6" />
                      <span>Find Creators</span>
                    </Button>
                  </Link>
                  <Link href="/analytics">
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center space-y-2">
                      <BarChart3 className="w-6 h-6" />
                      <span>View Analytics</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Campaigns</CardTitle>
                <CardDescription>Manage and monitor your active campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
                    <p className="text-gray-600 mb-4">Create your first campaign to start tracking performance</p>
                    <Link href="/campaigns/create">
                      <Button>Create First Campaign</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.slice(0, 5).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <p className="text-sm text-gray-600">{campaign.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span>Budget: {formatCurrency(campaign.budget)}</span>
                            <span>Used: {formatCurrency(campaign.budgetUsed)}</span>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Progress 
                            value={(campaign.budgetUsed / campaign.budget) * 100} 
                            className="w-24 mb-2" 
                          />
                          <p className="text-sm text-gray-600">
                            {Math.round((campaign.budgetUsed / campaign.budget) * 100)}% used
                          </p>
                        </div>
                      </div>
                    ))}
                    {campaigns.length > 5 && (
                      <div className="text-center pt-4">
                        <Link href="/campaigns">
                          <Button variant="outline">View All Campaigns</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Configuration</CardTitle>
                <CardDescription>Your platform's custom branding settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Palette className="w-5 h-5 mr-2" />
                      Brand Colors
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: account.brandingConfig?.primaryColor || '#7c3aed' }}
                        ></div>
                        <span>Primary: {account.brandingConfig?.primaryColor || '#7c3aed'}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: account.brandingConfig?.secondaryColor || '#3b82f6' }}
                        ></div>
                        <span>Secondary: {account.brandingConfig?.secondaryColor || '#3b82f6'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <LinkIcon className="w-5 h-5 mr-2" />
                      Domain & Logo
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Custom Domain:</span>
                        <p className="font-medium">{account.customDomain || 'Not configured'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Logo:</span>
                        <p className="font-medium">
                          {account.brandingConfig?.logo ? 'Configured' : 'Using default'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enterprise Features</CardTitle>
                <CardDescription>Your enabled platform capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(account.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium capitalize">
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getFeatureDescription(feature)}
                        </p>
                      </div>
                      <Badge variant={enabled ? 'default' : 'secondary'}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function getFeatureDescription(feature: string): string {
  const descriptions: { [key: string]: string } = {
    whiteLabel: 'Complete white-label branding',
    customBranding: 'Custom colors, logo, and styling',
    apiAccess: 'Full API access for integrations',
    customDomains: 'Use your own domain name',
    prioritySupport: '24/7 priority customer support',
    dedicatedManager: 'Dedicated account manager',
  };
  return descriptions[feature] || 'Enterprise feature';
}