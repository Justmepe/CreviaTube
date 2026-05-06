import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating, CompactRating } from "@/components/ui/star-rating";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  User,
  Verified,
  Calendar,
  Zap,
  DollarSign,
  Target,
  Users,
  Headphones,
  Heart
} from "lucide-react";
import { useState } from "react";

interface PlatformReview {
  id: string;
  overallRating: number;
  easeOfUse: number;
  paymentReliability: number;
  campaignQuality: number;
  clipperQuality?: number;
  customerSupport: number;
  platformFeatures: number;
  reviewTitle: string;
  reviewText: string;
  reviewTrigger: string;
  userExperience?: {
    daysSinceJoined: number;
    campaignsCompleted: number;
    totalEarnings: number;
    payoutsReceived: number;
    userRole: string;
    accountType?: string;
  };
  improvementSuggestions?: string;
  npsScore: number;
  wouldRecommend: boolean;
  helpfulVotes: number;
  totalVotes: number;
  createdAt: string;
  isVerified: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    accountType?: string;
  };
  adminResponse?: string;
  adminRespondedAt?: string;
}

interface ReviewCardProps {
  review: PlatformReview;
  showFullDetails?: boolean;
  onHelpfulVote?: (reviewId: string, helpful: boolean) => void;
}

export function ReviewCard({ review, showFullDetails = false, onHelpfulVote }: ReviewCardProps) {
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  
  const getAccountTypeLabel = (accountType?: string, role?: string) => {
    if (accountType === "influencer") return "Social Influencer";
    if (accountType === "business") return "Business";
    return role === "creator" ? "Creator" : "Clipper";
  };

  const getAccountTypeColor = (accountType?: string, role?: string) => {
    if (accountType === "influencer") return "bg-pink-100 text-pink-800";
    if (accountType === "business") return "bg-green-100 text-green-800";
    return role === "creator" ? "bg-orange-100 text-orange-800" : "bg-teal-100 text-teal-800";
  };
  
  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case "first_payout": return "First Payout";
      case "earnings_milestone": return "Earnings Milestone";
      case "campaign_milestone": return "Campaign Milestone";
      case "time_milestone": return "Platform Anniversary";
      case "voluntary": return "Voluntary";
      default: return "Review";
    }
  };
  
  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case "first_payout": return "bg-green-100 text-green-800";
      case "earnings_milestone": return "bg-yellow-100 text-yellow-800";
      case "campaign_milestone": return "bg-blue-100 text-blue-800";
      case "time_milestone": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const detailRatings = [
    { key: "easeOfUse", label: "Ease of Use", icon: Zap, value: review.easeOfUse },
    { key: "paymentReliability", label: "Payment Reliability", icon: DollarSign, value: review.paymentReliability },
    { key: "campaignQuality", label: "Campaign Quality", icon: Target, value: review.campaignQuality },
    ...(review.clipperQuality ? [{ key: "clipperQuality", label: "Clipper Quality", icon: Users, value: review.clipperQuality }] : []),
    { key: "customerSupport", label: "Customer Support", icon: Headphones, value: review.customerSupport },
    { key: "platformFeatures", label: "Platform Features", icon: Heart, value: review.platformFeatures },
  ];
  
  const helpfulnessPercentage = review.totalVotes > 0 ? Math.round((review.helpfulVotes / review.totalVotes) * 100) : 0;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CompactRating rating={review.overallRating} />
              {review.isVerified && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  <Verified className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900">{review.reviewTitle}</h3>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{review.user.fullName}</span>
              </div>
              
              <Badge className={getAccountTypeColor(review.user.accountType, review.user.role)}>
                {getAccountTypeLabel(review.user.accountType, review.user.role)}
              </Badge>
              
              <Badge variant="outline" className={getTriggerColor(review.reviewTrigger)}>
                {getTriggerLabel(review.reviewTrigger)}
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          
          {review.wouldRecommend && (
            <Badge className="bg-green-100 text-green-800">
              Recommends CreviaTube
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Review Text */}
        <div>
          <p className={`text-gray-700 leading-relaxed ${
            showFullText || review.reviewText.length <= 200 
              ? "" 
              : "line-clamp-3"
          }`}>
            {review.reviewText}
          </p>
          
          {review.reviewText.length > 200 && (
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="text-teal-600 hover:text-teal-700 text-sm mt-1"
            >
              {showFullText ? "Show less" : "Read more"}
            </button>
          )}
        </div>
        
        {/* Detailed Ratings */}
        {(showFullDetails || showAllRatings) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Detailed Ratings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detailRatings.map((rating) => {
                const Icon = rating.icon;
                return (
                  <div key={rating.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700">{rating.label}</span>
                    </div>
                    <StarRating rating={rating.value} readonly size="sm" />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">NPS Score (Recommendation)</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    review.npsScore >= 9 ? "bg-green-100 text-green-800" :
                    review.npsScore >= 7 ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {review.npsScore}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!showFullDetails && !showAllRatings && (
          <button
            onClick={() => setShowAllRatings(true)}
            className="text-teal-600 hover:text-teal-700 text-sm"
          >
            Show detailed ratings
          </button>
        )}
        
        {/* User Experience Context */}
        {showFullDetails && review.userExperience && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">User Context</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-800">{review.userExperience.daysSinceJoined}</div>
                <div className="text-blue-600">Days on Platform</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-800">{review.userExperience.campaignsCompleted}</div>
                <div className="text-blue-600">Campaigns</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-800">${review.userExperience.totalEarnings}</div>
                <div className="text-blue-600">Total Earned</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-800">{review.userExperience.payoutsReceived}</div>
                <div className="text-blue-600">Payouts</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Improvement Suggestions */}
        {review.improvementSuggestions && showFullDetails && (
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">Improvement Suggestions</h4>
            <p className="text-amber-800 text-sm">{review.improvementSuggestions}</p>
          </div>
        )}
        
        {/* Admin Response */}
        {review.adminResponse && (
          <div className="bg-teal-50 rounded-lg p-4 border-l-4 border-teal-400">
            <h4 className="font-medium text-teal-900 mb-2">CreviaTube Response</h4>
            <p className="text-teal-800 text-sm mb-2">{review.adminResponse}</p>
            <p className="text-teal-600 text-xs">
              Responded {formatDistanceToNow(new Date(review.adminRespondedAt!), { addSuffix: true })}
            </p>
          </div>
        )}
        
        {/* Helpful Voting */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {review.totalVotes > 0 ? (
              <span>{helpfulnessPercentage}% found this helpful ({review.helpfulVotes}/{review.totalVotes})</span>
            ) : (
              <span>Be the first to rate this review</span>
            )}
          </div>
          
          {onHelpfulVote && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onHelpfulVote(review.id, true)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onHelpfulVote(review.id, false)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Not helpful
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}