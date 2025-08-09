import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/review-card";
import { CompactRating } from "@/components/ui/star-rating";
import { PlatformReviewModal } from "@/components/platform-review-modal";
import { 
  Star, 
  Search, 
  Filter, 
  MessageSquare, 
  TrendingUp, 
  Users,
  Award,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function PlatformReviews() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filterBy, setFilterBy] = useState("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Fetch platform reviews
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["/api/platform-reviews", { status: "published", limit: 50 }],
  });
  
  // Fetch review statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/platform-reviews/stats"],
  });
  
  // Check if current user has already reviewed
  const { data: userReviews = [] } = useQuery({
    queryKey: ["/api/platform-reviews", { userId: user?.id }],
    enabled: !!user,
  });
  
  const hasUserReviewed = Array.isArray(userReviews) && userReviews.length > 0;
  
  // Filter and sort reviews
  const filteredReviews = Array.isArray(reviews) ? reviews
    .filter((review: any) => {
      const matchesSearch = review.reviewTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          review.reviewText.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === "all" || 
                          (filterBy === "high_rated" && review.overallRating >= 4) ||
                          (filterBy === "critical" && review.overallRating < 3) ||
                          (filterBy === "creators" && review.user.role === "creator") ||
                          (filterBy === "clippers" && review.user.role === "clipper");
      
      return matchesSearch && matchesFilter;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "highest_rated":
          return b.overallRating - a.overallRating;
        case "lowest_rated":
          return a.overallRating - b.overallRating;
        case "most_helpful":
          return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
        default: // latest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    }) : [];
  
  const getRatingDistribution = () => {
    if (!stats || typeof stats !== 'object' || !('ratingBreakdown' in stats)) return [];
    
    const statsSafe = stats as any;
    return [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: statsSafe.ratingBreakdown?.[rating] || 0,
      percentage: statsSafe.totalReviews > 0 ? Math.round((statsSafe.ratingBreakdown?.[rating] || 0) / statsSafe.totalReviews * 100) : 0
    }));
  };
  
  if (isLoading) {
    return (
      <DashboardLayout title="Platform Reviews">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title="Platform Reviews">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-gray-600">
              See what our community thinks about CreoCash. Real reviews from creators and clippers.
            </p>
          </div>
          
          {user && !hasUserReviewed && (
            <Button 
              onClick={() => setShowReviewModal(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Write a Review
            </Button>
          )}
        </div>
        
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Average Rating</p>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                      <div className="flex">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalReviews}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">5-Star Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(((stats.ratingBreakdown?.[5] || 0) / stats.totalReviews) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Verified Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">100%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Rating Distribution */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getRatingDistribution().map((item) => (
                  <div key={item.rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm font-medium">{item.rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-sm text-gray-600">{item.count} ({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="highest_rated">Highest Rated</SelectItem>
                  <SelectItem value="lowest_rated">Lowest Rated</SelectItem>
                  <SelectItem value="most_helpful">Most Helpful</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviews</SelectItem>
                  <SelectItem value="high_rated">High Rated (4+ stars)</SelectItem>
                  <SelectItem value="critical">Critical (&lt; 3 stars)</SelectItem>
                  <SelectItem value="creators">From Creators</SelectItem>
                  <SelectItem value="clippers">From Clippers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Showing {filteredReviews.length} reviews</span>
                {filterBy !== "all" && (
                  <Badge variant="outline" className="text-xs">
                    {filterBy.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Reviews List */}
        <div className="space-y-6">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterBy !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Be the first to review CreoCash!"}
                </p>
                {user && !hasUserReviewed && (
                  <Button 
                    onClick={() => setShowReviewModal(true)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Write the First Review
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review: any) => (
              <ReviewCard 
                key={review.id} 
                review={review} 
                showFullDetails={false}
                onHelpfulVote={(reviewId, helpful) => {
                  // TODO: Implement helpful voting
                  console.log("Vote:", reviewId, helpful);
                }}
              />
            ))
          )}
        </div>
        
        {/* Load More Button (for pagination) */}
        {filteredReviews.length >= 20 && (
          <div className="text-center">
            <Button variant="outline">
              Load More Reviews
            </Button>
          </div>
        )}
      </div>
      
      {/* Review Modal */}
      <PlatformReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />
    </DashboardLayout>
  );
}