import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, type HttpError } from "@/lib/queryClient";
import { useAuth } from "@/features/auth/hooks/use-auth";

/**
 * Sticky banner shown to logged-in users whose email isn't verified.
 * Self-dismisses for the rest of the session if user clicks X.
 * Provides "Resend" action — in dev we surface the verify URL inline so
 * testers don't need a real email provider configured.
 *
 * staleTime is Infinity on /api/user, so a user who verified in a
 * previous tab will still see the banner from a stale cache. We
 * refetch once on mount so the banner reflects the real DB state,
 * and we treat a 409 "already verified" from the resend endpoint as
 * a success — invalidate the cache, hide the banner.
 */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  // One-shot fresh fetch of /api/user when this banner mounts. Costs
  // one HTTP call per session start; saves the user from staring at
  // a "you're not verified" banner when they actually are.
  useEffect(() => {
    if (!user || (user as any).emailVerified) return;
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resend = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/resend-verification", {});
      return res.json() as Promise<{ success: true; devVerifyUrl?: string }>;
    },
    onSuccess: (data) => {
      toast({ title: "Verification email sent", description: "Check your inbox." });
      if (data.devVerifyUrl) setDevUrl(data.devVerifyUrl);
    },
    onError: (err: HttpError | Error) => {
      // Special case: 409 means the backend already has us as
      // verified — refresh the user query so the banner disappears
      // and tell the user it's fine.
      if ("status" in err && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "You're already verified",
          description: "Refreshing your account state…",
        });
        return;
      }
      toast({
        title: "Couldn't send",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  if (!user || (user as any).emailVerified || dismissed) return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200 flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 text-amber-900">
        <Mail className="h-4 w-4 shrink-0" />
        <AlertDescription className="text-sm">
          Verify your email to fully activate your account.
          {devUrl && (
            <>
              {" "}
              <a className="underline font-mono text-xs" href={devUrl}>
                dev verify link
              </a>
            </>
          )}
        </AlertDescription>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending}>
          {resend.isPending ? "Sending…" : "Resend email"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
