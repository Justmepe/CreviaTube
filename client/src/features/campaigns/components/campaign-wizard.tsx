import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Target, DollarSign, Settings, TrendingUp, Users, Calendar, Globe, Zap } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";

// Step schemas
const basicInfoSchema = z.object({
  name: z.string().min(5, "Campaign name must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  duration: z.number().min(1, "Duration must be at least 1 day").max(365, "Duration cannot exceed 365 days"),
});

const budgetSchema = z.object({
  budget: z.number().min(50, "Minimum budget is $50"),
  rewardRates: z.object({
    click: z.number().min(0.01, "Minimum click reward is $0.01"),
    signup: z.number().min(0.10, "Minimum signup reward is $0.10"),
    view: z.number().min(0.001, "Minimum view reward is $0.001"),
    conversion: z.number().optional(),
  }),
});

const goalsSchema = z.object({
  primaryGoal: z.enum(["views", "clicks", "signups", "conversions"]),
  viewsGoal: z.number().optional(),
  clicksGoal: z.number().optional(),
  signupsGoal: z.number().optional(),
  conversionsGoal: z.number().optional(),
});

const targetingSchema = z.object({
  targetPlatforms: z.array(z.string()).min(1, "Select at least one platform"),
  targetCountries: z.array(z.string()).min(1, "Select at least one country"),
  targetLanguages: z.array(z.string()).min(1, "Select at least one language"),
  minFollowers: z.number().min(0, "Minimum followers cannot be negative"),
  maxFollowers: z.number().optional(),
  ageRange: z.object({
    min: z.number().min(13, "Minimum age is 13"),
    max: z.number().max(65, "Maximum age is 65"),
  }),
});

const campaignWizardSchema = basicInfoSchema
  .merge(budgetSchema)
  .merge(goalsSchema)
  .merge(targetingSchema);

type CampaignWizardData = z.infer<typeof campaignWizardSchema>;

interface CampaignWizardProps {
  onSubmit: (data: CampaignWizardData) => void;
  initialData?: any;
  isEditMode?: boolean;
  isSubmitting?: boolean;
}

const platforms = [
  { id: "instagram", name: "Instagram", icon: "📱", description: "Visual content & Stories" },
  { id: "youtube", name: "YouTube", icon: "📺", description: "Long-form video content" },
  { id: "tiktok", name: "TikTok", icon: "🎵", description: "Short-form video content" },
  { id: "twitter", name: "Twitter/X", icon: "🐦", description: "Micro-blogging & threads" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", description: "Professional networking" },
  { id: "facebook", name: "Facebook", icon: "👥", description: "Social networking" },
];

const countries = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", 
  "France", "Spain", "Italy", "Netherlands", "Brazil", "Mexico", "India", 
  "Japan", "South Korea", "Nigeria", "South Africa", "Kenya", "Global"
];

const languages = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian", 
  "Dutch", "Japanese", "Korean", "Hindi", "Swahili", "Arabic"
];

