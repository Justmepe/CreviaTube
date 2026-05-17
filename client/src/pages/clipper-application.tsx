import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Video,
  Image,
  Mic,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  User,
  Shield,
  Zap,
  Link2,
  ExternalLink,
  Info,
  FileText,
  PlayCircle,
  Hash,
} from "lucide-react";
import { CampaignGoalSummary } from "@/features/campaigns/components/campaign-goal-summary";
import { recognizeMediaHost } from "@shared/media-host";

interface Campaign {
  id: string;
  // Schema column is `name`; legacy fields here used `title`. Render
  // both so neither shape breaks during the transition.
  name?: string;
  title?: string;
  description: string;
  budget: number;
  rewardRates: string;
  requirements: string;
  targetPlatforms: string[];
  // Phase 4 — surfaced on the campaign-header card via CampaignGoalSummary
  // so clippers see what they're optimizing for before submitting.
  campaignGoals?: Record<string, any> | null;
  integration?: null | {
    pixelId: string | null;
    hasPostbackSecret: boolean;
    shopifyDomain: string | null;
    hasShopifyWebhookSecret: boolean;
    hasStripeWebhookSecret: boolean;
    mmpProvider: string | null;
    mmpAppId: string | null;
    hasMmpApiKey: boolean;
  };
}

interface AIDetectionResult {
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
}

