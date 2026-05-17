import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, Users, Clock, CheckCircle, AlertCircle, Eye, MousePointer, UserPlus, Settings, Play, DollarSign, Target, Webhook, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { ReviewClipperModal } from '@/features/reviews/ReviewClipperModal';
import { useToast } from '@/hooks/use-toast';
import { getGoalDefinition, type PrimaryGoal, type IntegrationField } from '../../../shared/goal-options';

interface CampaignWithClippers {
  id: string;
  name: string;
  description: string;
  status: string;
  budget: string;
  createdAt: string;
  fundingStatus?: string;
  campaignGoals?: { primaryGoal?: PrimaryGoal } & Record<string, any> | null;
  clippers?: Array<{
    id: string;
    clipperId: string;
    clipperName: string;
    isCompleted: boolean;
    completedAt: string | null;
    isApproved: boolean;
    applicationStatus?: string | null;
    postUrl?: string | null;
    completionMetrics: any;
    canReview: boolean;
    hasReview: boolean;
  }>;
  integration?: null | {
    pixelId: string | null;
    hasPostbackSecret: boolean;
    shopifyDomain: string | null;
    hasShopifyWebhookSecret: boolean;
    hasStripeWebhookSecret: boolean;
    mmpProvider: string | null;
    mmpAppId: string | null;
    hasMmpApiKey: boolean;
  };
  progress?: null | {
    primaryGoal: string;
    target: number | null;
    achieved: number;
    percentage: number;
  };
}

