// Phase 4 — TikTok Login Kit OAuth routes (clipper-side).
//
// Two endpoints:
//   GET /api/oauth/tiktok/start    → redirect to TikTok authorize page
//   GET /api/oauth/tiktok/callback → exchange code, persist tokens
//
// Flow:
//   1. Authenticated clipper hits /start (typically from a "Connect
//      TikTok" button on the clipper-assignment page).
//   2. We mint a CSRF state, stash it in the session keyed by user id,
//      and 302 to TikTok's authorize URL with that state.
//   3. TikTok redirects back to /callback?code=…&state=…
//   4. We verify the state matches what we stashed for this session,
//      exchange the code for a token set, and persist it onto
//      users.socialAccounts.tiktok.
//   5. Redirect the user back to the page they came from (or
//      /dashboard as fallback).

import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../shared/schema";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  isTikTokConfigured,
  type TikTokTokenSet,
} from "../lib/tiktok-api";

// Session augmentation: where we stash the OAuth state during the
// authorize → callback round-trip. Not a separate table — the state is
// only meaningful for the ~30s the user spends on TikTok's page.
declare module "express-session" {
  interface SessionData {
    tiktokOAuth?: {
      state: string;
      userId: string;
      returnTo: string; // path to redirect back to on success / failure
      // Created so we can expire stale states defensively.
      createdAt: number;
    };
  }
}

// 10 minutes — TikTok's authorize page rarely takes longer.
const STATE_TTL_MS = 10 * 60 * 1000;

function generateState(): string {
  return randomBytes(24).toString("base64url");
}

// Sanitize the returnTo path to avoid open-redirect: must start with
// /, must not start with // (protocol-relative), must not contain
// CR/LF that could split the Location header.
function safeReturnTo(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const s = input.trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (/[\r\n]/.test(s)) return fallback;
  return s;
}

export function setupOAuthTikTokAPI(app: Express): void {
  // Start: clipper-only entry point.
  app.get("/api/oauth/tiktok/start", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    if (!isTikTokConfigured()) {
      return res.status(503).json({
        message:
          "TikTok OAuth not configured. Ask the admin to set TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET.",
      });
    }

    const state = generateState();
    const returnTo = safeReturnTo(req.query.returnTo, "/dashboard");
    req.session.tiktokOAuth = {
      state,
      userId: user.id,
      returnTo,
      createdAt: Date.now(),
    };

    const authorizeUrl = buildAuthorizeUrl(state);
    return res.redirect(authorizeUrl);
  });

  // Callback: TikTok hands us back ?code & ?state. We verify state, then
  // exchange the code for tokens.
  app.get("/api/oauth/tiktok/callback", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    const stash = req.session.tiktokOAuth;
    // One-shot: clear the stash regardless of outcome so a leaked state
    // can't be replayed.
    delete req.session.tiktokOAuth;

    const failureUrl = (msg: string) => {
      const back = stash?.returnTo ?? "/dashboard";
      const sep = back.includes("?") ? "&" : "?";
      return `${back}${sep}tiktokOAuth=error&reason=${encodeURIComponent(msg)}`;
    };

    if (req.query.error) {
      // User declined on TikTok's side. Honest redirect with the reason.
      const reason = String(req.query.error_description ?? req.query.error);
      return res.redirect(failureUrl(reason));
    }

    if (!stash) {
      return res.redirect(failureUrl("session expired"));
    }
    if (Date.now() - stash.createdAt > STATE_TTL_MS) {
      return res.redirect(failureUrl("authorize timed out, please try again"));
    }
    if (stash.userId !== user.id) {
      // The user who returned isn't the one who started. Treat as CSRF.
      return res.redirect(failureUrl("session mismatch"));
    }
    const incomingState = String(req.query.state ?? "");
    if (!incomingState || incomingState !== stash.state) {
      return res.redirect(failureUrl("state mismatch"));
    }

    const code = String(req.query.code ?? "");
    if (!code) {
      return res.redirect(failureUrl("no code"));
    }

    let tokenSet: TikTokTokenSet;
    try {
      tokenSet = await exchangeCodeForToken(code);
    } catch (err: any) {
      console.error("[oauth-tiktok] code exchange failed", err);
      return res.redirect(failureUrl("token exchange failed"));
    }

    // Persist onto users.social_accounts.tiktok. Read-modify-write so we
    // don't clobber other connected accounts.
    try {
      const [row] = await db
        .select({ socialAccounts: users.socialAccounts })
        .from(users)
        .where(eq(users.id, user.id));
      const current = (row?.socialAccounts as any) ?? {};
      const next = {
        ...current,
        tiktok: {
          ...(current.tiktok ?? {}),
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          expiresAt: tokenSet.expiresAt,
          refreshExpiresAt: tokenSet.refreshExpiresAt,
          openId: tokenSet.openId,
          scope: tokenSet.scope,
          connectedAt: new Date().toISOString(),
        },
      };
      await db.update(users).set({ socialAccounts: next }).where(eq(users.id, user.id));
    } catch (err) {
      console.error("[oauth-tiktok] persist failed", err);
      return res.redirect(failureUrl("storage failed"));
    }

    const back = stash.returnTo;
    const sep = back.includes("?") ? "&" : "?";
    return res.redirect(`${back}${sep}tiktokOAuth=connected`);
  });
}
