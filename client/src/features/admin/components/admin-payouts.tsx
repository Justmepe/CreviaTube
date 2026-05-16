import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Users,
  Clock,
  Download,
  Banknote,
  CreditCard,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";

// Phase 7 follow-up — backend endpoints return real data (Slice C);
// this page used to ignore them and render hardcoded mocks. Now
// bound to the actual API shape.

interface PayoutStats {
  totalPaidOut: number;
  pendingPayouts: number;
  platformBalance: number;
  activeClippers: number;
  payoutsThisMonth: number;
  averagePayoutAmount: number;
}

interface PayoutHistoryRow {
  id: string;
  clipper: string;
  campaign: string;
  amount: number;
  method: string;
  date: string | null;
  status: string;
  verification: string;
}

interface WithdrawalRow {
  id: string;
  amount: string | number;
  paymentMethod?: string;
  method?: string;
  status: string;
  createdAt?: string;
  processedAt?: string | null;
}

export default function AdminPayouts() {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");

  const { data: payoutStats, isLoading: statsLoading } = useQuery<PayoutStats>({
    queryKey: ["/api/admin/payout-stats"],
  });

  const { data: payoutHistory, isLoading: historyLoading } = useQuery<PayoutHistoryRow[]>({
    queryKey: ["/api/admin/payout-history"],
  });

  const { data: withdrawalHistory } = useQuery<WithdrawalRow[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; method: string; description: string }) => {
      const res = await apiRequest("POST", "/api/admin/withdraw", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payout-stats"] });
      toast({
        title: "Withdrawal Initiated",
        description: "Withdrawal request has been processed successfully.",
      });
      setWithdrawAmount("");
      setWithdrawMethod("");
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Format helpers — keep zero showing as "$0" not "$NaN" when the
  // platform has no activity yet.
  const fmtCurrency = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n)
      ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : "$0";
  const fmtNumber = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "0";

  const stats = payoutStats;
  const history = payoutHistory ?? [];
  const withdrawals = withdrawalHistory ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payout management</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Real-time view of clipper payouts and platform treasury withdrawals.
          </p>
        </div>

        {/* Payout Overview Cards — bound to /api/admin/payout-stats. */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total paid out</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{fmtCurrency(stats?.totalPaidOut)}</div>
              <p className="text-xs text-green-700">
                {fmtNumber(stats?.payoutsThisMonth)} payout{stats?.payoutsThisMonth === 1 ? "" : "s"} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Average payout</CardTitle>
              <Zap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{fmtCurrency(stats?.averagePayoutAmount)}</div>
              <p className="text-xs text-blue-700">Across all completed payouts</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">In escrow</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{fmtCurrency(stats?.pendingPayouts)}</div>
              <p className="text-xs text-purple-700">Locked in active campaigns</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Active clippers</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{fmtNumber(stats?.activeClippers)}</div>
              <p className="text-xs text-orange-700">Clippers who have been paid at least once</p>
            </CardContent>
          </Card>
        </div>

        {/* Payout Management Tabs */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">Payout History</TabsTrigger>
            <TabsTrigger value="pending">Automatic Processing</TabsTrigger>
            <TabsTrigger value="withdrawals">Platform Withdrawals</TabsTrigger>
          </TabsList>

          {/* Payout History Tab — bound to /api/admin/payout-history. */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Clipper payout history</CardTitle>
                    <CardDescription>Last 50 payouts from the platform treasury</CardDescription>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2" disabled>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Loading payouts…
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-12 text-center">
                    <Zap className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm text-slate-700 font-medium">No payouts yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Once campaign goals are verified and clippers get paid in USDC, they'll appear here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clipper</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium">@{payout.clipper}</TableCell>
                          <TableCell>{payout.campaign}</TableCell>
                          <TableCell>{fmtCurrency(payout.amount)}</TableCell>
                          <TableCell>{payout.method}</TableCell>
                          <TableCell>{payout.date ?? "—"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <Zap className="h-3 w-3 mr-1" />
                                {payout.status}
                              </Badge>
                              {payout.verification && (
                                <div className="text-xs text-gray-600 font-mono">{payout.verification}</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automatic Processing Tab — explanatory only.
              We don't currently expose a "processing queue" endpoint
              because payouts auto-fire on goal completion (Phase 4)
              rather than queueing for human review. If we ever add
              a queueing layer, the table goes here. */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Automatic payout processing</CardTitle>
                <CardDescription>
                  System pays clippers in USDC the moment campaign goals verify.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">How payouts work</h4>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• A clipper applies, posts the URL, and the goal-verification stack runs against it</p>
                    <p>• When the campaign-completion check passes, the payout signer sends USDC from the treasury wallet directly to the clipper</p>
                    <p>• 80% of the campaign budget is reserved for clipper payouts; the platform fee (20%) settles on funding</p>
                    <p>• No manual approval, no human in the loop unless the guarantee triggers a refund</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Live payout-in-flight tracking is a planned admin tool — for now, see the Payout History tab for what's already shipped.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Withdrawal Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Withdraw Platform Funds
                  </CardTitle>
                  <CardDescription>Transfer platform earnings to your business account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-700 font-medium">Available balance</div>
                      <div className="text-2xl font-bold text-purple-900">{fmtCurrency(stats?.platformBalance)}</div>
                      <div className="text-xs text-purple-600">
                        Platform fee revenue, less withdrawals. Treasury-wallet integration is pending — see Phase 7 Slice H.
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="amount">Withdrawal Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="method">Withdrawal Method</Label>
                        <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select withdrawal method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="stripe">Stripe</SelectItem>
                            <SelectItem value="crypto">Cryptocurrency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => withdrawMutation.mutate({
                          amount: parseFloat(withdrawAmount),
                          method: withdrawMethod,
                          description: "Platform revenue withdrawal"
                        })}
                        disabled={!withdrawAmount || !withdrawMethod || withdrawMutation.isPending}
                      >
                        {withdrawMutation.isPending ? "Processing..." : "Initiate Withdrawal"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawal History — bound to /api/admin/withdrawals. */}
              <Card>
                <CardHeader>
                  <CardTitle>Withdrawal history</CardTitle>
                  <CardDescription>Previous platform-treasury withdrawals</CardDescription>
                </CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No platform withdrawals yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {withdrawals.map((w) => {
                        const amount = typeof w.amount === "string" ? parseFloat(w.amount) : w.amount;
                        const date = w.processedAt ?? w.createdAt;
                        return (
                          <div
                            key={w.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium">{fmtCurrency(amount)}</div>
                                <div className="text-sm text-gray-500">
                                  {w.paymentMethod ?? w.method ?? "—"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                {date ? new Date(date).toLocaleDateString() : "—"}
                              </div>
                              <Badge
                                variant="default"
                                className={
                                  w.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {w.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}