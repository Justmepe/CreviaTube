import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Filter, Users, TrendingUp, Clock, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getQueryFn } from '@/lib/queryClient';

interface ClipperProfile {
  clipperId: string;
  clipperName: string;
  clipperUsername: string;
  averageRating: string;
  totalReviews: number;
  totalCampaignsCompleted: number;
  successRate: string;
  tier: string;
  rankingScore: string;
  qualityAverage: string;
  communicationAverage: string;
  timelinessAverage: string;
  creativityAverage: string;
  professionalismAverage: string;
  totalViewsGenerated: number;
  totalClicksGenerated: number;
  totalSignupsGenerated: number;
  positiveRecommendations: number;
  lastActiveAt: string | null;
  isActive: boolean;
}

const TIER_COLORS = {
  bronze: 'bg-orange-100 text-orange-800 border-orange-200',
  silver: 'bg-gray-100 text-gray-800 border-gray-200',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  platinum: 'bg-purple-100 text-purple-800 border-purple-200',
  diamond: 'bg-blue-100 text-blue-800 border-blue-200',
};

const TIER_ICONS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💫',
};

function ClipperCard({ clipper }: { clipper: ClipperProfile }) {
  const rating = parseFloat(clipper.averageRating);
  const successRate = parseFloat(clipper.successRate);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {clipper.clipperName}
              <Badge 
                variant="outline" 
                className={TIER_COLORS[clipper.tier as keyof typeof TIER_COLORS]}
              >
                {TIER_ICONS[clipper.tier as keyof typeof TIER_ICONS]} {clipper.tier}
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">@{clipper.clipperUsername}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500">{clipper.totalReviews} reviews</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-blue-50 rounded">
            <Users className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <p className="text-xs text-gray-600">Campaigns</p>
            <p className="font-semibold text-sm">{clipper.totalCampaignsCompleted}</p>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <p className="text-xs text-gray-600">Success Rate</p>
            <p className="font-semibold text-sm">{successRate.toFixed(0)}%</p>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <Award className="w-4 h-4 mx-auto mb-1 text-purple-600" />
            <p className="text-xs text-gray-600">Would Hire Again</p>
            <p className="font-semibold text-sm">{clipper.positiveRecommendations}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Performance Breakdown</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Quality:</span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {parseFloat(clipper.qualityAverage).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Communication:</span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {parseFloat(clipper.communicationAverage).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Timeliness:</span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {parseFloat(clipper.timelinessAverage).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Creativity:</span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {parseFloat(clipper.creativityAverage).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="space-y-2 border-t pt-3">
          <h4 className="font-medium text-sm">Total Generated</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="font-semibold">{clipper.totalViewsGenerated.toLocaleString()}</p>
              <p className="text-gray-500">Views</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{clipper.totalClicksGenerated.toLocaleString()}</p>
              <p className="text-gray-500">Clicks</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{clipper.totalSignupsGenerated.toLocaleString()}</p>
              <p className="text-gray-500">Signups</p>
            </div>
          </div>
        </div>

        <Button className="w-full" size="sm">
          View Profile & Reviews
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClipperDirectory() {
  const [filters, setFilters] = useState({
    minRating: 'all',
    tier: 'all',
    minCompletions: 'all',
    search: '',
  });

  const { data: clippers, isLoading } = useQuery<ClipperProfile[]>({
    queryKey: ['/api/clippers/top', filters],
    queryFn: getQueryFn(),
  });

  const filteredClippers = clippers?.filter(clipper => {
    if (filters.search && !clipper.clipperName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.minRating && filters.minRating !== 'all' && parseFloat(clipper.averageRating) < parseFloat(filters.minRating)) {
      return false;
    }
    if (filters.tier && filters.tier !== 'all' && clipper.tier !== filters.tier) {
      return false;
    }
    if (filters.minCompletions && filters.minCompletions !== 'all' && clipper.totalCampaignsCompleted < parseInt(filters.minCompletions)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Find Top Clippers</h1>
        <p className="text-gray-600">
          Browse our directory of top-rated clippers based on reviews, performance, and success rates.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by name..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
              <Select
                value={filters.minRating}
                onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any rating</SelectItem>
                  <SelectItem value="4.5">4.5+ stars</SelectItem>
                  <SelectItem value="4.0">4.0+ stars</SelectItem>
                  <SelectItem value="3.5">3.5+ stars</SelectItem>
                  <SelectItem value="3.0">3.0+ stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tier</label>
              <Select
                value={filters.tier}
                onValueChange={(value) => setFilters(prev => ({ ...prev, tier: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any tier</SelectItem>
                  <SelectItem value="diamond">💫 Diamond</SelectItem>
                  <SelectItem value="platinum">💎 Platinum</SelectItem>
                  <SelectItem value="gold">🥇 Gold</SelectItem>
                  <SelectItem value="silver">🥈 Silver</SelectItem>
                  <SelectItem value="bronze">🥉 Bronze</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Min Campaigns</label>
              <Select
                value={filters.minCompletions}
                onValueChange={(value) => setFilters(prev => ({ ...prev, minCompletions: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any amount</SelectItem>
                  <SelectItem value="20">20+ campaigns</SelectItem>
                  <SelectItem value="10">10+ campaigns</SelectItem>
                  <SelectItem value="5">5+ campaigns</SelectItem>
                  <SelectItem value="1">1+ campaigns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClippers && filteredClippers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClippers.map((clipper) => (
              <ClipperCard key={clipper.clipperId} clipper={clipper} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No clippers found</h3>
              <p className="text-gray-600">
                Try adjusting your filters to see more results.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}