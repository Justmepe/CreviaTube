import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Activity,
  DollarSign,
  TrendingUp,
  Users,
  MousePointer,
  UserPlus,
  PiggyBank,
  Search,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";

const brokerLinkSchema = z.object({
  brokerName: z.string().min(1, "Broker name is required"),
  brokerType: z.enum([
    "forex", "crypto", "stocks", "futures", "options", "cfds"
  ], {
    required_error: "Please select broker type",
  }),
  affiliateLink: z.string().url("Valid affiliate link required"),
  description: z.string().optional(),
});

type BrokerLinkFormData = z.infer<typeof brokerLinkSchema>;

// Comprehensive broker database for autocomplete
const POPULAR_BROKERS = {
  forex: [
    "OANDA", "Interactive Brokers", "TD Ameritrade", "FXCM", "Pepperstone", 
    "IC Markets", "Forex.com", "XM", "Exness", "FP Markets", "Admiral Markets",
    "AvaTrade", "Plus500", "CMC Markets", "IG", "Saxo Bank", "HotForex",
    "FBS", "Tickmill", "XTB", "ThinkMarkets", "Axi", "Vantage FX", "LiteForex"
  ],
  crypto: [
    "Binance", "Coinbase Pro", "Kraken", "Bitfinex", "Bybit", "OKX", 
    "KuCoin", "Huobi", "Gate.io", "Crypto.com", "FTX", "Gemini", 
    "Bitstamp", "Bittrex", "Poloniex", "CoinEx", "Bitget", "MEXC",
    "BitMEX", "Deribit", "PrimeXBT", "eToro", "Phemex", "WazirX"
  ],
  stocks: [
    "Interactive Brokers", "TD Ameritrade", "E*TRADE", "Charles Schwab",
    "Robinhood", "Webull", "Fidelity", "M1 Finance", "Ally Invest",
    "Merrill Edge", "Vanguard", "Firstrade", "TradeStation", "Tastyworks",
    "SoFi Invest", "Public", "Stash", "Acorns", "WeBull", "Moomoo"
  ],
  futures: [
    "Interactive Brokers", "TD Ameritrade", "TradeStation", "NinjaTrader",
    "AMP Futures", "Optimus Futures", "Sierra Chart", "MultiCharts",
    "CQG", "R Trader", "Stage 5 Trading", "Advantage Futures", 
    "Cannon Trading", "Dorman Trading", "Infinity Futures", "PFGBest"
  ],
  options: [
    "Interactive Brokers", "TD Ameritrade", "Tastyworks", "E*TRADE",
    "Charles Schwab", "Robinhood", "Webull", "OptionHouse", "TradeKing",
    "OptionsXpress", "thinkorswim", "Power E*TRADE", "Fidelity Active Trader Pro"
  ],
  cfds: [
    "Plus500", "IG", "CMC Markets", "AvaTrade", "XTB", "Admiral Markets",
    "Pepperstone", "IC Markets", "ThinkMarkets", "FP Markets", "Axi",
    "XM", "HotForex", "FBS", "Exness", "LiteForex", "Tickmill", "Vantage FX"
  ]
};

interface PersonalizedBrokerLink {
  id: string;
  brokerName: string;
  brokerType: string;
  affiliateLink: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  trackingStats: {
    totalClicks: number;
    totalSignups: number;
    totalDeposits: number;
    conversionRate: number;
    revenue: number;
  };
}

