import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  Users, 
  DollarSign,
  TrendingUp,
  Instagram,
  Youtube,
  Globe,
  ArrowRight,
  Info
} from "lucide-react";

export function DashboardTypeExplanation() {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>You're viewing the Creator Metrics Dashboard.</strong> This tracks your personal social media, trading, and website performance. For platform-wide analytics, admins should use the Admin Revenue Dashboard.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creator Metrics Dashboard */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <TrendingUp className="h-5 w-5" />
              Creator Metrics Dashboard
            </CardTitle>
            <CardDescription className="text-blue-700">
              Track your personal performance across platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Instagram className="h-4 w-4 text-blue-600" />
                <span>Social Media Performance</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Trading Account Analytics</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-blue-600" />
                <span>Website Traffic & Conversions</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Youtube className="h-4 w-4 text-blue-600" />
                <span>Content Performance Tracking</span>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-xs text-blue-600 mb-3">
                  <strong>Current Status:</strong> No API connections configured
                </p>
                <Button size="sm" variant="outline" onClick={() => window.location.href = '/social-integration'}>
                  Connect Your Accounts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Analytics Dashboard */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <DollarSign className="h-5 w-5" />
              Admin Revenue Dashboard
            </CardTitle>
            <CardDescription className="text-green-700">
              Platform-wide revenue and user analytics (Admin Only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Monthly Revenue Trends</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-green-600" />
                <span>User Growth Analytics</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span>Platform Performance KPIs</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Revenue-User Correlation</span>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-xs text-green-600 mb-3">
                  <strong>Admin Access Required</strong>
                </p>
                <Button size="sm" onClick={() => window.location.href = '/admin/revenue'} className="bg-green-600 hover:bg-green-700">
                  Go to Admin Dashboard
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Differences</CardTitle>
          <CardDescription>Understanding the distinction between creator and admin dashboards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Creator Metrics Dashboard</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Individual creator performance</li>
                <li>• Social media follower growth</li>
                <li>• Trading account statistics</li>
                <li>• Website traffic and conversions</li>
                <li>• Personal campaign effectiveness</li>
                <li>• Content engagement rates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-900 mb-2">Admin Revenue Dashboard</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Platform-wide revenue tracking</li>
                <li>• User acquisition patterns</li>
                <li>• Monthly growth analytics</li>
                <li>• Revenue per user metrics</li>
                <li>• Creator type distribution</li>
                <li>• Platform performance KPIs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}