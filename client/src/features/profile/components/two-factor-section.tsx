// Settings card: enable / disable Authenticator-app TOTP, and a one-click
// "send me a test code" path for email OTP. The login flow doesn't enforce
// 2FA yet (separate piece) — these primitives are usable today for
// sensitive-action gating, password resets, etc.

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, ShieldCheck, Mail, KeyRound } from "lucide-react";

export function TwoFactorSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const totpEnabled = (user as any)?.totpEnabled === true;

  // ---- TOTP setup state ----
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupOtpauthUri, setSetupOtpauthUri] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset the panel state when user toggles totp_enabled (e.g., after
  // disable, the setup flow should be ready to go again).
  useEffect(() => {
    if (totpEnabled) {
      setSetupOpen(false);
      setSetupSecret(null);
      setSetupOtpauthUri(null);
      setSetupCode("");
    }
  }, [totpEnabled]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/2fa/totp/setup-init", {});
      const data = await res.json();
      setSetupSecret(data.secret);
      setSetupOtpauthUri(data.otpauthUri);
      setSetupOpen(true);
    } catch (e: any) {
      toast({ title: "Couldn't start setup", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async () => {
    if (!setupCode || setupCode.length !== 6) {
      toast({ title: "6-digit code required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/2fa/totp/setup-verify", { code: setupCode });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Verification failed");
      }
      toast({ title: "Authenticator enabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (e: any) {
      toast({ title: "Couldn't enable", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!setupCode || setupCode.length !== 6) {
      toast({ title: "Enter a code from your app to confirm", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/2fa/totp/disable", { code: setupCode });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Disable failed");
      }
      setSetupCode("");
      toast({ title: "Authenticator disabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (e: any) {
      toast({ title: "Couldn't disable", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const sendEmailOtp = async () => {
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/2fa/email/request", { reason: "verification test" });
      if (!res.ok) throw new Error("Failed to send");
      toast({ title: "Code sent to your email", description: "Check your inbox; code is valid for 10 minutes." });
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-700" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          Add a second factor for sensitive actions. Authenticator app codes are stronger;
          email codes work as a fallback for everyone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* TOTP — Authenticator app */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm">Authenticator app (TOTP)</span>
              {totpEnabled ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Enabled
                </Badge>
              ) : (
                <Badge variant="outline">Not set up</Badge>
              )}
            </div>
            {!totpEnabled && !setupOpen && (
              <Button onClick={startSetup} disabled={busy} variant="default">
                Set up
              </Button>
            )}
          </div>

          {/* Setup flow */}
          {!totpEnabled && setupOpen && setupSecret && setupOtpauthUri && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-700">
                Scan the QR code with Google Authenticator, 1Password, Authy, or any
                TOTP app. Then enter the 6-digit code your app shows.
              </p>
              <div className="flex flex-col items-center bg-white rounded-md border border-slate-200 p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupOtpauthUri)}`}
                  alt="Authenticator setup QR code"
                  width={200}
                  height={200}
                />
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700">
                    Can't scan? Enter manually
                  </summary>
                  <code className="block mt-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 break-all">
                    {setupSecret}
                  </code>
                </details>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totp-setup-code" className="text-sm">Code from your app</Label>
                <Input
                  id="totp-setup-code"
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                  className="font-mono tracking-[0.4em] text-center"
                />
                <Button onClick={finishSetup} disabled={busy} className="w-full">
                  {busy ? "Verifying…" : "Enable"}
                </Button>
              </div>
            </div>
          )}

          {/* Disable flow */}
          {totpEnabled && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-700">
                To disable, enter a current code from your authenticator app. We
                require a fresh code so a session-cookie thief can't turn 2FA off.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                  className="font-mono tracking-[0.4em] text-center"
                />
                <Button onClick={disable} disabled={busy} variant="destructive">
                  Disable
                </Button>
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* Email OTP */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm">Email codes</span>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                Always available
              </Badge>
            </div>
            <Button onClick={sendEmailOtp} disabled={busy} variant="outline">
              Send test code
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            We send 6-digit codes to your registered email for password resets and
            sensitive actions. Valid for 10 minutes. Codes are single-use.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
