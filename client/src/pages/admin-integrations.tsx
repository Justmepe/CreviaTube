// Admin-only — platform integrations / API credentials.
//
// Separate from /admin/config (which is for numeric levers like fee
// bps and seat caps) because credentials need different UX:
//   - reads are redacted (we never show the full key back)
//   - source attribution shows env vs db origin
//   - dedicated "Test" button that pings the real API once

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  KeyRound,
  Youtube,
  CheckCircle2,
  AlertTriangle,
  Save,
  Trash2,
  PlayCircle,
  ExternalLink,
} from "lucide-react";

interface IntegrationsState {
  youtube: {
    isSet: boolean;
    source: "env" | "db" | "none";
    hint: string;
    envSet: boolean;
    dbSet: boolean;
  };
}

interface TestResult {
  ok: boolean;
  message: string;
  hint?: string | null;
}

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draftKey, setDraftKey] = useState("");
  const [lastTest, setLastTest] = useState<TestResult | null>(null);

  const { data, isLoading } = useQuery<IntegrationsState>({
    queryKey: ["/api/admin/integrations"],
  });

  const saveMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("PUT", "/api/admin/integrations/youtube", {
        apiKey,
      });
      return (await res.json()) as { ok: boolean; cleared: boolean };
    },
    onSuccess: (resp) => {
      toast({
        title: resp.cleared ? "YouTube key cleared" : "YouTube key saved",
        description: resp.cleared
          ? "View-polling will skip YouTube clips until a key is set."
          : "Auto-tracking enabled for YouTube clips.",
      });
      setDraftKey("");
      setLastTest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't save",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const body = apiKey ? { apiKey } : {};
      const res = await apiRequest(
        "POST",
        "/api/admin/integrations/youtube/test",
        body,
      );
      return (await res.json()) as TestResult;
    },
    onSuccess: (resp) => {
      setLastTest(resp);
      toast({
        title: resp.ok ? "Key works" : "Key failed",
        description: resp.message,
        variant: resp.ok ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      setLastTest({ ok: false, message: err.message });
      toast({
        title: "Test failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const yt = data?.youtube;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-slate-700" />
            Platform integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            API credentials for view-tracking. Set once here and all
            clippers' clips get auto-tracked — no per-user setup needed.
          </p>
        </div>

        {/* ── YouTube ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-600" />
                <div>
                  <CardTitle className="text-base">YouTube Data API v3</CardTitle>
                  <CardDescription>
                    Auto-tracks public view counts on YouTube clip
                    submissions. Free tier handles thousands of clips per
                    day.
                  </CardDescription>
                </div>
              </div>
              {isLoading ? (
                <Badge variant="outline">Loading…</Badge>
              ) : yt?.isSet ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Not configured
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current status block */}
            {yt && (
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm space-y-1">
                {yt.isSet ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current key</span>
                      <span className="font-mono">{yt.hint}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span>
                        {yt.source === "env" ? (
                          <>
                            <Badge variant="outline">.env file</Badge>{" "}
                            <span className="text-xs text-muted-foreground">
                              (env overrides DB)
                            </span>
                          </>
                        ) : (
                          <Badge variant="outline">database</Badge>
                        )}
                      </span>
                    </div>
                    {yt.envSet && yt.dbSet && (
                      <p className="text-xs text-amber-700 mt-1">
                        Both env and DB are set — env wins. Clearing the
                        env var on the server would make the DB key active.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No key configured. View-polling will skip every YouTube clip submitted.
                  </p>
                )}
              </div>
            )}

            {/* Set / update */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {yt?.dbSet ? "Replace stored key" : "Paste API key"}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="password"
                  value={draftKey}
                  onChange={(e) => {
                    setDraftKey(e.target.value);
                    setLastTest(null);
                  }}
                  placeholder="AIzaSy…"
                  className="font-mono max-w-md"
                  data-testid="input-youtube-api-key"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!draftKey || testMutation.isPending}
                  onClick={() => testMutation.mutate(draftKey)}
                  data-testid="button-test-youtube-key-draft"
                >
                  <PlayCircle className="h-4 w-4 mr-1.5" />
                  {testMutation.isPending ? "Testing…" : "Test"}
                </Button>
                <Button
                  size="sm"
                  disabled={!draftKey || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(draftKey)}
                  data-testid="button-save-youtube-key"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The key is stored encrypted-at-rest in <code>platform_config</code> and
                never shown again after saving.
              </p>
            </div>

            {/* Test stored key + clear */}
            <div className="flex items-center gap-2 flex-wrap">
              {yt?.isSet && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testMutation.isPending}
                  onClick={() => testMutation.mutate("")}
                  data-testid="button-test-youtube-key-stored"
                >
                  <PlayCircle className="h-4 w-4 mr-1.5" />
                  Test current key
                </Button>
              )}
              {yt?.dbSet && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear the stored YouTube API key? Auto-tracking will stop until you set a new one.",
                      )
                    )
                      saveMutation.mutate("");
                  }}
                  data-testid="button-clear-youtube-key"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear stored key
                </Button>
              )}
            </div>

            {/* Test result inline */}
            {lastTest && (
              <Alert
                className={
                  lastTest.ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }
              >
                <AlertTitle
                  className={lastTest.ok ? "text-emerald-900" : "text-rose-900"}
                >
                  {lastTest.ok ? "Test passed" : "Test failed"}
                </AlertTitle>
                <AlertDescription
                  className={lastTest.ok ? "text-emerald-800" : "text-rose-800"}
                >
                  {lastTest.message}
                  {lastTest.hint && (
                    <div className="mt-1 text-xs">{lastTest.hint}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* How-to */}
            <details className="rounded-md border bg-white px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">
                How to get a YouTube API key (2 minutes, free)
              </summary>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-muted-foreground">
                <li>
                  Open{" "}
                  <a
                    href="https://console.cloud.google.com/projectcreate"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  and create a new project (name it "CreviaTube" or similar).
                </li>
                <li>
                  In the search bar, type "YouTube Data API v3" → click it →
                  click <strong>Enable</strong>.
                </li>
                <li>
                  Go to{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Credentials
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  → <strong>Create credentials</strong> → <strong>API key</strong>.
                </li>
                <li>
                  Copy the key (starts with <code>AIzaSy…</code>) and paste above.
                </li>
                <li>
                  Click <strong>Test</strong> first to verify, then{" "}
                  <strong>Save</strong>.
                </li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Free quota: 10,000 units/day. A single videos.list call costs 1
                unit and can batch up to 50 video IDs — comfortably handles tens
                of thousands of tracked clips on the free tier.
              </p>
            </details>
          </CardContent>
        </Card>

        {/* ── Future: TikTok / Instagram / X ──────────────────── */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              TikTok · Instagram · X (coming)
            </CardTitle>
            <CardDescription>
              TikTok and Instagram require per-clipper OAuth (their APIs only
              return view counts for the video owner). X requires a paid Basic
              plan. These will surface here once wired up.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
