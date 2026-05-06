import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Stage = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<Stage>("verifying");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStage("error");
      setMessage("No verification token provided.");
      return;
    }

    (async () => {
      try {
        const res = await apiRequest("POST", "/api/email/verify", { token });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Verification failed");
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        setStage("success");
      } catch (e: any) {
        setStage("error");
        setMessage(e.message || "Something went wrong");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stage === "verifying" && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
            {stage === "success"   && <CheckCircle className="h-5 w-5 text-emerald-600" />}
            {stage === "error"     && <AlertTriangle className="h-5 w-5 text-red-600" />}
            <span>
              {stage === "verifying" && "Verifying your email…"}
              {stage === "success"   && "Email verified"}
              {stage === "error"     && "Verification failed"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === "success" && (
            <>
              <Alert className="bg-emerald-50 border-emerald-200">
                <AlertDescription className="text-emerald-900">
                  Your email is confirmed. You're all set.
                </AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => setLocation("/")}>
                Continue to dashboard
              </Button>
            </>
          )}
          {stage === "error" && (
            <>
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                Back to dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
