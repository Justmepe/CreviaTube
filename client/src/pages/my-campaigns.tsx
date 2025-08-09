import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Users, Clock, CheckCircle, AlertCircle, Eye, MousePointer, UserPlus, Settings, Play, DollarSign } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getQueryFn } from '@/lib/queryClient';
import { ReviewClipperModal } from '@/features/reviews/ReviewClipperModal';

interface CampaignWithClippers {
  id: string;
  name: string;
  description: string;
  status: string;
  budget: string;
  createdAt: string;
  fundingStatus?: string;
  clippers?: Array<{
    id: string;
    clipperId: string;
    clipperName: string;
    isCompleted: boolean;
    completedAt: string | null;
    isApproved: boolean;
    completionMetrics: any;
    canReview: boolean;
    hasReview: boolean;
  }>;
}

export default function MyCampaignsPage() {
  const { user } = useAuth();
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    clipperCampaign?: any;
  }>({ open: false });

  const { data: campaigns, isLoading } = useQuery<CampaignWithClippers[]>({
    queryKey: ['/api/campaigns/my-campaigns'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user && user.role === 'creator',
  });

  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
  const completedCampaigns = campaigns?.filter(c => c.status === 'completed') || [];
  const draftCampaigns = campaigns?.filter(c => c.status === 'draft') || [];

  const openReviewModal = (clipperCampaign: any) => {
    setReviewModal({
      open: true,
      clipperCampaign: {
        id: clipperCampaign.id,
        clipperId: clipperCampaign.clipperId,
        campaignId: clipperCampaign.campaignId || campaigns?.find(c => 
          c.clippers?.some(cl => cl.id === clipperCampaign.id)
        )?.id,
        clipperName: clipperCampaign.clipperName,
        campaignName: campaigns?.find(c => 
          c.clippers?.some(cl => cl.id === clipperCampaign.id)
        )?.name,
        isCompleted: clipperCampaign.isCompleted,
        completionMetrics: clipperCampaign.completionMetrics,
      }
    });
  };

  if (!user || user.role !== 'creator') {
    return (
      <DashboardLayout title="My Campaigns">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Creator Access Required</h2>
            <p className="text-gray-600">
              Only creators can view campaign management.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  function CampaignCard({ campaign }: { campaign: CampaignWithClippers }) {
    const completedClippers = campaign.clippers?.filter(c => c.isCompleted) || [];
    const activeClippers = campaign.clippers?.filter(c => c.isApproved && !c.isCompleted) || [];
    const pendingClippers = campaign.clippers?.filter(c => !c.isApproved) || [];
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {campaign.name}
                <Badge variant={
                  campaign.status === 'active' ? 'default' :
                  campaign.status === 'completed' ? 'secondary' : 'outline'
                }>
                  {campaign.status}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">${campaign.budget}</p>
              <p className="text-xs text-gray-500">Budget</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Campaign Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="font-semibold">{campaign.clippers?.length || 0}</p>
              <p className="text-xs text-gray-600">Total Clippers</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="font-semibold">{completedClippers.length}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <Clock className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="font-semibold">{activeClippers.length}</p>
              <p className="text-xs text-gray-600">In Progress</p>
            </div>
          </div>

          {/* Clippers List */}
          {(campaign.clippers?.length || 0) > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Clippers</h4>
              <div className="space-y-2">
                {campaign.clippers?.map((clipper) => (
                  <div 
                    key={clipper.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{clipper.clipperName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Badge 
                            variant={
                              clipper.isCompleted ? "default" :
                              clipper.isApproved ? "secondary" : "outline"
                            }
                            className="text-xs"
                          >
                            {clipper.isCompleted ? 'Completed' :
                             clipper.isApproved ? 'Active' : 'Pending'}
                          </Badge>
                          {clipper.isCompleted && clipper.completedAt && (
                            <span>
                              Completed {new Date(clipper.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {clipper.isCompleted && clipper.completionMetrics && (
                        <div className="flex items-center gap-3 text-xs">
                          {clipper.completionMetrics.totalViews && (
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {clipper.completionMetrics.totalViews}
                            </div>
                          )}
                          {clipper.completionMetrics.totalClicks && (
                            <div className="flex items-center gap-1">
                              <MousePointer className="w-3 h-3" />
                              {clipper.completionMetrics.totalClicks}
                            </div>
                          )}
                          {clipper.completionMetrics.totalSignups && (
                            <div className="flex items-center gap-1">
                              <UserPlus className="w-3 h-3" />
                              {clipper.completionMetrics.totalSignups}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {clipper.isCompleted && clipper.canReview && !clipper.hasReview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReviewModal(clipper)}
                          className="flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          Review
                        </Button>
                      )}
                      
                      {clipper.hasReview && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Reviewed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Campaign Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {campaign.status === 'draft' ? 'Draft' : 
                 campaign.status === 'active' ? 'Active' : 
                 campaign.status === 'completed' ? 'Completed' : campaign.status}
              </Badge>
              {campaign.fundingStatus && (
                <Badge variant="secondary" className="text-xs">
                  {campaign.fundingStatus === 'pending' ? 'Needs Funding' :
                   campaign.fundingStatus === 'processing' ? 'Processing Payment' :
                   campaign.fundingStatus === 'funded' ? 'Funded' : campaign.fundingStatus}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {campaign.status === 'draft' && campaign.fundingStatus === 'pending' && (
                <Link href={`/campaign-funding/${campaign.id}`}>
                  <Button size="sm" variant="default" className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Fund Campaign
                  </Button>
                </Link>
              )}
              
              {campaign.status === 'draft' && campaign.fundingStatus === 'funded' && (
                <Button size="sm" variant="default" className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  Activate
                </Button>
              )}
              
              <Link href={`/campaigns/create-enhanced?edit=${campaign.id}`}>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardLayout title="My Campaigns">
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">
            Manage your campaigns and review clipper performance.
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts ({draftCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeCampaigns.length > 0 ? (
              <div className="space-y-4">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No active campaigns</h3>
                  <p className="text-gray-600">
                    Create your first campaign to start working with clippers.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedCampaigns.length > 0 ? (
              <div className="space-y-4">
                {completedCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No completed campaigns</h3>
                  <p className="text-gray-600">
                    Completed campaigns will appear here for review and analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4">
            {draftCampaigns.length > 0 ? (
              <div className="space-y-4">
                {draftCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No draft campaigns</h3>
                  <p className="text-gray-600">
                    Draft campaigns will appear here before being published.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ReviewClipperModal
        open={reviewModal.open}
        onOpenChange={(open) => setReviewModal({ open, clipperCampaign: undefined })}
        clipperCampaign={reviewModal.clipperCampaign!}
      />
    </DashboardLayout>
  );
}