import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Eye, 
  Users, 
  DollarSign, 
  Calendar,
  Play,
  Pause,
  Settings,
  TrendingUp,
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

interface Campaign {
  id: string;
  title: string;
  description: string;
  budget: number;
  budgetUsed: number;
  status: "draft" | "active" | "paused" | "completed";
  platformRequirements: string[];
  rewardRates: {
    click: number;
    signup: number;
    deposit?: number;
    trade?: number;
    conversion?: number;
  };
  duration: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    clipperCampaigns: number;
    trackingEvents: number;
  };
}

export default function CampaignsList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: getQueryFn(),
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign updated",
        description: "Campaign status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      instagram: "📱",
      youtube: "📺",
      tiktok: "🎵",
      twitter: "🐦",
      linkedin: "💼",
      facebook: "👥"
    };
    return icons[platform as keyof typeof icons] || "🌐";
  };

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const draftCampaigns = campaigns.filter(c => c.status === "draft");
  const pausedCampaigns = campaigns.filter(c => c.status === "paused");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");

  if (isLoading) {
    return (
      <DashboardLayout title="Campaigns">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
    const budgetProgress = (campaign.budgetUsed / campaign.budget) * 100;
    const daysLeft = Math.max(0, campaign.duration - Math.floor((new Date().getTime() - new Date(campaign.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{campaign.title}</CardTitle>
              <Badge className={`mt-1 ${getStatusColor(campaign.status)}`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
            </div>
            <div className="flex gap-1">
              {campaign.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCampaignMutation.mutate({ id: campaign.id, status: "paused" })}
                  disabled={toggleCampaignMutation.isPending}
                >
                  <Pause className="h-3 w-3" />
                </Button>
              )}
              {(campaign.status === "paused" || campaign.status === "draft") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCampaignMutation.mutate({ id: campaign.id, status: "active" })}
                  disabled={toggleCampaignMutation.isPending}
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              <Button size="sm" variant="outline">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="line-clamp-2 mb-4">
            {campaign.description}
          </CardDescription>
          
          {/* Platforms */}
          <div className="flex flex-wrap gap-1 mb-4">
            {campaign.platformRequirements.map((platform) => (
              <Badge key={platform} variant="outline" className="text-xs">
                {getPlatformIcon(platform)} {platform}
              </Badge>
            ))}
          </div>
          
          {/* Budget Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Budget Used</span>
              <span>{formatCurrency(campaign.budgetUsed)} / {formatCurrency(campaign.budget)}</span>
            </div>
            <Progress value={budgetProgress} className="h-2" />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="font-semibold">{campaign._count?.clipperCampaigns || 0}</p>
              <p className="text-muted-foreground">Clippers</p>
            </div>
            <div className="text-center">
              <Eye className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="font-semibold">{campaign._count?.trackingEvents || 0}</p>
              <p className="text-muted-foreground">Events</p>
            </div>
            <div className="text-center">
              <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="font-semibold">{daysLeft}</p>
              <p className="text-muted-foreground">Days Left</p>
            </div>
          </div>
          
          {/* Reward Rates */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Rewards:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                Click: {formatCurrency(campaign.rewardRates.click)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Signup: {formatCurrency(campaign.rewardRates.signup)}
              </Badge>
              {campaign.rewardRates.deposit && (
                <Badge variant="secondary" className="text-xs">
                  Deposit: {formatCurrency(campaign.rewardRates.deposit)}
                </Badge>
              )}
              {campaign.rewardRates.conversion && (
                <Badge variant="secondary" className="text-xs">
                  Convert: {formatCurrency(campaign.rewardRates.conversion)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout title="Campaigns">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground">
              Manage your affiliate marketing campaigns and track performance
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCampaigns.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(campaigns.reduce((sum, c) => sum + c.budget, 0))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clippers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns.reduce((sum, c) => sum + (c._count?.clipperCampaigns || 0), 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns.reduce((sum, c) => sum + (c._count?.trackingEvents || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({draftCampaigns.length})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({pausedCampaigns.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCampaigns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active campaigns</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first campaign to start promoting your content
                  </p>
                  <Link href="/campaigns/new">
                    <Button>Create Campaign</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="draft">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="paused">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pausedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}