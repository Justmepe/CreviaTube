import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Banknote,
  CreditCard,
  Wallet
} from "lucide-react";
import { useState } from "react";

export default function AdminPayouts() {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");

  const { data: payoutStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/payout-stats"],
  });

  const { data: payoutHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/admin/payout-history"],
  });

  const { data: withdrawalHistory, isLoading: withdrawalsLoading } = useQuery({
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
      <DashboardLayout title="Payout Management">
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

  return (
    <DashboardLayout title="Payout Management">
      <div className="space-y-6">
        {/* Payout Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total Paid Out</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">$28,450</div>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +12.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Pending Payouts</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">$3,250</div>
              <p className="text-xs text-blue-600">
                15 pending requests
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Platform Balance</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">$17,230</div>
              <p className="text-xs text-purple-600">
                Available for withdrawal
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Active Clippers</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">58</div>
              <p className="text-xs text-orange-600">
                Earning payouts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payout Management Tabs */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">Payout History</TabsTrigger>
            <TabsTrigger value="pending">Pending Payouts</TabsTrigger>
            <TabsTrigger value="withdrawals">Platform Withdrawals</TabsTrigger>
          </TabsList>

          {/* Payout History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Clipper Payout History</CardTitle>
                    <CardDescription>Complete history of all payouts made to clippers</CardDescription>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                    {[
                      { clipper: "clipper_mike", campaign: "Forex Trading Course", amount: 150, method: "Bank Transfer", date: "2024-07-30", status: "completed" },
                      { clipper: "social_sam", campaign: "Crypto Investment Guide", amount: 230, method: "PayPal", date: "2024-07-29", status: "completed" },
                      { clipper: "content_creator", campaign: "Trading Signals App", amount: 180, method: "M-Pesa", date: "2024-07-28", status: "completed" },
                      { clipper: "video_pro", campaign: "Social Media Marketing", amount: 120, method: "Bank Transfer", date: "2024-07-27", status: "completed" },
                      { clipper: "influencer_jane", campaign: "Business Mentorship", amount: 280, method: "PayPal", date: "2024-07-26", status: "completed" },
                      { clipper: "trader_clips", campaign: "MetaTrader Course", amount: 200, method: "Crypto", date: "2024-07-25", status: "completed" },
                    ].map((payout, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{payout.clipper}</TableCell>
                        <TableCell>{payout.campaign}</TableCell>
                        <TableCell>${payout.amount}</TableCell>
                        <TableCell>{payout.method}</TableCell>
                        <TableCell>{payout.date}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Payouts Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payout Requests</CardTitle>
                <CardDescription>Clipper payout requests awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clipper</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { clipper: "new_clipper", campaign: "AI Trading Bot", amount: 95, method: "Bank Transfer", date: "2024-07-30" },
                      { clipper: "growth_hacker", campaign: "Social Growth Course", amount: 140, method: "PayPal", date: "2024-07-30" },
                      { clipper: "tiktok_star", campaign: "Influencer Marketing", amount: 75, method: "M-Pesa", date: "2024-07-29" },
                    ].map((request, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{request.clipper}</TableCell>
                        <TableCell>{request.campaign}</TableCell>
                        <TableCell>${request.amount}</TableCell>
                        <TableCell>{request.method}</TableCell>
                        <TableCell>{request.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                      <div className="text-sm text-purple-700 font-medium">Available Balance</div>
                      <div className="text-2xl font-bold text-purple-900">$17,230.00</div>
                      <div className="text-xs text-purple-600">Platform revenue available for withdrawal</div>
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

              {/* Withdrawal History */}
              <Card>
                <CardHeader>
                  <CardTitle>Withdrawal History</CardTitle>
                  <CardDescription>Previous platform fund withdrawals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { amount: 5000, method: "Bank Transfer", date: "2024-07-25", status: "completed" },
                      { amount: 3500, method: "PayPal", date: "2024-07-18", status: "completed" },
                      { amount: 2800, method: "Stripe", date: "2024-07-10", status: "completed" },
                      { amount: 4200, method: "Bank Transfer", date: "2024-07-03", status: "completed" },
                    ].map((withdrawal, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium">${withdrawal.amount.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{withdrawal.method}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{withdrawal.date}</div>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {withdrawal.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}