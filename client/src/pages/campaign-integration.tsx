// Phase 4 — campaign integration setup page.
//
// Where the campaigner copies the auto-generated pixel id (with embed
// snippet) and postback secret, and where they paste connector creds
// for Shopify / Stripe / a Mobile Measurement Partner. Wired to
// GET/PUT /api/campaigns/:id/integration.
//
// We surface fields conditionally based on what the campaign's primary
// goal needs — a "views" campaign sees nothing here; a "revenue" campaign
// sees Shopify + Stripe; an "installs" campaign sees the MMP block.
// shared/goal-options.ts is the source of truth for that mapping.

import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  ShieldCheck,
  Code2,
  Webhook,
  Smartphone,
  ShoppingBag,
  CreditCard,
  Activity,
  Beaker,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { getGoalDefinition, type PrimaryGoal, type IntegrationField } from "../../../shared/goal-options";

interface Campaign {
  id: string;
  name: string;
  campaignGoals: { primaryGoal?: PrimaryGoal } | null;
}

interface IntegrationView {
  id: string;
  campaignId: string;
  pixelId: string | null;
  hasPostbackSecret: boolean;
  shopifyDomain: string | null;
  hasShopifyWebhookSecret: boolean;
  hasStripeWebhookSecret: boolean;
  mmpProvider: string | null;
  mmpAppId: string | null;
  hasMmpApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationResponse {
  integration: IntegrationView | null;
  generated?: { pixelId?: string; postbackSecret?: string };
}

const PIXEL_BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function CampaignIntegration() {
  const [, params] = useRoute("/campaigns/:id/integration");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // One-time-reveal state. The server returns plaintext secrets exactly
  // once (on first save / regeneration); we hold them in component state
  // until the user dismisses, then they're gone.
  const [revealedPixelId, setRevealedPixelId] = useState<string | null>(null);
  const [revealedPostbackSecret, setRevealedPostbackSecret] = useState<string | null>(null);

  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
  });

  const { data: integrationData, isLoading: integrationLoading } = useQuery<IntegrationResponse>({
    queryKey: ["/api/campaigns", id, "integration"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
  });

  const integration = integrationData?.integration ?? null;
  const primaryGoal = campaign?.campaignGoals?.primaryGoal;
  const goalDef = primaryGoal ? safeGetGoal(primaryGoal) : null;

  // Form state — only the fields the user can edit. Initialized from the
  // integration row when it loads.
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyWebhookSecret, setShopifyWebhookSecret] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [mmpProvider, setMmpProvider] = useState<string>("");
  const [mmpAppId, setMmpAppId] = useState("");
  const [mmpApiKey, setMmpApiKey] = useState("");
  // Track whether we've populated form state from the loaded integration
  // already, so subsequent re-renders don't overwrite user edits.
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && integration) {
    setShopifyDomain(integration.shopifyDomain ?? "");
    setMmpProvider(integration.mmpProvider ?? "");
    setMmpAppId(integration.mmpAppId ?? "");
    setHydrated(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (opts?: { regenerate?: "pixel" | "postback" }) => {
      const url =
        `/api/campaigns/${id}/integration` +
        (opts?.regenerate ? `?regenerate=${opts.regenerate}` : "");
      const body: Record<string, unknown> = {
        shopifyDomain: shopifyDomain || null,
        // Only send secrets when the user typed a new one — passing empty
        // string blanks the saved value, and we shouldn't overwrite a
        // previously-set secret with empty just because it's not in form
        // state.
        ...(shopifyWebhookSecret ? { shopifyWebhookSecret } : {}),
        ...(stripeWebhookSecret ? { stripeWebhookSecret } : {}),
        mmpProvider: mmpProvider || null,
        mmpAppId: mmpAppId || null,
        ...(mmpApiKey ? { mmpApiKey } : {}),
      };
      const res = await apiRequest("PUT", url, body);
      return (await res.json()) as IntegrationResponse;
    },
    onSuccess: (data) => {
      // One-time reveal of plaintext generated secrets.
      if (data.generated?.pixelId) setRevealedPixelId(data.generated.pixelId);
      if (data.generated?.postbackSecret) setRevealedPostbackSecret(data.generated.postbackSecret);
      // Clear the input so the user doesn't accidentally save the same
      // secret twice.
      setShopifyWebhookSecret("");
      setStripeWebhookSecret("");
      setMmpApiKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id, "integration"] });
      toast({ title: "Integration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  if (campaignLoading || integrationLoading || !id) {
    return (
      <DashboardLayout title="Campaign integration">
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout title="Campaign integration">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Campaign not found</h3>
              <Button onClick={() => setLocation("/campaigns")} className="mt-4">Back to Campaigns</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Decide which integration sections to render based on the primary goal's
  // requiredIntegrationFields. If the goal needs none (e.g., views, clicks),
  // we still show the page — the campaigner gets the pixel + postback as
  // optional general-purpose receivers.
  const required = new Set<IntegrationField>(goalDef?.requiredIntegrationFields ?? []);
  const showShopify = required.has("shopifyDomain") || required.has("shopifyWebhookSecret");
  const showStripe = required.has("stripeWebhookSecret");
  const showMMP =
    required.has("mmpProvider") || required.has("mmpAppId") || required.has("mmpApiKey");

  const pixelEmbed = (pixelId: string | null) =>
    pixelId
      ? `<img src="${PIXEL_BASE}/pixel/${pixelId}?clipper={CLIPPER_TRACKING_CODE}&event=signup" width="1" height="1" style="display:none" alt="" />`
      : "";

  return (
    <DashboardLayout title={`Integration · ${campaign.name}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connect your data</h1>
          <p className="text-slate-600 mt-1">
            How CreviaTube verifies clipper-driven{" "}
            <span className="font-medium">{goalDef?.label ?? primaryGoal ?? "results"}</span> back to your store/app.
          </p>
        </div>

        {/* Goal summary */}
        {goalDef && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <span className="font-medium">{goalDef.label}:</span> {goalDef.description}
            </AlertDescription>
          </Alert>
        )}

        {/* Conversion pixel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-700" />
              Conversion pixel
            </CardTitle>
            <CardDescription>
              Embed this on your thank-you page. Each clipper has a unique tracking code that gets
              substituted into <code>{`{CLIPPER_TRACKING_CODE}`}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!integration?.pixelId && !revealedPixelId && (
              <p className="text-sm text-slate-600">
                Click <span className="font-medium">Generate</span> to provision a pixel id for this campaign.
              </p>
            )}
            {(integration?.pixelId || revealedPixelId) && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-slate-500">Pixel id</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={(revealedPixelId || integration?.pixelId) ?? ""} className="font-mono text-xs" />
                    <CopyButton value={(revealedPixelId || integration?.pixelId) ?? ""} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-slate-500">Embed snippet</Label>
                  <div className="flex items-start gap-2 mt-1">
                    <pre className="flex-1 text-[11px] bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                      {pixelEmbed(revealedPixelId || integration?.pixelId || null)}
                    </pre>
                    <CopyButton value={pixelEmbed(revealedPixelId || integration?.pixelId || null)} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Replace <code>event=signup</code> with the event you fire (
                    <code>signup</code>, <code>lead</code>, <code>purchase</code>, <code>conversion</code>,{" "}
                    <code>subscribe</code>, <code>install</code>, <code>code_redemption</code>). For revenue events
                    add <code>&value=29.99</code>.
                  </p>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => saveMutation.mutate({ regenerate: "pixel" })}
                disabled={saveMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {integration?.pixelId ? "Regenerate pixel id" : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Postback secret */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-blue-700" />
              Server postback secret
            </CardTitle>
            <CardDescription>
              For backend-to-backend conversions. Your server signs the payload with HMAC-SHA256
              using this secret.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revealedPostbackSecret ? (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-700" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2 text-green-800">Copy this now — it won't be shown again.</p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={revealedPostbackSecret} className="font-mono text-xs" />
                    <CopyButton value={revealedPostbackSecret} />
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-slate-600">
                {integration?.hasPostbackSecret
                  ? "A postback secret is set. Click below to roll it (the old one stops working)."
                  : "Click below to generate one. We'll show it once — copy it then."}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate({ regenerate: "postback" })}
              disabled={saveMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {integration?.hasPostbackSecret ? "Roll postback secret" : "Generate"}
            </Button>

            {/* Once a secret exists, show the campaigner the URL + a
                signing example. Hidden until then to keep the empty
                state simple. */}
            {integration?.hasPostbackSecret && id && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-slate-500">
                    Postback URL
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${PIXEL_BASE}/api/postback/${id}`}
                      className="font-mono text-xs"
                    />
                    <CopyButton value={`${PIXEL_BASE}/api/postback/${id}`} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-slate-500">
                    Signing example (Node.js)
                  </Label>
                  <div className="flex items-start gap-2 mt-1">
                    <pre className="flex-1 text-[11px] bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
{`const crypto = require("crypto");
const t = Math.floor(Date.now() / 1000);
const body = JSON.stringify({
  event: "signup",          // signup | lead | purchase | conversion |
                             // subscribe | install | code_redemption
  clipper_code: trackingCode,
  external_id: uniqueEventId,
  value: 29.99,             // optional, $-amount for purchase
});
const sig = crypto
  .createHmac("sha256", POSTBACK_SECRET)
  .update(\`\${t}.\${body}\`)
  .digest("hex");

await fetch("${PIXEL_BASE}/api/postback/${id}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Postback-Signature": \`t=\${t},v1=\${sig}\`,
  },
  body,
});`}
                    </pre>
                    <CopyButton
                      value={`const crypto = require("crypto");
const t = Math.floor(Date.now() / 1000);
const body = JSON.stringify({
  event: "signup",
  clipper_code: trackingCode,
  external_id: uniqueEventId,
  value: 29.99,
});
const sig = crypto
  .createHmac("sha256", POSTBACK_SECRET)
  .update(\`\${t}.\${body}\`)
  .digest("hex");

await fetch("${PIXEL_BASE}/api/postback/${id}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Postback-Signature": \`t=\${t},v1=\${sig}\`,
  },
  body,
});`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Sign the timestamp + raw body, send the result as
                    <code className="mx-1">X-Postback-Signature: t=&lt;t&gt;,v1=&lt;sig&gt;</code>.
                    We reject signatures older than 5 minutes.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopify */}
        {showShopify && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-700" />
                Shopify
              </CardTitle>
              <CardDescription>
                Connect your store so we can verify orders against per-clipper promo codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shopify-domain">Shop domain</Label>
                <Input
                  id="shopify-domain"
                  placeholder="mystore.myshopify.com"
                  value={shopifyDomain}
                  onChange={(e) => setShopifyDomain(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="shopify-secret">Webhook signing secret</Label>
                <Input
                  id="shopify-secret"
                  type="password"
                  placeholder={integration?.hasShopifyWebhookSecret ? "•••••• (set — replace to roll)" : "shpss_…"}
                  value={shopifyWebhookSecret}
                  onChange={(e) => setShopifyWebhookSecret(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stripe */}
        {showStripe && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-700" />
                Stripe
              </CardTitle>
              <CardDescription>
                For revenue / subscription verification via Stripe webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="stripe-secret">Webhook signing secret</Label>
              <Input
                id="stripe-secret"
                type="password"
                placeholder={integration?.hasStripeWebhookSecret ? "•••••• (set — replace to roll)" : "whsec_…"}
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                className="mt-1"
              />
            </CardContent>
          </Card>
        )}

        {/* MMP */}
        {showMMP && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-700" />
                Mobile Measurement Partner
              </CardTitle>
              <CardDescription>
                Required for app-install attribution. Pick your provider below, then paste the
                postback URL into your MMP dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Provider</Label>
                <Select value={mmpProvider} onValueChange={setMmpProvider}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appsflyer">AppsFlyer</SelectItem>
                    <SelectItem value="adjust">Adjust</SelectItem>
                    <SelectItem value="firebase">Firebase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mmp-app-id">App id</Label>
                <Input
                  id="mmp-app-id"
                  placeholder="com.example.app"
                  value={mmpAppId}
                  onChange={(e) => setMmpAppId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mmp-key">API key</Label>
                <Input
                  id="mmp-key"
                  type="password"
                  placeholder={integration?.hasMmpApiKey ? "•••••• (set — replace to roll)" : "Generate any random string here; you'll paste the same value into your MMP postback URL as ?token="}
                  value={mmpApiKey}
                  onChange={(e) => setMmpApiKey(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  We use this as a shared secret to authenticate inbound postbacks. Make it long
                  and random — at least 32 characters.
                </p>
              </div>

              {/* Provider-specific postback URL template. We render once
                  the campaigner has picked a provider AND saved the API
                  key — until then there's nothing to paste yet. */}
              {mmpProvider && integration?.hasMmpApiKey && id && (
                <div>
                  <Label className="text-xs uppercase tracking-wider text-slate-500">
                    Postback URL template
                  </Label>
                  <div className="flex items-start gap-2 mt-1">
                    <pre className="flex-1 text-[11px] bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                      {mmpPostbackTemplate(mmpProvider, id)}
                    </pre>
                    <CopyButton value={mmpPostbackTemplate(mmpProvider, id)} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {mmpProviderHelp(mmpProvider)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Replace <code>YOUR_MMP_API_KEY</code> with the API key you saved above (we
                    don't echo it back here for safety).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Test wiring + recent activity. Always shown — useful for any
            goal type once events start flowing. */}
        <TestWiringCard campaignId={id!} />
        <RecentActivityCard campaignId={id!} />

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation(`/campaigns/${id}/funding`)}>
            ← Back to funding
          </Button>
          <Button onClick={() => saveMutation.mutate(undefined)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save integration"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Test-wiring card ───────────────────────────────────────────────────
// Sends a synthetic event tagged metadata.test=true. The backend filters
// these out of progress aggregation, so they don't move real metrics —
// they only show up in the Recent activity panel below.
const TEST_EVENT_TYPES = [
  "signup",
  "lead",
  "purchase",
  "conversion",
  "subscribe",
  "install",
  "code_redemption",
] as const;
type TestEventType = (typeof TEST_EVENT_TYPES)[number];

function TestWiringCard({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [eventType, setEventType] = useState<TestEventType>("signup");
  const [value, setValue] = useState<string>("");

  const testMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { eventType };
      if (value.trim()) {
        const n = parseFloat(value);
        if (Number.isFinite(n)) body.value = n;
      }
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/integration/test`, body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/campaigns", campaignId, "integration", "recent-events"],
      });
      toast({
        title: "Test event fired",
        description: "Check the Recent activity panel below to confirm it landed.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-blue-700" />
          Test wiring
        </CardTitle>
        <CardDescription>
          Fire a synthetic event to confirm the receivers are wired correctly. Test events show up
          in the Recent activity panel but don't count toward goal completion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="test-event-type">Event</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as TestEventType)}>
              <SelectTrigger id="test-event-type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="test-value">Value (optional)</Label>
            <Input
              id="test-value"
              type="number"
              step="0.01"
              placeholder={eventType === "purchase" ? "29.99" : "—"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <Button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="w-full"
            >
              {testMutation.isPending ? "Firing…" : "Send test event"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          The event is attributed to the first approved clipper on this campaign. Approve at least
          one application before testing.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Recent activity panel ─────────────────────────────────────────────
// Shows the last 20 tracking events for this campaign. Auto-refreshes
// every 5 seconds while the page is open so the campaigner can fire a
// real Shopify/Stripe/MMP event from their side and see it land here.
interface RecentEvent {
  id: string;
  clipperCampaignId: string;
  eventType: string;
  eventValue: string | null;
  status: string;
  flaggedAsBot: boolean | null;
  source: string | null;
  isTest: boolean;
  createdAt: string;
}

function RecentActivityCard({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useQuery<{ events: RecentEvent[] }>({
    queryKey: ["/api/campaigns", campaignId, "integration", "recent-events"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 5000,
  });

  const events = data?.events ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-700" />
          Recent activity
        </CardTitle>
        <CardDescription>
          Last 20 events received for this campaign. Auto-refreshes every 5 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing yet. Fire a test event above, or trigger one from your Shopify/Stripe/MMP setup.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <RecentEventRow key={ev.id} ev={ev} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventRow({ ev }: { ev: RecentEvent }) {
  const ts = new Date(ev.createdAt);
  const ago = formatTimeAgo(ts);
  const valueDisplay =
    ev.eventValue && Number(ev.eventValue) !== 1
      ? ev.eventType === "purchase"
        ? `$${Number(ev.eventValue).toFixed(2)}`
        : Number(ev.eventValue).toLocaleString()
      : null;

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md border border-slate-200 bg-white text-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Badge variant="outline" className="font-mono">
          {ev.eventType}
        </Badge>
        {valueDisplay && <span className="font-medium text-slate-700">{valueDisplay}</span>}
        <span className="text-xs text-slate-500 truncate">
          {ev.source ?? "unknown source"}
        </span>
        {ev.isTest && (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Beaker className="h-3 w-3 mr-1" />
            test
          </Badge>
        )}
        {ev.flaggedAsBot && (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Bot className="h-3 w-3 mr-1" />
            bot
          </Badge>
        )}
      </div>
      <div className="text-xs text-slate-500 whitespace-nowrap ml-4" title={ts.toISOString()}>
        {ago}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Avoid throwing when an unknown / legacy primaryGoal lands here. The
// catalog throws on lookup, but this page should still render with a
// best-effort display rather than crashing.
function safeGetGoal(id: string) {
  try {
    return getGoalDefinition(id as PrimaryGoal);
  } catch {
    return null;
  }
}

// Build the postback URL the campaigner pastes into their MMP dashboard.
// Each provider has its own macro syntax for "click id" / "event name" /
// "transaction id" — we keep the template parameter names identical
// (clipper_code, event, external_id, amount) and let the campaigner
// substitute provider macros into those slots.
function mmpPostbackTemplate(provider: string, campaignId: string): string {
  const base = `${PIXEL_BASE}/api/postback/mmp/${campaignId}`;
  switch (provider) {
    case "appsflyer":
      // AppsFlyer S2S postback macros: {click_id}, {event_name}, {event_uid}, {revenue}
      return (
        `${base}?token=YOUR_MMP_API_KEY` +
        `&provider=appsflyer` +
        `&event={event_name}` +
        `&clipper_code={click_id}` +
        `&external_id={event_uid}` +
        `&amount={revenue}`
      );
    case "adjust":
      // Adjust callback placeholders: {click_id}, {activity_kind}, {adid}, {revenue_float}
      return (
        `${base}?token=YOUR_MMP_API_KEY` +
        `&provider=adjust` +
        `&event={activity_kind}` +
        `&clipper_code={click_id}` +
        `&external_id={adid}` +
        `&amount={revenue_float}`
      );
    case "firebase":
      // Firebase doesn't ship S2S postbacks natively — campaigner uses a
      // Cloud Function relay. We document the params we expect; they map
      // GA4 event names client-side.
      return (
        `${base}?token=YOUR_MMP_API_KEY` +
        `&provider=firebase` +
        `&event=install` +
        `&clipper_code=YOUR_CLICK_ID` +
        `&external_id=YOUR_EVENT_ID` +
        `&amount=YOUR_REVENUE`
      );
    default:
      return `${base}?token=YOUR_MMP_API_KEY&event=install&clipper_code=…&external_id=…`;
  }
}

function mmpProviderHelp(provider: string): string {
  switch (provider) {
    case "appsflyer":
      return "AppsFlyer macros are auto-substituted ({click_id}, {event_name}, etc.). Point the campaigner-side click URL at our /track/{trackingCode} so {click_id} arrives populated.";
    case "adjust":
      return "Adjust callback placeholders ({click_id}, {activity_kind}, {adid}) auto-substitute. Set this as your global callback URL in the Adjust dashboard.";
    case "firebase":
      return "Firebase requires a Cloud Function or BigQuery export to call this URL — Firebase has no native S2S postbacks. Map your GA4 install / first_open event in the relay.";
    default:
      return "";
  }
}

function CopyButton({ value }: { value: string }) {
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast({ title: "Copied to clipboard" });
        } catch {
          toast({ title: "Copy failed", variant: "destructive" });
        }
      }}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}
