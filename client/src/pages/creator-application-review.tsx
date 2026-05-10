import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClipperRating } from "@/features/reviews/clipper-rating";
import { ClipperProfileBlock } from "@/features/reviews/clipper-profile-block";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { REJECTION_REASONS } from "../../../shared/rejection-reasons";
import { recognizeMediaHost } from "@shared/media-host";
import { AiVerdictBanner, AiVerdictPill, AiSignalsBreakdown, verdictFromConfidence, type AiVerdict } from "@/features/reviews/ai-verdict";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  Brain,
  Shield,
  Eye,
  MessageSquare,
  Calendar
} from "lucide-react";

interface ClipperApplication {
  id: string;
  clipperId: string;
  campaignId: string;
  clipperUsername: string;
  campaignTitle: string;
  submittedContent: string;
  contentType: string;
  contentDescription: string;
  applicationStatus: string;
  aiDetectionResult: {
    isAIGenerated: boolean;
    confidence: number;
    flags: string[];
    analysis: {
      textPatterns: number;
      repetitiveStructure: number;
      vocabularyComplexity: number;
      naturalFlow: number;
      personalTone: number;
    };
    recommendation: 'approve' | 'review' | 'reject';
  };
  aiConfidence: number;
  aiFlags: string[];
  joinedAt: string;
  creatorReviewNotes?: string;
  rejectionReason?: string;
  rejectionReasonCode?: string | null;
  // Phase 5 — media URL submission. When submissionKind === 'url',
  // submittedContent will be null and the review UI embeds a player
  // for recognized hosts (or falls back to open-in-new-tab).
  submissionUrl?: string | null;
  submissionKind?: "text" | "url" | null;
  // Reputation enrichment from clipper_stats (null for new clippers)
  clipperRating?: string | null;
  clipperReviewCount?: number | null;
  clipperTier?: string | null;
  // Phase 5 — per-creator trust signals for THIS creator. Counts how
  // many of this clipper's applications have been previously
  // approved / rejected on the creator's campaigns.
  approvedCountFromThisClipper?: number;
  rejectedCountFromThisClipper?: number;
  lastApprovedFromThisClipperAt?: string | null;
}

type SortMode = "newest" | "rating_desc" | "reviews_desc" | "ai_safe";

