// Phase 7 Slice G — admin audit log viewer.
//
// Read-only table of every state-changing admin action with filters
// for actor, action verb, and target. Reads from
// GET /api/admin/audit-log (capped at 500 rows; default 100).
//
// Adversarial-grade in the sense that we don't allow edits — to
// remove a row you'd need direct DB access. Most queries are
// "what did $admin do today" or "who touched this campaign", so
// the filter set is tuned to those.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, RotateCw, FileText } from "lucide-react";

interface AuditRow {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_TONE: Record<string, string> = {
  "user.suspend": "bg-rose-50 text-rose-900 border-rose-200",
  "user.delete": "bg-rose-50 text-rose-900 border-rose-200",
  "user.activate": "bg-emerald-50 text-emerald-900 border-emerald-200",
  "user.deactivate": "bg-amber-50 text-amber-900 border-amber-200",
  "campaign.cancel": "bg-rose-50 text-rose-900 border-rose-200",
  "subscription.cancel": "bg-rose-50 text-rose-900 border-rose-200",
  "withdrawal.approve": "bg-emerald-50 text-emerald-900 border-emerald-200",
  "withdrawal.reject": "bg-rose-50 text-rose-900 border-rose-200",
  "guarantee.refund_marked": "bg-emerald-50 text-emerald-900 border-emerald-200",
  "credit.manual_post": "bg-blue-50 text-blue-900 border-blue-200",
};

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [targetIdFilter, setTargetIdFilter] = useState("");

  const queryString = new URLSearchParams();
  if (actionFilter) queryString.set("action", actionFilter);
  if (targetTypeFilter) queryString.set("targetType", targetTypeFilter);
  if (targetIdFilter) queryString.set("targetId", targetIdFilter);
  queryString.set("limit", "200");
  const queryUrl = `/api/admin/audit-log?${queryString.toString()}`;

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: AuditRow[] }>({
    queryKey: [queryUrl],
  });
  const rows = data?.rows ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-slate-700" />
            Admin audit log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every state-changing admin action is recorded here. Append-only — entries can't be edited or removed from the UI.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Leave blank to see everything (latest 200).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Action verb</Label>
              <Input
                placeholder="e.g. campaign.cancel"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value.trim())}
              />
            </div>
            <div>
              <Label className="text-xs">Target type</Label>
              <Input
                placeholder="user · campaign · subscription · …"
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value.trim())}
              />
            </div>
            <div>
              <Label className="text-xs">Target id</Label>
              <Input
                placeholder="exact uuid / username"
                value={targetIdFilter}
                onChange={(e) => setTargetIdFilter(e.target.value.trim())}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="w-full"
              >
                <RotateCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Entries{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({rows.length} shown)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">No audit entries</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {actionFilter || targetTypeFilter || targetIdFilter
                    ? "Try clearing the filters."
                    : "Once an admin takes a state-changing action, it'll appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="border rounded-md p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${ACTION_TONE[r.action] ?? "bg-slate-50 text-slate-900 border-slate-200"}`}
                        >
                          {r.action}
                        </Badge>
                        <span className="text-sm">
                          by{" "}
                          <span className="font-medium">@{r.actorUsername}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          → {r.targetType}
                          {r.targetId && (
                            <code className="ml-1 font-mono">{r.targetId.slice(0, 8)}…</code>
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {r.payload && (
                      <pre className="text-xs bg-slate-50 rounded p-2 overflow-x-auto text-slate-700">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    )}
                    {r.ipAddress && (
                      <div className="text-xs text-muted-foreground font-mono">
                        ip: {r.ipAddress}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
