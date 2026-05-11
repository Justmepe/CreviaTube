// Phase 6 Slice C — Founding Creator page.
//
// Grand Slam Offer structure: concrete dream outcome up top, value
// stack with itemized perks + dollar amounts (so $15 reads against
// $350+ of value), 30-day on-chain guarantee block, founding seat
// counter as scarcity. Page replaces the legacy four-perk premium
// pitch.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, ShieldCheck, Zap, Sparkles, TrendingUp } from "lucide-react";
import { ConnectWalletButton } from "@/features/wallet/connect-wallet-button";
import { PaymentModal } from "@/features/payments/components/payment-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";

type Plan = { id: string; priceUsdc: string; durationDays: number };
type SubscriptionStatus = { tier: string | null; status: string; currentPeriodEnd?: string };
type FoundingSeats = {
  taken: number;
  total: number;
  currentPrice: number;
  isUserFounder: boolean;
};

// Itemized value stack — the dollar values are anchors, not promises.
// They reinforce that the offer is undervalued at $15. Order matters:
// the headline perk (Featured placement) goes first.
const VALUE_STACK = [
  {
    label: "Featured placement at the top of the clipper marketplace",
    valueUsd: 50,
    detail: "Your campaigns surface above non-Premium creators with a Featured pill.",
  },
  {
    label: "Advanced analytics dashboard",
    valueUsd: 30,
    detail: "Per-campaign breakouts, time-to-conversion, top-clipper-per-goal.",
  },
  {
    label: "Founding Creator badge on every campaign",
    valueUsd: 20,
    detail: "Crown next to your name on every clipper-facing view.",
  },
  {
    label: "24-hour priority support channel",
    valueUsd: 20,
    detail: "Direct line, response within 24 hours.",
  },
  {
    label: "Early access to new top-tier clippers (48h before public)",
    valueUsd: 30,
    detail: "Message new diamond / platinum clippers first.",
  },
  {
    label: "Free campaign brief review (one-time, manual)",
    valueUsd: 200,
    detail: "We read your first brief and suggest improvements before you fund.",
  },
];

const TOTAL_VALUE = VALUE_STACK.reduce((acc, item) => acc + item.valueUsd, 0);

export default function PremiumPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isConnected } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: plan } = useQuery<Plan>({ queryKey: ["/api/subscription/plan"] });
  const { data: sub } = useQuery<SubscriptionStatus>({ queryKey: ["/api/subscription/current"] });
  const { data: seats } = useQuery<FoundingSeats>({ queryKey: ["/api/founding-seats/status"] });

  const isActive = sub?.status === "active" && sub.tier === "premium";
  const isCreator = user?.role === "creator";
  const seatsLeft = seats ? seats.total - seats.taken : null;
  const isFoundingPriceLive = seatsLeft !== null && seatsLeft > 0;

  // Render a friendly soft-gate for clippers and admins — the page is
  // reachable by URL but the offer doesn't apply to them.
  if (!isCreator) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Founding Creator
              </CardTitle>
              <CardDescription>
                Currently available to creators. A clipper-specific Premium tier is in the works.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-10 space-y-8">
        {/* Hero — concrete dream outcome + scarcity counter */}
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge className="bg-amber-100 text-amber-900 border-amber-300">
              <Crown className="h-3.5 w-3.5 mr-1" />
              FOUNDING CREATOR
            </Badge>
            {seats && (
              <Badge variant="outline" className="bg-white">
                <span className="font-bold text-emerald-700">{seatsLeft}</span>
                <span className="text-slate-600 font-normal">&nbsp;of {seats.total} left</span>
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Get 3× more clipper applications on your next campaign.
          </h1>

          <p className="text-lg text-slate-700">
            {plan ? (
              <>
                <span className="font-bold text-2xl text-slate-900">${plan.priceUsdc}</span>
                /mo · USDC on Base ·{" "}
                {isFoundingPriceLive ? (
                  <span className="text-emerald-700 font-medium">
                    Locked for life — even after we raise to $29.
                  </span>
                ) : (
                  <span className="text-slate-600">All Founding seats taken.</span>
                )}
              </>
            ) : (
              "Loading…"
            )}
          </p>

          {isActive ? (
            <div className="rounded-md bg-white border border-emerald-200 p-3 text-sm text-emerald-900">
              <strong>You're in.</strong>{" "}
              {seats?.isUserFounder
                ? "Founding Creator — locked at $15/mo for life."
                : "Active Premium."}
              {sub?.currentPeriodEnd && (
                <> Renews on {new Date(sub.currentPeriodEnd).toLocaleDateString()}.</>
              )}
            </div>
          ) : !isConnected ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">Connect a wallet to claim your seat.</p>
              <ConnectWalletButton />
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
              onClick={() => setModalOpen(true)}
              data-testid="button-claim-founding-seat"
            >
              <Crown className="h-4 w-4 mr-2" />
              Claim my Founding seat
            </Button>
          )}
        </div>

        {/* Value stack — $350 of value for $15 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">What you get</CardTitle>
            <CardDescription>
              Itemized value of every perk in the offer. Real prices for the real work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {VALUE_STACK.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0"
              >
                <div className="flex items-start gap-2 flex-1">
                  <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-slate-600">{item.detail}</div>
                  </div>
                </div>
                <div className="text-sm font-mono text-slate-500 shrink-0">
                  ${item.valueUsd}/mo
                </div>
              </div>
            ))}
            <div className="pt-3 flex items-center justify-between">
              <div className="font-bold">Total value</div>
              <div className="text-right">
                <div className="text-xl font-bold text-slate-900">${TOTAL_VALUE}+</div>
                <div className="text-xs text-slate-600">
                  Your price: <span className="font-bold text-amber-700">${plan?.priceUsdc ?? "…"}/mo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guarantee — risk reversal */}
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              The 30-day guarantee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-emerald-950">
            <p>
              If your campaigns don't get measurably more applications in your
              first 30 days, your USDC is refunded automatically — on-chain,
              back to the wallet you paid from.
            </p>
            <p className="text-emerald-800">
              No support tickets. No back-and-forth. You stay if it works,
              you walk if it doesn't.
            </p>
          </CardContent>
        </Card>

        {/* Why founding is limited */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Why Founding is limited to 50 seats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              We're capping it at 50 so we can personally onboard each Founder,
              learn what works, and ship perks that actually move money.
            </p>
            <p>
              Once we hit 50, the price moves to <strong>$29/mo</strong> — but you,
              locked in at <strong>${plan?.priceUsdc ?? "15"}/mo</strong> for life.
              Even renewals stay at the founding price.
            </p>
          </CardContent>
        </Card>

        <PaymentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          kind="subscription"
          description={
            plan
              ? `Claim your Founding seat for ${plan.priceUsdc} USDC, ${plan.durationDays} days.`
              : "Loading…"
          }
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/subscription/current"] });
            queryClient.invalidateQueries({ queryKey: ["/api/founding-seats/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/subscription/plan"] });
            setTimeout(() => setModalOpen(false), 1500);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
