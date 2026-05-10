// Phase 4 — clipper-side assignment detail.
//
// Where an approved clipper sees:
//   - their tracking link (the URL they share / paste in their bio)
//   - their unique promo code (for offline / e-commerce attribution)
//   - a field to submit / update the live post URL once they've posted
//   - progress against the campaign goal
//
// Fetched from GET /api/clipper-campaigns/:id and edited via
// POST /api/clipper-campaigns/:id/post-url. The same shape is used
// regardless of which goal the campaign tracks — the catalog at
// shared/goal-options.ts tells us how to label the progress bar.

import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Ticket,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { getGoalDefinition, type PrimaryGoal } from "../../../shared/goal-options";

interface AssignmentResponse {
  assignment: {
    id: string;
    campaignId: string;
    trackingCode: string;
    clipperPromoCode: string | null;
    postUrl: string | null;
    isApproved: boolean;
    isCompleted: boolean;
    applicationStatus: string | null;
    rejectionReason: string | null;
    completedAt: string | null;
    joinedAt: string;
  };
  campaign: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    campaignGoals: { primaryGoal?: PrimaryGoal } | null;
    targetPlatforms: string;
  };
  progress: null | {
    isCompleted: boolean;
    goalProgress: null | {
      type: string;
      target: number;
      current: number;
      percentage: number;
      isReached: boolean;
    };
  };
  coverage: {
    platform: "youtube" | "tiktok" | "instagram" | "x" | "unknown";
    goalType: string | null;
    relevant: boolean;       // true only when goal=views AND platform matters
    autoVerified: boolean;
    reason:
      | "unknown_platform"
      | "no_youtube_api_key"
      | "tiktok_oauth_required"
      | "instagram_oauth_required"
      | "x_paid_api_required"
      | null;
    needsClipperOAuth: boolean;
    tiktokConnected: boolean;
    instagramConnected: boolean;
    instagramUsername: string | null;
  };
}

// Per-reason copy shown to the clipper. Honest about what we can and
// can't auto-verify so they're not confused when their progress bar
// stays at zero on a TikTok / IG / X post.
const COVERAGE_MESSAGE: Record<NonNullable<AssignmentResponse["coverage"]["reason"]>, string> = {
  unknown_platform:
    "We couldn't recognize the platform from this URL. Make sure the link is to a public YouTube / TikTok / Instagram / X post.",
  no_youtube_api_key:
    "YouTube view-polling isn't configured on this server. Ask the admin to set YOUTUBE_API_KEY, or the campaigner to credit views manually.",
  tiktok_oauth_required:
    "We can't auto-poll TikTok view counts yet — TikTok's API requires the post owner to authenticate. The campaigner will credit views manually for now.",
  instagram_oauth_required:
    "We can't auto-poll Instagram view counts yet — Instagram requires Business-account OAuth. The campaigner will credit views manually for now.",
  x_paid_api_required:
    "X's view-count API is paywalled. The campaigner will credit views manually for now.",
};

