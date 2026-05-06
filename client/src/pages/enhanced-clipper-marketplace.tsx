import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CampaignMatchBadge } from "@/features/campaigns/components/campaign-match-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Globe,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Music,
  Heart,
  Eye,
  Share2,
  AlertTriangle,
  Info,
  Mail
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

interface Campaign {
  id: string;
  title: string;
  description: string;
  budget: number;
  budgetUsed: number;
  status: string;
  targetPlatforms: string;
  rewardRates: {
    click: number;
    signup: number;
    deposit?: number;
    trade?: number;
    conversion?: number;
    view: number; // New view-based payment
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
    accountType: string;
    socialAccounts?: Record<string, any>;
  };
  _count?: {
    clipperCampaigns: number;
  };
  fundingStatus: "pending" | "funded" | "completed";
  socialRequirements?: {
    minFollowers: number;
    engagementRate: number;
    platforms: string[];
  };
}

interface ClipperCampaign {
  id: string;
  campaignId: string;
  isApproved: boolean;
  status: string;
  appliedAt: string;
  approvedAt?: string;
  earnings: number;
  trackingCode: string;
  campaign: Campaign;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons = {
    instagram: Instagram,
    youtube: Youtube,
    twitter: Twitter,
    facebook: Facebook,
    tiktok: Music,
  };
  
  const Icon = icons[platform as keyof typeof icons] || Globe;
  return <Icon className="h-4 w-4" />;
};

type MatchedResponse = {
  clipperPlatforms: string[];
  hasConnectedPlatforms: boolean;
  campaigns: Array<Campaign & { matchScore?: number; matchedPlatforms?: string[] }>;
};

