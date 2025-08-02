import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook,
  Plus,
  Link,
  Users,
  Eye,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const socialIntegrationSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "facebook"]),
  username: z.string().min(1, "Username is required"),
  profileUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  followerCount: z.number().min(0, "Follower count must be positive").optional(),
  accessToken: z.string().optional(),
});

type SocialIntegrationData = z.infer<typeof socialIntegrationSchema>;

const platformInfo = {
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    description: "Connect your Instagram account to track posts, stories, and reels performance",
  },
  tiktok: {
    name: "TikTok",
    icon: Plus, // Using Plus as placeholder for TikTok icon
    color: "text-black",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    description: "Track your TikTok videos and engagement metrics",
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "Monitor your YouTube channel performance and subscriber growth",
  },
  twitter: {
    name: "Twitter/X",
    icon: Twitter,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Track tweets, retweets, and follower engagement",
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Connect your Facebook page for post and engagement tracking",
  },
};

export default function SocialIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const form = useForm<SocialIntegrationData>({
    resolver: zodResolver(socialIntegrationSchema),
    defaultValues: {
      platform: "instagram",
      username: "",
      profileUrl: "",
      followerCount: undefined,
      accessToken: "",
    },
  });

  const { data: socialAccounts = {} } = useQuery({
    queryKey: ["/api/users", user?.id, "social-accounts"],
    enabled: !!user?.id,
  });

  const integrateSocialMutation = useMutation({
    mutationFn: async (data: SocialIntegrationData) => {
      const res = await apiRequest("POST", `/api/users/${user?.id}/social-integration`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Social account connected!",
        description: `Your ${data.platform} account has been successfully integrated.`,
      });
      form.reset();
      setSelectedPlatform(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Integration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SocialIntegrationData) => {
    integrateSocialMutation.mutate(data);
  };

  const connectedAccounts = user?.socialAccounts as any || {};

  return (
    <DashboardLayout title="Social Media Integration">
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media Integration</h1>
          <p className="text-gray-600 mt-2">
            Connect your social media accounts to enable automatic tracking of views, engagement, and follower growth.
            This helps clippers get paid accurately based on their performance.
          </p>
        </div>

        {/* Integration Benefits */}
        <Alert className="border-teal-200 bg-teal-50">
          <TrendingUp className="h-4 w-4 text-teal-600" />
          <AlertDescription className="text-teal-800">
            <strong>Why integrate social accounts?</strong> 
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Automatic tracking of content performance</li>
              <li>Real-time view count updates for fair clipper payments</li>
              <li>Engagement metrics (likes, shares, comments) contribute to earnings</li>
              <li>Transparent reporting for both creators and clippers</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Connected Accounts */}
        {Object.keys(connectedAccounts).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Connected Accounts
              </CardTitle>
              <CardDescription>Your integrated social media accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(connectedAccounts).map(([platform, data]: [string, any]) => {
                  const info = platformInfo[platform as keyof typeof platformInfo];
                  const Icon = info?.icon || Plus;
                  
                  return (
                    <div key={platform} className={`p-4 rounded-lg border ${info?.borderColor} ${info?.bgColor}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`h-5 w-5 ${info?.color}`} />
                        <div>
                          <h3 className="font-semibold">{info?.name}</h3>
                          <p className="text-sm text-muted-foreground">@{data.username}</p>
                        </div>
                      </div>
                      
                      {data.followerCount && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{data.followerCount.toLocaleString()} followers</span>
                          </div>
                        </div>
                      )}
                      
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-200">
                        Connected
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Platforms */}
        <Card>
          <CardHeader>
            <CardTitle>Connect Social Media Accounts</CardTitle>
            <CardDescription>
              Choose a platform to connect and start tracking your content performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(platformInfo).map(([platform, info]) => {
                const Icon = info.icon;
                const isConnected = connectedAccounts[platform];
                
                return (
                  <div
                    key={platform}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isConnected 
                        ? `${info.borderColor} ${info.bgColor} opacity-50` 
                        : selectedPlatform === platform
                        ? `${info.borderColor} ${info.bgColor}`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => !isConnected && setSelectedPlatform(platform)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className={`h-6 w-6 ${info.color}`} />
                      <h3 className="font-semibold">{info.name}</h3>
                      {isConnected && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {info.description}
                    </p>
                    {!isConnected && (
                      <Button 
                        size="sm" 
                        variant={selectedPlatform === platform ? "default" : "outline"}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Integration Form */}
        {selectedPlatform && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-teal-600" />
                Connect {platformInfo[selectedPlatform as keyof typeof platformInfo]?.name}
              </CardTitle>
              <CardDescription>
                Enter your account details to enable automatic tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} value={selectedPlatform} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={`Your ${platformInfo[selectedPlatform as keyof typeof platformInfo]?.name} username (without @)`}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://instagram.com/yourusername"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="followerCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Follower Count (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Privacy Notice:</strong> We only collect public metrics (follower count, post views) 
                      to ensure fair payment calculations. Your personal data and private content remain secure.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={integrateSocialMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {integrateSocialMutation.isPending ? "Connecting..." : "Connect Account"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSelectedPlatform(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Tracking Information */}
        <Card>
          <CardHeader>
            <CardTitle>How Tracking Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">View Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic counting of video views and post impressions
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="font-semibold mb-1">Engagement</div>
                <p className="text-sm text-muted-foreground">
                  Likes, shares, comments contribute to performance metrics
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Growth Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor follower growth and audience expansion
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2"><strong>For Creators:</strong> Connected accounts help you track which clippers are performing best and driving the most engagement.</p>
              <p><strong>For Clippers:</strong> Integration ensures you get paid fairly based on actual view counts and engagement metrics from your content.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}