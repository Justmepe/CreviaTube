import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  Shield, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Lock,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Smartphone,
  Building
} from "lucide-react";

export default function CreatorFundingDemo() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [fundingStep, setFundingStep] = useState(1);

  // Demo campaigns with different budgets
  const demoCampaigns = [
    {
      id: "1",
      name: "Trading Education Series",
      description: "Educational content about forex trading strategies",
      budget: "1000.00",
      status: "draft",
      fundingStatus: "pending",
      targetPlatforms: ["YouTube", "Instagram", "TikTok"],
      duration: 30
    },
    {
      id: "2", 
      name: "Crypto Investment Guide",
      description: "Beginner's guide to cryptocurrency investing",
      budget: "2500.00",
      status: "draft",
      fundingStatus: "pending",
      targetPlatforms: ["YouTube", "Twitter", "Blog"],
      duration: 45
    },
    {
      id: "3",
      name: "Social Media Growth Hacks",
      description: "Proven strategies to grow your social media following",
      budget: "500.00",
      status: "draft", 
      fundingStatus: "pending",
      targetPlatforms: ["Instagram", "TikTok"],
      duration: 14
    }
  ];

  const paymentMethods = [
    {
      id: "mpesa",
      name: "M-Pesa",
      description: "Pay with M-Pesa mobile money",
      icon: <Smartphone className="h-5 w-5" />,
      popular: true
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Pay with Visa, MasterCard",
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: "bank",
      name: "Bank Transfer", 
      description: "Direct bank transfer",
      icon: <Building className="h-5 w-5" />
    }
  ];

  const calculateSplit = (budget: string) => {
    const total = parseFloat(budget);
    const platformFee = total * 0.20;
    const clipperEscrow = total * 0.80;
    return { total, platformFee, clipperEscrow };
  };

  return (
    <DashboardLayout title="Creator Campaign Funding">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Process Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-teal-600" />
              Campaign Funding Process
            </CardTitle>
            <CardDescription>
              Fund your campaigns to activate them and start working with clippers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 ${fundingStep >= 1 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${fundingStep >= 1 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="text-sm font-medium">Select Campaign</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className={`flex items-center gap-2 ${fundingStep >= 2 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${fundingStep >= 2 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="text-sm font-medium">Review Split</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" /> 
              <div className={`flex items-center gap-2 ${fundingStep >= 3 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${fundingStep >= 3 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="text-sm font-medium">Choose Payment</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className={`flex items-center gap-2 ${fundingStep >= 4 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${fundingStep >= 4 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  4
                </div>
                <span className="text-sm font-medium">Fund & Activate</span>
              </div>
            </div>
            <Progress value={(fundingStep / 4) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Step 1: Campaign Selection */}
        {fundingStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Select Campaign to Fund</h3>
            <div className="grid gap-4">
              {demoCampaigns.map((campaign) => (
                <Card key={campaign.id} className={`cursor-pointer transition-all ${selectedCampaign?.id === campaign.id ? 'ring-2 ring-teal-500 bg-teal-50' : 'hover:bg-gray-50'}`} onClick={() => setSelectedCampaign(campaign)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{campaign.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">{campaign.duration} days</Badge>
                          <Badge variant="outline">{campaign.targetPlatforms.length} platforms</Badge>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">{campaign.fundingStatus}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-teal-600">
                          ${parseFloat(campaign.budget).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">Total Budget</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {selectedCampaign && (
              <Button onClick={() => setFundingStep(2)} className="w-full bg-teal-600 hover:bg-teal-700">
                Continue with "{selectedCampaign.name}"
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Budget Split Review */}
        {fundingStep === 2 && selectedCampaign && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Step 2: Review Budget Distribution</h3>
            
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Important:</strong> Once funded, your budget will be locked in escrow to ensure automatic payments to clippers. This cannot be reversed.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-600" />
                  Escrow Budget Breakdown
                </CardTitle>
                <CardDescription>
                  Your budget is automatically split to ensure transparent and fair distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const { total, platformFee, clipperEscrow } = calculateSplit(selectedCampaign.budget);
                  return (
                    <>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-6 w-6 text-gray-600" />
                          <div>
                            <div className="font-semibold">Total Campaign Budget</div>
                            <div className="text-sm text-gray-600">Amount you will pay</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold">${total.toFixed(2)}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800">Clipper Rewards (80%)</span>
                          </div>
                          <div className="text-xl font-bold text-green-600">${clipperEscrow.toFixed(2)}</div>
                          <div className="text-sm text-green-700 mt-1">
                            Locked in escrow, automatically paid to clippers for verified performance
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">Platform Fee (20%)</span>
                          </div>
                          <div className="text-xl font-bold text-blue-600">${platformFee.toFixed(2)}</div>
                          <div className="text-sm text-blue-700 mt-1">
                            Covers platform maintenance, payment processing, and verification systems
                          </div>
                        </div>
                      </div>

                      <Separator />
                      
                      <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                        <h4 className="font-semibold text-teal-800 mb-2">How Automatic Payments Work:</h4>
                        <ul className="text-sm text-teal-700 space-y-1">
                          <li>• Clippers promote your content across selected platforms</li>
                          <li>• Our system automatically tracks views, clicks, and engagement</li>
                          <li>• Payments are processed within 24 hours of verified performance</li>
                          <li>• No manual approval needed - fully automated based on your reward rates</li>
                        </ul>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFundingStep(1)} className="flex-1">
                Back to Selection
              </Button>
              <Button onClick={() => setFundingStep(3)} className="flex-1 bg-teal-600 hover:bg-teal-700">
                Approve Budget Split
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Method */}
        {fundingStep === 3 && selectedCampaign && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Step 3: Choose Payment Method</h3>
            
            <div className="grid gap-4">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="cursor-pointer hover:bg-gray-50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {method.icon}
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {method.name}
                            {method.popular && <Badge variant="secondary" className="bg-green-100 text-green-800">Popular</Badge>}
                          </div>
                          <div className="text-sm text-gray-600">{method.description}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFundingStep(2)} className="flex-1">
                Back to Review
              </Button>
              <Button onClick={() => setFundingStep(4)} className="flex-1 bg-teal-600 hover:bg-teal-700">
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Final Confirmation */}
        {fundingStep === 4 && selectedCampaign && (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">Ready to Fund Campaign!</h3>
                <p className="text-green-700 text-center mb-6">
                  Your campaign will be activated immediately after payment processing.
                  Clippers can start applying and promoting your content.
                </p>
                
                <div className="w-full max-w-md space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-3">Final Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Campaign:</span>
                        <span className="font-semibold">{selectedCampaign.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Payment:</span>
                        <span className="font-semibold">${parseFloat(selectedCampaign.budget).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clipper Escrow:</span>
                        <span className="text-green-600">${(parseFloat(selectedCampaign.budget) * 0.80).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee:</span>
                        <span className="text-blue-600">${(parseFloat(selectedCampaign.budget) * 0.20).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 w-full max-w-md">
                  <Button variant="outline" onClick={() => setFundingStep(3)} className="flex-1">
                    Back to Payment
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">
                    <Lock className="h-4 w-4 mr-2" />
                    Complete Funding
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why Fund Upfront?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>Trust:</strong> Clippers know they'll be paid for their work</p>
              <p>• <strong>Automation:</strong> Payments happen automatically within 24 hours</p>
              <p>• <strong>Transparency:</strong> Clear budget allocation prevents disputes</p>
              <p>• <strong>Quality:</strong> Only serious creators with real budgets attract top clippers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>Escrow Protection:</strong> Funds are held securely until performance is verified</p>
              <p>• <strong>Automated Verification:</strong> AI-powered tracking ensures accurate payments</p>
              <p>• <strong>Dispute Resolution:</strong> Built-in system for handling any issues</p>
              <p>• <strong>Refund Policy:</strong> Unused funds are returned if campaign ends early</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}