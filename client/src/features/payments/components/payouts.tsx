import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  CreditCard,
  Smartphone,
  Building,
  Plus,
  Eye,
  Filter
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  paymentMethod: string;
  paymentDetails: any;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  user: {
    username: string;
    fullName: string;
  };
  campaign?: {
    id: string;
    title: string;
  };
}

interface PayoutSummary {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  availableBalance: number;
  minimumPayout: number;
}

const payoutRequestSchema = z.object({
  amount: z.number().min(10, "Minimum payout is $10"),
  paymentMethod: z.enum([
    "mobile_money", 
    "bank_transfer", 
    "paypal", 
    "crypto", 
    "wise_transfer",
    "rapyd_bank",
    "rapyd_card",
    "rapyd_cash"
  ]),
  paymentDetails: z.object({
    // Bank account details
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    swiftCode: z.string().optional(),
    bankCode: z.string().optional(),
    accountHolderName: z.string().optional(),
    
    // Card details
    cardNumber: z.string().optional(),
    cardHolderName: z.string().optional(),
    
    // Mobile money
    phoneNumber: z.string().optional(),
    
    // PayPal & Email
    email: z.string().email().optional(),
    
    // Crypto
    walletAddress: z.string().optional(),
    
    // Country & Currency
    country: z.string().optional(),
    currency: z.string().optional(),
    
    // Additional details
    recipientName: z.string().optional(),
    recipientAddress: z.string().optional(),
  }),
  notes: z.string().optional(),
});

type PayoutRequestData = z.infer<typeof payoutRequestSchema>;

