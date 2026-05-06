import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/password/request-reset", { email });
      return res.json() as Promise<{ success: true; message: string; devVerifyUrl?: string }>;
    },
    onSuccess: (data) => {
      if (data.devVerifyUrl) setDevUrl(data.devVerifyUrl);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Reset your password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.isSuccess ? (
            <>
              <Alert>
                <AlertDescription>
                  If an account exists for <strong>{email}</strong>, we've sent a
                  password reset link. Check your inbox.
                </AlertDescription>
              </Alert>
              {devUrl && (
                <Alert>
                  <AlertDescription>
                    <span className="text-xs">Dev mode link: </span>
                    <a className="text-xs font-mono text-blue-600 underline break-all" href={devUrl}>
                      {devUrl}
                    </a>
                  </AlertDescription>
                </Alert>
              )}
              <Button variant="outline" className="w-full" onClick={() => setLocation("/auth")}>
                Back to sign in
              </Button>
            </>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) request.mutate(email.trim().toLowerCase());
              }}
            >
              <p className="text-sm text-slate-600">
                Enter the email tied to your account and we'll send a reset link.
              </p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={request.isPending || !email.trim()}>
                {request.isPending ? "Sending…" : "Send reset link"}
              </Button>
              <Button variant="ghost" type="button" className="w-full" onClick={() => setLocation("/auth")}>
                Back to sign in
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