export default function MyCampaignsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

  const activateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${campaignId}`, {
        status: "active"
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Activated",
        description: "Your campaign is now active and clippers can apply to it.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/my-campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate campaign",
        variant: "destructive",
      });
    },
  });

  const handleActivateCampaign = (campaignId: string) => {
    activateCampaignMutation.mutate(campaignId);
  };

  const handleEditCampaign = (campaign: CampaignWithClippers) => {
    // Store campaign data in sessionStorage for editing
    sessionStorage.setItem('editCampaign', JSON.stringify(campaign));
    setLocation('/campaigns/create-enhanced?edit=true');
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
              {/* Status badge intentionally omitted here — it's shown in
                  the footer alongside the funding-status badge so users
                  see status + funding together as a pair. */}
              <CardTitle>{campaign.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">${campaign.budget}</p>
              <p className="text-xs text-gray-500">Budget</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Goal + integration panel — Phase 4 source-of-truth for
              "is this campaign actually verifying anything?" */}
          <GoalAndIntegrationPanel campaign={campaign} />

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
                          {/* Discoverability fix: pending applications used to
                              be invisible-actionable — creator saw the pill but
                              didn't know /creator/applications existed. Inline
                              "Review" link makes the next action one click away. */}
                          {!clipper.isApproved && !clipper.isCompleted && (
                            <Link
                              href="/creator/applications"
                              className="text-blue-700 hover:underline"
                            >
                              Review →
                            </Link>
                          )}
                          {clipper.isCompleted && clipper.completedAt && (
                            <span>
                              Completed {new Date(clipper.completedAt).toLocaleDateString()}
                            </span>
                          )}
                          {clipper.postUrl ? (
                            <a
                              href={clipper.postUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-blue-700 hover:underline truncate max-w-[12rem]"
                              title={clipper.postUrl}
                            >
                              <ExternalLink className="w-3 h-3" />
                              View post
                            </a>
                          ) : clipper.isApproved ? (
                            <span className="text-amber-700">Awaiting post URL</span>
                          ) : null}
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
                <Button 
                  size="sm" 
                  variant="default" 
                  className="flex items-center gap-1"
                  onClick={() => handleActivateCampaign(campaign.id)}
                >
                  <Play className="w-3 h-3" />
                  Activate
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center gap-1"
                onClick={() => handleEditCampaign(campaign)}
              >
                <Settings className="w-3 h-3" />
                Edit
              </Button>
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

// ── Goal + Integration panel ─────────────────────────────────────────
// Renders the "what is this campaign actually verifying" surface for a
// single campaign card on /my-campaigns. Three sub-blocks:
//   - Goal: label + target + aggregate progress bar
//   - Integration: green/amber badge per required field, plus a
//     "Configure integration" button when the campaigner hasn't set up
//     what their goal needs
// Reads the goal definition from shared/goal-options.ts so the labels
// stay in sync with the campaign-creation form.

function GoalAndIntegrationPanel({ campaign }: { campaign: CampaignWithClippers }) {
  const primaryGoal = campaign.campaignGoals?.primaryGoal;
  if (!primaryGoal) {
    // Legacy campaign without a primaryGoal set. Don't render the panel
    // at all — there's nothing to verify against.
    return null;
  }

  const goalDef = (() => {
    try {
      return getGoalDefinition(primaryGoal as PrimaryGoal);
    } catch {
      return null;
    }
  })();

  const required: ReadonlyArray<IntegrationField> = goalDef?.requiredIntegrationFields ?? [];
  // For each required integration field, decide if it's "set" on the
  // campaign's integration row. Drives the green/amber badges below.
  const intg = campaign.integration ?? null;
  const integrationStatus = required.map<{ field: IntegrationField; label: string; ok: boolean }>(
    (f) => {
      const labels: Record<IntegrationField, string> = {
        postbackSecret: "Postback secret",
        pixelId: "Pixel id",
        shopifyDomain: "Shopify domain",
        shopifyWebhookSecret: "Shopify webhook secret",
        stripeWebhookSecret: "Stripe webhook secret",
        mmpProvider: "MMP provider",
        mmpAppId: "MMP app id",
        mmpApiKey: "MMP API key",
      };
      let ok = false;
      if (intg) {
        switch (f) {
          case "postbackSecret":         ok = intg.hasPostbackSecret; break;
          case "pixelId":                ok = Boolean(intg.pixelId); break;
          case "shopifyDomain":          ok = Boolean(intg.shopifyDomain); break;
          case "shopifyWebhookSecret":   ok = intg.hasShopifyWebhookSecret; break;
          case "stripeWebhookSecret":    ok = intg.hasStripeWebhookSecret; break;
          case "mmpProvider":            ok = Boolean(intg.mmpProvider); break;
          case "mmpAppId":               ok = Boolean(intg.mmpAppId); break;
          case "mmpApiKey":              ok = intg.hasMmpApiKey; break;
        }
      }
      return { field: f, label: labels[f], ok };
    },
  );
  const allConfigured = integrationStatus.every((s) => s.ok);
  const isFunded = campaign.fundingStatus === "funded";
  const showIntegrationCta = required.length > 0 && !allConfigured;

  // Format aggregate progress with goal-aware units. Revenue is the only
  // $-valued goal in v1 — everything else is an integer count.
  const progress = campaign.progress ?? null;
  const formatProgressNumber = (v: number) =>
    primaryGoal === "revenue"
      ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : Math.floor(v).toLocaleString();
  const targetUnit = goalDef?.targetUnit ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      {/* Goal header + progress */}
      <div>
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-700" />
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Goal
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {goalDef?.label ?? primaryGoal}
            </span>
          </div>
          {progress?.target ? (
            <span className="text-xs text-slate-500">
              {formatProgressNumber(progress.achieved)} of {formatProgressNumber(progress.target)}{" "}
              {primaryGoal !== "revenue" ? targetUnit : ""}
            </span>
          ) : (
            <span className="text-xs text-amber-700">No target set</span>
          )}
        </div>
        {progress?.target ? (
          <div className="mt-2">
            <Progress value={progress.percentage} />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{Math.floor(progress.percentage)}%</span>
              {progress.percentage >= 100 && (
                <span className="text-green-700 font-medium">Goal reached</span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Integration status — only when the goal needs it. Goals like
          views/clicks (tracking-link / public-API) don't need any
          campaigner-side integration config and we hide this row entirely. */}
      {required.length > 0 && (
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-blue-700" />
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                Integration
              </span>
              {allConfigured ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  Configured
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                  {isFunded ? "Needs setup" : "Pending"}
                </Badge>
              )}
            </div>
            {showIntegrationCta && (
              <Link href={`/campaigns/${campaign.id}/integration`}>
                <Button size="sm" variant="outline">
                  Configure
                </Button>
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {integrationStatus.map((s) => (
              <Badge
                key={s.field}
                variant="outline"
                className={`text-xs ${
                  s.ok
                    ? "bg-white border-green-200 text-green-800"
                    : "bg-white border-amber-200 text-amber-800"
                }`}
              >
                {s.ok ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {s.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}