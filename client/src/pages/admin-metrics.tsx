// Admin-only metrics dashboard. Reads from the /api/admin/metrics/*
// rollup endpoints. Funnel chart, signup time-series, persona mix table.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowDown, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type Summary = {
  days: number;
  byEvent: Record<string, number>;
  funnel: { event: string; count: number; conversionFromPrev: number | null }[];
};
type Timeseries = { event: string; days: number; data: { day: string; count: number }[] };
type PersonaMix = {
  days: number;
  data: { role: string; accountType: string; stage: string; country: string; count: number }[];
};

const EVENT_LABEL: Record<string, string> = {
  signup: "Sign up",
  email_verified: "Verified email",
  wallet_bound: "Bound wallet",
  campaign_created: "Created campaign",
  campaign_funded: "Funded campaign",
  campaign_goal_reached: "Goal reached",
  stage_promoted: "Stage promoted",
  application_submitted: "Application submitted",
  application_decision: "Application reviewed",
};

export default function AdminMetricsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [days, setDays] = useState(30);
  const [tsEvent, setTsEvent] = useState("signup");

  // Guard: redirect non-admins to home rather than showing a forbidden page.
  if (user && user.role !== "admin") {
    setLocation("/");
    return <div />;
  }

  const summary = useQuery<Summary>({
    queryKey: [`/api/admin/metrics/summary?days=${days}`],
    enabled: !!user && user.role === "admin",
  });

  const timeseries = useQuery<Timeseries>({
    queryKey: [`/api/admin/metrics/timeseries?days=${days}&event=${tsEvent}`],
    enabled: !!user && user.role === "admin",
  });

  const personaMix = useQuery<PersonaMix>({
    queryKey: [`/api/admin/metrics/persona-mix?days=${days}`],
    enabled: !!user && user.role === "admin",
  });

  return (
    <DashboardLayout title="Platform metrics">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">Admin</Badge>
              <span className="text-xs text-slate-500">Live from metric_events</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Platform metrics</h1>
            <p className="text-slate-600 mt-1">Signup funnel, time-series, persona mix.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin/credit-event")}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Manual credit
            </Button>
            <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded ${
                    days === d ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              Activation funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : !summary.data || summary.data.funnel.every((f) => f.count === 0) ? (
              <div className="text-sm text-slate-500">No events in the selected window yet.</div>
            ) : (
              <FunnelChart data={summary.data.funnel} />
            )}
          </CardContent>
        </Card>

        {/* Time series */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-3">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-700" />
                Daily {EVENT_LABEL[tsEvent] || tsEvent}
              </span>
              <select
                value={tsEvent}
                onChange={(e) => setTsEvent(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-white"
              >
                {Object.entries(EVENT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeseries.isLoading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : !timeseries.data || timeseries.data.data.length === 0 ? (
              <div className="text-sm text-slate-500">No data for this event in the window.</div>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={timeseries.data.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Persona mix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signup persona mix</CardTitle>
          </CardHeader>
          <CardContent>
            {personaMix.isLoading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : !personaMix.data || personaMix.data.data.length === 0 ? (
              <div className="text-sm text-slate-500">No signup events yet in the window.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-medium pb-2">Role</th>
                    <th className="text-left font-medium pb-2">Account</th>
                    <th className="text-left font-medium pb-2">Stage</th>
                    <th className="text-left font-medium pb-2">Country</th>
                    <th className="text-right font-medium pb-2">Signups</th>
                  </tr>
                </thead>
                <tbody>
                  {personaMix.data.data.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-2 capitalize">{row.role}</td>
                      <td className="py-2 capitalize">{row.accountType}</td>
                      <td className="py-2 text-slate-600">{row.stage.replace(/_/g, " ")}</td>
                      <td className="py-2 font-mono text-xs">{row.country}</td>
                      <td className="py-2 text-right font-semibold">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function FunnelChart({ data }: { data: Summary["funnel"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data.map((d) => ({ name: EVENT_LABEL[d.event] || d.event, count: d.count }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
        {data.map((d, i) => (
          <div key={d.event} className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
            <div className="text-xs text-slate-500 truncate">{EVENT_LABEL[d.event] || d.event}</div>
            <div className="text-lg font-bold mt-0.5">{d.count}</div>
            {d.conversionFromPrev !== null && i > 0 && (
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <ArrowDown className="w-3 h-3" />
                {d.conversionFromPrev}% from prev
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
