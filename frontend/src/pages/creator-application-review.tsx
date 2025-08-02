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
}

export default function CreatorApplicationReview() {
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<ClipperApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch pending applications
  const { data: applications, isLoading } = useQuery<ClipperApplication[]>({
    queryKey: ["/api/creator/pending-applications"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Review Application Mutation
  const reviewApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, action, notes }: { 
      applicationId: string; 
      action: 'approve' | 'reject'; 
      notes: string;
    }) => {
      const response = await apiRequest("POST", `/api/clipper-applications/${applicationId}/review`, {
        action,
        notes,
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

    reviewApplicationMutation.mutate({
      applicationId: selectedApplication.id,
      action,
      notes: reviewNotes,
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

  const pendingApplications = applications?.filter(app => 
    app.applicationStatus === 'creator_review' || 
    (app.applicationStatus === 'ai_scanning' && app.aiDetectionResult?.recommendation === 'review')
  ) || [];

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
          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Pending Applications</h3>
                <p className="text-muted-foreground text-center">
                  All clipper applications have been reviewed or are in AI scanning.
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{application.clipperUsername}</span>
                        </div>
                        {getStatusBadge(application.applicationStatus)}
                      </div>
                      
                      <h4 className="font-medium mb-2">{application.campaignTitle}</h4>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Content: {application.contentType}</span>
                        <div className="flex items-center space-x-2">
                          <Brain className="h-3 w-3" />
                          <span className={getAIScoreColor(application.aiConfidence)}>
                            {(application.aiConfidence * 100).toFixed(0)}% AI
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
                      {/* AI Detection Summary */}
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>AI Detection Summary</span>
                        </h4>
                        
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span>AI Confidence</span>
                            <span className={`font-bold ${getAIScoreColor(selectedApplication.aiConfidence)}`}>
                              {(selectedApplication.aiConfidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            Recommendation: <span className="font-medium">
                              {selectedApplication.aiDetectionResult?.recommendation || 'review'}
                            </span>
                          </div>
                        </div>

                        {selectedApplication.aiDetectionResult?.flags && (
                          <div>
                            <p className="text-sm font-medium mb-2">Detection Flags:</p>
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

                      {/* Content Preview */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Submitted Content</h4>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">{selectedApplication.contentType}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {selectedApplication.contentDescription}
                            </span>
                          </div>
                          <div className="text-sm max-h-32 overflow-y-auto">
                            {selectedApplication.submittedContent}
                          </div>
                        </div>
                      </div>

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