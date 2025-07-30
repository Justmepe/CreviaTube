import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CreditCard, 
  ArrowRight, 
  CheckCircle,
  DollarSign,
  Users,
  Target,
  Calendar,
  Smartphone,
  Building,
  Phone
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

const paymentSchema = z.object({
  method: z.enum(["mpesa", "airtel_money", "card", "bank"]),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
});

type PaymentData = z.infer<typeof paymentSchema>;

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
  id: string;
  totalAmount: string;
  escrowAmount: string;
  platformFeeAmount: string;
  availableBalance: string;
  lockedBalance: string;
  status: string;
  totalPaid: string;
  remainingBalance: number;
}

const PaymentMethodCard = ({ method, isSelected, onSelect }: { 
  method: any; 
  isSelected: boolean; 
  onSelect: () => void;
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'phone': return <Smartphone className="h-5 w-5" />;
      case 'credit-card': return <CreditCard className="h-5 w-5" />;
      case 'building': return <Building className="h-5 w-5" />;
      default: return <Phone className="h-5 w-5" />;
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? "border-teal-500 bg-teal-50" 
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        {getIcon(method.icon)}
        <div>
          <h3 className="font-semibold">{method.name}</h3>
          <p className="text-sm text-muted-foreground">{method.description}</p>
        </div>
        {isSelected && <CheckCircle className="h-5 w-5 text-teal-600 ml-auto" />}
      </div>
    </div>
  );
};

const FundingForm = ({ campaign, onSuccess }: { campaign: Campaign; onSuccess: () => void }) => {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  
  const { data: paymentMethods = { availableMethods: [] } } = useQuery<{ availableMethods: any[] }>({
    queryKey: ["/api/payment-methods"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const form = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: "mpesa",
      phoneNumber: "",
      email: "",
    },
  });

  const fundCampaignMutation = useMutation({
    mutationFn: async (data: PaymentData) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaign.id}/fund`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      
      // Check if we have a redirect URL from PesaPal
      if (data.redirectUrl) {
        toast({
          title: "Opening payment window...",
          description: "Complete your payment through the secure PesaPal window.",
        });
        
        // Redirect to PesaPal payment page
        window.open(data.redirectUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
        
        // Show information about sandbox mode
        setTimeout(() => {
          toast({
            title: "Development Mode",
            description: `This is sandbox mode - no real money will be charged. In production, KES ${parseFloat(campaign.budget).toFixed(2)} would be deducted from your account.`,
            duration: 10000,
          });
        }, 2000);
      } else {
        toast({
          title: "Campaign funded successfully!",
          description: `Your campaign has been funded with KES ${parseFloat(campaign.budget).toFixed(2)}. Clippers can now apply and start promoting.`,
        });
      }
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Funding failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentData) => {
    fundCampaignMutation.mutate(data);
  };

  const selectedMethodData = paymentMethods.availableMethods.find((m: any) => m.id === selectedMethod);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.availableMethods.map((method: any) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                isSelected={selectedMethod === method.id}
                onSelect={() => {
                  setSelectedMethod(method.id);
                  form.setValue("method", method.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* Payment Details */}
        {selectedMethod && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {selectedMethodData?.requiresPhone && (
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="254712345678"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="your@email.com"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={fundCampaignMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
            >
              {fundCampaignMutation.isPending ? (
                "Processing Payment..."
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Fund Campaign - KES {parseFloat(campaign.budget).toFixed(2)}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};

export default function CampaignFunding() {
  const [match, params] = useRoute("/campaigns/:id/funding");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

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
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
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

  if (campaign.fundingStatus === "funded") {
    return (
      <DashboardLayout title="Campaign Funded">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">Campaign Successfully Funded!</h3>
              <p className="text-green-700 text-center mb-6">
                Your campaign "{campaign.name}" has been funded and is now active. 
                Clippers can apply and start promoting your content.
              </p>
              
              {escrowStatus && (
                <div className="w-full max-w-md space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-3">Escrow Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Funded:</span>
                        <span className="font-semibold">${parseFloat(escrowStatus.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee (20%):</span>
                        <span className="text-red-600">-${parseFloat(escrowStatus.platformFeeAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Available for Clippers:</span>
                        <span className="text-green-600 font-semibold">${parseFloat(escrowStatus.availableBalance).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Already Paid:</span>
                        <span>${parseFloat(escrowStatus.totalPaid).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setLocation(`/campaigns/${campaign.id}`)} variant="outline">
                  View Campaign
                </Button>
                <Button onClick={() => setLocation("/campaigns")} className="bg-green-600 hover:bg-green-700">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Manage Campaigns
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const totalBudget = parseFloat(campaign.budget);
  const platformFee = totalBudget * 0.20;
  const clipperEscrow = totalBudget * 0.80;
  const rewardRates = JSON.parse(campaign.rewardRates || "{}");
  const platforms = JSON.parse(campaign.targetPlatforms || "[]");

  return (
    <DashboardLayout title="Fund Campaign">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Warning Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Important:</strong> Once you fund this campaign, the budget will be locked in escrow 
            and cannot be withdrawn. This ensures clippers receive their payments automatically and fairly.
          </AlertDescription>
        </Alert>

        {/* Campaign Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-600" />
              Campaign: {campaign.name}
            </CardTitle>
            <CardDescription>
              Review your campaign details before funding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{campaign.description}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Duration: {campaign.duration} days</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Platforms: {platforms.length}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform: string) => (
                <Badge key={platform} variant="outline">{platform}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Budget Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Total Budget</span>
                <span className="font-bold">${totalBudget.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Platform Fee (20%)</span>
                  <span className="text-red-600">-${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Clipper Escrow (80%)</span>
                  <span className="text-green-600 font-semibold">${clipperEscrow.toFixed(2)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center font-semibold">
                  <span>Available for Rewards</span>
                  <span className="text-green-700 text-xl">${clipperEscrow.toFixed(2)}</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  This amount will be held in escrow for automatic clipper payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reward Rates Preview */}
        {Object.keys(rewardRates).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reward Rates</CardTitle>
              <CardDescription>How much clippers earn for each action</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(rewardRates).map(([action, rate]) => (
                  <div key={action} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-lg text-green-600">
                      ${parseFloat(rate as string).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      per {action}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Escrow Protection Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Shield className="h-5 w-5" />
              Escrow Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
              <span className="text-sm">Your budget is held securely in escrow</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
              <span className="text-sm">Clippers are paid automatically when they earn rewards</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
              <span className="text-sm">No withdrawals allowed - protects clipper earnings</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
              <span className="text-sm">Transparent tracking of all payments</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        {campaign.fundingStatus === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-teal-600" />
                Fund Your Campaign
              </CardTitle>
              <CardDescription>
                Complete the payment to activate your campaign and start accepting clippers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FundingForm 
                campaign={campaign} 
                onSuccess={() => setLocation(`/campaigns/${campaign.id}/funding`)} 
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}