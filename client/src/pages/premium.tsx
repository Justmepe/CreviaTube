import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/features/dashboard/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check } from "lucide-react";
import { ConnectWalletButton } from "@/features/wallet/connect-wallet-button";
import { PaymentModal } from "@/features/payments/components/payment-modal";

type Plan = { id: string; priceUsdc: string; durationDays: number };
type SubscriptionStatus = { tier: string | null; status: string; currentPeriodEnd?: string };

export default function PremiumPage() {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: plan } = useQuery<Plan>({ queryKey: ["/api/subscription/plan"] });
  const { data: sub } = useQuery<SubscriptionStatus>({ queryKey: ["/api/subscription/current"] });

  const isActive = sub?.status === "active" && sub.tier === "premium";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Crown className="h-7 w-7 text-amber-500" />
            CreviaTube Premium
          </h1>
          <p className="text-muted-foreground">Pay in USDC on Base. No bank, no Stripe, just your wallet.</p>
        </div>

        <Card className="border-2 border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Premium</CardTitle>
              {isActive ? (
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            <CardDescription>
              {plan ? `${plan.priceUsdc} USDC for ${plan.durationDays} days` : "Loading plan…"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {[
                "Priority placement in clipper marketplace",
                "Advanced analytics on campaigns + payouts",
                "Lower platform fee on cold-outreach campaigns",
                "Premium badge on your profile",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{f}</li>
              ))}
            </ul>

            {isActive && sub?.currentPeriodEnd && (
              <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
                Active until <strong>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</strong>. Renew anytime — additional USDC payments stack on top.
              </div>
            )}

            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Connect a wallet to subscribe.</p>
                <ConnectWalletButton />
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => setModalOpen(true)}
              >
                {isActive ? "Renew (extend by 30 days)" : "Subscribe with USDC"}
              </Button>
            )}
          </CardContent>
        </Card>

        <PaymentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          kind="subscription"
          description={plan ? `Subscribe for ${plan.priceUsdc} USDC, ${plan.durationDays} days.` : "Loading…"}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/subscription/current"] });
            setTimeout(() => setModalOpen(false), 1500);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
