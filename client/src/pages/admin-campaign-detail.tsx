// Admin campaign detail — all admin actions for one campaign in one
// place. Reached by clicking a row in /admin/campaigns. Sections:
//
//   - Header: name, badges, budget, creator
//   - Admin actions: Force fund, Force-assign clipper, Cancel
//   - Submissions: every clipper on this campaign, with platform +
//     polled view count + tracking status
//   - Audit history: recent campaign.* admin actions on this campaign

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Zap,
  UserPlus,
  XCircle,
  ExternalLink,
  ScrollText,
  Youtube,
  Music,
  Twitter,
  Instagram,
  Globe,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fundingStatus: string;
  budget: string;
  budgetUsed: string;
  escrowBalance: string;
  duration: number;
  campaignGoals?: { primaryGoal?: string } | null;
  createdAt: string;
  fundedAt: string | null;
  creatorId: string;
  creatorUsername: string;
  creatorEmail: string;
  submissionCount: number;
}

interface Submission {
  submissionId: string;
  clipperId: string;
  clipperUsername: string;
  clipperEmail: string;
  postUrl: string | null;
  platform: "youtube" | "tiktok" | "instagram" | "x" | "unknown";
  lastViewCount: number;
  lastViewPolledAt: string | null;
  applicationStatus: string | null;
  joinedAt: string;
  tracking: { supported: boolean; reason: string | null };
}

interface AuditRow {
  id: string;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string | null;
  payload: any;
  ipAddress: string | null;
  createdAt: string;
}

const platformIcons: Record<string, any> = {
  youtube: Youtube,
  tiktok: Music,
  twitter: Twitter,
  x: Twitter,
  instagram: Instagram,
  unknown: Globe,
};

const trackingReasonText: Record<string, string> = {
  no_youtube_api_key:
    "Server is missing YOUTUBE_API_KEY — set it on /admin/integrations.",
  tiktok_oauth_required:
    "Clipper must connect TikTok before views can be auto-verified.",
  instagram_oauth_required:
    "Clipper must connect Instagram before views can be auto-verified.",
  x_paid_api_required:
    "X (Twitter) view counts require a paid API plan — not tracked.",
  unknown_platform: "Post URL doesn't match a supported platform.",
};

