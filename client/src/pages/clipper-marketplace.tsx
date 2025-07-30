import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  Filter,
  Star,
  DollarSign,
  Users,
  Calendar,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  MapPin,
  Globe
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
  status: string;
  platformRequirements: string[];
  rewardRates: {
    click: number;
    signup: number;
    deposit?: number;
    trade?: number;
    conversion?: number;
  };
  requirements: {
    minFollowers?: number;
    geography?: string[];
    languages?: string[];
  };
  duration: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    fullName: string;
    userType: string;
  };
  _count?: {
    clipperCampaigns: number;
  };
}

interface ClipperCampaign {
  id: string;
  campaignId: string;
  isApproved: boolean;
  status: string;
  appliedAt: string;
  approvedAt?: string;
  campaign: Campaign;
}

export default function ClipperMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const { data: availableCampaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/available"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: myApplications = [], isLoading: applicationsLoading } = useQuery<ClipperCampaign[]>({
    queryKey: ["/api/clipper-campaigns"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: user?.role === "clipper",
  });

  const applyToCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", "/api/clipper-campaigns", { campaignId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clipper-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/available"] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
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

  const getCreatorTypeColor = (userType: string) => {
    switch (userType) {
      case "trader_creator": return "bg-blue-100 text-blue-800";
      case "influencer": return "bg-purple-100 text-purple-800";
      case "entrepreneur": return "bg-green-100 text-green-800";
      case "enterprise": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filter and sort campaigns
  const filteredCampaigns = availableCampaigns
    .filter(campaign => {
      const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = platformFilter === "all" || 
                            campaign.platformRequirements.includes(platformFilter);
      return matchesSearch && matchesPlatform;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "highest_reward":
          return (b.rewardRates.signup + b.rewardRates.click) - (a.rewardRates.signup + a.rewardRates.click);
        case "budget":
          return b.budget - a.budget;
        case "least_competitive":
          return (a._count?.clipperCampaigns || 0) - (b._count?.clipperCampaigns || 0);
        default: // latest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const appliedCampaignIds = new Set(myApplications.map(app => app.campaignId));

  const CampaignCard = ({ campaign, showApplyButton = true }: { campaign: Campaign; showApplyButton?: boolean }) => {
    const hasApplied = appliedCampaignIds.has(campaign.id);
    const budgetProgress = (campaign.budgetUsed / campaign.budget) * 100;
    const competitiveness = campaign._count?.clipperCampaigns || 0;
    
    const getCompetitivenessColor = (count: number) => {
      if (count <= 5) return "text-green-600";
      if (count <= 15) return "text-yellow-600";
      return "text-red-600";
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{campaign.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getCreatorTypeColor(campaign.creator.userType)}>
                  {campaign.creator.userType.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">by {campaign.creator.fullName}</span>
              </div>
            </div>
            {showApplyButton && (
              <Button
                size="sm"
                onClick={() => applyToCampaignMutation.mutate(campaign.id)}
                disabled={hasApplied || applyToCampaignMutation.isPending}
                className={hasApplied ? "opacity-50" : "bg-teal-600 hover:bg-teal-700"}
              >
                {hasApplied ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Applied
                  </>
                ) : (
                  "Apply Now"
                )}
              </Button>
            )}
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
          
          {/* Reward Rates - Highlighted */}
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium text-green-800 mb-2">Earn up to:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-green-700">{formatCurrency(campaign.rewardRates.click)}</p>
                <p className="text-xs text-green-600">per click</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-700">{formatCurrency(campaign.rewardRates.signup)}</p>
                <p className="text-xs text-green-600">per signup</p>
              </div>
              {campaign.rewardRates.deposit && (
                <div className="text-center">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(campaign.rewardRates.deposit)}</p>
                  <p className="text-xs text-green-600">per deposit</p>
                </div>
              )}
              {campaign.rewardRates.conversion && (
                <div className="text-center">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(campaign.rewardRates.conversion)}</p>
                  <p className="text-xs text-green-600">per conversion</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Requirements */}
          {campaign.requirements && (
            <div className="space-y-2 mb-4">
              {campaign.requirements.minFollowers && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span>Min. {campaign.requirements.minFollowers.toLocaleString()} followers</span>
                </div>
              )}
              {campaign.requirements.geography && campaign.requirements.geography.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{campaign.requirements.geography.slice(0, 2).join(", ")}{campaign.requirements.geography.length > 2 ? "..." : ""}</span>
                </div>
              )}
              {campaign.requirements.languages && campaign.requirements.languages.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span>{campaign.requirements.languages.slice(0, 2).join(", ")}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Campaign Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t">
            <div className="text-center">
              <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="font-semibold">{formatCurrency(campaign.budget - campaign.budgetUsed)}</p>
              <p className="text-muted-foreground">Available</p>
            </div>
            <div className="text-center">
              <Target className={`h-4 w-4 mx-auto mb-1 ${getCompetitivenessColor(competitiveness)}`} />
              <p className={`font-semibold ${getCompetitivenessColor(competitiveness)}`}>{competitiveness}</p>
              <p className="text-muted-foreground">Clippers</p>
            </div>
            <div className="text-center">
              <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="font-semibold">{campaign.duration}</p>
              <p className="text-muted-foreground">Days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ApplicationCard = ({ application }: { application: ClipperCampaign }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "approved": return "bg-green-100 text-green-800";
        case "pending": return "bg-yellow-100 text-yellow-800";
        case "rejected": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "approved": return <CheckCircle className="h-4 w-4" />;
        case "pending": return <Clock className="h-4 w-4" />;
        default: return <Target className="h-4 w-4" />;
      }
    };

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{application.campaign.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(application.status)}>
                  {getStatusIcon(application.status)}
                  <span className="ml-1 capitalize">{application.status}</span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Applied {new Date(application.appliedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CampaignCard campaign={application.campaign} showApplyButton={false} />
          
          {application.isApproved && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">
                🎉 Congratulations! You've been approved for this campaign.
              </p>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Get Tracking Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (campaignsLoading || applicationsLoading) {
    return (
      <DashboardLayout title="Campaign Marketplace">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Marketplace">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Discover and apply to affiliate marketing campaigns from creators worldwide
          </p>
        </div>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse">Browse Campaigns ({filteredCampaigns.length})</TabsTrigger>
            <TabsTrigger value="applications">My Applications ({myApplications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest</SelectItem>
                      <SelectItem value="highest_reward">Highest Reward</SelectItem>
                      <SelectItem value="budget">Largest Budget</SelectItem>
                      <SelectItem value="least_competitive">Least Competitive</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredCampaigns.length} campaigns found
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Grid */}
            {filteredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                  <p className="text-muted-foreground text-center">
                    Try adjusting your search terms or filters to find more campaigns
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            {myApplications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start applying to campaigns to see your applications here
                  </p>
                  <Button onClick={() => document.querySelector<HTMLElement>('[data-state="inactive"][value="browse"]')?.click()}>
                    Browse Campaigns
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}