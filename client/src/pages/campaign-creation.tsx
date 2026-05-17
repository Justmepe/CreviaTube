import { useEffect, useState } from "react";
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
  Heart,
  Crown,
  Smartphone,
  Sparkles,
  DollarSign,
  UserCheck,
  Ticket,
  FileVideo,
} from "lucide-react";
import { resolvePersona } from "@/features/personas/resolver";
import { getPersonaConfig } from "@/features/personas/registry";
import type { CampaignTemplate } from "@/features/personas/registry";
import type { Persona } from "@/features/personas/types";

// All v1 goal types (aligned with shared/goal-options.ts GOAL_CATALOG).
// New in Phase 4: revenue, leads, code_redemptions, ugc_volume.
const GOAL_TYPES = [
  "views",
  "clicks",
  "signups",
  "conversions",
  "follows",
  "subscribes",
  "installs",
  "revenue",
  "leads",
  "code_redemptions",
  "ugc_volume",
] as const;
type GoalType = typeof GOAL_TYPES[number];

// Frontend zod for the form. Backend re-validates via insertCampaignSchema.
const campaignSchema = z.object({
  name: z.string().min(5, "Name must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  budget: z.string().min(1, "Budget is required"),
  duration: z.number().int().min(1, "Minimum 1 day"),
  targetPlatforms: z.array(z.string()).min(1, "Select at least one platform"),
  rewardRates: z.object({
    view: z.number().min(0).optional(),
    click: z.number().min(0).optional(),
    signup: z.number().min(0).optional(),
    conversion: z.number().min(0).optional(),
    follow: z.number().min(0).optional(),
    subscribe: z.number().min(0).optional(),
    install: z.number().min(0).optional(),
    // Phase 4 — new event types.
    purchase: z.number().min(0).optional(),         // revenue goals — paid per verified purchase event
    lead: z.number().min(0).optional(),             // lead-gen goals — paid per qualified lead
    codeRedemption: z.number().min(0).optional(),   // promo-code goals — paid per redemption
    post: z.number().min(0).optional(),             // ugc-volume goals — paid per approved post
  }),
  campaignGoals: z.object({
    primaryGoal: z.enum(GOAL_TYPES),
    viewsGoal: z.number().int().min(0).optional(),
    clicksGoal: z.number().int().min(0).optional(),
    signupsGoal: z.number().int().min(0).optional(),
    conversionsGoal: z.number().int().min(0).optional(),
    followsGoal: z.number().int().min(0).optional(),
    subscribesGoal: z.number().int().min(0).optional(),
    installsGoal: z.number().int().min(0).optional(),
    // Phase 4 — new goal targets (revenue is $-valued; the rest are counts).
    revenueGoal: z.number().min(0).optional(),
    leadsGoal: z.number().int().min(0).optional(),
    codeRedemptionsGoal: z.number().int().min(0).optional(),
    ugcVolumeGoal: z.number().int().min(0).optional(),
  }),
  minFollowers: z.number().int().min(0),
  // Migration 0028 — source materials the creator supplies. Arrays
  // come through the UI as plain strings (one URL per line for
  // example clips; comma-separated for hashtags) and get split into
  // arrays in onSubmit before hitting the API. Schema relaxed to
  // optional + .or(literal('')) so legacy edit flows that don't
  // touch these fields don't fail validation.
  sourceContentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  brandGuidelines: z.string().optional().or(z.literal("")),
  exampleClipUrlsText: z.string().optional().or(z.literal("")),
  requiredHashtagsText: z.string().optional().or(z.literal("")),
  clipLengthSecMin: z.number().int().min(1).optional(),
  clipLengthSecMax: z.number().int().min(1).optional(),
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

type GoalOption = { value: GoalType; label: string; icon: any; helper: string };

const ALL_GOAL_OPTIONS: Record<GoalType, GoalOption> = {
  views:            { value: "views",            label: "Verified views",         icon: Eye,                helper: "Best for awareness / reach campaigns" },
  clicks:           { value: "clicks",           label: "Link clicks",            icon: MousePointerClick,  helper: "Best for traffic / app installs" },
  signups:          { value: "signups",          label: "Signups",                icon: UserPlus,           helper: "Best for lead gen / waitlists" },
  conversions:      { value: "conversions",      label: "Conversions",            icon: TrendingUp,         helper: "Best for revenue / paid actions" },
  follows:          { value: "follows",          label: "Follower growth",        icon: Heart,              helper: "Convert viewers into followers on your channel" },
  subscribes:       { value: "subscribes",       label: "Paid subscribers",       icon: Crown,              helper: "Drive paid-tier signups (Patreon, Substack, course)" },
  installs:         { value: "installs",         label: "App installs",           icon: Smartphone,         helper: "iOS / Android installs from the clip" },
  revenue:          { value: "revenue",          label: "Sales / revenue",        icon: DollarSign,         helper: "$-valued purchases verified via Shopify or Stripe webhook" },
  leads:            { value: "leads",            label: "Qualified leads",        icon: UserCheck,          helper: "Form fills / demo bookings, verified via pixel" },
  code_redemptions: { value: "code_redemptions", label: "Promo-code redemptions", icon: Ticket,             helper: "Each clipper gets a unique code. Webhook attributes redemptions back" },
  ugc_volume:       { value: "ugc_volume",       label: "UGC volume",             icon: FileVideo,          helper: "Goal hits when N clippers post approved content" },
};

// Which goal types each persona can pick. Mirrors shared/goal-options.ts —
// kept as a static map here so the UI can layer on lucide icons + helper
// text the shared module shouldn't depend on.
const GOALS_FOR_PERSONA: Record<Persona, GoalType[]> = {
  brand:      ["views", "clicks", "signups", "conversions", "revenue", "leads", "code_redemptions", "ugc_volume"],
  influencer: ["views", "follows", "clicks", "subscribes"],
  founder:    ["views", "clicks", "signups", "installs", "leads", "code_redemptions"],
  clipper:    [],
  admin:      [],
};

// Maps a persona's primaryGoal to the corresponding rewardRates key.
// Single-source-of-truth fix for the singular/plural mismatch the
// completion-bonus calc was hitting (goal "views" vs rate key "view").
const GOAL_TO_RATE_KEY: Record<GoalType, keyof CampaignFormData["rewardRates"]> = {
  views:            "view",
  clicks:           "click",
  signups:          "signup",
  conversions:      "conversion",
  follows:          "follow",
  subscribes:       "subscribe",
  installs:         "install",
  revenue:          "purchase",
  leads:            "lead",
  code_redemptions: "codeRedemption",
  ugc_volume:       "post",
};

// Goal type → goal-amount field name (camelCase for form path).
const GOAL_TO_AMOUNT_FIELD: Record<GoalType, keyof CampaignFormData["campaignGoals"]> = {
  views:            "viewsGoal",
  clicks:           "clicksGoal",
  signups:          "signupsGoal",
  conversions:      "conversionsGoal",
  follows:          "followsGoal",
  subscribes:       "subscribesGoal",
  installs:         "installsGoal",
  revenue:          "revenueGoal",
  leads:            "leadsGoal",
  code_redemptions: "codeRedemptionsGoal",
  ugc_volume:       "ugcVolumeGoal",
};

export default function CampaignCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  // Phase 4 — edit-mode support. /my-campaigns "Edit" stashes the
  // campaign in sessionStorage and navigates here with ?edit=true.
  // editingId !== null means we're patching an existing campaign;
  // submit-button copy and the mutation path branch on it.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Resolve the user's persona and look up their template playbook + the
  // subset of goal types they're allowed to pick. Defaults gracefully to
  // brand for legacy users / null state.
  const persona = resolvePersona(user as any);
  const personaConfig = getPersonaConfig(persona);
  const goalsForThisPersona = (GOALS_FOR_PERSONA[persona] || []).map((g) => ALL_GOAL_OPTIONS[g]);
  const defaultGoal = goalsForThisPersona[0]?.value || "views";

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "100",
      duration: 7,
      targetPlatforms: [],
      rewardRates: {
        view: 0.04,
        click: 0.05,
        signup: 2.0,
        conversion: persona === "brand" ? 5.0 : undefined,
        follow: persona === "influencer" ? 0.5 : undefined,
        subscribe: persona === "influencer" ? 3.0 : undefined,
        install: persona === "founder" ? 1.5 : undefined,
      },
      campaignGoals: { primaryGoal: defaultGoal },
      minFollowers: 1000,
      sourceContentUrl: "",
      brandGuidelines: "",
      exampleClipUrlsText: "",
      requiredHashtagsText: "",
      clipLengthSecMin: undefined,
      clipLengthSecMax: undefined,
    },
  });

  // Hydrate from sessionStorage on mount when ?edit=true is in the URL.
  // Robust to malformed JSON / missing fields — failures fall back to a
  // fresh-create state silently. We clear sessionStorage on success so
  // a refresh doesn't replay the prefill.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") !== "true") return;
    const raw = sessionStorage.getItem("editCampaign");
    if (!raw) return;
    try {
      const c = JSON.parse(raw);
      if (!c?.id) return;
      // Decode the JSON-stringified columns back into form-shaped values.
      const platforms: string[] = (() => {
        try { return JSON.parse(c.targetPlatforms || "[]"); } catch { return []; }
      })();
      const rewardRates = (() => {
        try { return JSON.parse(c.rewardRates || "{}"); } catch { return {}; }
      })();
      const reqs = (() => {
        try { return JSON.parse(c.requirements || "{}"); } catch { return {}; }
      })();
      form.reset({
        name: c.name ?? "",
        description: c.description ?? "",
        budget: String(c.budget ?? "100"),
        duration: Number(c.duration ?? 7),
        targetPlatforms: Array.isArray(platforms) ? platforms : [],
        rewardRates: {
          view:           Number(rewardRates.view ?? 0) || undefined,
          click:          Number(rewardRates.click ?? 0) || undefined,
          signup:         Number(rewardRates.signup ?? 0) || undefined,
          conversion:     Number(rewardRates.conversion ?? 0) || undefined,
          follow:         Number(rewardRates.follow ?? 0) || undefined,
          subscribe:      Number(rewardRates.subscribe ?? 0) || undefined,
          install:        Number(rewardRates.install ?? 0) || undefined,
          purchase:       Number(rewardRates.purchase ?? 0) || undefined,
          lead:           Number(rewardRates.lead ?? 0) || undefined,
          codeRedemption: Number(rewardRates.codeRedemption ?? 0) || undefined,
          post:           Number(rewardRates.post ?? 0) || undefined,
        },
        campaignGoals: c.campaignGoals && c.campaignGoals.primaryGoal
          ? c.campaignGoals
          : { primaryGoal: defaultGoal },
        minFollowers: Number(reqs.minFollowers ?? 0),
        // Migration 0028 — source materials. Arrays → joined strings
        // for the textarea / comma-separated input shapes.
        sourceContentUrl: c.sourceContentUrl ?? "",
        brandGuidelines: c.brandGuidelines ?? "",
        exampleClipUrlsText: Array.isArray(c.exampleClipUrls)
          ? c.exampleClipUrls.join("\n")
          : "",
        requiredHashtagsText: Array.isArray(c.requiredHashtags)
          ? c.requiredHashtags.join(", ")
          : "",
        clipLengthSecMin: c.clipLengthSecMin ?? undefined,
        clipLengthSecMax: c.clipLengthSecMax ?? undefined,
      });
      setSelectedCountries(Array.isArray(reqs.geography) ? reqs.geography : []);
      setSelectedLanguages(Array.isArray(reqs.languages) ? reqs.languages : []);
      setEditingId(String(c.id));
      sessionStorage.removeItem("editCampaign");
    } catch (err) {
      console.error("Failed to load campaign for edit:", err);
    }
    // Run once on mount — we deliberately ignore exhaustive deps so this
    // doesn't re-fire after the form's defaultGoal changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply a registry template to the form. Pre-fills name, description,
  // primaryGoal + that goal's amount, and the matching reward rate. The
  // creator can customize anything from there.
  const applyTemplate = (tpl: CampaignTemplate) => {
    const rateKey = GOAL_TO_RATE_KEY[tpl.primaryGoal];
    const amountField = GOAL_TO_AMOUNT_FIELD[tpl.primaryGoal];
    form.setValue("name", tpl.name, { shouldDirty: true });
    form.setValue("description", `${tpl.description} (Guidance to clippers: ${tpl.guidance})`, { shouldDirty: true });
    form.setValue("campaignGoals.primaryGoal", tpl.primaryGoal, { shouldDirty: true });
    form.setValue(`campaignGoals.${amountField}` as any, tpl.defaultGoalAmount, { shouldDirty: true });
    form.setValue(`rewardRates.${rateKey}` as any, tpl.defaultRewardRate, { shouldDirty: true });
  };

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
      //
      // Source-material array fields (migration 0028): the form
      // collects them as strings (textarea / comma-separated input)
      // because react-hook-form arrays are clunky; we split into
      // arrays here right before submit. Empty strings stay as null
      // arrays rather than [""] so SQL ARRAY[] is clean.
      const splitLines = (s?: string) =>
        s ? s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : null;
      const splitHashtags = (s?: string) =>
        s
          ? s.split(",").map((x) => x.trim().replace(/^#/, "")).filter(Boolean)
          : null;

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
        sourceContentUrl: data.sourceContentUrl?.trim() || null,
        brandGuidelines: data.brandGuidelines?.trim() || null,
        exampleClipUrls: splitLines(data.exampleClipUrlsText),
        requiredHashtags: splitHashtags(data.requiredHashtagsText),
        clipLengthSecMin: data.clipLengthSecMin ?? null,
        clipLengthSecMax: data.clipLengthSecMax ?? null,
      };
      // Edit-mode: PATCH the existing row. Create-mode: POST a new one.
      // The endpoint that PATCH hits is the same handler the legacy
      // enhanced-campaign-creation page used.
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/campaigns/${editingId}`, payload);
        return await res.json();
      }
      const res = await apiRequest("POST", "/api/campaigns", payload);
      return await res.json();
    },
    onSuccess: (campaign: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/my-campaigns"] });
      if (editingId) {
        toast({
          title: "Campaign updated",
          description: "Your changes are saved.",
        });
        setLocation("/my-campaigns");
        return;
      }
      toast({
        title: "Campaign created",
        description: "Now fund it with USDC to make it live.",
      });
      // Send the creator straight to the funding page so they don't have to hunt for it.
      setLocation(`/campaigns/${campaign.id}/funding`);
    },
    onError: (error: Error) => {
      toast({
        title: editingId ? "Failed to save changes" : "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const platformFee = budgetNumber * 0.2;
  const escrowAmount = budgetNumber * 0.8;

  return (
    <DashboardLayout title={editingId ? "Edit campaign" : "Create campaign"}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Persona badge + tagline. The DashboardLayout already renders
            the page-level h1 ("Create campaign" / "Edit campaign"), so
            we don't repeat it here — just the persona context + the
            short instruction line. */}
        <div className="-mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {personaConfig.shortLabel}
            </span>
            <span className="text-xs text-slate-500">{personaConfig.oneLiner}</span>
          </div>
          <p className="text-slate-600">
            {editingId
              ? "Update your campaign settings. Changes apply immediately to anyone applying or polling next."
              : "Set the goal, fund USDC into escrow, clippers post, payouts fire when you hit it."}
          </p>
        </div>

        {/* Template picker — persona-specific starter playbooks. Clicking
            applies sensible defaults; the creator can customize anything
            below. Hidden when persona has no templates (admin / clipper). */}
        {personaConfig.templates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h2 className="text-base font-semibold text-slate-900">Pick a starting point</h2>
              <span className="text-xs text-slate-500">— optional, you can build from scratch too</span>
            </div>
            {/* 2-column grid on large screens (was 4 — descriptions
                were long enough that 4 narrow columns wrapped each word
                onto its own line, making the cards look broken). */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personaConfig.templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition flex flex-col gap-1.5"
                >
                  <div className="font-semibold text-sm">{tpl.name}</div>
                  <div className="text-xs text-slate-600 leading-snug">{tpl.description}</div>
                  <div className="mt-1 text-xs text-blue-700 font-medium">
                    ${tpl.defaultRewardRate} {tpl.rewardRateUnit}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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

                {/* === CLIPPER RESOURCES === */}
                {/* Migration 0028: what the creator gives clippers so they
                    can actually make the work. Until this section existed,
                    clippers had to guess what to clip from and what good
                    looked like — every Whop-style platform surfaces this
                    up front. */}
                <section>
                  <h3 className="text-base font-semibold text-slate-900">
                    Clipper resources
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 mb-4">
                    What clippers need to actually make the clip. All
                    optional but strongly recommended — better source
                    material + clearer guidelines = better clips.
                  </p>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="sourceContentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source content URL</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://www.youtube.com/watch?v=… (your long-form podcast / stream / video)"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The raw long-form video clippers should clip
                            FROM. Public YouTube / Google Drive / Dropbox
                            link works.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandGuidelines"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand guidelines</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={
                                "Tone: …\nWhat to hook on: …\nWhat NOT to clip: …\nRequired credits / tags: @yourbrand …\nBanned topics: …"
                              }
                              className="min-h-[140px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Hooks, tone, do's & don'ts. Same kind of thing
                            you'd put in a brief Google Doc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exampleClipUrlsText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Example clips (one URL per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={
                                "https://www.tiktok.com/@…/video/…\nhttps://youtube.com/shorts/…"
                              }
                              className="min-h-[90px] font-mono text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Clips that exemplify the bar. Clippers will
                            mimic the energy of these.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiredHashtagsText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Required hashtags / mentions</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="#yourbrand, #campaignname, @yourhandle"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated. Every approved clip should
                            include these.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="clipLengthSecMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min length (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="15"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="clipLengthSecMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max length (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="90"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
                    {goalsForThisPersona.map((opt) => {
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
                    name={`campaignGoals.${GOAL_TO_AMOUNT_FIELD[primaryGoal as GoalType]}` as any}
                    render={({ field }) => {
                      const goalLabel = ALL_GOAL_OPTIONS[primaryGoal as GoalType]?.label ?? primaryGoal;
                      const isRevenue = primaryGoal === "revenue";
                      return (
                        <FormItem>
                          <FormLabel>
                            Target — {goalLabel}{isRevenue ? " (USDC)" : ""}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              step={isRevenue ? "0.01" : "1"}
                              placeholder={primaryGoal === "views" ? "100000" : isRevenue ? "5000" : "1000"}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  isRevenue ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Payouts auto-release once verified {goalLabel.toLowerCase()} reaches this number.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </section>

                <Separator />

                {/* === REWARD RATES (persona-aware) === */}
                <section>
                  <h3 className="text-base font-semibold text-slate-900">Reward rates</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-4">What clippers earn per verified action. Only the rates relevant to your persona's goals are shown.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {goalsForThisPersona.map((opt) => {
                      const rateKey = GOAL_TO_RATE_KEY[opt.value];
                      const labelMap: Record<GoalType, string> = {
                        views:            "Per 1,000 views (USDC)",
                        clicks:           "Per click (USDC)",
                        signups:          "Per signup (USDC)",
                        conversions:      "Per conversion (USDC)",
                        follows:          "Per new follow (USDC)",
                        subscribes:       "Per paid subscriber (USDC)",
                        installs:         "Per install (USDC)",
                        revenue:          "Per verified purchase (USDC)",
                        leads:            "Per qualified lead (USDC)",
                        code_redemptions: "Per code redemption (USDC)",
                        ugc_volume:       "Per approved post (USDC)",
                      };
                      return (
                        <FormField
                          key={rateKey}
                          control={form.control}
                          name={`rewardRates.${rateKey}` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{labelMap[opt.value]}</FormLabel>
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
                      );
                    })}
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
                    {createCampaignMutation.isPending
                      ? (editingId ? "Saving…" : "Creating…")
                      : (editingId ? "Save changes" : "Create draft & continue to funding")}
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
