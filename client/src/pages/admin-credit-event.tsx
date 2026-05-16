// Phase 4 — admin manual-credit page.
//
// Operations interface for POST /api/admin/credit-event. Used when the
// automatic verification stack can't cover a clipper's claim (X posts,
// declined-OAuth clippers, disputes). Every credit is audited via
// metric_events with the admin id, reason, and optional evidence URL.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ShieldAlert, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const EVENT_TYPES = [
  "view",
  "click",
  "signup",
  "lead",
  "purchase",
  "conversion",
  "subscribe",
  "install",
  "code_redemption",
  "follow",
] as const;
type EventType = (typeof EVENT_TYPES)[number];

interface CreditResponse {
  ok: true;
  eventId: string;
  eventType: EventType;
  eventValue: number;
  triggeredCompletion: boolean;
}

export default function AdminCreditEventPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [clipperCampaignId, setClipperCampaignId] = useState("");
  const [eventType, setEventType] = useState<EventType>("view");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [externalId, setExternalId] = useState("");
  const [lastResult, setLastResult] = useState<CreditResponse | null>(null);

  // Non-admins shouldn't be here — bounce them. The endpoint also 403s,
  // but redirecting at the page level is friendlier. Render an empty
  // shell while the redirect lands (returning null breaks the wouter
  // ProtectedRoute typing — Element-only).
  if (user && user.role !== "admin") {
    setLocation("/dashboard");
    return <DashboardLayout title="Manual credit"><div /></DashboardLayout>;
  }

  const isRevenue = eventType === "purchase";

  const creditMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        clipperCampaignId: clipperCampaignId.trim(),
        eventType,
        reason: reason.trim(),
      };
      const n = parseFloat(amount);
      if (isRevenue) body.value = n;
      else body.count = n;
      if (evidenceUrl.trim()) body.evidenceUrl = evidenceUrl.trim();
      if (externalId.trim()) body.externalId = externalId.trim();
      const res = await apiRequest("POST", "/api/admin/credit-event", body);
      return (await res.json()) as CreditResponse;
    },
    onSuccess: (data) => {
      setLastResult(data);
      toast({
        title: "Credit recorded",
        description: data.triggeredCompletion
          ? "Goal threshold reached — bonus payout was triggered."
          : `${data.eventType}: ${data.eventValue} credited.`,
      });
      // Clear amount/reason/evidence so the next credit starts fresh,
      // but keep clipperCampaignId + eventType in case ops is making
      // multiple credits for the same row.
      setAmount("");
      setReason("");
      setEvidenceUrl("");
      setExternalId("");
    },
    onError: (err: Error) => {
      toast({
        title: "Credit failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    clipperCampaignId.trim().length > 0 &&
    reason.trim().length > 0 &&
    amount.trim().length > 0 &&
    !creditMutation.isPending;

  return (
    // Title intentionally omitted — the inline h1 "Credit a manual
    // event" + descriptive paragraph is the richer header.
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Credit a manual event</h1>
          <p className="text-slate-600 mt-1 text-sm">
            For platforms / clippers we can't auto-verify (X posts, declined OAuth, disputes).
            Every credit is audited with your admin id, reason, and optional evidence URL.
          </p>
        </div>

        <Alert className="border-amber-300 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900 text-sm">
            <span className="font-medium">Use sparingly.</span> Manual credits flow through the
            same goal-completion pipeline as real events — crossing the campaign target releases
            the bonus payout immediately.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-700" />
              Credit details
            </CardTitle>
            <CardDescription>
              Find the clipper-campaign id from the campaign's recent-activity panel or the
              clipper's dashboard URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cc-id">Clipper-campaign id</Label>
              <Input
                id="cc-id"
                placeholder="UUID from /clipper/campaigns/:id"
                value={clipperCampaignId}
                onChange={(e) => setClipperCampaignId(e.target.value)}
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="event-type">Event type</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                  <SelectTrigger id="event-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">{isRevenue ? "Value (USDC)" : "Count"}</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step={isRevenue ? "0.01" : "1"}
                  placeholder={isRevenue ? "29.99" : "10000"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason (required)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., 'X post received 12,400 views per screenshot evidence' or 'TikTok OAuth declined; verified manually via creator-tools screenshot'"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Audited verbatim in <code>metric_events</code>. Be specific — future-you will
                thank you.
              </p>
            </div>

            <div>
              <Label htmlFor="evidence">Evidence URL (optional)</Label>
              <Input
                id="evidence"
                type="url"
                placeholder="https://… screenshot link"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="external">External id (optional)</Label>
              <Input
                id="external"
                placeholder="x_post_1234 — used to dedup re-fires"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setLocation("/admin/metrics")}>
                Cancel
              </Button>
              <Button onClick={() => creditMutation.mutate()} disabled={!canSubmit}>
                {creditMutation.isPending ? "Recording…" : "Record credit"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {lastResult && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-700" />
            <AlertDescription className="text-green-900 text-sm">
              <span className="font-medium">Credited.</span>{" "}
              Event id <code className="font-mono">{lastResult.eventId}</code> ·{" "}
              {lastResult.eventType}: {lastResult.eventValue}
              {lastResult.triggeredCompletion && (
                <> · <span className="font-medium">goal reached, bonus released</span></>
              )}
              .
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
