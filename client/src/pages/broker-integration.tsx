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