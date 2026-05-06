import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
  }, []);

  const reset = useMutation({
    mutationFn: async (args: { token: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/password/reset", args);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body as { success: true; message: string };
    },
  });

  if (!token) {
    return (
      <Centered>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" /> Missing token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              No reset token was provided. Request a new password reset link.
            </AlertDescription>
          </Alert>
          <Button className="w-full" onClick={() => setLocation("/forgot-password")}>
            Request a new link
          </Button>
        </CardContent>
      </Centered>
    );
  }

  if (reset.isSuccess) {
    return (
      <Centered>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" /> Password updated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-emerald-50 border-emerald-200">
            <AlertDescription className="text-emerald-900">
              Your password has been updated. Sign in with the new password.
            </AlertDescription>
          </Alert>
          <Button className="w-full" onClick={() => setLocation("/auth")}>
            Sign in
          </Button>
        </CardContent>
      </Centered>
    );
  }

  return (
    <Centered>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Choose a new password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setClientError(null);
            if (password.length < 8) {
              setClientError("Password must be at least 8 characters.");
              return;
            }
            if (password !== confirm) {
              setClientError("Passwords don't match.");
              return;
            }
            reset.mutate({ token, newPassword: password });
          }}
        >
          <Input
            type="password"
            placeholder="New password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {(clientError || reset.error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {clientError || (reset.error as Error)?.message || "Reset failed"}
              </AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            {reset.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}
