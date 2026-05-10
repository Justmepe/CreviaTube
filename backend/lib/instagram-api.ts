// Phase 4 — Instagram Graph API + Facebook Login client.
//
// Same goal as the TikTok client: get a token from the *clipper*, then
// query view counts for their own posts. Instagram insights are
// owner-scoped, so this only works for content posted by the connected
// account, on a Business or Creator account (personal IG accounts can't
// expose insights — UI documents that constraint).
//
// Operator prerequisites (no secrets in this repo):
//   1. Create a Meta app at https://developers.facebook.com
//   2. Add the "Instagram Graph API" product
//   3. Set the Valid OAuth Redirect URI to {APP_URL}/api/oauth/instagram/callback
//   4. Set FACEBOOK_APP_ID + FACEBOOK_APP_SECRET env vars
//
// Token lifetimes (per Meta docs as of 2025):
//   short-lived user token   1 hour
//   long-lived user token    60 days
//   long-lived page token    inherits user-token lifetime
//
// We exchange short-lived → long-lived immediately on connect, store the
// long-lived token, and refresh proactively when within ~7 days of expiry.

import { APP_URL } from "./email";

// Scopes:
//   pages_show_list             — list the user's FB Pages (needed to get IG Business account)
//   instagram_basic             — read IG profile + media
//   instagram_manage_insights   — read insights (plays/reach) on owned media
//   business_management         — required for many Business-API permissions
export const INSTAGRAM_SCOPES = [
  "pages_show_list",
  "instagram_basic",
  "instagram_manage_insights",
  "business_management",
] as const;

export const INSTAGRAM_REDIRECT_PATH = "/api/oauth/instagram/callback";

// Refresh proactively when within this window of expiry. Long-lived
// tokens are 60 days; refreshing 7 days before keeps the chain alive
// without re-asking the user.
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Graph API version pinned. Bump deliberately when Meta deprecates.
const GRAPH_VERSION = "v18.0";

export interface InstagramTokenSet {
  // Long-lived user token. Used to authenticate API calls.
  accessToken: string;
  // ISO timestamp — when the long-lived user token expires.
  expiresAt: string;
  // The connected IG Business Account id (resolved from /me/accounts).
  businessAccountId: string;
  // Username — purely for display in the UI.
  username?: string;
}

interface FbTokenResponse {
  access_token?: string;
  expires_in?: number;     // seconds
  token_type?: string;
  error?: { message?: string; type?: string };
}

interface FbPagesResponse {
  data?: Array<{
    id: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: { id?: string };
  }>;
  paging?: { cursors?: any };
  error?: { message?: string };
}

function instagramConfig(): { appId: string; appSecret: string; redirectUri: string } {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "Instagram OAuth not configured — set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET",
    );
  }
  return { appId, appSecret, redirectUri: `${APP_URL}${INSTAGRAM_REDIRECT_PATH}` };
}

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

