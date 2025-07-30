import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, Wallet, BarChart3, Plus, Eye, Globe, Zap, Building, Award, Crown, Layers } from "lucide-react";

export default function EnterpriseDashboard() {
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

  // Calculate enterprise-specific stats
  const totalImpressions = (trackingEvents as any[]).filter((e: any) => e.eventType === "view").length * 10000; // Enterprise scale
  const totalBrandMentions = (trackingEvents as any[]).filter((e: any) => e.eventType === "conversion").length * 50;
  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.status === "active").length;
  const totalBudgetSpent = activeCampaigns * 50000; // Enterprise budgets

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, current: true },
    { name: "Brand Campaigns", href: "/campaigns", icon: Crown },
    { name: "Creator Network", href: "/creators", icon: Users },
    { name: "Brand Analytics", href: "/analytics", icon: TrendingUp },
    { name: "Multi-Channel", href: "/channels", icon: Layers },
    { name: "Enterprise Payouts", href: "/payouts", icon: Wallet },
  ];

  // Enterprise-specific activities
  const recentBrandActivities = [
    {
      id: 1,
      type: "campaign_launch",
      creator: "Top Tier Network",
      description: "launched multi-platform brand awareness campaign",
      amount: "+2.5M impressions",
      timestamp: "2 hours ago",
      icon: Crown,
      iconBg: "bg-purple-50 text-purple-500"
    },
    {
      id: 2,
      type: "brand_mention",
      creator: "Elite Creator Collective", 
      description: "generated 50K brand mentions across social platforms",
      amount: "+15% brand awareness",
      timestamp: "4 hours ago",
      icon: Award,
      iconBg: "bg-yellow-50 text-yellow-500"
    },
    {
      id: 3,
      type: "partnership",
      creator: "Premium Influencer Tier",
      description: "established exclusive brand partnership agreement",
      amount: "+KES 250,000 deal",
      timestamp: "1 day ago",
      icon: Building,
      iconBg: "bg-blue-50 text-blue-500"
    }
  ];

  const topEnterpriseCreators = [
    { 
      name: "Elite Creator Network", 
      tier: "Premium Partnership", 
      reach: "2.5M followers", 
      campaigns: 8,
      brandScore: "9.8/10",
      investment: "KES 425,000" 
    },
    { 
      name: "Premium Content Collective", 
      tier: "Exclusive Brand Ambassador", 
      reach: "1.8M followers", 
      campaigns: 6,
      brandScore: "9.6/10",
      investment: "KES 380,000" 
    },
    { 
      name: "Luxury Lifestyle Creators", 
      tier: "Strategic Partnership", 
      reach: "1.2M followers", 
      campaigns: 5,
      brandScore: "9.4/10",
      investment: "KES 320,000" 
    },
  ];

  return (
    <DashboardLayout navigation={navigation} user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Brand Dashboard</h1>
            <p className="text-gray-600">Multi-channel brand campaigns and premium creator partnerships</p>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Launch Enterprise Campaign
          </Button>
        </div>

        {/* Enterprise Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Brand Reach</p>
                  <p className="text-2xl font-bold text-gray-900">{(totalImpressions / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-green-600 mt-1">+24% from last month</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Brand Mentions</p>
                  <p className="text-2xl font-bold text-gray-900">{(totalBrandMentions / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-green-600 mt-1">+18% engagement rate</p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Partnerships</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCampaigns * 3}</p>
                  <p className="text-xs text-green-600 mt-1">Premium tier creators</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Campaign Investment</p>
                  <p className="text-2xl font-bold text-gray-900">KES {(totalBudgetSpent / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-blue-600 mt-1">ROI: 340%</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Enterprise Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-purple-500" />
                Enterprise Brand Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBrandActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.iconBg}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.creator}</span> {activity.description}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700">
                          {activity.amount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Enterprise Creator Partners */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                Premium Creator Partners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topEnterpriseCreators.map((creator, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {creator.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{creator.name}</p>
                        <p className="text-xs text-purple-600 font-medium">{creator.tier}</p>
                        <p className="text-xs text-gray-500">{creator.reach} • {creator.campaigns} campaigns</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{creator.investment}</p>
                      <div className="flex items-center space-x-1">
                        <Award className="w-3 h-3 text-yellow-500" />
                        <p className="text-xs text-yellow-600">{creator.brandScore}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enterprise Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-500" />
              Multi-Channel Brand Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">Social Media Reach</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">2.8M</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">Brand Recognition</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">92%</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">Partnership ROI</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">340%</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}