export default function ClipperApplication() {
  const { campaignId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Phase 5 — submission kind toggle. "text" keeps the legacy
  // AI-scan flow (paste your script / caption / etc.). "url" is for
  // video clippers: paste a Drive / YouTube / Streamable / Loom link
  // and the creator watches it on the review page.
  const [submissionKind, setSubmissionKind] = useState<"text" | "url">("text");
  const [submissionUrl, setSubmissionUrl] = useState("");

  const [submittedContent, setSubmittedContent] = useState("");
  const [contentType, setContentType] = useState<"text" | "video" | "image" | "audio">("text");
  const [contentDescription, setContentDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIDetectionResult | null>(null);

  // Recognize the host as the clipper types so we can show an
  // inline sharing-settings hint and a host badge. Recomputes on
  // every keystroke — cheap, all in-memory regex/URL parsing.
  const hostInfo = recognizeMediaHost(submissionUrl);
  const trimmedUrl = submissionUrl.trim();
  const urlIsValid = (() => {
    if (!trimmedUrl) return false;
    try {
      const u = new URL(trimmedUrl);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  })();

  // Fetch campaign details
  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
  });

  // AI Content Analysis Mutation
  const analyzeContentMutation = useMutation({
    mutationFn: async (content: { type: string; content: string; description: string }) => {
      const response = await apiRequest("POST", "/api/ai-detection/analyze", content);
      return response.json();
    },
    onSuccess: (result: AIDetectionResult) => {
      setAiResult(result);
      setIsAnalyzing(false);
      
      if (result.recommendation === 'reject') {
        toast({
          title: "AI Content Detected",
          description: "This content appears to be AI-generated. Please submit original, human-created content.",
          variant: "destructive",
        });
      } else if (result.recommendation === 'review') {
        toast({
          title: "Content Under Review",
          description: "Your content will be manually reviewed before approval.",
          variant: "default",
        });
      } else {
        toast({
          title: "Content Approved",
          description: "Your content passed AI detection. Ready to submit application!",
          variant: "default",
        });
      }
    },
    onError: () => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit Application Mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await apiRequest("POST", `/api/campaigns/${campaignId}/apply`, applicationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted and is being processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clipper-campaigns"] });
      setLocation("/campaigns");
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const handleAnalyzeContent = () => {
    if (!submittedContent.trim()) {
      toast({
        title: "No Content",
        description: "Please enter content to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAiResult(null);
    
    analyzeContentMutation.mutate({
      type: contentType,
      content: submittedContent,
      description: contentDescription,
    });
  };

  const handleSubmitApplication = () => {
    if (submissionKind === "url") {
      if (!urlIsValid) {
        toast({
          title: "Invalid URL",
          description: "Paste a full http(s) link to your clip.",
          variant: "destructive",
        });
        return;
      }
      submitApplicationMutation.mutate({
        submissionKind: "url",
        submissionUrl: trimmedUrl,
        contentType,
        contentDescription,
      });
      return;
    }

    if (!aiResult || aiResult.recommendation === 'reject') {
      toast({
        title: "Cannot Submit",
        description: "Content must pass AI detection before submission.",
        variant: "destructive",
      });
      return;
    }

    submitApplicationMutation.mutate({
      submissionKind: "text",
      submittedContent,
      contentType,
      contentDescription,
      aiDetectionResult: aiResult,
      aiConfidence: aiResult.confidence,
      aiFlags: aiResult.flags,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Campaign not found or access denied.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4" />;
      case "image": return <Image className="h-4 w-4" />;
      case "audio": return <Mic className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getAIScoreColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-red-600";
    if (confidence >= 0.4) return "text-yellow-600";
    return "text-green-600";
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'review':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Review</Badge>;
      case 'reject':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Campaign Header */}
      <Card>
        <CardHeader>
          <CardTitle>Apply to Campaign: {campaign.name ?? campaign.title}</CardTitle>
          <CardDescription>{campaign.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase 4 — goal + verification context so the clipper
              understands what they're optimizing for before they
              spend time creating content. variant="full" surfaces the
              "Verified via …" caption since the apply page has room. */}
          <CampaignGoalSummary
            campaignGoals={campaign.campaignGoals ?? null}
            integration={campaign.integration ?? null}
            variant="full"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Budget</p>
              <p className="text-lg font-bold">${campaign.budget}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Target Platforms</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {campaign.targetPlatforms.map((platform) => (
                  <Badge key={platform} variant="outline" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Requirements</p>
              <p className="text-sm">{campaign.requirements}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration 0028 — Clipper resources. Only renders when the
          creator supplied any source materials, otherwise stays hidden
          so legacy / sparsely-filled campaigns don't show empty cards. */}
      {(campaign.sourceContentUrl ||
        campaign.brandGuidelines ||
        (campaign.exampleClipUrls && campaign.exampleClipUrls.length > 0) ||
        (campaign.requiredHashtags && campaign.requiredHashtags.length > 0) ||
        campaign.clipLengthSecMin ||
        campaign.clipLengthSecMax) && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-700" />
              Clipper resources
            </CardTitle>
            <CardDescription>
              Source content + guidelines from the creator. Read these
              before posting your clip.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.sourceContentUrl && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <PlayCircle className="h-4 w-4" />
                  Source content
                </p>
                <a
                  href={campaign.sourceContentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 hover:underline break-all"
                >
                  {campaign.sourceContentUrl}
                </a>
              </div>
            )}

            {campaign.brandGuidelines && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Brand guidelines
                </p>
                <div className="text-sm whitespace-pre-wrap rounded-md border bg-white p-3">
                  {campaign.brandGuidelines}
                </div>
              </div>
            )}

            {campaign.exampleClipUrls && campaign.exampleClipUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Example clips
                </p>
                <ul className="text-sm space-y-1">
                  {campaign.exampleClipUrls.map((url: string) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline break-all inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {campaign.requiredHashtags && campaign.requiredHashtags.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Hash className="h-4 w-4" />
                    Required tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.requiredHashtags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="bg-white">
                        #{tag.replace(/^#/, "")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(campaign.clipLengthSecMin || campaign.clipLengthSecMax) && (
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Clock className="h-4 w-4" />
                    Clip length
                  </p>
                  <p className="text-sm">
                    {campaign.clipLengthSecMin ?? "?"}–
                    {campaign.clipLengthSecMax ?? "?"} seconds
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* UGC Content Submission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Submit Your Content</span>
          </CardTitle>
          <CardDescription>
            Paste a link to your clip (preferred for video) or paste the
            text directly. Text submissions run through AI detection;
            URL submissions go straight to the creator for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={submissionKind}
            onValueChange={(v) => setSubmissionKind(v as "text" | "url")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" data-testid="tab-submit-url">
                <Link2 className="h-4 w-4 mr-2" /> Link to clip
              </TabsTrigger>
              <TabsTrigger value="text" data-testid="tab-submit-text">
                <FileText className="h-4 w-4 mr-2" /> Paste text
              </TabsTrigger>
            </TabsList>

            {/* URL submission */}
            <TabsContent value="url" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="submissionUrl">Clip URL</Label>
                <Input
                  id="submissionUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://drive.google.com/file/d/... or https://youtu.be/..."
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  data-testid="input-submission-url"
                />
                <p className="text-xs text-muted-foreground">
                  Google Drive, YouTube, Vimeo, Streamable, Loom, Dropbox,
                  or a direct .mp4/.webm link. Anything else still works,
                  it just won't preview inline.
                </p>
              </div>

              {trimmedUrl && (
                <Alert
                  className={
                    hostInfo.host === "unknown"
                      ? "border-amber-200 bg-amber-50"
                      : "border-blue-200 bg-blue-50"
                  }
                >
                  <Info
                    className={
                      hostInfo.host === "unknown"
                        ? "h-4 w-4 text-amber-600"
                        : "h-4 w-4 text-blue-600"
                    }
                  />
                  <AlertDescription>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{hostInfo.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {hostInfo.embedKind === "iframe"
                          ? "Embeds inline"
                          : hostInfo.embedKind === "video"
                          ? "Plays inline"
                          : "Opens in new tab"}
                      </Badge>
                    </div>
                    {hostInfo.sharingHint && (
                      <p className="text-sm mt-1">{hostInfo.sharingHint}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="contentTypeUrl">Content Type</Label>
                <Select
                  value={contentType}
                  onValueChange={(value: any) => setContentType(value)}
                >
                  <SelectTrigger id="contentTypeUrl">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4" />
                        <span>Video</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="image">
                      <div className="flex items-center space-x-2">
                        <Image className="h-4 w-4" />
                        <span>Image</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="audio">
                      <div className="flex items-center space-x-2">
                        <Mic className="h-4 w-4" />
                        <span>Audio</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="text">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Other</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentDescriptionUrl">
                  Notes for the creator (optional)
                </Label>
                <Input
                  id="contentDescriptionUrl"
                  placeholder="Anything they should know before watching..."
                  value={contentDescription}
                  onChange={(e) => setContentDescription(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* Text submission (legacy AI-gated path) */}
            <TabsContent value="text" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type</Label>
                <Select
                  value={contentType}
                  onValueChange={(value: any) => setContentType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Text Content</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4" />
                        <span>Video Content</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="image">
                      <div className="flex items-center space-x-2">
                        <Image className="h-4 w-4" />
                        <span>Image Content</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="audio">
                      <div className="flex items-center space-x-2">
                        <Mic className="h-4 w-4" />
                        <span>Audio Content</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentDescription">Content Description</Label>
                <Input
                  id="contentDescription"
                  placeholder="Briefly describe your content strategy and approach..."
                  value={contentDescription}
                  onChange={(e) => setContentDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submittedContent">
                  Your Content {getContentTypeIcon(contentType)}
                </Label>
                <Textarea
                  id="submittedContent"
                  placeholder={`Enter your original ${contentType} content here. Be authentic and personal - avoid generic or AI-generated text.`}
                  value={submittedContent}
                  onChange={(e) => setSubmittedContent(e.target.value)}
                  rows={8}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Include personal experiences, opinions, and
                  authentic language to pass AI detection.
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleAnalyzeContent}
                  disabled={isAnalyzing || !submittedContent.trim()}
                  className="flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  {isAnalyzing ? (
                    <>
                      <Zap className="h-4 w-4 animate-pulse" />
                      <span>Analyzing Content...</span>
                    </>
                  ) : (
                    <span>Analyze Content for AI</span>
                  )}
                </Button>
              </div>

              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>AI Detection in Progress</span>
                    <span>Analyzing patterns...</span>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Detection Results — text path only */}
      {submissionKind === "text" && aiResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>AI Detection Results</span>
              {getRecommendationBadge(aiResult.recommendation)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Score */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">AI Confidence Score</p>
                <p className="text-sm text-muted-foreground">Likelihood of AI generation</p>
              </div>
              <div className={`text-2xl font-bold ${getAIScoreColor(aiResult.confidence)}`}>
                {(aiResult.confidence * 100).toFixed(1)}%
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Analysis Breakdown</h4>
                {Object.entries(aiResult.analysis).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Progress value={value * 100} className="w-20 h-2" />
                      <span className="text-xs font-medium w-12">
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Detection Flags</h4>
                {aiResult.flags.length > 0 ? (
                  <div className="space-y-1">
                    {aiResult.flags.map((flag, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1">
                        {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No concerning patterns detected</p>
                )}
              </div>
            </div>

            {/* Recommendation */}
            {aiResult.recommendation === 'reject' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Content Rejected:</strong> This content appears to be AI-generated. 
                  Please create original, authentic content that reflects your personal voice and experiences.
                </AlertDescription>
              </Alert>
            )}

            {aiResult.recommendation === 'review' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Manual Review Required:</strong> Your content will be reviewed by the creator 
                  before approval. This typically takes 1-2 business days.
                </AlertDescription>
              </Alert>
            )}

            {aiResult.recommendation === 'approve' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Content Approved:</strong> Your content passed AI detection and appears to be 
                  authentic user-generated content. You can now submit your application.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Application */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Ready to Submit Application?</h3>
              <p className="text-sm text-muted-foreground">
                {submissionKind === "url"
                  ? "Your link will be sent to the creator for review."
                  : "Your content must pass AI detection before you can apply."}
              </p>
            </div>
            <Button
              onClick={handleSubmitApplication}
              disabled={
                submitApplicationMutation.isPending ||
                (submissionKind === "url"
                  ? !urlIsValid
                  : !aiResult || aiResult.recommendation === "reject")
              }
              size="lg"
              data-testid="button-submit-application"
            >
              {submitApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}