const TRACKING_BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function ClipperAssignment() {
  const [, params] = useRoute("/clipper/campaigns/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<AssignmentResponse>({
    queryKey: ["/api/clipper-campaigns", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
  });

  const [postUrl, setPostUrl] = useState("");
  // Hydrate from the loaded row exactly once.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!hydrated && data?.assignment) {
      setPostUrl(data.assignment.postUrl ?? "");
      setHydrated(true);
    }
  }, [data, hydrated]);

  // Surface OAuth callback outcomes once on mount. Each provider's
  // callback appends ?<provider>OAuth=connected (or =error&reason=…) to
  // the URL before redirecting back here. Toast and clear the params
  // so a refresh doesn't replay the toast.
  const oauthToastShown = useRef(false);
  useEffect(() => {
    if (oauthToastShown.current) return;
    const params = new URLSearchParams(window.location.search);
    const flags: Array<{ key: string; provider: string }> = [
      { key: "tiktokOAuth", provider: "TikTok" },
      { key: "instagramOAuth", provider: "Instagram" },
    ];
    let any = false;
    for (const { key, provider } of flags) {
      const status = params.get(key);
      if (!status) continue;
      any = true;
      if (status === "connected") {
        toast({
          title: `${provider} connected`,
          description:
            "We'll start polling view counts for your post within 30 minutes.",
        });
      } else if (status === "error") {
        toast({
          title: `${provider} connection failed`,
          description: params.get("reason") ?? "Please try again.",
          variant: "destructive",
        });
      }
      params.delete(key);
    }
    if (!any) return;
    oauthToastShown.current = true;
    params.delete("reason");
    const remaining = params.toString();
    const cleanUrl = window.location.pathname + (remaining ? `?${remaining}` : "");
    window.history.replaceState({}, "", cleanUrl);
  }, [toast]);

  const submitPostUrlMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clipper-campaigns/${id}/post-url`, { postUrl });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clipper-campaigns", id] });
      toast({ title: "Post URL saved", description: "Your post is now linked to this campaign." });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save post URL", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !id) {
    return (
      <DashboardLayout title="Your assignment">
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Your assignment">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Assignment not found</h3>
              <Button onClick={() => setLocation("/marketplace")} className="mt-4">
                Browse campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { assignment, campaign, progress } = data;
  const primaryGoal = campaign.campaignGoals?.primaryGoal;
  const goalDef = primaryGoal ? safeGetGoal(primaryGoal) : null;

  const trackingLink = `${TRACKING_BASE}/track/${assignment.trackingCode}`;
  const isApproved = assignment.applicationStatus === "approved" && assignment.isApproved;
  const isPending = !isApproved && assignment.applicationStatus !== "rejected";
  const isRejected = assignment.applicationStatus === "rejected";

  return (
    <DashboardLayout title={`Assignment · ${campaign.name}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
            <p className="text-slate-600 mt-1 text-sm">
              {goalDef ? <>Goal: <span className="font-medium">{goalDef.label}</span></> : "Campaign assignment"}
            </p>
          </div>
          <StatusBadge
            isApproved={isApproved}
            isCompleted={assignment.isCompleted}
            isRejected={isRejected}
            isPending={isPending}
          />
        </div>

        {/* Status-specific banners */}
        {isPending && (
          <Alert className="border-amber-300 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-900 text-sm">
              <span className="font-medium">Awaiting creator review.</span> You'll get your tracking
              link and promo code as soon as the campaign creator approves your application.
            </AlertDescription>
          </Alert>
        )}
        {isRejected && (
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-900 text-sm">
              <span className="font-medium">Application rejected.</span>
              {assignment.rejectionReason ? (
                <span> Reason: {assignment.rejectionReason}</span>
              ) : null}
            </AlertDescription>
          </Alert>
        )}
        {assignment.isCompleted && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-700" />
            <AlertDescription className="text-green-900 text-sm">
              <span className="font-medium">Goal reached!</span> Your bonus has been released. Keep
              the post live so views and clicks continue to count.
            </AlertDescription>
          </Alert>
        )}

        {/* Assignment panel — only useful once approved. */}
        {isApproved && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-blue-700" />
                  Your tracking link
                </CardTitle>
                <CardDescription>
                  Paste this in your bio / video description. Every click is attributed to you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input readOnly value={trackingLink} className="font-mono text-xs" />
                  <CopyButton value={trackingLink} />
                </div>
              </CardContent>
            </Card>

            {assignment.clipperPromoCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-blue-700" />
                    Your promo code
                  </CardTitle>
                  <CardDescription>
                    Share this code in your post. Redemptions and orders that use it are credited
                    to you automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={assignment.clipperPromoCode}
                      className="font-mono text-base font-semibold tracking-widest"
                    />
                    <CopyButton value={assignment.clipperPromoCode} />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-700" />
                  Submit your post URL
                </CardTitle>
                <CardDescription>
                  After you publish your clip, paste the live URL here. We poll the platform to
                  verify views / engagement and confirm your post is still up.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="post-url">Post URL</Label>
                  <Input
                    id="post-url"
                    placeholder="https://www.tiktok.com/@you/video/123456…"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    {assignment.postUrl
                      ? "You can replace this any time, e.g. if you re-upload."
                      : "Required for views / engagement / UGC-volume verification."}
                  </p>
                  <Button
                    onClick={() => submitPostUrlMutation.mutate()}
                    disabled={submitPostUrlMutation.isPending || !postUrl.trim()}
                  >
                    {submitPostUrlMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* TikTok success state. */}
            {data.coverage.relevant &&
              data.coverage.platform === "tiktok" &&
              data.coverage.tiktokConnected && (
                <Alert className="border-green-300 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-900 text-sm">
                    <span className="font-medium">TikTok connected.</span> We'll auto-poll your
                    video's view count and credit your progress every 30 minutes.
                  </AlertDescription>
                </Alert>
              )}

            {/* Instagram success state. */}
            {data.coverage.relevant &&
              data.coverage.platform === "instagram" &&
              data.coverage.instagramConnected && (
                <Alert className="border-green-300 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-900 text-sm">
                    <span className="font-medium">
                      Instagram connected
                      {data.coverage.instagramUsername
                        ? ` (@${data.coverage.instagramUsername})`
                        : ""}
                      .
                    </span>{" "}
                    We'll auto-poll your Reel's view count and credit your progress every 30
                    minutes.
                  </AlertDescription>
                </Alert>
              )}

            {/* TikTok OAuth call-to-action. */}
            {data.coverage.relevant &&
              !data.coverage.autoVerified &&
              data.coverage.needsClipperOAuth &&
              data.coverage.platform === "tiktok" && (
                <Alert className="border-blue-300 bg-blue-50">
                  <Link2 className="h-4 w-4 text-blue-700" />
                  <AlertDescription className="text-blue-900 text-sm space-y-3">
                    <div>
                      <span className="font-medium">Connect your TikTok</span> so we can
                      auto-verify view counts on this clip. Without it, the campaigner has to
                      credit views manually.
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/api/oauth/tiktok/start?returnTo=" +
                          encodeURIComponent(`/clipper/campaigns/${id}`))
                      }
                    >
                      Connect TikTok
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

            {/* Instagram OAuth call-to-action. Reuses the same shape as
                TikTok's. Note we additionally surface the Business-or-
                Creator-account requirement in the copy so the clipper
                isn't surprised by a "no IG Business account linked"
                error from the callback. */}
            {data.coverage.relevant &&
              !data.coverage.autoVerified &&
              data.coverage.needsClipperOAuth &&
              data.coverage.platform === "instagram" && (
                <Alert className="border-blue-300 bg-blue-50">
                  <Link2 className="h-4 w-4 text-blue-700" />
                  <AlertDescription className="text-blue-900 text-sm space-y-3">
                    <div>
                      <span className="font-medium">Connect your Instagram</span> so we can
                      auto-verify view counts on this Reel. Your account must be a Business or
                      Creator account linked to a Facebook Page — Instagram only exposes
                      insights for those.
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/api/oauth/instagram/start?returnTo=" +
                          encodeURIComponent(`/clipper/campaigns/${id}`))
                      }
                    >
                      Connect Instagram
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

            {/* Coverage banner — non-OAuth-actionable platforms (X /
                unknown / no-YouTube-key). Hidden for YouTube
                (auto-verified), for non-views goals (post URL is just a
                proof link there), and for the TikTok / Instagram cases
                handled above (which have their own action buttons). */}
            {data.coverage.relevant &&
              !data.coverage.autoVerified &&
              data.coverage.reason &&
              !(data.coverage.platform === "tiktok" && data.coverage.needsClipperOAuth) &&
              !(data.coverage.platform === "instagram" && data.coverage.needsClipperOAuth) && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <AlertDescription className="text-amber-900 text-sm">
                    <span className="font-medium">Manual verification required.</span>{" "}
                    {COVERAGE_MESSAGE[data.coverage.reason]}
                  </AlertDescription>
                </Alert>
              )}

            {/* Progress */}
            {progress?.goalProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-700" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold tracking-tight">
                        {formatProgress(progress.goalProgress.current, progress.goalProgress.type)}
                      </p>
                      <p className="text-xs text-slate-500">
                        of {formatProgress(progress.goalProgress.target, progress.goalProgress.type)}{" "}
                        target
                      </p>
                    </div>
                    <p className="text-sm font-medium text-blue-700">
                      {Math.floor(progress.goalProgress.percentage)}%
                    </p>
                  </div>
                  <Progress value={progress.goalProgress.percentage} />
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/marketplace")}>
            ← Back to campaigns
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({
  isApproved,
  isCompleted,
  isRejected,
  isPending,
}: {
  isApproved: boolean;
  isCompleted: boolean;
  isRejected: boolean;
  isPending: boolean;
}) {
  if (isCompleted) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Goal reached
      </Badge>
    );
  }
  if (isRejected) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  if (isApproved) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (isPending) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  }
  return null;
}

function safeGetGoal(id: string) {
  try {
    return getGoalDefinition(id as PrimaryGoal);
  } catch {
    return null;
  }
}

// Format progress numbers with sensible units. Revenue is the only $-valued
// goal in v1; everything else is an integer count.
function formatProgress(value: number, goalType: string): string {
  if (goalType === "revenue") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return Math.floor(value).toLocaleString();
}

function CopyButton({ value }: { value: string }) {
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast({ title: "Copied to clipboard" });
        } catch {
          toast({ title: "Copy failed", variant: "destructive" });
        }
      }}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}
