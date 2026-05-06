import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Target,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Wallet,
  Users,
  Eye,
  MousePointerClick,
  UserPlus,
  TrendingUp,
} from "lucide-react";

// Frontend zod for the form. Backend re-validates via insertCampaignSchema.
const campaignSchema = z.object({
  name: z.string().min(5, "Name must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  budget: z.string().min(1, "Budget is required"),
  duration: z.number().int().min(1, "Minimum 1 day"),
  targetPlatforms: z.array(z.string()).min(1, "Select at least one platform"),
  rewardRates: z.object({
    view: z.number().min(0, "Per-1k-views must be ≥ 0"),
    click: z.number().min(0, "Per-click must be ≥ 0"),
    signup: z.number().min(0, "Per-signup must be ≥ 0"),
    conversion: z.number().optional(),
  }),
  campaignGoals: z.object({
    primaryGoal: z.enum(["views", "clicks", "signups", "conversions"]),
    viewsGoal: z.number().int().min(0).optional(),
    clicksGoal: z.number().int().min(0).optional(),
    signupsGoal: z.number().int().min(0).optional(),
    conversionsGoal: z.number().int().min(0).optional(),
  }),
  minFollowers: z.number().int().min(0),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube Shorts" },
  { value: "instagram", label: "Instagram Reels" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

const COUNTRIES = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "ke", label: "Kenya" },
  { value: "ng", label: "Nigeria" },
  { value: "za", label: "South Africa" },
  { value: "in", label: "India" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "sw", label: "Swahili" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "pt", label: "Portuguese" },
];

const GOAL_OPTIONS = [
  { value: "views", label: "Verified views", icon: Eye, helper: "Best for awareness / reach campaigns" },
  { value: "clicks", label: "Link clicks", icon: MousePointerClick, helper: "Best for traffic / app installs" },
  { value: "signups", label: "Signups", icon: UserPlus, helper: "Best for lead gen / waitlists" },
  { value: "conversions", label: "Conversions", icon: TrendingUp, helper: "Best for revenue / paid actions" },
] as const;

export default function CampaignCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "100",
      duration: 7,
      targetPlatforms: [],
      rewardRates: {
        view: 0.04,    // per 1,000 verified views
        click: 0.05,
        signup: 2.0,
        conversion: user?.accountType === "business" ? 5.0 : undefined,
      },
      campaignGoals: {
        primaryGoal: "views",
        viewsGoal: 100000,
        clicksGoal: undefined,
        signupsGoal: undefined,
        conversionsGoal: undefined,
      },
      minFollowers: 1000,
    },
  });

  const primaryGoal = form.watch("campaignGoals.primaryGoal");
  const selectedPlatforms = form.watch("targetPlatforms");
  const budgetNumber = parseFloat(form.watch("budget") || "0");

  const togglePlatform = (id: string) => {
    const current = form.getValues("targetPlatforms");
    const updated = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    form.setValue("targetPlatforms", updated, { shouldValidate: true });
  };

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      // Backend stores reward_rates and target_platforms as JSON-stringified text;
      // campaign_goals is a true json column. Match those shapes.
      const payload = {
        name: data.name,
        description: data.description,
        budget: data.budget,
        duration: data.duration,
        targetPlatforms: JSON.stringify(data.targetPlatforms),
        rewardRates: JSON.stringify(data.rewardRates),
        requirements: JSON.stringify({
          minFollowers: data.minFollowers,
          geography: selectedCountries,
          languages: selectedLanguages,
        }),
        campaignGoals: data.campaignGoals,
      };
      const res = await apiRequest("POST", "/api/campaigns", payload);
      return await res.json();
    },
    onSuccess: (campaign: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign created",
        description: "Now fund it with USDC to make it live.",
      });
      // Send the creator straight to the funding page so they don't have to hunt for it.
      setLocation(`/campaigns/${campaign.id}/funding`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const platformFee = budgetNumber * 0.2;
  const escrowAmount = budgetNumber * 0.8;

  return (
    <DashboardLayout title="Create Campaign">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">New campaign</h1>
          <p className="text-slate-600 mt-1">
            Set the goal, fund USDC into escrow, clippers post, payouts fire when you hit it.
          </p>
        </div>

        {/* Escrow notice */}
        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          <ShieldCheck className="h-4 w-4 text-blue-700" />
          <AlertDescription>
            <strong>USDC escrow:</strong> 80% of your budget is reserved for clipper payouts, 20% is the
            platform fee. Funds release on-chain the moment the campaign goal is met. Unused balance refunds
            to your wallet when the campaign ends.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-700" />
              Campaign details
            </CardTitle>
            <CardDescription>You can change everything except budget and goals after creation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createCampaignMutation.mutate(data))}
                className="space-y-8"
              >
                {/* === BASICS === */}
                <section className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., App launch · TikTok push" {...field} />
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
                            placeholder="What you want clippers to promote, target audience, content angles, do's and don'ts."
                            className="min-h-[120px]"
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
                          <FormLabel>Budget (USDC)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="0.01" {...field} />
                          </FormControl>
                          <FormDescription>Total locked in escrow on Base.</FormDescription>
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
                          <FormDescription>Unfilled budget refunds after this.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <Separator />

                {/* === PLATFORMS === */}
                <section>
                  <h3 className="text-base font-semibold text-slate-900">Target platforms</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-4">Where clippers should post.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PLATFORMS.map((p) => {
                      const active = selectedPlatforms.includes(p.value);
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => togglePlatform(p.value)}
                          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition text-left ${
                            active
                              ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.targetPlatforms && (
                    <p className="text-sm text-red-600 mt-2">{form.formState.errors.targetPlatforms.message}</p>
                  )}
                </section>

                <Separator />

                {/* === CAMPAIGN GOALS === */}
                <section>
                  <h3 className="text-base font-semibold text-slate-900">Campaign goal</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-4">
                    Pick one primary metric. The smart contract auto-releases the bounty the moment a clipper
                    crosses this number with verified events.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {GOAL_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = primaryGoal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            form.setValue("campaignGoals.primaryGoal", opt.value, { shouldValidate: true })
                          }
                          className={`p-4 rounded-xl border text-left transition ${
                            active
                              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-300/40"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${active ? "text-blue-700" : "text-slate-500"}`} />
                            <span className="font-semibold text-sm">{opt.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{opt.helper}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Numeric input for the chosen goal */}
                  <FormField
                    control={form.control}
                    name={`campaignGoals.${primaryGoal}Goal` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Target {primaryGoal}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder={primaryGoal === "views" ? "100000" : "1000"}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Payouts auto-release when a clipper reaches this many verified {primaryGoal}.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <Separator />

                {/* === REWARD RATES === */}
                <section>
                  <h3 className="text-base font-semibold text-slate-900">Reward rates</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-4">What clippers earn per verified action.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rewardRates.view"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Per 1,000 views (USDC)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
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
                      name="rewardRates.click"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Per click (USDC)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
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
                          <FormLabel>Per signup (USDC)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                            <FormLabel>Per conversion (USDC)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </section>

                <Separator />

                {/* === CLIPPER REQUIREMENTS === */}
                <section>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    Clipper requirements
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 mb-4">Filter who can apply.</p>

                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="minFollowers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum followers</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>Across any of the selected platforms.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <ChipPicker
                      label="Target countries"
                      placeholder="Add country"
                      options={COUNTRIES}
                      selected={selectedCountries}
                      onToggle={(v) =>
                        setSelectedCountries((prev) =>
                          prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                        )
                      }
                    />

                    <ChipPicker
                      label="Required languages"
                      placeholder="Add language"
                      options={LANGUAGES}
                      selected={selectedLanguages}
                      onToggle={(v) =>
                        setSelectedLanguages((prev) =>
                          prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                        )
                      }
                    />
                  </div>
                </section>

                <Separator />

                {/* === BUDGET BREAKDOWN === */}
                <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <Lock className="h-4 w-4 text-slate-500" />
                    Where your USDC goes
                  </h3>
                  <div className="space-y-2.5">
                    <Row label="Total budget" value={`${budgetNumber.toFixed(2)} USDC`} />
                    <Row label="Platform fee (20%)" value={`- ${platformFee.toFixed(2)} USDC`} muted />
                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Reserved for clippers</span>
                        <span className="font-bold text-emerald-700 text-lg">{escrowAmount.toFixed(2)} USDC</span>
                      </div>
                    </div>
                  </div>
                  <Alert className="mt-5 border-amber-200 bg-amber-50 text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <AlertDescription className="text-sm">
                      Once funded, the budget is locked in on-chain escrow. Unspent balance returns to your
                      wallet automatically when the campaign ends.
                    </AlertDescription>
                  </Alert>
                </section>

                {/* === SUBMIT === */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Reset form
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCampaignMutation.isPending}
                    className="bg-gradient-to-r from-blue-700 to-emerald-700 hover:from-blue-800 hover:to-emerald-800 text-white shadow-md"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {createCampaignMutation.isPending ? "Creating…" : "Create draft & continue to funding"}
                  </Button>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Wallet className="h-4 w-4 text-blue-700" />
                  <AlertDescription className="text-blue-900">
                    <strong>Next step:</strong> after creation you'll be sent to the funding page to send
                    USDC on Base into escrow. Clippers can apply once funding settles on-chain.
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

// =============== Subcomponents ===============

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium ${muted ? "text-slate-500" : "text-slate-900"}`}>{value}</span>
    </div>
  );
}

function ChipPicker({
  label,
  placeholder,
  options,
  selected,
  onToggle,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((value) => {
            const opt = options.find((o) => o.value === value);
            return (
              <Badge
                key={value}
                variant="secondary"
                className="cursor-pointer hover:bg-slate-200"
                onClick={() => onToggle(value)}
              >
                {opt?.label || value} ×
              </Badge>
            );
          })}
        </div>
      )}
      <Select
        value=""
        onValueChange={(v) => onToggle(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options
            .filter((o) => !selected.includes(o.value))
            .map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
