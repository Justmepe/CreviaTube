import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";
import { ConnectWalletButton } from "@/features/wallet/connect-wallet-button";
import { PaymentModal } from "@/features/payments/components/payment-modal";

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: string;
  budgetUsed: string;
  status: string;
  fundingStatus: string;
  fundedAt?: string;
  escrowBalance?: string;
  platformFee?: string;
  rewardRates: string;
  targetPlatforms: string;
  duration: number;
  createdAt: string;
}

interface EscrowStatus {
  totalAmount?: string;
  escrowAmount?: string;
  platformFeeAmount?: string;
  availableBalance?: string;
}

export default function CampaignFunding() {
  const [, params] = useRoute("/campaigns/:id/funding");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
  });

  const { data: escrowStatus } = useQuery<EscrowStatus>({
    queryKey: ["/api/campaigns", id, "funding-status"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id && campaign?.fundingStatus === "funded",
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Fund Campaign">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout title="Fund Campaign">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Campaign not found</h3>
              <p className="text-muted-foreground text-center">
                The campaign you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => setLocation("/campaigns")} className="mt-4">
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const totalBudget = parseFloat(campaign.budget);
  const platformFee = totalBudget * 0.20;
  const escrowAmount = totalBudget * 0.80;

  // Funded view
  if (campaign.fundingStatus === "funded") {
    return (
      <DashboardLayout title="Campaign Funded">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">Campaign Successfully Funded!</h3>
              <p className="text-green-700 text-center mb-6">
                "{campaign.name}" is now active. Clippers can apply and start promoting your content.
              </p>
              <div className="w-full max-w-md bg-white p-4 rounded-lg border border-green-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total funded:</span>
                  <span className="font-medium">{escrowStatus?.totalAmount ?? totalBudget.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clipper escrow (80%):</span>
                  <span className="font-medium text-green-700">{escrowStatus?.availableBalance ?? escrowAmount.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (20%):</span>
                  <span className="font-medium text-red-600">{escrowStatus?.platformFeeAmount ?? platformFee.toFixed(2)} USDC</span>
                </div>
                {campaign.fundedAt && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Funded at:</span>
                    <span>{new Date(campaign.fundedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <Button onClick={() => setLocation("/campaigns")} className="mt-6">View Campaigns</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Pending view
  return (
    <DashboardLayout title="Fund Campaign">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{campaign.name}</CardTitle>
                <CardDescription>{campaign.description}</CardDescription>
              </div>
              <Badge variant="outline">{campaign.fundingStatus}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-4 w-4" />Total budget</span>
              <span className="font-semibold">{totalBudget.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4" />Duration</span>
              <span>{campaign.duration} days</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee (20%)</span>
              <span className="text-red-600">-{platformFee.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goes to clipper escrow (80%)</span>
              <span className="text-green-700">{escrowAmount.toFixed(2)} USDC</span>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Funds are held in escrow and released to clippers automatically as they hit their goals.
            Once funded, the budget cannot be withdrawn.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Pay with USDC on Base</CardTitle>
            <CardDescription>
              {isConnected
                ? `You'll send ${totalBudget.toFixed(2)} USDC from your wallet to the platform escrow.`
                : "Connect a wallet to fund this campaign."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => setModalOpen(true)}
              >Fund {totalBudget.toFixed(2)} USDC</Button>
            ) : (
              <ConnectWalletButton />
            )}
          </CardContent>
        </Card>

        <PaymentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          kind="campaign_funding"
          referenceId={campaign.id}
          description={`Fund campaign "${campaign.name}" with ${totalBudget.toFixed(2)} USDC.`}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id] });
            queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id, "funding-status"] });
            toast({ title: "Campaign funded", description: "Your campaign is now active." });
            setTimeout(() => setModalOpen(false), 1500);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
