import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  AlertTriangle
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
    userType: string;
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

export default function EnhancedClipperMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [creatorTypeFilter, setCreatorTypeFilter] = useState("all");

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
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const getCreatorTypeColor = (type: string) => {
    switch (type) {
      case "trader_creator": return "bg-blue-100 text-blue-800";
      case "influencer": return "bg-pink-100 text-pink-800";
      case "entrepreneur": return "bg-green-100 text-green-800";
      case "enterprise": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCreatorTypeLabel = (type: string) => {
    switch (type) {
      case "trader_creator": return "Trading Educator";
      case "influencer": return "Social Influencer";
      case "entrepreneur": return "Entrepreneur";
      case "enterprise": return "Enterprise Brand";
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
      if (creatorTypeFilter !== "all" && campaign.creator.userType !== creatorTypeFilter) {
        return false;
      }
      return campaign.fundingStatus === "funded" && campaign.status === "active";
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "budget": return b.budget - a.budget;
        case "reward": return (b.rewardRates.view || 0) - (a.rewardRates.view || 0);
        case "duration": return a.duration - b.duration;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const appliedCampaignIds = new Set(myApplications.map(app => app.campaignId));

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
                  <SelectItem value="all">All Creators</SelectItem>
                  <SelectItem value="trader_creator">Trading Educators</SelectItem>
                  <SelectItem value="influencer">Social Influencers</SelectItem>
                  <SelectItem value="entrepreneur">Entrepreneurs</SelectItem>
                  <SelectItem value="enterprise">Enterprise Brands</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Available Campaigns</TabsTrigger>
            <TabsTrigger value="my-campaigns">My Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
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
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getCreatorTypeColor(campaign.creator.userType)}>
                              {getCreatorTypeLabel(campaign.creator.userType)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              by @{campaign.creator.username}
                            </Badge>
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

          <TabsContent value="my-campaigns" className="space-y-6">
            {myApplications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                  <p className="text-gray-600 mb-4">Start by browsing available campaigns and applying to ones that match your audience.</p>
                  <Button onClick={() => document.querySelector('[value="available"]')?.click()}>
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