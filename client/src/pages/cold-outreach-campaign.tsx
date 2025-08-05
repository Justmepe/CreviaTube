import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Linkedin, 
  Twitter, 
  Instagram,
  DollarSign,
  Target,
  Users,
  Calendar,
  Info,
  CheckCircle,
  AlertTriangle,
  Crown
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

const outreachCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.number().min(50, "Minimum budget for outreach campaigns is $50"),
  duration: z.number().min(7).max(90),
  campaignType: z.literal("cold_outreach"),
  
  // Outreach specific fields
  outreachType: z.enum(["email", "linkedin", "phone", "instagram_dm", "twitter_dm", "mixed"]),
  targetAudience: z.string().min(20, "Please describe your target audience in detail"),
  messageTemplate: z.string().min(50, "Message template must be detailed (min 50 characters)"),
  targetIndustries: z.array(z.string()).min(1, "Select at least one industry"),
  targetJobTitles: z.array(z.string()).min(1, "Select at least one job title"),
  responseRequirements: z.string().min(20, "Specify what constitutes a quality response"),
  
  // Goals
  contactsGoal: z.number().min(10, "Minimum 10 contacts for outreach campaigns"),
  responsesGoal: z.number().min(1, "Set a realistic response goal"),
  
  // Rewards
  contactReward: z.number().min(2, "Minimum $2 per contact"),
  responseReward: z.number().min(5, "Minimum $5 per quality response"),
});

type OutreachCampaignForm = z.infer<typeof outreachCampaignSchema>;

const outreachIcons = {
  email: Mail,
  linkedin: Linkedin,
  phone: Phone,
  instagram_dm: Instagram,
  twitter_dm: Twitter,
  mixed: MessageSquare,
};

const industries = [
  "Technology", "Finance", "Healthcare", "E-commerce", "Manufacturing",
  "Real Estate", "Education", "Marketing", "Consulting", "Legal",
  "Retail", "Hospitality", "Construction", "Transportation", "Energy"
];

const jobTitles = [
  "CEO", "CTO", "CMO", "Sales Manager", "Marketing Director",
  "Business Owner", "VP Sales", "Operations Manager", "HR Director",
  "Product Manager", "Business Development", "Founder", "Director"
];

