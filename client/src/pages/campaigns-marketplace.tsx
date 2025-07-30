import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Search, Filter, Star, Users, Clock, DollarSign, Target, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CampaignsMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: availableCampaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns/available"],
    enabled: !!user && user.role === "clipper",
  });

  const joinCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest("POST", "/api/clipper-campaigns", { campaignId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Successfully joined campaign. You'll receive your tracking link soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clipper-campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join campaign",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(Number(amount));
  };

  const parseRewardRates = (rewardRates: string) => {
    try {
      return JSON.parse(rewardRates);
    } catch {
      return {};
    }
  };

  const parseTargetPlatforms = (platforms: string) => {
    try {
      return JSON.parse(platforms);
    } catch {
      return [];
    }
  };

  const filteredCampaigns = (availableCampaigns as any[]).filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user || user.role !== "clipper") {
    return (
      <DashboardLayout title="Campaigns Marketplace">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only clippers can access the campaigns marketplace.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaigns Marketplace">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns Marketplace</h1>
            <p className="text-gray-600">Discover and join campaigns to start earning</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Cards */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No campaigns found</h3>
              <p className="text-gray-600 mt-2">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "No campaigns are currently available. Check back later!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((campaign: any) => {
              const rewardRates = parseRewardRates(campaign.rewardRates);
              const platforms = parseTargetPlatforms(campaign.targetPlatforms);
              
              return (
                <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={campaign.status === "active" ? "default" : "secondary"}
                            className={campaign.status === "active" ? "bg-green-100 text-green-800" : ""}
                          >
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline">
                            {formatCurrency(campaign.budget)} budget
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm ml-1">4.8</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {campaign.description || "No description available"}
                    </p>

                    {/* Reward Rates */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Rewards</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {rewardRates.signup && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Signup:</span>
                            <span className="font-medium">{formatCurrency(rewardRates.signup)}</span>
                          </div>
                        )}
                        {rewardRates.view && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Views (1K):</span>
                            <span className="font-medium">{formatCurrency(rewardRates.view)}</span>
                          </div>
                        )}
                        {rewardRates.conversion && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Conversion:</span>
                            <span className="font-medium">{formatCurrency(rewardRates.conversion)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Platform Tags */}
                    {platforms.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Target Platforms</h4>
                        <div className="flex flex-wrap gap-1">
                          {platforms.map((platform: string) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {campaign.requirements && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Requirements</h4>
                        <p className="text-sm text-gray-600">{campaign.requirements}</p>
                      </div>
                    )}

                    {/* Campaign Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>12 clippers</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{campaign.duration || 30} days</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full"
                      onClick={() => joinCampaignMutation.mutate(campaign.id)}
                      disabled={joinCampaignMutation.isPending}
                    >
                      {joinCampaignMutation.isPending ? "Joining..." : "Join Campaign"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}