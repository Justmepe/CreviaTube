import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Heart, DollarSign, Users, Headphones, Zap, Target } from "lucide-react";

interface ReviewRatings {
  overallRating: number;
  easeOfUse: number;
  paymentReliability: number;
  campaignQuality: number;
  clipperQuality?: number;
  customerSupport: number;
  platformFeatures: number;
}

interface PlatformReviewModalProps {
  open: boolean;
  onClose: () => void;
  triggerType?: string;
  triggerValue?: string;
  promptId?: string;
}

export function PlatformReviewModal({
  open,
  onClose,
  triggerType,
  triggerValue,
  promptId,
}: PlatformReviewModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [ratings, setRatings] = useState<ReviewRatings>({
    overallRating: 5,
    easeOfUse: 5,
    paymentReliability: 5,
    campaignQuality: 5,
    clipperQuality: user?.role === "creator" ? 5 : undefined,
    customerSupport: 5,
    platformFeatures: 5,
  });
  
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [improvementSuggestions, setImprovementSuggestions] = useState("");
  const [npsScore, setNpsScore] = useState(10);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await apiRequest("POST", "/api/platform-reviews", reviewData);
      return response.json();
    },
    onSuccess: async (data) => {
      // Mark prompt as responded if we have a promptId
      if (promptId) {
        await apiRequest("PATCH", `/api/review-prompts/${promptId}/respond`, {
          response: "reviewed",
          reviewId: data.review.id,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/platform-reviews"] });
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback. Your review helps us improve CreviaTube.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewTitle.trim() || !reviewText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and review text.",
        variant: "destructive",
      });
      return;
    }
    
    const reviewData = {
      ...ratings,
      reviewTitle: reviewTitle.trim(),
      reviewText: reviewText.trim(),
      improvementSuggestions: improvementSuggestions.trim(),
      npsScore,
      wouldRecommend,
      reviewTrigger: triggerType || "voluntary",
      featuresRequested: [], // Could be expanded later
    };
    
    submitReviewMutation.mutate(reviewData);
  };
  
  const handleDismiss = async () => {
    if (promptId) {
      await apiRequest("PATCH", `/api/review-prompts/${promptId}/respond`, {
        response: "dismissed",
      });
    }
    onClose();
  };
  
  const updateRating = (key: keyof ReviewRatings, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };
  
  const ratingCategories = [
    {
      key: "easeOfUse" as const,
      label: "Ease of Use",
      description: "How easy is it to navigate and use CreviaTube?",
      icon: Zap,
    },
    {
      key: "paymentReliability" as const,
      label: "Payment Reliability",
      description: "How reliable are payments and payouts?",
      icon: DollarSign,
    },
    {
      key: "campaignQuality" as const,
      label: user?.role === "clipper" ? "Campaign Quality" : "Platform Tools",
      description: user?.role === "clipper" ? "Quality of available campaigns" : "Quality of campaign creation tools",
      icon: Target,
    },
    ...(user?.role === "creator" ? [{
      key: "clipperQuality" as const,
      label: "Clipper Quality",
      description: "Quality of clippers applying to your campaigns",
      icon: Users,
    }] : []),
    {
      key: "customerSupport" as const,
      label: "Customer Support",
      description: "How helpful and responsive is our support team?",
      icon: Headphones,
    },
    {
      key: "platformFeatures" as const,
      label: "Platform Features",
      description: "Overall satisfaction with CreviaTube features",
      icon: Heart,
    },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Rate Your CreviaTube Experience</DialogTitle>
          <DialogDescription>
            {triggerType && triggerValue && (
              <span className="text-teal-600 font-medium">
                🎉 Congratulations on reaching this milestone! 
              </span>
            )}
            Your feedback helps us improve CreviaTube for everyone. Please share your honest experience.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <Label className="text-lg font-medium">Overall Rating</Label>
            <div className="flex justify-center mt-2">
              <StarRating
                rating={ratings.overallRating}
                onRatingChange={(value) => updateRating("overallRating", value)}
                size="lg"
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">How would you rate CreviaTube overall?</p>
          </div>
          
          <Separator />
          
          {/* Category Ratings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Rate Specific Areas</h3>
            <div className="grid gap-4">
              {ratingCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.key} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-teal-600" />
                      <div>
                        <Label className="font-medium">{category.label}</Label>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <StarRating
                      rating={ratings[category.key] || 5}
                      onRatingChange={(value) => updateRating(category.key, value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          <Separator />
          
          {/* Written Review */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewTitle">Review Title *</Label>
              <Input
                id="reviewTitle"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience in a few words..."
                maxLength={100}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="reviewText">Your Review *</Label>
              <Textarea
                id="reviewText"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your detailed experience with CreviaTube. What did you like? What could be improved?"
                rows={4}
                maxLength={2000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{reviewText.length}/2000 characters</p>
            </div>
            
            <div>
              <Label htmlFor="improvements">Suggestions for Improvement (Optional)</Label>
              <Textarea
                id="improvements"
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                placeholder="What specific improvements would you like to see?"
                rows={2}
                maxLength={500}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* NPS Score */}
          <div>
            <Label className="text-base font-medium">Would you recommend CreviaTube to others?</Label>
            <p className="text-sm text-gray-600 mb-3">On a scale of 0-10, how likely are you to recommend CreviaTube?</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Not likely</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => {
                      setNpsScore(score);
                      setWouldRecommend(score >= 7);
                    }}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      npsScore === score
                        ? "bg-teal-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500">Very likely</span>
            </div>
          </div>
          
          {/* Submit Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitReviewMutation.isPending}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              disabled={submitReviewMutation.isPending}
            >
              Not Now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}