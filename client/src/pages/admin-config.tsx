// Phase 7 Slice H — runtime platform config editor.
//
// Edit the platform fee, Founding seat cap, and price tiers without
// a deploy. Backed by /api/admin/config (GET + PUT). Server-side
// validation enforces bounds (fee <= 50%, seat cap 1-10000, prices
// 0-10000 USDC). Each save writes an audit log entry tagged
// 'config.update'.

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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Save } from "lucide-react";

interface ConfigRow {
  key: string;
  value: string;
  description: string | null;
}

// Human-readable labels and helper text for known keys. Unknown keys
// still appear with their raw key as the label so admins can see
// custom values they added directly via SQL.
const KEY_META: Record<string, { label: string; help: string }> = {
  platform_fee_bps: {
    label: "Platform fee (basis points)",
    help: "Fee on every funded campaign. 2000 bps = 20%. Capped at 5000 (50%).",
  },
  founding_seats_total: {
    label: "Founding seats total",
    help: "Number of locked-price Founding Creator seats. Raising this opens more seats at the founding price.",
  },
  founding_price_usdc: {
    label: "Founding price (USDC)",
    help: "Locked price for Founding subscribers, for life.",
  },
  post_founding_price_usdc: {
    label: "Post-Founding price (USDC)",
    help: "Standard Premium price once the seat cap is reached.",
  },
};

export default function AdminConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ rows: ConfigRow[] }>({
    queryKey: ["/api/admin/config"],
  });

  const saveMutation = useMutation({
    mutationFn: async (args: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/admin/config/${args.key}`, {
        value: args.value,
      });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: "Saved",
        description: `${vars.key} → ${vars.value}`,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.key];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't save",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const rows = data?.rows ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-700" />
            Platform configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Runtime config — saves take effect immediately for this
            worker and within 60 seconds for other workers. Every
            change is recorded in the audit log.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading config…
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => {
            const meta = KEY_META[row.key];
            const draft = drafts[row.key];
            const isDirty = draft !== undefined && draft !== row.value;
            const currentValue = draft ?? row.value;
            return (
              <Card key={row.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {meta?.label ?? row.key}
                  </CardTitle>
                  <CardDescription>
                    {meta?.help ?? row.description ?? ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Input
                      value={currentValue}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.key]: e.target.value,
                        }))
                      }
                      className="font-mono max-w-[260px]"
                      data-testid={`input-config-${row.key}`}
                    />
                    <Button
                      size="sm"
                      disabled={!isDirty || saveMutation.isPending}
                      onClick={() =>
                        saveMutation.mutate({ key: row.key, value: currentValue })
                      }
                      data-testid={`button-save-${row.key}`}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    {isDirty && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDrafts((prev) => {
                            const next = { ...prev };
                            delete next[row.key];
                            return next;
                          })
                        }
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 font-mono">
                    key: {row.key}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
