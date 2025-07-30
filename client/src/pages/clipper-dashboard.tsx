import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Copy, ExternalLink, Wallet, Link as LinkIcon, TrendingUp, Eye, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClipperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: clipperCampaigns = [] } = useQuery({
    queryKey: ["/api/clipper-campaigns"],
    enabled: !!user && user.role === "clipper",
  });

  const { data: trackingEvents = [] } = useQuery({
    queryKey: ["/api/tracking-events"],
    enabled: !!user && user.role === "clipper",
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["/api/payouts"],
    enabled: !!user && user.role === "clipper",
  });

  const { data: earnings } = useQuery({
    queryKey: ["/api/analytics/clipper", user?.id],
    enabled: !!user && user.role === "clipper",
  });

  const navigation = [
    { name: "Dashboard", href: "/", icon: TrendingUp, current: true },
    { name: "Campaigns", href: "/campaigns", icon: LinkIcon },
    { name: "Earnings", href: "/earnings", icon: DollarSign },
    { name: "Payouts", href: "/payouts", icon: Wallet },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const getTrackingUrl = (trackingCode: string) => {
    return `${window.location.origin}/track/${trackingCode}`;
  };

  const recentEarnings = (trackingEvents as any[]).slice(0, 5).map((event: any) => ({
    id: event.id,
    date: new Date(event.createdAt).toLocaleDateString(),
    action: event.eventType === "signup" ? "New Signup" : 
            event.eventType === "view" ? "1K Views" :
            event.eventType === "deposit" ? "Deposit + Trade" : "Conversion",
    amount: `+KES ${parseFloat(event.rewardAmount || "0").toLocaleString()}`,
    status: event.status,
  }));

  return (
    <DashboardLayout navigation={navigation} user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clipper Dashboard</h1>
            <p className="text-gray-600">Track your performance and earnings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-primary-50 to-primary-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-primary-700">
                    KES {(earnings as any)?.total?.toLocaleString() || "0"}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-success-50 to-success-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success-600">Active Links</p>
                  <p className="text-2xl font-bold text-success-700">{(clipperCampaigns as any[]).length}</p>
                </div>
                <LinkIcon className="w-8 h-8 text-success-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-accent-50 to-accent-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent-600">Pending</p>
                  <p className="text-2xl font-bold text-accent-700">
                    KES {(earnings as any)?.pending?.toLocaleString() || "0"}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-accent-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tracking Links */}
        <Card>
          <CardHeader>
            <CardTitle>My Tracking Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(clipperCampaigns as any[]).map((cc: any) => (
              <div key={cc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Campaign: {cc.campaignId}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-600 font-mono bg-white px-2 py-1 rounded flex-1">
                      {getTrackingUrl(cc.trackingCode)}
                    </p>
                    <Badge variant={cc.isApproved ? "default" : "secondary"}>
                      {cc.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getTrackingUrl(cc.trackingCode))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getTrackingUrl(cc.trackingCode), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(clipperCampaigns as any[]).length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No campaigns joined yet</p>
                <Button>Browse Available Campaigns</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700">Date</th>
                      <th className="text-left p-3 font-medium text-gray-700">Action</th>
                      <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentEarnings.map((earning: any) => (
                      <tr key={earning.id}>
                        <td className="p-3 text-gray-900">{earning.date}</td>
                        <td className="p-3 text-gray-700">{earning.action}</td>
                        <td className="p-3 font-medium text-success-600">{earning.amount}</td>
                        <td className="p-3">
                          <Badge 
                            variant={earning.status === "paid" ? "default" : "secondary"}
                            className={
                              earning.status === "paid" ? "bg-primary-100 text-primary-800" :
                              earning.status === "verified" ? "bg-success-100 text-success-800" :
                              "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {earning.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {recentEarnings.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No earnings yet</p>
                    <p className="text-sm text-gray-400">Start promoting to earn rewards!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payout Section */}
          <Card>
            <CardHeader>
              <CardTitle>Payout Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-success-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-success-600">Available Balance</span>
                    <span className="text-lg font-semibold text-success-700">
                      KES {(earnings as any)?.pending?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <Button 
                    className="w-full bg-success-500 hover:bg-success-600"
                    disabled={!(earnings as any)?.pending || (earnings as any).pending < 100}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Request M-Pesa Payout
                  </Button>
                  {(!(earnings as any)?.pending || (earnings as any).pending < 100) && (
                    <p className="text-xs text-success-600 mt-2">
                      Minimum payout amount is KES 100
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Recent Payouts</h4>
                  {(payouts as any[]).slice(0, 3).map((payout: any) => (
                    <div key={payout.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">KES {parseFloat(payout.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={payout.status === "completed" ? "default" : "secondary"}>
                        {payout.status}
                      </Badge>
                    </div>
                  ))}

                  {(payouts as any[]).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No payouts yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