export function CampaignWizard({ onSubmit, isSubmitting = false, initialData, isEditMode = false }: CampaignWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 4;

  // Helper function to parse initial data for editing
  const getDefaultValues = (): Partial<CampaignWizardData> => {
    if (isEditMode && initialData) {
      try {
        // Parse JSON strings from the database
        const targetPlatforms = initialData.targetPlatforms ? JSON.parse(initialData.targetPlatforms) : [];
        const rewardRates = initialData.rewardRates ? JSON.parse(initialData.rewardRates) : {};
        const requirements = initialData.requirements ? JSON.parse(initialData.requirements) : {};
        
        return {
          name: initialData.name || "",
          description: initialData.description || "",
          duration: parseInt(initialData.duration) || 30,
          budget: parseFloat(initialData.budget) || 100,
          rewardRates: {
            click: rewardRates.click || 0.05,
            signup: rewardRates.signup || 2.00,
            view: rewardRates.view || 0.01,
            conversion: rewardRates.conversion,
          },
          primaryGoal: initialData.campaignGoals?.primaryGoal || "views",
          viewsGoal: initialData.campaignGoals?.viewsGoal,
          clicksGoal: initialData.campaignGoals?.clicksGoal,
          signupsGoal: initialData.campaignGoals?.signupsGoal,
          conversionsGoal: initialData.campaignGoals?.conversionsGoal,
          targetPlatforms: targetPlatforms,
          targetCountries: requirements.targetCountries || ["Global"],
          targetLanguages: requirements.targetLanguages || ["English"],
          minFollowers: requirements.minFollowers || 1000,
          maxFollowers: requirements.maxFollowers,
          ageRange: requirements.ageRange || { min: 18, max: 45 },
        };
      } catch (error) {
        console.error('Error parsing initial data:', error);
      }
    }
    
    // Default values for new campaigns
    return {
      name: "",
      description: "",
      duration: 30,
      budget: 100,
      rewardRates: {
        click: 0.05,
        signup: 2.00,
        view: 0.01,
        conversion: user?.accountType === "business" ? 5.00 : undefined,
      },
      primaryGoal: "views",
      targetPlatforms: [],
      targetCountries: ["Global"],
      targetLanguages: ["English"],
      minFollowers: 1000,
      maxFollowers: undefined,
      ageRange: { min: 18, max: 45 },
    };
  };

  const form = useForm<CampaignWizardData>({
    resolver: zodResolver(campaignWizardSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when initialData becomes available in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      console.log('CampaignWizard: Resetting form with initialData:', initialData); // Debug log
      const defaultValues = getDefaultValues();
      console.log('CampaignWizard: Parsed default values:', defaultValues); // Debug log
      form.reset(defaultValues);
    }
  }, [initialData, isEditMode, form]);

  const steps = [
    {
      title: "Basic Information",
      description: "Campaign name, description, and duration",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      title: "Budget & Rewards",
      description: "Set your budget and reward rates",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      title: "Goals & Metrics",
      description: "Define success metrics and completion goals",
      icon: <Target className="h-5 w-5" />,
    },
    {
      title: "Targeting & Requirements",
      description: "Choose platforms and clipper requirements",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  const nextStep = async () => {
    // Step-specific validation based on current step
    let fieldsToValidate: string[] = [];
    
    switch (currentStep) {
      case 1: // Basic Information
        fieldsToValidate = ["name", "description", "duration"];
        break;
      case 2: // Budget & Rewards
        fieldsToValidate = ["budget", "rewardRates.click", "rewardRates.signup", "rewardRates.view"];
        if (user?.accountType === "business") {
          fieldsToValidate.push("rewardRates.conversion");
        }
        break;
      case 3: // Goals & Metrics
        fieldsToValidate = ["primaryGoal"];
        break;
      case 4: // Targeting & Requirements
        fieldsToValidate = ["targetPlatforms", "targetCountries", "targetLanguages", "minFollowers", "ageRange.min", "ageRange.max"];
        break;
      default:
        fieldsToValidate = [];
    }

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateCampaign = () => {
    console.log('=== CREATE CAMPAIGN FUNCTION CALLED ===');
    console.log('User type:', user?.accountType);
    console.log('Current step:', currentStep);
    console.log('Total steps:', totalSteps);
    
    // Get current form values
    const formValues = form.getValues();
    console.log('=== FORM VALUES ===', JSON.stringify(formValues, null, 2));
    
    // Skip validation for now - just try to submit
    console.log('=== CALLING onSubmit DIRECTLY ===');
    try {
      onSubmit(formValues);
      console.log('=== onSubmit CALLED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== onSubmit ERROR ===', error);
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  const getBudgetProjection = () => {
    const budget = form.watch("budget");
    const platformFee = budget * 0.20;
    const escrowAmount = budget * 0.80;
    return { budget, platformFee, escrowAmount };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <CardTitle>Campaign Creation Wizard</CardTitle>
            </div>
            <Badge variant="outline">
              Step {currentStep} of {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  index + 1 <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Form {...form}>
        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <CardTitle>Basic Campaign Information</CardTitle>
                </div>
                <CardDescription>
                  Give your campaign a compelling name and description that will attract clippers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Forex Trading Masterclass Promotion"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a clear, engaging name that describes your campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what clippers will be promoting, your target audience, and what makes this campaign valuable..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide detailed information about your campaign, goals, and what clippers need to know
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
                      <FormLabel>Campaign Duration (days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          max="365"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        How long should this campaign run? (1-365 days)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Budget & Rewards */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <CardTitle>Budget & Reward Structure</CardTitle>
                  </div>
                  <CardDescription>
                    Set your total budget and define how much clippers earn for each action.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Campaign Budget (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="50"
                            step="10"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Your total campaign budget (minimum $50)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Budget Breakdown */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold">Budget Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Platform Fee (20%)</span>
                        <p className="font-semibold">${getBudgetProjection().platformFee.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Clipper Rewards (80%)</span>
                        <p className="font-semibold text-green-600">${getBudgetProjection().escrowAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Reward Rates */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Reward Rates per Action</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="rewardRates.view"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Per View</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.001"
                                min="0.001"
                                placeholder="0.01"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rewardRates.click"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Per Click</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.05"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                            <FormLabel>Per Signup</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.10"
                                min="0.10"
                                placeholder="2.00"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {user?.accountType === "business" && (
                        <FormField
                          control={form.control}
                          name="rewardRates.conversion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Per Conversion</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="1.00"
                                  min="0"
                                  placeholder="5.00"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Goals & Metrics */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Campaign Goals & Success Metrics</CardTitle>
                </div>
                <CardDescription>
                  Define what success looks like and when individual clippers complete their participation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="primaryGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Goal for Clipper Completion</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the main goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="views">Views - Content engagement</SelectItem>
                          <SelectItem value="clicks">Clicks - Link interactions</SelectItem>
                          <SelectItem value="signups">Signups - New registrations</SelectItem>
                          {user?.accountType === "business" && (
                            <SelectItem value="conversions">Conversions - Final actions</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        When a clipper reaches this goal, their participation is marked complete and they receive their rewards
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Goal Values */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Individual Clipper Goals</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="viewsGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Views Goal</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              placeholder="10000"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clicksGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clicks Goal</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              placeholder="1000"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signupsGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signups Goal</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              placeholder="50"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {user?.accountType === "business" && (
                      <FormField
                        control={form.control}
                        name="conversionsGoal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conversions Goal</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                min="0"
                                placeholder="10"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Targeting & Requirements */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Targeting & Clipper Requirements</CardTitle>
                </div>
                <CardDescription>
                  Define your target platforms, audience, and clipper requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Platform Selection */}
                <FormField
                  control={form.control}
                  name="targetPlatforms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Platforms</FormLabel>
                      <FormDescription>
                        Select the social media platforms where you want promotion
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {platforms.map((platform) => (
                          <div key={platform.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={platform.id}
                              checked={field.value?.includes(platform.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, platform.id]);
                                } else {
                                  field.onChange(current.filter(p => p !== platform.id));
                                }
                              }}
                            />
                            <label htmlFor={platform.id} className="text-sm cursor-pointer">
                              {platform.icon} {platform.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Geographic Targeting */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="targetCountries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Countries</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const current = field.value || [];
                            if (!current.includes(value)) {
                              field.onChange([...current, value]);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Add countries" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value?.map((country) => (
                            <Badge key={country} variant="secondary" className="text-xs">
                              {country}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value?.filter(c => c !== country));
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetLanguages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Languages</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const current = field.value || [];
                            if (!current.includes(value)) {
                              field.onChange([...current, value]);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Add languages" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((language) => (
                              <SelectItem key={language} value={language}>
                                {language}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value?.map((language) => (
                            <Badge key={language} variant="secondary" className="text-xs">
                              {language}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value?.filter(l => l !== language));
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Follower Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="minFollowers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Followers</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            placeholder="1000"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum follower count required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxFollowers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Followers (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            placeholder="100000"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Leave empty for no upper limit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Age Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="ageRange.min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Age</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="13"
                            max="65"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 18)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ageRange.max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Age</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="13"
                            max="65"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 45)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="button" 
                disabled={false}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Button clicked - event triggered');
                  handleCreateCampaign();
                }}
                className="bg-primary hover:bg-primary/90"
              >
                Create Campaign
                <TrendingUp className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}