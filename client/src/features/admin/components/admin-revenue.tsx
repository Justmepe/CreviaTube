import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Wallet,
  PieChart,
} from "lucide-react";

// Phase 7 follow-up — page was pure mock (hardcoded forex_queen,
// crypto_master, etc., made-up revenue projections, fake monthly
// growth rates). Now binds to real /api/admin/revenue-stats and
// /api/admin/revenue-transactions data. Sections we genuinely don't
// have data for yet (month-over-month trends, projections, exportable
// reports) show honest empty states instead of fake numbers.

interface RevenueSources {
  campaignFees: number;
  subscriptions: number;
  apiAccess: number;
  transactions: number;
}

interface RevenueStats {
  totalRevenue: number;
  monthlyRecurring: number;
  platformFees: number;
  averageCampaignValue: number;
  campaignCount: number;
  sources: RevenueSources;
}

interface RevenueTransaction {
  id: string;
  type: string;
  user: string;
  amount: number;
  date: string | null;
  source: string;
  txHash: string | null;
}

export default function AdminRevenue() {
  const { data: revenueStats, isLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/admin/revenue-stats"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<
    RevenueTransaction[]
  >({
    queryKey: ["/api/admin/revenue-transactions"],
  });

  const fmtCurrency = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n)
      ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : "$0";

  if (isLoading) {
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

  const sources = revenueStats?.sources;
  const txs = transactions ?? [];

  // Top revenue contributors — compute from real transactions instead
  // of the previous hardcoded list. Sum per username.
  const contributorMap = new Map<
    string,
    { user: string; amount: number; count: number }
  >();
  for (const t of txs) {
    if (!t.user) continue;
    const existing = contributorMap.get(t.user);
    if (existing) {
      existing.amount += t.amount;
      existing.count += 1;
    } else {
      contributorMap.set(t.user, { user: t.user, amount: t.amount, count: 1 });
    }
  }
  const topContributors = Array.from(contributorMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Revenue source bar widths — compute proportional widths from the
  // real source totals so the bars don't lie about distribution.
  const sourceTotal =
    (sources?.campaignFees ?? 0) +
    (sources?.subscriptions ?? 0) +
    (sources?.apiAccess ?? 0) +
    (sources?.transactions ?? 0);
  const pct = (n: number) =>
    sourceTotal === 0 ? 0 : Math.round((n / sourceTotal) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform revenue
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Real-time revenue from campaign platform fees and Premium
            subscriptions.
          </p>
        </div>

        {/* Revenue Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                Total platform revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {fmtCurrency(revenueStats?.totalRevenue)}
              </div>
              <p className="text-xs text-green-700">All-time, USDC on Base</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">
                Avg monthly recurring
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {fmtCurrency(revenueStats?.monthlyRecurring)}
              </div>
              <p className="text-xs text-blue-700">6-month rolling average</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">
                Platform fees collected
              </CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {fmtCurrency(revenueStats?.platformFees)}
              </div>
              <p className="text-xs text-purple-700">20% take rate on funded campaigns</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">
                Avg campaign value
              </CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {fmtCurrency(revenueStats?.averageCampaignValue)}
              </div>
              <p className="text-xs text-orange-700">
                Across {revenueStats?.campaignCount ?? 0} funded campaign
                {revenueStats?.campaignCount === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Revenue overview</TabsTrigger>
            <TabsTrigger value="transactions">Recent transactions</TabsTrigger>
          </TabsList>

          {/* Revenue Overview Tab — real sources + real top contributors. */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Revenue sources
                  </CardTitle>
                  <CardDescription>Breakdown of platform income streams</CardDescription>
                </CardHeader>
                <CardContent>
                  {sourceTotal === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No revenue recorded yet. Fund your first campaign to see this populate.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <SourceBar
                        label="Campaign platform fees (20%)"
                        value={sources?.campaignFees ?? 0}
                        pct={pct(sources?.campaignFees ?? 0)}
                        color="bg-green-500"
                      />
                      <SourceBar
                        label="Premium subscriptions"
                        value={sources?.subscriptions ?? 0}
                        pct={pct(sources?.subscriptions ?? 0)}
                        color="bg-blue-500"
                      />
                      <SourceBar
                        label="API access"
                        value={sources?.apiAccess ?? 0}
                        pct={pct(sources?.apiAccess ?? 0)}
                        color="bg-purple-500"
                      />
                      <SourceBar
                        label="Transaction fees"
                        value={sources?.transactions ?? 0}
                        pct={pct(sources?.transactions ?? 0)}
                        color="bg-orange-500"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top revenue contributors
                  </CardTitle>
                  <CardDescription>
                    Highest-spending users across the last 50 transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topContributors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No paid transactions yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topContributors.map((c) => (
                        <div
                          key={c.user}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">@{c.user}</div>
                            <div className="text-sm text-gray-500">
                              {c.count} transaction{c.count === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="font-semibold text-green-700">
                            {fmtCurrency(c.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recent Transactions Tab — real data from payment_intents. */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent revenue transactions</CardTitle>
                <CardDescription>
                  Last 50 paid payment intents — both campaign fundings and
                  Premium subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Loading…
                  </p>
                ) : txs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No paid transactions yet. They'll appear here the moment a
                    campaign funds or a subscription is paid.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {txs.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                t.type === "Subscription"
                                  ? "bg-amber-50 text-amber-900 border-amber-200 text-xs"
                                  : "bg-blue-50 text-blue-900 border-blue-200 text-xs"
                              }
                            >
                              {t.type}
                            </Badge>
                            <span className="font-medium">@{t.user}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {t.source}
                            </span>
                          </div>
                          {t.txHash && (
                            <div className="text-xs text-muted-foreground font-mono mt-1">
                              {t.txHash.slice(0, 10)}…{t.txHash.slice(-8)}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-semibold text-green-700">
                            {fmtCurrency(t.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.date ?? "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function SourceBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-semibold">
          ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}
