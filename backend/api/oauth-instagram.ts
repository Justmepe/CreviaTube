// Phase 4 — Instagram OAuth routes (clipper-side).
// Mirrors the TikTok flow shape — same CSRF state pattern, same
// session-stash approach, same return-URL handling. The differences
// live entirely inside the API client (lib/instagram-api.ts) where
// Meta's two-step short→long token exchange and Page → IG-Business
// resolution happen.

import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../shared/schema";
import {
  buildAuthorizeUrl,
  completeOAuthFlow,
  isInstagramConfigured,
  type InstagramTokenSet,
} from "../lib/instagram-api";

declare module "express-session" {
  interface SessionData {
    instagramOAuth?: {
      state: string;
      userId: string;
      returnTo: string;
      createdAt: number;
    };
  }
}

const STATE_TTL_MS = 10 * 60 * 1000;

function generateState(): string {
  return randomBytes(24).toString("base64url");
}

function safeReturnTo(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const s = input.trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (/[\r\n]/.test(s)) return fallback;
  return s;
}

export function setupOAuthInstagramAPI(app: Express): void {
  app.get("/api/oauth/instagram/start", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    if (!isInstagramConfigured()) {
      return res.status(503).json({
        message:
          "Instagram OAuth not configured. Ask the admin to set FACEBOOK_APP_ID + FACEBOOK_APP_SECRET.",
      });
    }

    const state = generateState();
    const returnTo = safeReturnTo(req.query.returnTo, "/dashboard");
    req.session.instagramOAuth = {
      state,
      userId: user.id,
      returnTo,
      createdAt: Date.now(),
    };

    const authorizeUrl = buildAuthorizeUrl(state);
    return res.redirect(authorizeUrl);
  });

  app.get("/api/oauth/instagram/callback", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    const stash = req.session.instagramOAuth;
    delete req.session.instagramOAuth;

    const failureUrl = (msg: string) => {
      const back = stash?.returnTo ?? "/dashboard";
      const sep = back.includes("?") ? "&" : "?";
      return `${back}${sep}instagramOAuth=error&reason=${encodeURIComponent(msg)}`;
    };

    if (req.query.error) {
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

    let tokenSet: InstagramTokenSet;
    try {
      tokenSet = await completeOAuthFlow(code);
    } catch (err: any) {
      console.error("[oauth-instagram] flow failed", err);
      return res.redirect(failureUrl(err?.message ?? "token exchange failed"));
    }

    // Read-modify-write users.social_accounts.instagram so we don't
    // clobber other connected accounts.
    try {
      const [row] = await db
        .select({ socialAccounts: users.socialAccounts })
        .from(users)
        .where(eq(users.id, user.id));
      const current = (row?.socialAccounts as any) ?? {};
      const next = {
        ...current,
        instagram: {
          ...(current.instagram ?? {}),
          accessToken: tokenSet.accessToken,
          expiresAt: tokenSet.expiresAt,
          businessAccountId: tokenSet.businessAccountId,
          businessAccount: true,
          username: tokenSet.username ?? current.instagram?.username,
          connectedAt: new Date().toISOString(),
        },
      };
      await db.update(users).set({ socialAccounts: next }).where(eq(users.id, user.id));
    } catch (err) {
      console.error("[oauth-instagram] persist failed", err);
      return res.redirect(failureUrl("storage failed"));
    }

    const back = stash.returnTo;
    const sep = back.includes("?") ? "&" : "?";
    return res.redirect(`${back}${sep}instagramOAuth=connected`);
  });
}