export default function Payouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<Payout[]>({
    queryKey: ["/api/payouts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: summary } = useQuery<PayoutSummary>({
    queryKey: ["/api/payouts/summary"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const form = useForm<PayoutRequestData>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues: {
      amount: 50,
      paymentMethod: "mobile_money" as const,
      paymentDetails: {
        accountNumber: "",
        routingNumber: "",
        swiftCode: "",
        bankCode: "",
        accountHolderName: "",
        cardNumber: "",
        cardHolderName: "",
        phoneNumber: "",
        email: "",
        walletAddress: "",
        country: "",
        currency: "",
        recipientName: "",
        recipientAddress: "",
      },
      notes: "",
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (data: PayoutRequestData) => {
      const res = await apiRequest("POST", "/api/payouts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts/summary"] });
      toast({
        title: "Payout requested",
        description: "Your payout request has been submitted for processing.",
      });
      setShowRequestDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "processing": return <Clock className="h-4 w-4 animate-spin" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "failed": return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
      case "wise_transfer": 
      case "rapyd_bank": return <Building className="h-4 w-4" />;
      case "mobile_money": return <Smartphone className="h-4 w-4" />;
      case "paypal":
      case "rapyd_card": return <CreditCard className="h-4 w-4" />;
      case "crypto":
      case "rapyd_cash": return <DollarSign className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const paymentMethods = [
    { value: "mobile_money", label: "Mobile Money (M-Pesa, Airtel)", icon: <Smartphone className="h-4 w-4" /> },
    { value: "bank_transfer", label: "Local Bank Transfer", icon: <Building className="h-4 w-4" /> },
    { value: "wise_transfer", label: "International Bank Transfer (Wise)", icon: <Building className="h-4 w-4" /> },
    { value: "paypal", label: "PayPal", icon: <CreditCard className="h-4 w-4" /> },
    { value: "rapyd_bank", label: "Global Bank Transfer (Rapyd)", icon: <Building className="h-4 w-4" /> },
    { value: "rapyd_card", label: "Global Card Transfer (Rapyd)", icon: <CreditCard className="h-4 w-4" /> },
    { value: "rapyd_cash", label: "Cash Pickup (Rapyd)", icon: <DollarSign className="h-4 w-4" /> },
    { value: "crypto", label: "Cryptocurrency", icon: <DollarSign className="h-4 w-4" /> },
  ];

  const filteredPayouts = payouts.filter(payout => 
    selectedStatus === "all" || payout.status === selectedStatus
  );

  const canRequestPayout = summary && summary.availableBalance >= summary.minimumPayout;

  return (
    <DashboardLayout title="Payouts">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Manage your earnings and request payouts from your affiliate commissions
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.availableBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Min. payout: {formatCurrency(summary.minimumPayout)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summary.pendingPayouts)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Being processed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.completedPayouts)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully paid
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Request Payout Section */}
        {user?.role === "clipper" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Request Payout
              </CardTitle>
              <CardDescription>
                Request a payout when you reach the minimum threshold
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  {summary && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Available Balance</span>
                        <span className="font-semibold">{formatCurrency(summary.availableBalance)}</span>
                      </div>
                      <Progress 
                        value={(summary.availableBalance / summary.minimumPayout) * 100} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground">
                        {summary.availableBalance >= summary.minimumPayout 
                          ? "You can request a payout!"
                          : `Need ${formatCurrency(summary.minimumPayout - summary.availableBalance)} more to request payout`
                        }
                      </p>
                    </div>
                  )}
                </div>
                <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      disabled={!canRequestPayout}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Payout</DialogTitle>
                      <DialogDescription>
                        Choose your payment method and amount to request a payout.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => requestPayoutMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="10"
                                  max={summary?.availableBalance || 0}
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {paymentMethods.map((method) => (
                                    <SelectItem key={method.value} value={method.value}>
                                      <div className="flex items-center gap-2">
                                        {method.icon}
                                        {method.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Dynamic payment details based on selected method */}
                        {form.watch("paymentMethod") === "bank_transfer" && (
                          <>
                            <FormField
                              control={form.control}
                              name="paymentDetails.accountNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="1234567890" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.routingNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Routing Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123456789" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.accountHolderName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Holder Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {form.watch("paymentMethod") === "wise_transfer" && (
                          <>
                            <FormField
                              control={form.control}
                              name="paymentDetails.accountNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="International account number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.bankCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bank Code / SWIFT</FormLabel>
                                  <FormControl>
                                    <Input placeholder="ABCDUS33XXX" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.recipientName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Recipient Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Full legal name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.country"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country</FormLabel>
                                  <FormControl>
                                    <Input placeholder="US, UK, DE, etc." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.currency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Currency</FormLabel>
                                  <FormControl>
                                    <Input placeholder="USD, EUR, GBP, etc." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {form.watch("paymentMethod") === "rapyd_card" && (
                          <>
                            <FormField
                              control={form.control}
                              name="paymentDetails.cardNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Card Number (Last 4 digits)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="1234" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.cardHolderName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Card Holder Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Name on card" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.country"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Card issuing country" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {form.watch("paymentMethod") === "mobile_money" && (
                          <>
                            <FormField
                              control={form.control}
                              name="paymentDetails.phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+254712345678" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.recipientName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Recipient Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Account holder name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {form.watch("paymentMethod") === "paypal" && (
                          <FormField
                            control={form.control}
                            name="paymentDetails.email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PayPal Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="your@paypal.email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch("paymentMethod") === "crypto" && (
                          <>
                            <FormField
                              control={form.control}
                              name="paymentDetails.walletAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Wallet Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="0x..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDetails.currency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cryptocurrency</FormLabel>
                                  <FormControl>
                                    <Input placeholder="BTC, ETH, USDT, etc." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Any special instructions or notes..."
                                  className="min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex gap-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowRequestDialog(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={requestPayoutMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {requestPayoutMutation.isPending ? "Processing..." : "Submit Request"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payouts History */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>View all your payout requests and their status</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredPayouts.length > 0 ? (
              <Tabs defaultValue="list" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="grid">Card View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="list">
                  <div className="space-y-4">
                    {filteredPayouts.map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                            {getPaymentMethodIcon(payout.paymentMethod)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {formatCurrency(payout.amount, payout.currency)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payout.paymentMethod.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Requested: {new Date(payout.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {payout.processedAt && (
                              <div className="text-xs text-muted-foreground">
                                Processed: {new Date(payout.processedAt).toLocaleDateString()}
                              </div>
                            )}
                            {payout.campaign && (
                              <div className="text-xs text-blue-600">
                                Campaign: {payout.campaign.title}
                              </div>
                            )}
                          </div>
                          <Badge className={getStatusColor(payout.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(payout.status)}
                              {payout.status}
                            </div>
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="grid">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPayouts.map((payout) => (
                      <Card key={payout.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(payout.paymentMethod)}
                              <span className="font-medium">
                                {formatCurrency(payout.amount, payout.currency)}
                              </span>
                            </div>
                            <Badge className={getStatusColor(payout.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(payout.status)}
                                {payout.status}
                              </div>
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>Method: {payout.paymentMethod.replace('_', ' ').toUpperCase()}</div>
                            <div>Requested: {new Date(payout.createdAt).toLocaleDateString()}</div>
                            {payout.processedAt && (
                              <div>Processed: {new Date(payout.processedAt).toLocaleDateString()}</div>
                            )}
                            {payout.campaign && (
                              <div className="text-blue-600">Campaign: {payout.campaign.title}</div>
                            )}
                          </div>
                          {payout.notes && (
                            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                              <strong>Notes:</strong> {payout.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payouts found</h3>
                <p className="text-muted-foreground">
                  {selectedStatus === "all" 
                    ? "You haven't requested any payouts yet."
                    : `No payouts with status "${selectedStatus}".`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}