// Build the URL we redirect the clipper's browser to. State is a CSRF
// token we re-verify in the callback.
export function buildAuthorizeUrl(state: string): string {
  const { appId, redirectUri } = instagramConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: INSTAGRAM_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

// Step 1: code → short-lived user token.
async function exchangeCodeForShortLived(code: string): Promise<{ token: string; expiresIn: number }> {
  const { appId, appSecret, redirectUri } = instagramConfig();
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  const json = (await res.json()) as FbTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Instagram code exchange ${res.status}: ${json.error?.message ?? "unknown"}`,
    );
  }
  return { token: json.access_token, expiresIn: json.expires_in ?? 3600 };
}

// Step 2: short-lived → long-lived (60-day) user token.
async function exchangeForLongLived(shortLived: string): Promise<{ token: string; expiresIn: number }> {
  const { appId, appSecret } = instagramConfig();
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(shortLived)}`;
  const res = await fetch(url);
  const json = (await res.json()) as FbTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Instagram long-lived exchange ${res.status}: ${json.error?.message ?? "unknown"}`,
    );
  }
  return { token: json.access_token, expiresIn: json.expires_in ?? 60 * 86_400 };
}

// Refresh a long-lived token before it expires. Same fb_exchange_token
// endpoint — pass the existing long-lived token as fb_exchange_token.
export async function refreshLongLivedToken(
  longLivedToken: string,
): Promise<{ token: string; expiresIn: number }> {
  return exchangeForLongLived(longLivedToken);
}

// Step 3: list pages, find the first one with an IG Business Account
// linked. v1 picks the first; users with multiple pages will need a
// chooser later.
async function findInstagramBusinessAccount(
  userToken: string,
): Promise<{ businessAccountId: string; pageName?: string } | null> {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts` +
    `?fields=id,name,access_token,instagram_business_account` +
    `&access_token=${encodeURIComponent(userToken)}`;
  const res = await fetch(url);
  const json = (await res.json()) as FbPagesResponse;
  if (!res.ok) {
    throw new Error(
      `Instagram /me/accounts ${res.status}: ${json.error?.message ?? "unknown"}`,
    );
  }
  for (const page of json.data ?? []) {
    if (page.instagram_business_account?.id) {
      return {
        businessAccountId: page.instagram_business_account.id,
        pageName: page.name,
      };
    }
  }
  return null;
}

// Single-call wrapper: code → long-lived token + IG Business account.
// Caller persists the returned token set; nothing here writes to the DB.
export async function completeOAuthFlow(code: string): Promise<InstagramTokenSet> {
  const short = await exchangeCodeForShortLived(code);
  const long = await exchangeForLongLived(short.token);
  const ig = await findInstagramBusinessAccount(long.token);
  if (!ig) {
    throw new Error(
      "No Instagram Business account linked. Convert your IG to a Business or Creator account and link it to a Facebook Page.",
    );
  }
  // Pull username for display purposes — best-effort, not fatal.
  let username: string | undefined;
  try {
    const u = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${ig.businessAccountId}?fields=username&access_token=${encodeURIComponent(long.token)}`,
    );
    if (u.ok) {
      const data = (await u.json()) as { username?: string };
      username = data.username;
    }
  } catch {
    /* ignore */
  }
  return {
    accessToken: long.token,
    expiresAt: new Date(Date.now() + long.expiresIn * 1000).toISOString(),
    businessAccountId: ig.businessAccountId,
    username,
  };
}

// Lazy refresh — like TikTok's ensureFreshAccessToken. Returns null if
// the token is too far gone (clipper must reconnect).
export async function ensureFreshInstagramToken(
  current: InstagramTokenSet,
  onRefresh: (next: InstagramTokenSet) => Promise<void>,
): Promise<string | null> {
  const expiresAt = new Date(current.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) return null;
  const now = Date.now();
  if (expiresAt < now) {
    // Already expired — Meta lets you refresh up to a few days past
    // expiry, but we don't lean on that. Treat as needs-reconnect.
    return null;
  }
  if (expiresAt - now > REFRESH_WINDOW_MS) {
    return current.accessToken;
  }
  // Within the refresh window — get a new 60-day token.
  try {
    const next = await refreshLongLivedToken(current.accessToken);
    const refreshed: InstagramTokenSet = {
      ...current,
      accessToken: next.token,
      expiresAt: new Date(Date.now() + next.expiresIn * 1000).toISOString(),
    };
    await onRefresh(refreshed);
    return refreshed.accessToken;
  } catch (err) {
    console.warn("[instagram-api] refresh failed", err);
    return current.accessToken; // current still works for now; next sweep retries
  }
}

// Find an IG media id by its shortcode (the CODE from
// instagram.com/reel/CODE/). We paginate the user's media list and
// match by permalink. v1 caps to MAX_PAGES so a clipper with thousands
// of posts doesn't burn quota — practical limit ~100 most-recent posts.
const MAX_MEDIA_PAGES = 4;
const MEDIA_PAGE_SIZE = 25;

export async function findMediaIdByPostCode(
  accessToken: string,
  businessAccountId: string,
  postCode: string,
): Promise<string | null> {
  let url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/media` +
    `?fields=id,permalink&limit=${MEDIA_PAGE_SIZE}` +
    `&access_token=${encodeURIComponent(accessToken)}`;
  for (let page = 0; page < MAX_MEDIA_PAGES && url; page++) {
    const res = await fetch(url);
    const json = (await res.json()) as {
      data?: Array<{ id: string; permalink?: string }>;
      paging?: { next?: string };
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(
        `Instagram /media ${res.status}: ${json.error?.message ?? "unknown"}`,
      );
    }
    for (const m of json.data ?? []) {
      if (m.permalink && m.permalink.includes(`/${postCode}/`)) {
        return m.id;
      }
    }
    url = json.paging?.next ?? "";
  }
  return null;
}

// Fetch view count (`plays` for Reels/Video, `impressions` as fallback).
// Returns null if the metric isn't available — IG sometimes refuses
// `plays` for very recent media; the caller should treat as "skip"
// rather than zero-out.
export async function getMediaViewCount(
  accessToken: string,
  mediaId: string,
): Promise<number | null> {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}/insights` +
    `?metric=plays&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
    error?: { message?: string; code?: number };
  };
  if (!res.ok) {
    // Metric not available for this media kind (e.g., a static image
    // post doesn't have plays) — IG returns 400. Fall back to null.
    if (res.status === 400) return null;
    throw new Error(
      `Instagram /insights ${res.status}: ${json.error?.message ?? "unknown"}`,
    );
  }
  const playsMetric = (json.data ?? []).find((d) => d.name === "plays");
  const v = playsMetric?.values?.[0]?.value;
  return typeof v === "number" ? v : null;
}
