import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Target, Users, Calendar, Zap, Lock, Shield, AlertTriangle } from "lucide-react";

const campaignSchema = z.object({
  name: z.string().min(5, "Name must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  budget: z.string().min(1, "Budget is required"),
  targetPlatforms: z.array(z.string()).min(1, "Select at least one platform"),
  rewardRates: z.object({
    click: z.number().min(0.01, "Minimum click reward is $0.01"),
    signup: z.number().min(0.1, "Minimum signup reward is $0.10"),
    deposit: z.number().optional(),
    trade: z.number().optional(),
    conversion: z.number().optional(),
  }),
  requirements: z.string().optional(),
  duration: z.number().min(1, "Minimum campaign duration is 1 day"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

// Platform icons mapping
const platformIcons: Record<string, string> = {
  "instagram": "📱",
  "youtube": "📺",
  "tiktok": "🎵",
  "twitter": "🐦",
  "linkedin": "💼",
  "facebook": "👥",
  "telegram": "💬",
  "discord": "🎮",
  "website": "🌐",
  "email": "📧"
};

export default function CampaignCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Platform data with fallback
  const platforms = [
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
    { value: "twitter", label: "Twitter/X" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "facebook", label: "Facebook" },
    { value: "telegram", label: "Telegram" },
    { value: "discord", label: "Discord" },
    { value: "website", label: "Website/Blog" },
    { value: "email", label: "Email Marketing" }
  ];

  // Countries data with fallback
  const countries = [
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
    { value: "ca", label: "Canada" },
    { value: "au", label: "Australia" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
    { value: "ke", label: "Kenya" },
    { value: "ng", label: "Nigeria" },
    { value: "za", label: "South Africa" },
    { value: "in", label: "India" }
  ];

  // Languages data with fallback
  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "sw", label: "Swahili" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
    { value: "pt", label: "Portuguese" }
  ];

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "100",
      targetPlatforms: [],
      rewardRates: {
        click: 0.05,
        signup: 2.00,
        deposit: user?.userType === "trader_creator" ? 10.00 : undefined,
        trade: user?.userType === "trader_creator" ? 0.50 : undefined,
        conversion: (user?.userType === "entrepreneur" || user?.userType === "enterprise") ? 5.00 : undefined,
      },
      requirements: "",
      duration: 7,
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const payload = {
        name: data.name,
        description: data.description,
        budget: data.budget,
        targetPlatforms: JSON.stringify(selectedPlatforms),
        rewardRates: JSON.stringify(data.rewardRates),
        requirements: JSON.stringify({
          minFollowers: 1000,
          geography: selectedCountries,
          languages: selectedLanguages,
        }),
        duration: data.duration,
      };
      const res = await apiRequest("POST", "/api/campaigns", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign created successfully",
        description: "Your campaign is now live and accepting clipper applications.",
      });
      form.reset();
      setSelectedPlatforms([]);
      setSelectedCountries([]);
      setSelectedLanguages([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePlatform = (platformId: string) => {
    const updated = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter(p => p !== platformId)
      : [...selectedPlatforms, platformId];
    setSelectedPlatforms(updated);
    form.setValue("targetPlatforms", updated);
  };

  const toggleCountry = (country: string) => {
    const updated = selectedCountries.includes(country)
      ? selectedCountries.filter(c => c !== country)
      : [...selectedCountries, country];
    setSelectedCountries(updated);
  };

  const toggleLanguage = (language: string) => {
    const updated = selectedLanguages.includes(language)
      ? selectedLanguages.filter(l => l !== language)
      : [...selectedLanguages, language];
    setSelectedLanguages(updated);
  };

  const budgetNumber = parseFloat(form.watch("budget") || "0");
  const estimatedReach = Math.min(budgetNumber * 20, 50000);
  const estimatedClippers = Math.min(Math.floor(budgetNumber / 50), 200);

  return (
    <DashboardLayout title="Create Campaign">
      <div className="max-w-4xl space-y-8">
        {/* Budget Escrow Notice */}
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Budget Escrow System:</strong> Your campaign budget will be held in escrow to ensure fair clipper payments. 
            The platform takes 20% as fees, and 80% is reserved for automatic clipper payments. 
            <span className="font-semibold text-orange-900"> Once funded, the budget cannot be withdrawn</span> to protect clipper earnings.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-600" />
              Campaign Details
            </CardTitle>
            <CardDescription>
              Create a new affiliate marketing campaign. You'll need to fund the budget before clippers can join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createCampaignMutation.mutate(data))} className="space-y-6">
                
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Promote My Trading Course" {...field} />
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
                            placeholder="Describe what you want clippers to promote and your target audience..."
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
                          <FormLabel>Campaign Budget ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="10"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Total budget for clipper rewards
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            Campaign duration (minimum 1 day, default 7 days)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Platform Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Platform Requirements</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which platforms clippers should promote your content on
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {platforms?.map((platform) => (
                      <Button
                        key={platform.value}
                        type="button"
                        variant={selectedPlatforms.includes(platform.value) ? "default" : "outline"}
                        className="justify-start h-auto p-3"
                        onClick={() => togglePlatform(platform.value)}
                      >
                        <span className="mr-2">{platformIcons[platform.value] || "📱"}</span>
                        {platform.label}
                      </Button>
                    ))}
                  </div>
                  {form.formState.errors.targetPlatforms && (
                    <p className="text-sm text-red-600 mt-2">
                      {form.formState.errors.targetPlatforms.message}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Reward Rates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Reward Rates</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set how much you'll pay clippers for each action
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rewardRates.click"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Per Click ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="rewardRates.signup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Per Signup ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0.10"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {user?.userType === "trader_creator" && (
                      <>
                        <FormField
                          control={form.control}
                          name="rewardRates.deposit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Per Deposit ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="rewardRates.trade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Per Trade ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    {(user?.userType === "entrepreneur" || user?.userType === "enterprise") && (
                      <FormField
                        control={form.control}
                        name="rewardRates.conversion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Per Conversion ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <Separator />

                {/* Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Clipper Requirements</h3>
                  
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Minimum Followers</label>
                    <Input 
                      type="number" 
                      min="0"
                      defaultValue="1000"
                      placeholder="1000"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Minimum follower count across all platforms
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Target Countries</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedCountries.map((country) => (
                          <Badge key={country} variant="secondary" className="cursor-pointer" onClick={() => toggleCountry(country)}>
                            {country} ×
                          </Badge>
                        ))}
                      </div>
                      <Select onValueChange={(value) => toggleCountry(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add target countries" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries?.filter(c => !selectedCountries.includes(c.label)).map((country) => (
                            <SelectItem key={country.value} value={country.label}>{country.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Required Languages</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedLanguages.map((language) => (
                          <Badge key={language} variant="secondary" className="cursor-pointer" onClick={() => toggleLanguage(language)}>
                            {language} ×
                          </Badge>
                        ))}
                      </div>
                      <Select onValueChange={(value) => toggleLanguage(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add required languages" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages?.filter(l => !selectedLanguages.includes(l.label)).map((language) => (
                            <SelectItem key={language.value} value={language.label}>{language.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Budget Breakdown */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    Budget Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Budget</span>
                      <span className="font-semibold text-lg">${budgetNumber.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Platform Fee (20%)</span>
                      <span className="text-red-600">-${(budgetNumber * 0.20).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Clipper Escrow (80%)</span>
                      <span className="text-green-600">${(budgetNumber * 0.80).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Available for Rewards</span>
                        <span className="text-green-700">${(budgetNumber * 0.80).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <strong>Important:</strong> Once you fund this campaign, the budget is locked in escrow 
                        and cannot be withdrawn. This ensures clippers receive their payments automatically.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Preview */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Campaign Preview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Reach</p>
                        <p className="font-semibold">{estimatedReach.toLocaleString()} people</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Potential Clippers</p>
                        <p className="font-semibold">{estimatedClippers} clippers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{form.watch("duration")} days</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    disabled={createCampaignMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {createCampaignMutation.isPending ? "Creating..." : "Create Draft Campaign"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Reset Form
                  </Button>
                </div>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Next Step:</strong> After creating your campaign, you'll be prompted to fund it with your credit card or bank account. 
                    Once funded, clippers can apply and start promoting your content immediately. All payments to clippers are processed automatically from your escrow balance.
                  </AlertDescription>
                </Alert>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}