export default function EnhancedClipperMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>(user?.role === "clipper" ? "best_fit" : "latest");
  const [creatorTypeFilter, setCreatorTypeFilter] = useState("all");

  const { data: availableCampaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/available"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: matched } = useQuery<MatchedResponse>({
    queryKey: ["/api/campaigns/matched"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: user?.role === "clipper",
  });

  // Map<campaignId, {matchScore, matchedPlatforms}> so badges render regardless of sort mode.
  const matchByCampaignId = new Map<string, { matchScore: number; matchedPlatforms: string[] }>();
  for (const c of matched?.campaigns ?? []) {
    if (typeof c.matchScore === "number") {
      matchByCampaignId.set(c.id, { matchScore: c.matchScore, matchedPlatforms: c.matchedPlatforms ?? [] });
    }
  }

  const { data: coldOutreachCampaigns = [], isLoading: coldOutreachLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/cold-outreach"],
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
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const getCreatorTypeColor = (type: string) => {
    switch (type) {
      case "influencer": return "bg-pink-100 text-pink-800";
      case "business": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCreatorTypeLabel = (type: string) => {
    switch (type) {
      case "influencer": return "Social Influencer";
      case "business": return "Business";
      default: return type;
    }
  };

  // Filter and sort campaigns
  const filteredCampaigns = availableCampaigns
    .filter(campaign => {
      if (searchTerm && !campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !campaign.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (platformFilter !== "all" && !JSON.parse(campaign.targetPlatforms || '[]').includes(platformFilter)) {
        return false;
      }
      if (creatorTypeFilter !== "all" && campaign.creator.accountType !== creatorTypeFilter) {
        return false;
      }
      return campaign.fundingStatus === "funded" && campaign.status === "active";
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "best_fit": {
          const ma = matchByCampaignId.get(a.id)?.matchScore ?? 0;
          const mb = matchByCampaignId.get(b.id)?.matchScore ?? 0;
          if (mb !== ma) return mb - ma;
          // Tiebreak by recency
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case "budget": return b.budget - a.budget;
        case "reward": return (b.rewardRates.view || 0) - (a.rewardRates.view || 0);
        case "duration": return a.duration - b.duration;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const appliedCampaignIds = new Set(myApplications.map(app => app.campaignId));

  // Filter cold outreach campaigns
  const filteredColdOutreachCampaigns = coldOutreachCampaigns
    .filter(campaign => {
      if (searchTerm && !campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !campaign.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;    
      }
      return campaign.fundingStatus === "funded" && campaign.status === "active";
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (campaignsLoading || applicationsLoading) {
    return (
      <DashboardLayout title="Clipper Marketplace">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Clipper Marketplace">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Discover campaigns and start earning with your social media influence</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
              {filteredCampaigns.length} Active Campaigns
            </Badge>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>

              <Select value={creatorTypeFilter} onValueChange={setCreatorTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Creator Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clippers</SelectItem>
                  <SelectItem value="influencer">Social Influencers</SelectItem>
                  <SelectItem value="business">Businesses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {user?.role === "clipper" && (
                    <SelectItem value="best_fit">Best fit for me</SelectItem>
                  )}
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="budget">Highest Budget</SelectItem>
                  <SelectItem value="reward">Best Rewards</SelectItem>
                  <SelectItem value="duration">Shortest Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">Standard Campaigns</TabsTrigger>
            <TabsTrigger value="cold-outreach">
              <div className="flex items-center gap-2">
                B2B Cold Outreach
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Premium
                </Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger value="my-campaigns">My Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">Standard Affiliate Campaigns</h3>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                20% Commission
              </Badge>
            </div>

            {user?.role === "clipper" && matched && !matched.hasConnectedPlatforms && (
              <Alert className="border-amber-200 bg-amber-50">
                <Target className="h-4 w-4 text-amber-700" />
                <AlertDescription className="flex items-center justify-between gap-3 text-amber-900">
                  <span>
                    Connect a social account to see campaigns matched to your platforms first.
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setLocation("/social-integration")}>
                    Connect accounts
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {user?.role === "clipper" && matched && matched.hasConnectedPlatforms && sortBy === "best_fit" && (
              <p className="text-sm text-muted-foreground">
                Sorted by fit with your connected platforms: {matched.clipperPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
              </p>
            )}
            {filteredCampaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filters or check back later for new campaigns.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{campaign.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={getCreatorTypeColor(campaign.creator.accountType)}>
                              {getCreatorTypeLabel(campaign.creator.accountType)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              by @{campaign.creator.username}
                            </Badge>
                            {(() => {
                              const m = matchByCampaignId.get(campaign.id);
                              return m ? <CampaignMatchBadge matchScore={m.matchScore} matchedPlatforms={m.matchedPlatforms} /> : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-4">
                      <CardDescription className="line-clamp-3">
                        {campaign.description}
                      </CardDescription>
                      
                      {/* Platform Requirements */}
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(campaign.targetPlatforms || '[]').map((platform: string) => (
                          <div key={platform} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
                            <PlatformIcon platform={platform} />
                            <span className="capitalize">{platform}</span>
                          </div>
                        ))}
                      </div>

                      {/* Reward Structure */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900">Reward Structure</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-blue-600" />
                              <span>Views (1K)</span>
                            </div>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(campaign.rewardRates.view || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-green-600" />
                              <span>Signup</span>
                            </div>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(campaign.rewardRates.signup)}
                            </span>
                          </div>
                          {campaign.rewardRates.deposit && (
                            <div className="flex items-center justify-between p-2 bg-purple-50 rounded col-span-2">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-purple-600" />
                                <span>Deposit + Trade</span>
                              </div>
                              <span className="font-semibold text-purple-600">
                                {formatCurrency(campaign.rewardRates.deposit)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Requirements */}
                      {campaign.requirements.minFollowers && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>Min. {campaign.requirements.minFollowers.toLocaleString()} followers</span>
                        </div>
                      )}

                      {/* Budget and Stats */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Used</span>
                          <span>{formatCurrency(campaign.budgetUsed)} / {formatCurrency(campaign.budget)}</span>
                        </div>
                        <Progress value={(campaign.budgetUsed / campaign.budget) * 100} className="h-2" />
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {appliedCampaignIds.has(campaign.id) ? (
                          <Button disabled className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Applied
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => applyToCampaignMutation.mutate(campaign.id)}
                            disabled={applyToCampaignMutation.isPending}
                            className="w-full bg-teal-600 hover:bg-teal-700"
                          >
                            {applyToCampaignMutation.isPending ? "Applying..." : "Apply Now"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cold-outreach" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">B2B Cold Outreach Campaigns</h3>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Premium Service - Higher Rates
                </Badge>
              </div>
              
             <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Specialized Service:</strong> Cold outreach campaigns require professional B2B lead generation skills, 
                  compliance knowledge, and higher engagement quality. Premium rates apply (25-30% vs standard 20%).
                </AlertDescription>
              </Alert>
            </div>

            {filteredColdOutreachCampaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No cold outreach campaigns available</h3>
                  <p className="text-gray-600 mb-4">Check back later for B2B lead generation opportunities, or browse standard campaigns.</p>
                  <Button variant="outline" onClick={() => {
                    const availableTab = document.querySelector('[value="available"]') as HTMLButtonElement;
                    availableTab?.click();
                  }}>
                    View Standard Campaigns
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredColdOutreachCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow border-amber-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{campaign.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-amber-100 text-amber-800">
                              Cold Outreach
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              by @{campaign.creator.username}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-gray-600 text-sm line-clamp-2">{campaign.description}</p>
                      
                      {/* Outreach Specific Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-amber-600" />
                          <span>B2B Lead Generation</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-amber-600" />
                          <span>Professional Outreach Required</span>
                        </div>
                      </div>

                      {/* Premium Reward Rates */}
                      <div className="bg-amber-50 rounded-lg p-3">
                        <h4 className="font-medium text-amber-800 mb-2">Premium Rewards</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between p-2 bg-white rounded">
                            <span>Per Contact</span>
                            <span className="font-semibold text-amber-700">
                              ${(campaign.rewardRates as any)?.outreach_contact || 3}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded">
                            <span>Per Response</span>
                            <span className="font-semibold text-amber-700">
                              ${(campaign.rewardRates as any)?.outreach_response || 10}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Budget and Stats */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Used</span>
                          <span>${campaign.budgetUsed} / ${campaign.budget}</span>
                        </div>
                        <Progress value={(campaign.budgetUsed / campaign.budget) * 100} className="h-2" />
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {appliedCampaignIds.has(campaign.id) ? (
                          <Button disabled className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Applied
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => applyToCampaignMutation.mutate(campaign.id)}
                            disabled={applyToCampaignMutation.isPending}
                            className="w-full bg-amber-600 hover:bg-amber-700"
                          >
                            {applyToCampaignMutation.isPending ? "Applying..." : "Apply for Cold Outreach"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-campaigns" className="space-y-6">
            {myApplications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                  <p className="text-gray-600 mb-4">Start by browsing available campaigns and applying to ones that match your audience.</p>
                  <Button onClick={() => {
                    const availableTab = document.querySelector('[value="available"]') as HTMLButtonElement;
                    availableTab?.click();
                  }}>
                    Browse Campaigns
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myApplications.map((application) => (
                  <Card key={application.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{application.campaign.title}</h3>
                          <p className="text-gray-600 mt-1">{application.campaign.description}</p>
                          
                          <div className="flex items-center gap-4 mt-4">
                            <Badge className={
                              application.isApproved 
                                ? "bg-green-100 text-green-800" 
                                : application.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }>
                              {application.isApproved ? "Approved" : 
                               application.status === "rejected" ? "Rejected" : "Pending"}
                            </Badge>
                            
                            <span className="text-sm text-gray-500">
                              Applied {new Date(application.appliedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-teal-600">
                            {formatCurrency(application.earnings)}
                          </div>
                          <div className="text-sm text-gray-500">Total Earned</div>
                          
                          {application.isApproved && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Code: {application.trackingCode}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}