// Phase 4 — TikTok Login Kit + Display API client.
//
// We use the Login Kit OAuth flow to get an access token from the
// *clipper* (the post owner), then the Display API to query view_count
// for their videos. Because the API is owner-scoped, we can't see view
// counts on someone else's TikTok content — so we ask the clipper to
// connect their account once after approval.
//
// Two operator-side prerequisites (documented in code only — no
// secrets in this repo):
//   1. Register a TikTok app at https://developers.tiktok.com
//   2. Set the redirect URL to {APP_URL}/api/oauth/tiktok/callback in
//      the developer portal AND set TIKTOK_CLIENT_KEY +
//      TIKTOK_CLIENT_SECRET env vars.
//
// Token lifetimes (per TikTok docs as of 2025):
//   access_token   24 hours
//   refresh_token  365 days
//
// Lazy refresh: callers should hit ensureFreshAccessToken before using
// a token; if it's near expiry the helper refreshes and persists.

import { APP_URL } from "./email";

// Scopes we ask for. user.info.basic is required to identify the
// account; video.list lets us call /v2/video/query/ to read view_count
// on the clipper's own videos. Some scopes require app review on
// TikTok's side — sandbox apps work for dev, production needs audit.
export const TIKTOK_SCOPES = ["user.info.basic", "video.list"] as const;

export const TIKTOK_REDIRECT_PATH = "/api/oauth/tiktok/callback";

// Buffer applied to "is this token expired?" — we refresh anything that
// expires in the next 60 seconds rather than racing the wire.
const EXPIRY_BUFFER_MS = 60_000;

export interface TikTokTokenSet {
  accessToken: string;
  refreshToken: string;
  // ISO timestamps so they round-trip through JSON storage cleanly.
  expiresAt: string;
  refreshExpiresAt: string;
  openId: string;
  scope: string;
}

interface TikTokTokenResponseRaw {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function tiktokConfig(): { clientKey: string; clientSecret: string; redirectUri: string } {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error(
      "TikTok OAuth not configured — set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET",
    );
  }
  return {
    clientKey,
    clientSecret,
    redirectUri: `${APP_URL}${TIKTOK_REDIRECT_PATH}`,
  };
}

// True iff TikTok env config is sufficient to start the OAuth flow.
// Used by the "Connect TikTok" UI button to decide whether to render
// in error-state (with a helpful message) versus offering the link.
export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

// Build the URL the clipper's browser navigates to. State must be
// stored server-side (we use the express-session) so the callback can
// CSRF-verify the round trip.
export function buildAuthorizeUrl(state: string): string {
  const { clientKey, redirectUri } = tiktokConfig();
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: TIKTOK_SCOPES.join(","),
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

function parseTokenResponse(raw: TikTokTokenResponseRaw): TikTokTokenSet {
  if (raw.error || !raw.access_token || !raw.refresh_token || !raw.open_id) {
    throw new Error(
      `TikTok token response missing fields: ${raw.error_description ?? raw.error ?? "unknown"}`,
    );
  }
  const now = Date.now();
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: new Date(now + (raw.expires_in ?? 86_400) * 1000).toISOString(),
    refreshExpiresAt: new Date(
      now + (raw.refresh_expires_in ?? 365 * 86_400) * 1000,
    ).toISOString(),
    openId: raw.open_id,
    scope: raw.scope ?? TIKTOK_SCOPES.join(","),
  };
}

// Exchange the auth-code TikTok handed back to /callback for a token set.
export async function exchangeCodeForToken(code: string): Promise<TikTokTokenSet> {
  const { clientKey, clientSecret, redirectUri } = tiktokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TikTokTokenResponseRaw;
  if (!res.ok) {
    throw new Error(
      `TikTok token exchange ${res.status}: ${json.error_description ?? json.error ?? "unknown"}`,
    );
  }
  return parseTokenResponse(json);
}

// Refresh an expired (or nearly-expired) access token. Returns a fresh
// TikTokTokenSet — refresh_token is rotated by TikTok on each refresh,
// so callers must persist the whole set.
export async function refreshAccessToken(refreshToken: string): Promise<TikTokTokenSet> {
  const { clientKey, clientSecret } = tiktokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TikTokTokenResponseRaw;
  if (!res.ok) {
    throw new Error(
      `TikTok token refresh ${res.status}: ${json.error_description ?? json.error ?? "unknown"}`,
    );
  }
  return parseTokenResponse(json);
}

// Return a usable access token — refreshing first if the stored one is
// near expiry. Returns null when the refresh token itself has expired
// (clipper must re-OAuth) or when refresh fails.
export async function ensureFreshAccessToken(
  current: TikTokTokenSet,
  onRefresh: (next: TikTokTokenSet) => Promise<void>,
): Promise<string | null> {
  const expiresAt = new Date(current.expiresAt).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > EXPIRY_BUFFER_MS) {
    return current.accessToken;
  }
  // Access token expired (or close). Bail if even the refresh window
  // closed — the clipper has to reconnect.
  const refreshExpiresAt = new Date(current.refreshExpiresAt).getTime();
  if (Number.isFinite(refreshExpiresAt) && refreshExpiresAt < Date.now()) {
    return null;
  }
  try {
    const next = await refreshAccessToken(current.refreshToken);
    await onRefresh(next);
    return next.accessToken;
  } catch (err) {
    console.warn("[tiktok-api] refresh failed", err);
    return null;
  }
}

// Display API video.query — fetches stats (incl. view_count) for the
// authenticated user's videos by id. Up to 20 ids per call. Returns a
// map { videoId → viewCount }; videos that don't belong to the user
// or were deleted are simply absent from the map.
export async function getVideoStats(
  accessToken: string,
  videoIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (videoIds.length === 0) return out;
  // TikTok caps to 20 ids per request — paginate for safety even though
  // we don't expect to hit it in v1 (one clipper rarely has 20 video
  // URLs in flight on the same campaign).
  for (let i = 0; i < videoIds.length; i += 20) {
    const chunk = videoIds.slice(i, i + 20);
    const url =
      "https://open.tiktokapis.com/v2/video/query/?fields=" +
      encodeURIComponent("id,view_count");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: chunk } }),
    });
    if (!res.ok) {
      throw new Error(`TikTok video.query ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const json = (await res.json()) as {
      data?: { videos?: Array<{ id?: string; view_count?: number }> };
    };
    for (const v of json.data?.videos ?? []) {
      if (v.id && typeof v.view_count === "number") {
        out.set(v.id, v.view_count);
      }
    }
  }
  return out;
}