export default function PersonalizedBrokerLinks() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<PersonalizedBrokerLink | null>(null);
  const [brokerSearchOpen, setBrokerSearchOpen] = useState(false);
  const [brokerSearchValue, setBrokerSearchValue] = useState("");

  const form = useForm<BrokerLinkFormData>({
    resolver: zodResolver(brokerLinkSchema),
    defaultValues: {
      brokerName: "",
      brokerType: "forex",
      affiliateLink: "",
      description: "",
    },
  });

  // Get filtered broker suggestions based on selected type and search input
  const filteredBrokers = useMemo(() => {
    const brokerType = form.watch("brokerType") as keyof typeof POPULAR_BROKERS;
    const brokers = POPULAR_BROKERS[brokerType] || [];
    
    if (!brokerSearchValue) return brokers;
    
    return brokers.filter((broker) =>
      broker.toLowerCase().includes(brokerSearchValue.toLowerCase())
    );
  }, [form.watch("brokerType"), brokerSearchValue]);

  const { data: brokerLinks = [], isLoading } = useQuery<PersonalizedBrokerLink[]>({
    queryKey: ["/api/broker-links/personal"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const addBrokerLinkMutation = useMutation({
    mutationFn: async (data: BrokerLinkFormData) => {
      const res = await apiRequest("POST", "/api/broker-links/personal", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker-links/personal"] });
      toast({
        title: "Success",
        description: "Broker link added successfully",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add broker link",
        variant: "destructive",
      });
    },
  });

  const deleteBrokerLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/broker-links/personal/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker-links/personal"] });
      toast({
        title: "Success",
        description: "Broker link deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete broker link",
        variant: "destructive",
      });
    },
  });

  const toggleBrokerLinkMutation = useMutation({
    mutationFn: async ({ linkId, isActive }: { linkId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/broker-links/personal/${linkId}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker-links/personal"] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
  };

  const getBrokerTypeColor = (type: string) => {
    switch (type) {
      case "forex": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "crypto": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "stocks": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "futures": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "options": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cfds": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Personalized Broker Links">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Personalized Broker Links">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your personalized broker affiliate links and track their performance
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Broker Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Broker Affiliate Link</DialogTitle>
                <DialogDescription>
                  Add your personalized broker affiliate link to track referrals and earnings.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => addBrokerLinkMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="brokerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broker Name</FormLabel>
                        <Popover open={brokerSearchOpen} onOpenChange={setBrokerSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={brokerSearchOpen}
                                className="w-full justify-between"
                              >
                                {field.value || "Search and select broker..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Type to search brokers..."
                                value={brokerSearchValue}
                                onValueChange={setBrokerSearchValue}
                              />
                              <CommandList>
                                <CommandEmpty>No broker found.</CommandEmpty>
                                <CommandGroup>
                                  {filteredBrokers.map((broker) => (
                                    <CommandItem
                                      key={broker}
                                      value={broker}
                                      onSelect={(currentValue) => {
                                        field.onChange(currentValue);
                                        setBrokerSearchOpen(false);
                                        setBrokerSearchValue("");
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === broker ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {broker}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="brokerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broker Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select broker type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="forex">Forex</SelectItem>
                            <SelectItem value="crypto">Cryptocurrency</SelectItem>
                            <SelectItem value="stocks">Stocks</SelectItem>
                            <SelectItem value="futures">Futures</SelectItem>
                            <SelectItem value="options">Options</SelectItem>
                            <SelectItem value="cfds">CFDs</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="affiliateLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Affiliate Link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://broker.com/signup?ref=your-code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description about this broker" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addBrokerLinkMutation.isPending}>
                      {addBrokerLinkMutation.isPending ? "Adding..." : "Add Link"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Links</p>
                  <p className="text-2xl font-bold">{brokerLinks.length}</p>
                </div>
                <ExternalLink className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">
                    {brokerLinks.reduce((sum, link) => sum + link.trackingStats.totalClicks, 0)}
                  </p>
                </div>
                <MousePointer className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Signups</p>
                  <p className="text-2xl font-bold">
                    {brokerLinks.reduce((sum, link) => sum + link.trackingStats.totalSignups, 0)}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(brokerLinks.reduce((sum, link) => sum + link.trackingStats.revenue, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Broker Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {brokerLinks.map((link) => (
            <Card key={link.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{link.brokerName}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getBrokerTypeColor(link.brokerType)}>
                      {link.brokerType.toUpperCase()}
                    </Badge>
                    <Badge variant={link.isActive ? "default" : "secondary"}>
                      {link.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                {link.description && (
                  <CardDescription className="line-clamp-2">
                    {link.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-blue-500" />
                    <span className="text-muted-foreground">Clicks:</span>
                    <span className="font-semibold">{link.trackingStats.totalClicks}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Signups:</span>
                    <span className="font-semibold">{link.trackingStats.totalSignups}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-purple-500" />
                    <span className="text-muted-foreground">Deposits:</span>
                    <span className="font-semibold">{link.trackingStats.totalDeposits}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-semibold">{formatCurrency(link.trackingStats.revenue)}</span>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-semibold">{link.trackingStats.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(link.affiliateLink)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(link.affiliateLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  
                  <Button 
                    size="sm"
                    variant={link.isActive ? "secondary" : "default"}
                    onClick={() => toggleBrokerLinkMutation.mutate({ 
                      linkId: link.id, 
                      isActive: !link.isActive 
                    })}
                  >
                    {link.isActive ? "Disable" : "Enable"}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteBrokerLinkMutation.mutate(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {brokerLinks.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Broker Links Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your personalized broker affiliate links to start tracking referrals and earnings.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Link
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}