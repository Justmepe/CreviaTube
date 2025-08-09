import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CampaignWizard } from "@/features/campaigns/components/campaign-wizard";
import { ChevronLeft, Zap, AlertTriangle, CheckCircle } from "lucide-react";

export default function EnhancedCampaignCreation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editCampaign, setEditCampaign] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Check for edit mode and load campaign data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isEdit = urlParams.get('edit') === 'true';
    
    if (isEdit) {
      const campaignData = sessionStorage.getItem('editCampaign');
      if (campaignData) {
        try {
          const campaign = JSON.parse(campaignData);
          setEditCampaign(campaign);
          setIsEditMode(true);
          // Clear the session storage after loading
          sessionStorage.removeItem('editCampaign');
        } catch (error) {
          console.error('Error parsing campaign data:', error);
          toast({
            title: "Error",
            description: "Failed to load campaign data for editing",
            variant: "destructive",
          });
        }
      }
    }
  }, [toast]);
  
  // Safely access auth context with error handling
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    // Handle case where AuthProvider is not available
    console.warn('Auth context not available in enhanced campaign creation');
  }

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        description: data.description,
        budget: data.budget.toString(),
        targetPlatforms: JSON.stringify(data.targetPlatforms),
        rewardRates: JSON.stringify(data.rewardRates),
        requirements: JSON.stringify({
          minFollowers: data.minFollowers,
          maxFollowers: data.maxFollowers,
          targetCountries: data.targetCountries,
          targetLanguages: data.targetLanguages,
          ageRange: data.ageRange,
        }),
        duration: data.duration,
        campaignGoals: {
          primaryGoal: data.primaryGoal,
          viewsGoal: data.viewsGoal,
          clicksGoal: data.clicksGoal,
          signupsGoal: data.signupsGoal,
          depositsGoal: data.depositsGoal,
          tradesGoal: data.tradesGoal,
          conversionsGoal: data.conversionsGoal,
        },
      };

      if (isEditMode && editCampaign?.id) {
        const res = await apiRequest("PATCH", `/api/campaigns/${editCampaign.id}`, payload);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/campaigns", payload);
        return await res.json();
      }
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/my-campaigns"] });
      toast({
        title: isEditMode ? "Campaign updated successfully!" : "Campaign created successfully!",
        description: isEditMode 
          ? `"${campaign.name}" has been updated.`
          : `"${campaign.name}" has been created and is ready for funding.`,
      });
      // Redirect to my campaigns page
      setLocation("/my-campaigns");
    },
    onError: (error: Error) => {
      console.error('Campaign creation error:', error);
      toast({
        title: "Campaign creation failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCampaignSubmit = (data: any) => {
    console.log('handleCampaignSubmit called with:', data);
    console.log('Mutation status:', {
      isPending: createCampaignMutation.isPending,
      isError: createCampaignMutation.isError,
      error: createCampaignMutation.error
    });
    
    createCampaignMutation.mutate(data);
  };

  return (
    <DashboardLayout title={isEditMode ? "Edit Campaign" : "Create Campaign"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/my-campaigns")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to My Campaigns
          </Button>
        </div>

        {/* User Type Alert */}
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {isEditMode ? "Editing" : "Creating"} campaign as <strong>{user?.userType?.replace('_', ' ').toUpperCase()}</strong>. 
                Reward options are customized for your creator type.
              </span>
              {user?.userType === "trader_creator" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Trading rewards enabled
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Campaign Wizard */}
        <CampaignWizard
          onSubmit={handleCampaignSubmit}
          isSubmitting={createCampaignMutation.isPending}
          initialData={editCampaign}
          isEditMode={isEditMode}
        />

        {/* Important Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Important Information
            </CardTitle>
            <CardDescription>
              Please review these important details about campaign creation and management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Funding Process</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Campaigns must be funded before going live</li>
                  <li>• 20% platform fee, 80% goes to clipper rewards</li>
                  <li>• Funds are held in escrow for automatic payouts</li>
                  <li>• Support for M-Pesa, PayPal, and other methods</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Goal-Based Completion</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Each clipper works toward individual goals</li>
                  <li>• Automatic payout when goals are reached</li>
                  <li>• Campaign stays active for other clippers</li>
                  <li>• Real-time progress tracking and analytics</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Quality Control</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• AI detection prevents fake content</li>
                  <li>• Bot protection ensures authentic engagement</li>
                  <li>• Creator approval for clipper applications</li>
                  <li>• Performance monitoring and analytics</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Budget Management</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time budget tracking and alerts</li>
                  <li>• Burn rate monitoring and projections</li>
                  <li>• Automatic escrow release system</li>
                  <li>• Detailed spending analytics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}