export default function ColdOutreachCampaign() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);
  
  const form = useForm<OutreachCampaignForm>({
    resolver: zodResolver(outreachCampaignSchema),
    defaultValues: {
      campaignType: "cold_outreach",
      duration: 30,
      budget: 200,
      contactsGoal: 50,
      responsesGoal: 10,
      contactReward: 3,
      responseReward: 10,
      targetIndustries: [],
      targetJobTitles: [],
    },
  });

  // Check if user is authorized for cold outreach
  const isAuthorized = user?.userType === "entrepreneur" || user?.userType === "enterprise";
  
  const createCampaignMutation = useMutation({
    mutationFn: async (data: OutreachCampaignForm) => {
      // Calculate premium commission (25-30% vs standard 20%)
      const premiumCommissionRate = user?.userType === "enterprise" ? 0.25 : 0.30;
      const platformFee = data.budget * premiumCommissionRate;
      const escrowAmount = data.budget - platformFee;
      
      const campaignData = {
        ...data,
        creatorId: user?.id,
        status: "draft",
        budgetUsed: 0,
        escrowBalance: escrowAmount,
        platformFee: platformFee,
        fundingStatus: "pending",
        targetPlatforms: JSON.stringify([data.outreachType]),
        rewardRates: JSON.stringify({
          outreach_contact: data.contactReward,
          outreach_response: data.responseReward,
        }),
        campaignGoals: {
          outreachContactsGoal: data.contactsGoal,
          outreachResponsesGoal: data.responsesGoal,
          primaryGoal: "outreach_contacts",
        },
        outreachConfig: {
          type: data.outreachType,
          targetAudience: data.targetAudience,
          messageTemplate: data.messageTemplate,
          targetIndustries: data.targetIndustries,
          targetJobTitles: data.targetJobTitles,
          responseRequirements: data.responseRequirements,
          premiumCommissionRate: premiumCommissionRate,
        },
      };
      
      const res = await apiRequest("POST", "/api/campaigns", campaignData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Cold Outreach Campaign Created",
        description: "Your premium lead generation campaign has been created successfully.",
      });
      setLocation("/my-campaigns");
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAuthorized) {
    return (
      <DashboardLayout title="Premium Cold Outreach">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Cold Outreach is a premium add-on service available for Entrepreneur and Enterprise users. 
            Standard campaigns use the regular 20% commission rate.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const calculateEstimatedReach = () => {
    const contacts = form.watch("contactsGoal") || 0;
    const contactReward = form.watch("contactReward") || 0;
    const responseReward = form.watch("responseReward") || 0;
    const expectedResponses = Math.floor(contacts * 0.15); // 15% typical response rate
    
    return {
      totalCost: (contacts * contactReward) + (expectedResponses * responseReward),
      expectedResponses,
      estimatedLeads: Math.floor(expectedResponses * 0.3), // 30% of responses become qualified leads
    };
  };

  const estimates = calculateEstimatedReach();
  const premiumRate = user?.userType === "enterprise" ? "25%" : "30%";

  return (
    <DashboardLayout title="Create Cold Outreach Campaign">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Cold Outreach Add-On</h1>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Premium Service: {premiumRate} Commission
          </Badge>
        </div>

        {/* Service Explanation */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Optional Premium Service:</strong> Cold outreach campaigns use higher commission rates ({premiumRate}) 
            to cover professional lead generation, verification, and compliance services. 
            Your regular campaigns continue using the standard 20% rate.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => createCampaignMutation.mutate(data))} className="space-y-6">
                {/* Basic Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Details</CardTitle>
                    <CardDescription>
                      Set up your professional B2B lead generation add-on campaign
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., B2B SaaS Lead Generation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your product/service and what makes it unique..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget (USD)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="50" 
                                step="10"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="7" 
                                max="90"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Outreach Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Outreach Strategy</CardTitle>
                    <CardDescription>
                      Configure your lead generation approach
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="outreachType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outreach Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select outreach method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(outreachIcons).map(([type, Icon]) => (
                                <SelectItem key={type} value={type}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {type.replace('_', ' ').toUpperCase()}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Audience</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your ideal customer (demographics, company size, pain points, etc.)..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="messageTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Hi [Name], I noticed [Company] is [specific observation]. We help companies like yours..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Include placeholders like [Name], [Company] that clippers can personalize
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="responseRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quality Response Criteria</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What constitutes a quality response? (e.g., shows genuine interest, asks questions, requests demo, etc.)"
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Target Filtering */}
                <Card>
                  <CardHeader>
                    <CardTitle>Target Filtering</CardTitle>
                    <CardDescription>
                      Define your ideal prospects
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <FormLabel>Target Industries</FormLabel>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {industries.map((industry) => (
                          <Button
                            key={industry}
                            type="button"
                            variant={selectedIndustries.includes(industry) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const updated = selectedIndustries.includes(industry)
                                ? selectedIndustries.filter(i => i !== industry)
                                : [...selectedIndustries, industry];
                              setSelectedIndustries(updated);
                              form.setValue("targetIndustries", updated);
                            }}
                          >
                            {industry}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FormLabel>Target Job Titles</FormLabel>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {jobTitles.map((title) => (
                          <Button
                            key={title}
                            type="button"
                            variant={selectedJobTitles.includes(title) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const updated = selectedJobTitles.includes(title)
                                ? selectedJobTitles.filter(t => t !== title)
                                : [...selectedJobTitles, title];
                              setSelectedJobTitles(updated);
                              form.setValue("targetJobTitles", updated);
                            }}
                          >
                            {title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Goals & Rewards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Goals & Rewards</CardTitle>
                    <CardDescription>
                      Set targets and compensation for your campaign
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactsGoal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Contacts</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="10"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="responsesGoal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Responses</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward per Contact ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="2" 
                                step="0.5"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="responseReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bonus per Response ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="5" 
                                step="1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? "Creating Campaign..." : "Create Outreach Campaign"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estimates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Campaign Estimates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Cost</span>
                    <span className="font-semibold">${estimates.totalCost}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expected Responses</span>
                    <span className="font-semibold">{estimates.expectedResponses}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Qualified Leads</span>
                    <span className="font-semibold">{estimates.estimatedLeads}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Add-On Service Fee ({premiumRate})</span>
                    <span className="font-semibold text-amber-600">
                      ${Math.round((form.watch("budget") || 0) * (user?.userType === "enterprise" ? 0.25 : 0.30))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add-On Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Add-On Service Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Professional copywriting review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Lead quality verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Response authenticity checks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>GDPR & CAN-SPAM compliance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Priority clipper matching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Detailed lead analytics</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Notice */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                All outreach campaigns must comply with GDPR, CAN-SPAM, and local regulations. 
                CreoCash provides compliance guidance and verification.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}