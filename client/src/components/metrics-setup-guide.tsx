import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook,
  BarChart3,
  TrendingUp,
  Zap,
  Settings,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { SiTiktok, SiGoogleanalytics, SiHubspot } from "react-icons/si";

interface MetricsSetupGuideProps {
  accountType?: string;
}

export function MetricsSetupGuide({ accountType = "creator" }: MetricsSetupGuideProps) {
  const getRecommendedAPIs = () => {
    if (accountType === "influencer") {
      return [
        { name: "Instagram", icon: Instagram, priority: "high", description: "Track followers, likes, comments, and story engagement" },
        { name: "TikTok", icon: SiTiktok, priority: "high", description: "Monitor viral content performance and follower growth" },
        { name: "YouTube", icon: Youtube, priority: "high", description: "Track subscribers, views, and video performance" },
        { name: "Twitter/X", icon: Twitter, priority: "medium", description: "Monitor tweets, retweets, and follower engagement" },
      ];
    } else {
      return [
        { name: "Google Analytics", icon: SiGoogleanalytics, priority: "high", description: "Track website traffic, conversions, and user behavior" },
        { name: "HubSpot CRM", icon: SiHubspot, priority: "high", description: "Monitor leads, contacts, and sales pipeline" },
        { name: "Facebook Ads", icon: Facebook, priority: "medium", description: "Track advertising performance and audience insights" },
        { name: "Instagram Business", icon: Instagram, priority: "medium", description: "Monitor business profile performance and reach" },
      ];
    }
  };

  const recommendedAPIs = getRecommendedAPIs();

  return (
    <div className="space-y-6">
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          Your metrics dashboard is ready! Connect your accounts to start tracking real-time performance data automatically.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Setup Guide
          </CardTitle>
          <CardDescription>
            Connect your platforms to unlock powerful analytics and automated tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendedAPIs.map((api, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                    <api.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{api.name}</span>
                      <Badge variant={api.priority === "high" ? "default" : "secondary"}>
                        {api.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{api.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-gray-500">Not connected</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Automatic Metrics Work</CardTitle>
          <CardDescription>Once connected, CreviaTube automatically syncs your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-2">Real-time Sync</h4>
              <p className="text-sm text-gray-600">
                Data updates automatically every 2 hours during active campaigns
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold mb-2">Smart Analytics</h4>
              <p className="text-sm text-gray-600">
                Advanced metrics and performance insights calculated automatically
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-2">Growth Tracking</h4>
              <p className="text-sm text-gray-600">
                Track campaign impact on follower growth and engagement rates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>Follow these steps to connect your first platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold">Choose Your Platform</h4>
                <p className="text-sm text-gray-600">Start with your most important platform (recommended: Instagram for influencers, Google Analytics for entrepreneurs)</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold">Get API Credentials</h4>
                <p className="text-sm text-gray-600">Visit the platform's developer portal to create API keys or access tokens</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold">Add to CreviaTube</h4>
                <p className="text-sm text-gray-600">Go to Social Integration page and enter your API credentials securely</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                ✓
              </div>
              <div>
                <h4 className="font-semibold">Automatic Tracking Starts</h4>
                <p className="text-sm text-gray-600">Your metrics dashboard will update automatically with real data within 2 hours</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3">
            <Button onClick={() => window.location.href = '/social-integration'} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Connect Platforms
            </Button>
            <Button variant="outline" onClick={() => window.open('https://developers.facebook.com/docs/instagram-basic-display-api/', '_blank')} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              API Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}