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
  Zap
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string;
  budget: number;
  rewardRates: string;
  requirements: string;
  targetPlatforms: string[];
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
  
  const [submittedContent, setSubmittedContent] = useState("");
  const [contentType, setContentType] = useState<"text" | "video" | "image" | "audio">("text");
  const [contentDescription, setContentDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIDetectionResult | null>(null);

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
    if (!aiResult || aiResult.recommendation === 'reject') {
      toast({
        title: "Cannot Submit",
        description: "Content must pass AI detection before submission.",
        variant: "destructive",
      });
      return;
    }

    submitApplicationMutation.mutate({
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
          <CardTitle>Apply to Campaign: {campaign.title}</CardTitle>
          <CardDescription>{campaign.description}</CardDescription>
        </CardHeader>
        <CardContent>
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

      {/* UGC Content Submission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Submit Your Original Content</span>
          </CardTitle>
          <CardDescription>
            Create and submit authentic, user-generated content. AI-generated content will be automatically detected and rejected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Content Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
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

          {/* Content Description */}
          <div className="space-y-2">
            <Label htmlFor="contentDescription">Content Description</Label>
            <Input
              id="contentDescription"
              placeholder="Briefly describe your content strategy and approach..."
              value={contentDescription}
              onChange={(e) => setContentDescription(e.target.value)}
            />
          </div>

          {/* Main Content */}
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
              Tip: Include personal experiences, opinions, and authentic language to pass AI detection.
            </p>
          </div>

          {/* AI Analysis Button */}
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

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>AI Detection in Progress</span>
                <span>Analyzing patterns...</span>
              </div>
              <Progress value={75} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Detection Results */}
      {aiResult && (
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
                Your content must pass AI detection before you can apply to this campaign.
              </p>
            </div>
            <Button
              onClick={handleSubmitApplication}
              disabled={!aiResult || aiResult.recommendation === 'reject' || submitApplicationMutation.isPending}
              size="lg"
            >
              {submitApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}