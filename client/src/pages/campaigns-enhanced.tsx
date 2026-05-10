import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CampaignAnalytics } from "@/features/campaigns/components/campaign-analytics";
import { BudgetTracker, BudgetTrackerCompact } from "@/features/campaigns/components/budget-tracker";
import { 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  DollarSign,
  Calendar,
  Eye,
  MousePointer,
  UserPlus
} from "lucide-react";
import { useLocation } from "wouter";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "completed";
  budget: number;
  budgetUsed: number;
  escrowBalance: number;
  fundingStatus: "pending" | "funded" | "insufficient";
  createdAt: string;
  duration: number;
  campaignGoals: {
    primaryGoal: string;
    viewsGoal?: number;
    clicksGoal?: number;
    signupsGoal?: number;
  };
}

export default function CampaignsEnhanced() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "paused": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getFundingStatusColor = (status: string) => {
    switch (status) {
      case "funded": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "insufficient": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateProgress = (campaign: Campaign) => {
    return campaign.budget > 0 ? (campaign.budgetUsed / campaign.budget) * 100 : 0;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Enhanced Campaigns">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {user?.role !== "admin" && (
            <Button onClick={() => setLocation("/campaigns/create-enhanced")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          )}
        </div>

        {/* Campaign Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(campaigns.reduce((sum, c) => sum + c.budget, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(campaigns.reduce((sum, c) => sum + c.budgetUsed, 0))}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="budget">Budget Tracking</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => setSelectedCampaign(campaign.id)}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        <Badge className={getFundingStatusColor(campaign.fundingStatus)}>
                          {campaign.fundingStatus}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Budget Progress */}
                    <BudgetTrackerCompact campaignId={campaign.id} />
                    
                    {/* Campaign Goals */}
                    {campaign.campaignGoals && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Primary Goal</h4>
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{campaign.campaignGoals.primaryGoal}</span>
                          <span className="text-muted-foreground">
                            Target: {campaign.campaignGoals[`${campaign.campaignGoals.primaryGoal}Goal` as keyof typeof campaign.campaignGoals]?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/campaigns/${campaign.id}/analytics`);
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analytics
                      </Button>
                      
                      {campaign.fundingStatus !== "funded" && (
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/campaigns/${campaign.id}/funding`);
                          }}
                        >
                          Fund
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCampaigns.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria."
                      : user?.role === "admin" 
                        ? "No campaigns have been created by users yet."
                        : "Create your first campaign to start promoting your content."
                    }
                  </p>
                  {user?.role !== "admin" && (
                    <Button onClick={() => setLocation("/campaigns/create-enhanced")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {selectedCampaign ? (
              <CampaignAnalytics 
                campaignId={selectedCampaign} 
                campaignName={campaigns.find(c => c.id === selectedCampaign)?.name}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Campaign</h3>
                  <p className="text-muted-foreground text-center">
                    Choose a campaign from the Campaigns tab to view detailed analytics.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Budget Tracking Tab */}
          <TabsContent value="budget" className="space-y-6">
            {selectedCampaign ? (
              <BudgetTracker campaignId={selectedCampaign} showDetails={true} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Campaign</h3>
                  <p className="text-muted-foreground text-center">
                    Choose a campaign from the Campaigns tab to view detailed budget tracking.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}