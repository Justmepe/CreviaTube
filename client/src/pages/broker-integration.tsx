import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";

const brokerSchema = z.object({
  name: z.string().min(1, "Broker name is required"),
  platform: z.enum(["mt4", "mt5", "proprietary"], {
    required_error: "Please select a platform",
  }),
  apiKey: z.string().min(1, "API key is required"),
  accountId: z.string().min(1, "Account ID is required"),
  serverUrl: z.string().url("Valid server URL required").optional().or(z.literal("")),
});

type BrokerFormData = z.infer<typeof brokerSchema>;

interface TradingAccount {
  id: string;
  name: string;
  platform: string;
  accountId: string;
  isConnected: boolean;
  lastSync: string;
  metrics?: {
    accountBalance?: number;
    totalTrades?: number;
    profitLoss?: number;
    winRate?: number;
  };
}

interface AffiliateData {
  totalClicks: number;
  totalSignups: number;
  totalDeposits: number;
  totalEarnings: number;
  breakdown: Record<string, {
    clicks: number;
    signups: number;
    deposits: number;
    earnings: number;
  }>;
  recentActivity: Array<{
    date: string;
    type: string;
    broker: string;
    amount: number;
  }>;
}

const AffiliatePerformanceWidget = () => {
  const { data: affiliateData, isLoading } = useQuery<AffiliateData>({
    queryKey: ["/api/affiliate/performance"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No affiliate data available
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{affiliateData.totalClicks}</div>
          <div className="text-sm text-blue-700 font-medium">Referral Clicks</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{affiliateData.totalSignups}</div>
          <div className="text-sm text-green-700 font-medium">Signups</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{affiliateData.totalDeposits}</div>
          <div className="text-sm text-purple-700 font-medium">Deposits</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(affiliateData.totalEarnings)}</div>
          <div className="text-sm text-orange-700 font-medium">Total Earned</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Broker Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(affiliateData.breakdown).map(([broker, data]) => (
                <div key={broker} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium capitalize">{broker}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.clicks} clicks • {data.signups} signups • {data.deposits} deposits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(data.earnings)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {affiliateData.recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium capitalize">{activity.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.broker} • {new Date(activity.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-semibold text-green-600">
                    +{formatCurrency(activity.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface BrokerProgram {
  id: string;
  name: string;
  signupBonus: number;
  depositBonus: number;
  volumeRate: number;
  description: string;
  affiliateLink: string;
  trackingCode: string;
  isActive: boolean;
  region: string;
  category: string;
}

const BrokerAffiliateList = () => {
  const { toast } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  const { data: brokerPrograms, isLoading } = useQuery<BrokerProgram[]>({
    queryKey: ["/api/affiliate/brokers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Broker Partners</h3>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get unique regions and categories for filters
  const regions = ["All", ...Array.from(new Set(brokerPrograms?.map(b => b.region) || []))];
  const categories = ["All", ...Array.from(new Set(brokerPrograms?.map(b => b.category) || []))];

  // Filter brokers based on selected region and category
  const filteredBrokers = brokerPrograms?.filter(broker => {
    const regionMatch = selectedRegion === "All" || broker.region === selectedRegion;
    const categoryMatch = selectedCategory === "All" || broker.category === selectedCategory;
    return regionMatch && categoryMatch;
  }) || [];

  // Group brokers by region for better organization
  const brokersByRegion = filteredBrokers.reduce((acc, broker) => {
    if (!acc[broker.region]) acc[broker.region] = [];
    acc[broker.region].push(broker);
    return acc;
  }, {} as Record<string, BrokerProgram[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <h3 className="text-lg font-semibold">Available Broker Partners ({filteredBrokers.length})</h3>
        
        <div className="flex gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRegion === "All" ? (
        // Show grouped by region when "All" is selected
        Object.entries(brokersByRegion).map(([region, brokers]) => (
          <div key={region} className="space-y-3">
            <h4 className="text-md font-medium text-muted-foreground border-b pb-1">
              {region} ({brokers.length})
            </h4>
            <div className="grid gap-3">
              {brokers.map((broker) => (
                <BrokerCard key={broker.id} broker={broker} formatCurrency={formatCurrency} toast={toast} />
              ))}
            </div>
          </div>
        ))
      ) : (
        // Show flat list when specific region is selected
        <div className="grid gap-3">
          {filteredBrokers.map((broker) => (
            <BrokerCard key={broker.id} broker={broker} formatCurrency={formatCurrency} toast={toast} />
          ))}
        </div>
      )}

      {filteredBrokers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No brokers found for the selected filters
        </div>
      )}
    </div>
  );
};

const BrokerCard = ({ broker, formatCurrency, toast }: { 
  broker: BrokerProgram; 
  formatCurrency: (amount: number) => string;
  toast: any;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{broker.name}</h4>
            <Badge variant="outline" className="text-xs">
              {broker.category}
            </Badge>
            {broker.region === "Kenya" && broker.category === "CMA Licensed" && (
              <Badge className="text-xs bg-green-100 text-green-800">CMA Licensed</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{broker.description}</p>
          <div className="flex gap-4 text-sm">
            <span className="text-blue-600">Signup: {formatCurrency(broker.signupBonus)}</span>
            <span className="text-green-600">Deposit: {formatCurrency(broker.depositBonus)}</span>
            <span className="text-purple-600">Volume: {broker.volumeRate}%</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">{broker.trackingCode}</Badge>
            <span className="text-muted-foreground">• {broker.region}</span>
            {broker.isActive && <Badge className="bg-green-100 text-green-800">Active</Badge>}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(broker.affiliateLink);
              toast({
                title: "Affiliate link copied",
                description: `${broker.name} link ready to share`,
              });
            }}
          >
            Copy Link
          </Button>
          <Button size="sm" asChild>
            <a href={broker.affiliateLink} target="_blank" rel="noopener noreferrer">
              Visit {broker.name}
            </a>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SUPPORTED_BROKERS = [
  {
    name: "MetaTrader 4",
    platform: "mt4",
    description: "Connect your MT4 trading account",
    fields: ["apiKey", "accountId", "serverUrl"]
  },
  {
    name: "MetaTrader 5", 
    platform: "mt5",
    description: "Connect your MT5 trading account",
    fields: ["apiKey", "accountId", "serverUrl"]
  },
  {
    name: "OANDA",
    platform: "proprietary", 
    description: "Connect your OANDA trading account",
    fields: ["apiKey", "accountId"]
  },
  {
    name: "Alpaca",
    platform: "proprietary",
    description: "Connect your Alpaca trading account", 
    fields: ["apiKey", "accountId"]
  },
  {
    name: "Interactive Brokers",
    platform: "proprietary",
    description: "Connect your Interactive Brokers account",
    fields: ["apiKey", "accountId"]
  },
];

export default function BrokerIntegration() {
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<BrokerFormData>({
    resolver: zodResolver(brokerSchema),
    defaultValues: {
      name: "",
      platform: undefined,
      apiKey: "",
      accountId: "",
      serverUrl: "",
    },
  });

  const { data: tradingAccounts, isLoading } = useQuery<{ brokers: TradingAccount[] }>({
    queryKey: ["/api/user/trading-accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const addBrokerMutation = useMutation({
    mutationFn: async (data: BrokerFormData) => {
      const res = await apiRequest("POST", "/api/user/trading-accounts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/trading-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Broker connected successfully",
        description: "Your trading account has been connected and metrics will sync automatically.",
      });
      form.reset();
      setSelectedBroker(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeBrokerMutation = useMutation({
    mutationFn: async (brokerId: string) => {
      const res = await apiRequest("DELETE", `/api/user/trading-accounts/${brokerId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/trading-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Broker disconnected",
        description: "Trading account has been removed from your profile.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove broker",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (brokerId: string) => {
      const res = await apiRequest("POST", `/api/user/trading-accounts/${brokerId}/test`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/trading-accounts"] });
      }
    },
  });

  const onSubmit = (data: BrokerFormData) => {
    addBrokerMutation.mutate(data);
  };

  const toggleApiKeyVisibility = (accountId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Broker Integration">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Broker Integration">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Connect your trading accounts to automatically track performance and share results with your audience
          </p>
        </div>

        <Tabs defaultValue="connected" className="space-y-6">
          <TabsList>
            <TabsTrigger value="connected">Connected Accounts</TabsTrigger>
            <TabsTrigger value="affiliate">Affiliate Marketing</TabsTrigger>
            <TabsTrigger value="add-new">Add New Broker</TabsTrigger>
            <TabsTrigger value="supported">Supported Brokers</TabsTrigger>
          </TabsList>

          <TabsContent value="connected" className="space-y-6">
            {tradingAccounts?.brokers?.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No trading accounts connected</CardTitle>
                  <CardDescription>
                    Connect your first trading account to start tracking your performance automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setSelectedBroker("add-new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Trading Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {tradingAccounts?.brokers?.map((account) => (
                  <Card key={account.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {account.name}
                            {account.isConnected ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Disconnected
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            Platform: {account.platform.toUpperCase()} • Account: {account.accountId}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testConnectionMutation.mutate(account.id)}
                            disabled={testConnectionMutation.isPending}
                          >
                            <Activity className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBrokerMutation.mutate(account.id)}
                            disabled={removeBrokerMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Last synced: {new Date(account.lastSync).toLocaleString()}
                      </div>
                      
                      {account.metrics && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Account Balance</div>
                              <div className="text-lg font-semibold">
                                {formatCurrency(account.metrics.accountBalance || 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Total Trades</div>
                              <div className="text-lg font-semibold">{account.metrics.totalTrades || 0}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">P&L</div>
                              <div className={`text-lg font-semibold ${(account.metrics.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(account.metrics.profitLoss || 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Win Rate</div>
                              <div className="text-lg font-semibold">{(account.metrics.winRate || 0).toFixed(1)}%</div>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="affiliate" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Broker Affiliate Marketing
                  </CardTitle>
                  <CardDescription>
                    Promote broker platforms through affiliate links and earn commissions on referrals, signups, deposits, and trading volume
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Referral Signups</span>
                      </div>
                      <p className="text-sm text-blue-700">Earn $50-200 per new broker account signup through your affiliate link</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-900">Deposit Bonuses</span>
                      </div>
                      <p className="text-sm text-green-700">Get additional $100-500 when referred users make their first deposit</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-purple-900">Volume Commission</span>
                      </div>
                      <p className="text-sm text-purple-700">Earn 0.5-2% ongoing commission on all trading volume</p>
                    </div>
                  </div>

                  <Separator />

                  <BrokerAffiliateList />


                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How it works:</strong> Share your affiliate links with your audience. When someone clicks your link, signs up with the broker, deposits funds, and starts trading, you earn commissions at each step. All tracking is automatic through your unique referral codes.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Affiliate Performance Dashboard</CardTitle>
                  <CardDescription>Track your affiliate marketing results and earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <AffiliatePerformanceWidget />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="add-new" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Trading Account</CardTitle>
                <CardDescription>
                  Connect a new broker account to track your trading performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Broker Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., My OANDA Account" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mt4">MetaTrader 4</SelectItem>
                                <SelectItem value="mt5">MetaTrader 5</SelectItem>
                                <SelectItem value="proprietary">Proprietary Platform</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showApiKey.new ? "text" : "password"}
                                  placeholder="Enter your API key"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => toggleApiKeyVisibility("new")}
                                >
                                  {showApiKey.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Your trading account ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("platform") === "mt4" || form.watch("platform") === "mt5" ? (
                      <FormField
                        control={form.control}
                        name="serverUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-broker-server.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your API credentials are encrypted and stored securely. They are only used to fetch trading metrics for your dashboard.
                      </AlertDescription>
                    </Alert>

                    <Button
                      type="submit"
                      disabled={addBrokerMutation.isPending}
                      className="w-full"
                    >
                      {addBrokerMutation.isPending ? "Connecting..." : "Connect Broker Account"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supported" className="space-y-6">
            <div className="grid gap-4">
              {SUPPORTED_BROKERS.map((broker) => (
                <Card key={broker.name}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{broker.name}</CardTitle>
                        <CardDescription>{broker.description}</CardDescription>
                      </div>
                      <Badge variant="outline">Supported</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Required fields:</div>
                      <div className="flex flex-wrap gap-2">
                        {broker.fields.map((field) => (
                          <Badge key={field} variant="secondary">
                            {field === "apiKey" ? "API Key" : 
                             field === "accountId" ? "Account ID" : 
                             field === "serverUrl" ? "Server URL" : field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}