// Static cookie policy. Short and rarely changes, so we ship it as
// content in the component rather than going through the
// /api/pages/* admin pipeline that privacy/terms use. If we need to
// edit it in production without a deploy, migrating to that pipeline
// is a 30-min job.

import { Cookie, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LAST_UPDATED = "2026-05-11";

export default function CookiePolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setLocation("/")} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Cookie className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">Cookie Policy</h1>
          </div>
          <p className="text-slate-600 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8 prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed">
              This page explains what cookies and similar storage CreviaTube uses, why we use them,
              and how you can control them.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-3">What we use</h2>
            <ul className="space-y-3 text-slate-700">
              <li>
                <strong>Session cookies</strong> — required to keep you signed in. Cleared when
                you log out or close your browser session. Without these, the app can't function.
              </li>
              <li>
                <strong>CSRF protection cookies</strong> — protect against cross-site request
                forgery on form submissions. Strictly necessary.
              </li>
              <li>
                <strong>Wallet-connection state</strong> — the wallet kit we use (Reown / WalletConnect)
                stores a small amount of data in localStorage so you don't have to reconnect on
                every page load.
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-3">What we do NOT use</h2>
            <ul className="space-y-3 text-slate-700">
              <li>No third-party advertising cookies.</li>
              <li>No cross-site tracking pixels.</li>
              <li>No analytics that fingerprint you across the web.</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-3">Your controls</h2>
            <p className="text-slate-700 leading-relaxed">
              You can clear cookies and site data from your browser settings at any time. Doing so
              will sign you out of CreviaTube and disconnect any linked wallet, but no other
              functionality is affected. If your jurisdiction grants you specific data-protection
              rights (GDPR, CCPA, etc.), see our{" "}
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  setLocation("/privacy-policy");
                }}
              >
                Privacy Policy
              </a>{" "}
              for how to exercise them.
            </p>

            <div className="mt-12 p-6 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Questions?</h3>
              <p className="text-slate-700">
                Reach us at{" "}
                <a href="mailto:privacy@creviatube.com" className="text-blue-600 hover:underline">
                  privacy@creviatube.com
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