export default function CreatorApplicationReview() {
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<ClipperApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  // Phase 5 — structured rejection reason. Required when rejecting,
  // ignored on approve. Same code as the shared/rejection-reasons.ts
  // catalog so the backend can validate against the closed enum.
  const [rejectionReasonCode, setRejectionReasonCode] = useState<string>("");
  const [activeTab, setActiveTab] = useState("pending");
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [minRating, setMinRating] = useState<string>("any");
  const [verdictFilter, setVerdictFilter] = useState<"all" | AiVerdict>("all");

  // Fetch pending applications
  const { data: applications, isLoading } = useQuery<ClipperApplication[]>({
    queryKey: ["/api/creator/pending-applications"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Review Application Mutation
  const reviewApplicationMutation = useMutation({
    mutationFn: async ({
      applicationId,
      action,
      notes,
      reasonCode,
    }: {
      applicationId: string;
      action: 'approve' | 'reject';
      notes: string;
      reasonCode?: string;
    }) => {
      const response = await apiRequest("POST", `/api/clipper-applications/${applicationId}/review`, {
        action,
        notes,
        reasonCode,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Reviewed",
        description: "The application has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/pending-applications"] });
      setSelectedApplication(null);
      setReviewNotes("");
      setRejectionReasonCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to process application",
        variant: "destructive",
      });
    },
  });

  const handleReviewApplication = (action: 'approve' | 'reject') => {
    if (!selectedApplication) return;

    // Reject path: enforce the structured reason here so the API
    // validation never fires the destructive button while empty.
    if (action === "reject" && !rejectionReasonCode) {
      toast({
        title: "Pick a reason",
        description: "Choose a rejection reason from the dropdown so the clipper knows why.",
        variant: "destructive",
      });
      return;
    }

    reviewApplicationMutation.mutate({
      applicationId: selectedApplication.id,
      action,
      notes: reviewNotes,
      reasonCode: action === "reject" ? rejectionReasonCode : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'content_pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Content Pending</Badge>;
      case 'ai_scanning':
        return <Badge className="bg-blue-100 text-blue-800"><Brain className="h-3 w-3 mr-1" />AI Scanning</Badge>;
      case 'creator_review':
        return <Badge className="bg-yellow-100 text-yellow-800"><Eye className="h-3 w-3 mr-1" />Awaiting Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'ai_flagged':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />AI Flagged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAIScoreColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-red-600";
    if (confidence >= 0.4) return "text-yellow-600";
    return "text-green-600";
  };

  const rawPending = applications?.filter(app =>
    app.applicationStatus === 'creator_review' ||
    (app.applicationStatus === 'ai_scanning' && app.aiDetectionResult?.recommendation === 'review')
  ) || [];

  // Apply min-rating filter (treats "no rating yet" as 0) and verdict filter
  const minRatingFloat = minRating === "any" ? 0 : parseFloat(minRating);
  const filteredPending = rawPending.filter(app => {
    const r = parseFloat(app.clipperRating || "0");
    if (r < minRatingFloat) return false;
    if (verdictFilter !== "all" && verdictFromConfidence(app.aiConfidence) !== verdictFilter) return false;
    return true;
  });

  // Sort by chosen mode
  const pendingApplications = [...filteredPending].sort((a, b) => {
    switch (sortBy) {
      case "rating_desc":
        return parseFloat(b.clipperRating || "0") - parseFloat(a.clipperRating || "0");
      case "reviews_desc":
        return (b.clipperReviewCount || 0) - (a.clipperReviewCount || 0);
      case "ai_safe":
        return (a.aiConfidence || 0) - (b.aiConfidence || 0);
      case "newest":
      default:
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    }
  });

  const reviewedApplications = applications?.filter(app =>
    app.applicationStatus === 'approved' ||
    app.applicationStatus === 'rejected' ||
    app.applicationStatus === 'ai_flagged'
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clipper Application Review</h1>
          <p className="text-muted-foreground">
            Review clipper applications and verify content authenticity
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>{pendingApplications.length} Pending Review</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingApplications.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Reviewed ({reviewedApplications.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {/* Sort + filter controls */}
          {rawPending.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-muted/30 rounded-md">
              <div className="space-y-1">
                <Label className="text-xs">Sort by</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="rating_desc">Highest rated clipper</SelectItem>
                    <SelectItem value="reviews_desc">Most reviewed clipper</SelectItem>
                    <SelectItem value="ai_safe">Lowest AI confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min rating</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any (incl. unrated)</SelectItem>
                    <SelectItem value="3.0">3.0+ stars</SelectItem>
                    <SelectItem value="3.5">3.5+ stars</SelectItem>
                    <SelectItem value="4.0">4.0+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AI verdict</Label>
                <Select value={verdictFilter} onValueChange={(v) => setVerdictFilter(v as any)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="safe">Safe only</SelectItem>
                    <SelectItem value="review">Needs review</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground ml-auto">
                Showing {pendingApplications.length} of {rawPending.length}
              </div>
            </div>
          )}

          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{rawPending.length === 0 ? "No Pending Applications" : "No applications match your filters"}</h3>
                <p className="text-muted-foreground text-center">
                  {rawPending.length === 0
                    ? "All clipper applications have been reviewed or are in AI scanning."
                    : "Try lowering the minimum rating to include unrated clippers."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applications List */}
              <div className="space-y-4">
                {pendingApplications.map((application) => (
                  <Card 
                    key={application.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedApplication?.id === application.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedApplication(application)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{application.clipperUsername}</span>
                        </div>
                        {getStatusBadge(application.applicationStatus)}
                      </div>

                      <div className="mb-3">
                        <ClipperRating clipperId={application.clipperId} asLink />
                      </div>

                      {/* Phase 5 — per-creator trust signal. Counts how
                          many times this creator has previously approved
                          (and rejected) work from this clipper. Helps
                          the creator make a faster judgment call: a
                          clipper they've approved 7 times before deserves
                          a different read than a stranger applying for
                          the first time. */}
                      <TrustHistoryChip application={application} />

                      <h4 className="font-medium mb-2">{application.campaignTitle}</h4>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Content: {application.contentType}</span>
                        <div className="flex items-center gap-2">
                          <AiVerdictPill confidence={application.aiConfidence} />
                          <span className={getAIScoreColor(application.aiConfidence)}>
                            {(application.aiConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      {application.aiDetectionResult?.flags && application.aiDetectionResult.flags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {application.aiDetectionResult.flags.slice(0, 2).map((flag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {flag.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {application.aiDetectionResult.flags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{application.aiDetectionResult.flags.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Review Panel */}
              <div className="lg:sticky lg:top-6">
                {selectedApplication ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Eye className="h-5 w-5" />
                        <span>Review Application</span>
                      </CardTitle>
                      <CardDescription>
                        {selectedApplication.clipperUsername} - {selectedApplication.campaignTitle}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Clipper Reputation */}
                      <ClipperProfileBlock clipperId={selectedApplication.clipperId} showProfileLink reviewLimit={3} />

                      {/* AI Detection */}
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>AI Detection</span>
                        </h4>

                        <AiVerdictBanner confidence={selectedApplication.aiConfidence} />

                        <AiSignalsBreakdown analysis={selectedApplication.aiDetectionResult?.analysis} />

                        {selectedApplication.aiDetectionResult?.flags && selectedApplication.aiDetectionResult.flags.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Specific patterns detected</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedApplication.aiDetectionResult.flags.map((flag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content Preview — branches on submissionKind.
                          URL path embeds the player (iframe/video) for
                          recognized hosts and falls back to an
                          open-in-new-tab link for unrecognized ones.
                          Text path keeps the legacy text dump. */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Submitted Content</h4>
                        <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{selectedApplication.contentType}</Badge>
                            {selectedApplication.contentDescription && (
                              <span className="text-sm text-muted-foreground">
                                {selectedApplication.contentDescription}
                              </span>
                            )}
                          </div>

                          {selectedApplication.submissionKind === "url" &&
                          selectedApplication.submissionUrl ? (
                            <SubmissionUrlPreview
                              url={selectedApplication.submissionUrl}
                            />
                          ) : (
                            <div className="text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
                              {selectedApplication.submittedContent}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Phase 5 — trust toggle. Visible only when this
                          creator has approved this clipper at least once
                          before; before then there's nothing to "trust"
                          yet. The component handles its own GET/PUT
                          against /api/creator/clipper-trust. */}
                      <TrustToggleBlock
                        clipperId={selectedApplication.clipperId}
                        approvedCountFromThisClipper={
                          selectedApplication.approvedCountFromThisClipper ?? 0
                        }
                        clipperUsername={selectedApplication.clipperUsername}
                      />

                      {/* Review Notes */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Review Notes</h4>
                        <Textarea
                          placeholder="Add your review notes (optional)..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Phase 5 — structured rejection reason. Required
                          if rejecting. Reads from the shared catalog so
                          codes always match the DB CHECK constraint and
                          the rejection email's category label. */}
                      <div className="space-y-2">
                        <Label htmlFor="rejection-reason">
                          Rejection reason <span className="text-slate-500 font-normal">(required if rejecting)</span>
                        </Label>
                        <Select value={rejectionReasonCode} onValueChange={setRejectionReasonCode}>
                          <SelectTrigger id="rejection-reason">
                            <SelectValue placeholder="Pick a reason if you're rejecting" />
                          </SelectTrigger>
                          <SelectContent>
                            {REJECTION_REASONS.map((r) => (
                              <SelectItem key={r.code} value={r.code}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{r.label}</span>
                                  <span className="text-xs text-slate-500">{r.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Review Actions */}
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleReviewApplication('approve')}
                          disabled={reviewApplicationMutation.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReviewApplication('reject')}
                          disabled={reviewApplicationMutation.isPending}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>

                      {selectedApplication.aiDetectionResult?.recommendation === 'reject' && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <strong>AI Detection Alert:</strong> This content was flagged as likely AI-generated. 
                            Consider rejecting unless you're confident it's authentic.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Select an Application</h3>
                      <p className="text-muted-foreground text-center">
                        Choose an application from the list to review.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed">
          <div className="space-y-4">
            {reviewedApplications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Reviewed Applications</h3>
                  <p className="text-muted-foreground text-center">
                    Applications you've reviewed will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              reviewedApplications.map((application) => (
                <Card key={application.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{application.clipperUsername}</span>
                      </div>
                      {getStatusBadge(application.applicationStatus)}
                    </div>
                    
                    <h4 className="font-medium mb-2">{application.campaignTitle}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Content Type</p>
                        <p className="font-medium">{application.contentType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AI Confidence</p>
                        <p className={`font-medium ${getAIScoreColor(application.aiConfidence)}`}>
                          {(application.aiConfidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reviewed</p>
                        <p className="font-medium flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(application.joinedAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                    
                    {application.creatorReviewNotes && (
                      <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                        <div className="flex items-center space-x-1 mb-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-medium">Review Notes:</span>
                        </div>
                        <p>{application.creatorReviewNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Per-creator trust chip. Reads approvedCountFromThisClipper /
// rejectedCountFromThisClipper / lastApprovedFromThisClipperAt off the
// application row (computed by the backend correlated subqueries).
// Three visual states:
//   - First-time clipper (0 approved, 0 rejected) → small "New to you" tag
//   - Has prior approvals → green "N approved" + relative-time
//   - Has prior rejections only → amber "N rejected"
// Phase 5 — embed the clipper's submitted clip URL inline for the
// creator's review. Recognized hosts (YouTube / Vimeo / Drive /
// Streamable / Loom / Dropbox / direct video) render a player so the
// creator can watch without leaving the page. Unrecognized hosts and
// platforms that don't support embed (TikTok / IG / X) fall back to a
// labelled open-in-new-tab link with a sharing-settings caveat.
function SubmissionUrlPreview({ url }: { url: string }) {
  const info = recognizeMediaHost(url);

  if (info.embedKind === "iframe" && info.embedSrc) {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full overflow-hidden rounded-md border bg-black">
          <iframe
            src={info.embedSrc}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={`Clip preview from ${info.label}`}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{info.label}</Badge>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  if (info.embedKind === "video" && info.embedSrc) {
    return (
      <div className="space-y-2">
        <video
          src={info.embedSrc}
          controls
          className="w-full max-h-[480px] rounded-md border bg-black"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{info.label}</Badge>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  // Fallback: open-in-new-tab. Used for TikTok / IG / X / unknown hosts.
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">{info.label}</Badge>
        <span className="text-xs text-amber-800">Inline preview not supported</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block break-all text-sm text-blue-700 underline"
      >
        {url}
      </a>
      {info.sharingHint && (
        <p className="text-xs text-amber-800">{info.sharingHint}</p>
      )}
    </div>
  );
}

function TrustHistoryChip({ application }: { application: ClipperApplication }) {
  const approved = application.approvedCountFromThisClipper ?? 0;
  const rejected = application.rejectedCountFromThisClipper ?? 0;
  const lastAt = application.lastApprovedFromThisClipperAt;

  if (approved === 0 && rejected === 0) {
    return (
      <Badge variant="outline" className="mb-2 text-xs text-slate-600 border-slate-200">
        New to you
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2">
      {approved > 0 && (
        <Badge
          variant="outline"
          className="text-xs text-green-700 border-green-200 bg-green-50"
          title={
            lastAt
              ? `Last approved ${new Date(lastAt).toLocaleDateString()}`
              : undefined
          }
        >
          {approved} approved on your campaigns
        </Badge>
      )}
      {rejected > 0 && (
        <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
          {rejected} previously rejected
        </Badge>
      )}
    </div>
  );
}

// Phase 5 — trust-toggle block on the application review modal.
// Owns its own GET to fetch the current trust state for this
// (creator, clipper) pair and a PUT mutation to upsert toggle +
// threshold. The toggle hides entirely until the creator has at
// least one prior approval — before then there's nothing to base
// trust on.
function TrustToggleBlock({
  clipperId,
  approvedCountFromThisClipper,
  clipperUsername,
}: {
  clipperId: string;
  approvedCountFromThisClipper: number;
  clipperUsername: string;
}) {
  const { toast } = useToast();
  const trustQuery = useQuery<{
    trust: null | {
      id: string;
      autoApprove: boolean;
      autoApproveThreshold: number;
      approvedCount: number;
    };
  }>({
    queryKey: ["/api/creator/clipper-trust", clipperId],
    enabled: !!clipperId,
  });

  const [autoApprove, setAutoApprove] = useState(false);
  const [threshold, setThreshold] = useState<number>(5);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate state from server response once.
  if (trustQuery.data && !hydrated) {
    setAutoApprove(Boolean(trustQuery.data.trust?.autoApprove));
    setThreshold(trustQuery.data.trust?.autoApproveThreshold ?? 5);
    setHydrated(true);
  }

  const mutation = useMutation({
    mutationFn: async (payload: { autoApprove: boolean; threshold: number }) => {
      const res = await apiRequest(
        "PUT",
        `/api/creator/clipper-trust/${clipperId}`,
        payload,
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/creator/clipper-trust", clipperId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/pending-applications"] });
      toast({ title: "Trust settings saved" });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't save trust settings",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Hide for first-time clippers — there's no signal to base trust on
  // yet. The block reappears the moment they get their first approval.
  if (approvedCountFromThisClipper === 0) return null;

  const meetsThreshold = approvedCountFromThisClipper >= threshold;

  return (
    <div className="space-y-3 p-3 rounded-md border border-blue-200 bg-blue-50/40">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-sm font-medium text-slate-900">
            Trust @{clipperUsername} — auto-approve future submissions
          </Label>
          <p className="text-xs text-slate-600 mt-0.5">
            When on, applications from this clipper to your campaigns skip
            review and go straight to approved. They'll get a "you're trusted"
            email the first time it fires.
          </p>
        </div>
        <Switch
          checked={autoApprove}
          onCheckedChange={(v) => {
            setAutoApprove(v);
            mutation.mutate({ autoApprove: v, threshold });
          }}
          disabled={mutation.isPending}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-600 whitespace-nowrap">
          Auto-approve threshold
        </Label>
        <Input
          type="number"
          min={1}
          max={1000}
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value || "5", 10) || 5)}
          onBlur={() => {
            if (threshold !== (trustQuery.data?.trust?.autoApproveThreshold ?? 5)) {
              mutation.mutate({ autoApprove, threshold });
            }
          }}
          className="w-20 h-8 text-sm"
        />
        <span className="text-xs text-slate-500">
          approvals before auto-approve unlocks ·{" "}
          <span className={meetsThreshold ? "text-green-700 font-medium" : ""}>
            currently {approvedCountFromThisClipper}/{threshold}
          </span>
        </span>
      </div>
      {autoApprove && !meetsThreshold && (
        <div className="text-xs text-amber-700">
          Toggle is on but threshold isn't met yet — auto-approve won't fire
          until {threshold - approvedCountFromThisClipper} more approval
          {threshold - approvedCountFromThisClipper === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}