export default function AdminCampaignDetailPage() {
  const [, params] = useRoute("/admin/campaigns/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const id = params?.id ?? "";

  const { data: campaign, isLoading } = useQuery<CampaignDetail>({
    queryKey: [`/api/admin/campaigns/${id}`],
    enabled: !!id,
  });

  const { data: subsData } = useQuery<{ submissions: Submission[] }>({
    queryKey: [`/api/admin/campaigns/${id}/submissions`],
    enabled: !!id,
  });

  const { data: auditData } = useQuery<{ rows: AuditRow[] }>({
    queryKey: [`/api/admin/audit-log?targetType=campaign&targetId=${id}&limit=50`],
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/campaigns/${id}`] });
    queryClient.invalidateQueries({
      queryKey: [`/api/admin/campaigns/${id}/submissions`],
    });
    queryClient.invalidateQueries({
      queryKey: [`/api/admin/audit-log?targetType=campaign&targetId=${id}&limit=50`],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
  };

  const forceFundMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/campaigns/${id}/force-fund`,
        { reason },
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Force-funded",
        description: "Campaign flipped to funded + active. No USDC moved.",
      });
      invalidate();
    },
    onError: (err: Error) => {
      toast({
        title: "Force-fund failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const forceAssignMutation = useMutation({
    mutationFn: async (args: {
      clipperId: string;
      postUrl: string;
      reason: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/campaigns/${id}/force-assign-clipper`,
        args,
      );
      return await res.json();
    },
    onSuccess: (data: any) => {
      const warn = (data?.warnings ?? []).join(" ");
      toast({
        title:
          data?.action === "created" ? "Clipper assigned" : "Submission updated",
        description: `@${data?.clipperUsername} → ${data?.postUrl}${warn ? " · " + warn : ""}`,
      });
      invalidate();
    },
    onError: (err: Error) => {
      toast({
        title: "Force-assign failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", `/api/admin/campaigns/${id}/cancel`, {
        reason,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Campaign cancelled",
        description: data?.refundPending
          ? `Escrow flipped to refund_pending (${data.refundUsdc} USDC). Process from /admin/refunds.`
          : "No escrow balance to refund.",
      });
      invalidate();
    },
    onError: (err: Error) => {
      toast({
        title: "Cancel failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-6">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading campaign…
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-6">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Campaign not found.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const isCancelled = campaign.status === "cancelled";
  const isFunded = campaign.fundingStatus === "funded";
  const submissions = subsData?.submissions ?? [];
  const auditRows = auditData?.rows ?? [];

  const formatNumber = (n: number) =>
    n >= 1_000_000
      ? (n / 1_000_000).toFixed(1) + "M"
      : n >= 1_000
      ? (n / 1_000).toFixed(1) + "K"
      : n.toString();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        {/* ── Back link + header ─────────────────────────────────── */}
        <button
          onClick={() => setLocation("/admin/campaigns")}
          className="text-sm text-muted-foreground hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="text-xl">{campaign.name}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {campaign.id}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
                  Owned by{" "}
                  <span className="font-medium">@{campaign.creatorUsername}</span>{" "}
                  ({campaign.creatorEmail})
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={
                    isFunded
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }
                >
                  {campaign.fundingStatus}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    campaign.status === "active"
                      ? "bg-blue-50 text-blue-900 border-blue-200"
                      : isCancelled
                      ? "bg-rose-50 text-rose-900 border-rose-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }
                >
                  {campaign.status}
                </Badge>
                {campaign.campaignGoals?.primaryGoal && (
                  <Badge variant="outline">
                    goal: {campaign.campaignGoals.primaryGoal}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Budget</div>
                <div className="font-semibold">
                  ${parseFloat(campaign.budget).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Budget used</div>
                <div className="font-semibold">
                  ${parseFloat(campaign.budgetUsed).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Escrow</div>
                <div className="font-semibold">
                  ${parseFloat(campaign.escrowBalance).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Submissions</div>
                <div className="font-semibold">{campaign.submissionCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Admin actions ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin actions</CardTitle>
            <CardDescription>
              All test fixtures. None of these move USDC on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {!isFunded && !isCancelled && (
              <Button
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  const reason = window.prompt(
                    "Reason for force-funding? (min 5 chars)",
                  );
                  if (!reason || reason.trim().length < 5) return;
                  forceFundMutation.mutate(reason.trim());
                }}
                data-testid="button-force-fund"
              >
                <Zap className="h-4 w-4 mr-2" />
                Force fund
              </Button>
            )}

            {!isCancelled && (
              <Button
                variant="outline"
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  const clipper = window.prompt(
                    "Clipper (UUID, username, or email)?",
                  );
                  if (!clipper || !clipper.trim()) return;
                  const postUrl = window.prompt(
                    "Post URL? (https://www.youtube.com/watch?v=… or TikTok/IG/X URL)",
                  );
                  if (!postUrl || !/^https?:\/\//i.test(postUrl.trim())) return;
                  const reason = window.prompt(
                    "Reason for force-assigning? (min 5 chars)",
                  );
                  if (!reason || reason.trim().length < 5) return;
                  forceAssignMutation.mutate({
                    clipperId: clipper.trim(),
                    postUrl: postUrl.trim(),
                    reason: reason.trim(),
                  });
                }}
                data-testid="button-force-assign"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Force-assign clipper
              </Button>
            )}

            {!isCancelled && (
              <Button
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  const reason = window.prompt(
                    "Reason for cancelling? (min 5 chars)",
                  );
                  if (!reason || reason.trim().length < 5) return;
                  cancelMutation.mutate(reason.trim());
                }}
                data-testid="button-cancel"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel campaign
              </Button>
            )}

            <Link href={`/campaigns/${campaign.id}`}>
              <Button variant="ghost">
                <ExternalLink className="h-4 w-4 mr-2" />
                View on creator side
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ── Submissions ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Submissions ({submissions.length})
            </CardTitle>
            <CardDescription>
              Every clipper who has a row on this campaign, with the
              polled view count + tracking status per platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No clippers have submitted yet. Use{" "}
                <strong>Force-assign clipper</strong> above to drop a
                test submission.
              </p>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => {
                  const Icon = platformIcons[s.platform] || Globe;
                  const reasonText =
                    s.tracking.reason && trackingReasonText[s.tracking.reason];
                  return (
                    <div
                      key={s.submissionId}
                      className="border rounded-md p-3 flex items-start justify-between gap-3 flex-wrap"
                      data-testid={`submission-${s.submissionId}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium capitalize">
                            {s.platform}
                          </span>
                          {s.tracking.supported ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 border-emerald-200"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Auto-tracked
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-200"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Not tracked
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {s.applicationStatus ?? "?"}
                          </Badge>
                        </div>
                        {s.postUrl ? (
                          <a
                            href={s.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all"
                          >
                            {s.postUrl}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            No post URL set
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          @{s.clipperUsername} ({s.clipperEmail}) · joined{" "}
                          {new Date(s.joinedAt).toLocaleDateString()}
                          {s.lastViewPolledAt
                            ? ` · last polled ${new Date(s.lastViewPolledAt).toLocaleString()}`
                            : " · never polled"}
                        </p>
                        {!s.tracking.supported && reasonText && (
                          <p className="text-xs text-amber-700 mt-1">
                            {reasonText}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Views</div>
                        <div className="text-lg font-semibold">
                          {formatNumber(s.lastViewCount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Audit history ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Campaign audit history
            </CardTitle>
            <CardDescription>
              Recent admin actions targeting this campaign. For
              clipper-level actions (force-assign), see the global{" "}
              <Link href="/admin/audit" className="text-blue-600 hover:underline">
                audit log
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No admin actions recorded for this campaign yet.
              </p>
            ) : (
              <div className="space-y-2">
                {auditRows.map((row) => (
                  <div
                    key={row.id}
                    className="border-l-2 border-slate-200 pl-3 py-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono">
                        {row.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {row.payload?.reason && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Reason:</span>{" "}
                        {row.payload.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
