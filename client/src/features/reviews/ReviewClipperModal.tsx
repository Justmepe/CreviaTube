import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const reviewSchema = z.object({
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  timeliness: z.number().min(1).max(5),
  creativity: z.number().min(1).max(5),
  professionalism: z.number().min(1).max(5),
  reviewTitle: z.string().min(5, "Title must be at least 5 characters").max(100),
  reviewText: z.string().min(20, "Review must be at least 20 characters").max(1000),
  wouldHireAgain: z.boolean(),
  recommendToOthers: z.boolean(),
  tags: z.array(z.string()).optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewClipperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipperCampaign: {
    id: string;
    clipperId: string;
    campaignId: string;
    clipperName: string;
    campaignName: string;
    isCompleted: boolean;
    completionMetrics?: any;
  };
}

const StarRating = ({ 
  value, 
  onChange, 
  label 
}: { 
  value: number; 
  onChange: (value: number) => void; 
  label: string;
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

const REVIEW_TAGS = [
  'reliable', 'creative', 'fast', 'professional', 'responsive',
  'high-quality', 'exceeded-expectations', 'good-communication',
  'met-deadlines', 'innovative', 'authentic-content', 'engaging',
  'poor-communication', 'missed-deadlines', 'low-quality', 'unreliable'
];

export function ReviewClipperModal({ open, onOpenChange, clipperCampaign }: ReviewClipperModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallRating: 5,
      qualityRating: 5,
      communicationRating: 5,
      timeliness: 5,
      creativity: 5,
      professionalism: 5,
      reviewTitle: '',
      reviewText: '',
      wouldHireAgain: true,
      recommendToOthers: true,
      tags: [],
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      return apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          clipperCampaignId: clipperCampaign?.id,
          clipperId: clipperCampaign?.clipperId,
          campaignId: clipperCampaign?.campaignId,
          tags: selectedTags,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted successfully",
        description: "Thank you for your feedback. It helps other creators find great clippers.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clippers'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit review",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    submitReviewMutation.mutate({
      ...data,
      tags: selectedTags,
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (!clipperCampaign?.isCompleted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Cannot Submit Review
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600">
              You can only review clippers after they have completed their campaign goals.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Review {clipperCampaign?.clipperName}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Campaign: {clipperCampaign?.campaignName}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rating Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Performance Ratings</h3>
                
                <FormField
                  control={form.control}
                  name="overallRating"
                  render={({ field }) => (
                    <FormItem>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        label="Overall Rating"
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualityRating"
                  render={({ field }) => (
                    <FormItem>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        label="Content Quality"
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="communicationRating"
                  render={({ field }) => (
                    <FormItem>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        label="Communication"
                      />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Additional Ratings</h3>
                
                <FormField
                  control={form.control}
                  name="timeliness"
                  render={({ field }) => (
                    <FormItem>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        label="Timeliness"
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creativity"
                  render={({ field }) => (
                    <FormItem>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        label="Creativity"
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professionalism"
                  render={({ field }) => (
                    <FormItem>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        label="Professionalism"
                      />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Written Review */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Written Review</h3>
              
              <FormField
                control={form.control}
                name="reviewTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Excellent work and communication"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reviewText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Review</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Share your experience working with this clipper. What did they do well? How was their communication and delivery?"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Review Tags</h3>
              <p className="text-sm text-gray-600">
                Select tags that describe your experience (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Recommendations</h3>
              
              <FormField
                control={form.control}
                name="wouldHireAgain"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">
                      I would hire this clipper again
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommendToOthers"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">
                      I would recommend this clipper to other creators
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitReviewMutation.isPending}
                className="flex-1"
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}