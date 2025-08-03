import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp } from "lucide-react";

const campaignGoalsSchema = z.object({
  primaryGoal: z.enum(['views', 'clicks', 'signups', 'deposits', 'trades', 'conversions']),
  viewsGoal: z.number().min(1).optional(),
  clicksGoal: z.number().min(1).optional(),
  signupsGoal: z.number().min(1).optional(),
  depositsGoal: z.number().min(1).optional(),
  tradesGoal: z.number().min(1).optional(),
  conversionsGoal: z.number().min(1).optional(),
});

type CampaignGoalsFormData = z.infer<typeof campaignGoalsSchema>;

interface CampaignGoalsFormProps {
  initialData?: Partial<CampaignGoalsFormData>;
  onSubmit: (data: CampaignGoalsFormData) => void;
  isSubmitting?: boolean;
}

export function CampaignGoalsForm({ initialData, onSubmit, isSubmitting = false }: CampaignGoalsFormProps) {
  const form = useForm<CampaignGoalsFormData>({
    resolver: zodResolver(campaignGoalsSchema),
    defaultValues: {
      primaryGoal: 'views',
      viewsGoal: undefined,
      clicksGoal: undefined,
      signupsGoal: undefined,
      depositsGoal: undefined,
      tradesGoal: undefined,
      conversionsGoal: undefined,
      ...initialData,
    },
  });

  const primaryGoal = form.watch('primaryGoal');

  const goalOptions = [
    { value: 'views', label: 'Views', description: 'Total video/content views' },
    { value: 'clicks', label: 'Clicks', description: 'Link clicks and interactions' },
    { value: 'signups', label: 'Sign-ups', description: 'New user registrations' },
    { value: 'deposits', label: 'Deposits', description: 'User deposits/funding' },
    { value: 'trades', label: 'Trades', description: 'Trading activity' },
    { value: 'conversions', label: 'Conversions', description: 'Final conversion actions' },
  ];

  const getGoalFieldName = (goalType: string) => {
    return `${goalType}Goal` as keyof CampaignGoalsFormData;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Campaign Goals</CardTitle>
        </div>
        <CardDescription>
          Set individual completion goals for clippers. When a clipper reaches the primary goal, their campaign participation will be marked as complete.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Primary Goal Selection */}
            <FormField
              control={form.control}
              name="primaryGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the main goal for clipper completion" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {goalOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This is the main metric that determines when a clipper's campaign participation is complete.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Goal Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goalOptions.map((option) => {
                const fieldName = getGoalFieldName(option.value);
                const isPrimary = primaryGoal === option.value;
                
                return (
                  <FormField
                    key={option.value}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={isPrimary ? "text-primary font-semibold" : ""}>
                          <div className="flex items-center gap-2">
                            {isPrimary && <TrendingUp className="h-3 w-3" />}
                            {option.label} Target
                            {isPrimary && <span className="text-xs bg-primary/10 text-primary px-1 rounded">PRIMARY</span>}
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={`Enter ${option.label.toLowerCase()} target`}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            className={isPrimary ? "border-primary/50 bg-primary/5" : ""}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {isPrimary 
                            ? `When a clipper reaches this number of ${option.label.toLowerCase()}, they'll complete the campaign.`
                            : `Optional: Track ${option.label.toLowerCase()} for analytics (not used for completion).`
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Individual Completion Logic</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Each clipper's campaign participation will be marked complete when they reach the primary goal target. 
                    The overall campaign remains active for other clippers until the campaign duration expires.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Saving Goals..." : "Save Campaign Goals"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}