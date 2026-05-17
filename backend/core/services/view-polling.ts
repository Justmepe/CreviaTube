// Phase 4 — public-API view polling.
//
// For campaigns with primaryGoal === "views" we periodically hit the
// platform's public API for each clipper's post_url, read the cumulative
// view count, and record the delta since our last snapshot as a `view`
// tracking event. The existing trackingService.recordTrackingEvent path
// fires goal-completion checks downstream, so a clipper's bonus releases
// the moment public-platform views cross the campaign target.
//
// Platform support today:
//   YouTube  — public Data API v3, requires YOUTUBE_API_KEY
//   TikTok   — stub: needs OAuth, not in v1
//   Instagram— stub: owner-only metrics, needs OAuth, not in v1
//   X        — stub: API now paywalled, not in v1
//
// First poll establishes a baseline (the existing public view count
// becomes lastViewCount) so we don't credit pre-existing views as if
// the clipper drove them. Only growth from that point forward credits.
//
// No-op gracefully when YOUTUBE_API_KEY is unset — useful for dev /
// testing environments where the upstream key isn't provisioned.

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { campaigns, clipperCampaigns, users } from "../../../shared/schema";
import { trackingService } from "./tracking-service";
import {
  ensureFreshAccessToken,
  getVideoStats,
  isTikTokConfigured,
  type TikTokTokenSet,
} from "../../lib/tiktok-api";
import {
  ensureFreshInstagramToken,
  findMediaIdByPostCode,
  getMediaViewCount,
  isInstagramConfigured,
  type InstagramTokenSet,
} from "../../lib/instagram-api";

// Module-level cache for the DB-stored YouTube API key. Hydrated on
// server boot and on every admin save via refreshYoutubeKeyFromDb().
// Env wins over DB so a deploy can hard-override the live value.
// Synchronous resolveYoutubeKey() lets viewPollingSupported() stay
// sync (it's called inline from the metrics endpoint per-row).
let _cachedDbYoutubeKey = "";

export function resolveYoutubeKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY || _cachedDbYoutubeKey || undefined;
}

export async function refreshYoutubeKeyFromDb(): Promise<void> {
  try {
    const { getConfig } = await import("../../lib/platform-config");
    _cachedDbYoutubeKey = (await getConfig("youtube_api_key")) || "";
  } catch (err) {
    console.warn("[view-polling] refreshYoutubeKeyFromDb failed:", err);
  }
}

export type SupportedPlatform = "youtube" | "tiktok" | "instagram" | "x" | "unknown";

export interface PostFingerprint {
  platform: SupportedPlatform;
  // Platform-specific id we'd query if/when the API path is wired:
  //   YouTube   videoId
  //   TikTok    videoId (the numeric id from /video/{id})
  //   Instagram postCode (the short code from /reel/{code} or /p/{code})
  //   X         tweetId (the numeric id from /status/{id})
  videoId?: string;
  postCode?: string;
  tweetId?: string;
}

// Recognize a post URL and pull the platform-specific id we need to
// query. Identifying the post is cheap and useful even when we can't
// yet hit the platform's API (used for the "we recognize this URL but
// can't verify views automatically" UI banner).
export function fingerprintPostUrl(rawUrl: string | null | undefined): PostFingerprint {
  if (!rawUrl) return { platform: "unknown" };
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return { platform: "unknown" };
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // ── YouTube ─────────────────────────────────────────────────────────
  //   https://www.youtube.com/watch?v=VIDEOID
  //   https://youtu.be/VIDEOID
  //   https://www.youtube.com/shorts/VIDEOID
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return { platform: "youtube", videoId: v };
    const shortsMatch = u.pathname.match(/^\/shorts\/([^/?#]+)/);
    if (shortsMatch) return { platform: "youtube", videoId: shortsMatch[1] };
  }
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "");
    if (id) return { platform: "youtube", videoId: id };
  }

  // ── TikTok ──────────────────────────────────────────────────────────
  //   https://www.tiktok.com/@user/video/1234567890
  //   https://vm.tiktok.com/SHORTID/        (short link — id not the video id)
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) return { platform: "tiktok", videoId: m[1] };
    return { platform: "tiktok" };
  }

  // ── Instagram ───────────────────────────────────────────────────────
  //   https://www.instagram.com/reel/CODE/
  //   https://www.instagram.com/p/CODE/        (post)
  //   https://www.instagram.com/tv/CODE/       (IGTV legacy)
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const m = u.pathname.match(/^\/(?:reel|p|tv)\/([^/?#]+)/);
    if (m) return { platform: "instagram", postCode: m[1] };
    return { platform: "instagram" };
  }

  // ── X (Twitter) ─────────────────────────────────────────────────────
  //   https://x.com/user/status/1234567890
  //   https://twitter.com/user/status/1234567890
  if (host === "x.com" || host === "twitter.com") {
    const m = u.pathname.match(/\/status\/(\d+)/);
    if (m) return { platform: "x", tweetId: m[1] };
    return { platform: "x" };
  }

  return { platform: "unknown" };
}

// Hit TikTok Display API video.query for a clipper-owned video and
// return the cumulative view_count. Refreshes the access token first
// if it's near expiry; the rotated tokens are persisted to
// users.social_accounts.tiktok so subsequent sweeps don't redo the
// refresh dance. Throws on non-2xx / unrefreshable tokens so the
// caller can log + skip.
async function fetchTikTokViewCount(
  clipperUserId: string,
  current: TikTokTokenSet,
  videoId: string,
): Promise<number> {
  const accessToken = await ensureFreshAccessToken(current, async (next) => {
    // Persist the rotated token set onto users.social_accounts.tiktok
    // (read-modify-write so we don't clobber other connected accounts).
    const [row] = await db
      .select({ socialAccounts: users.socialAccounts })
      .from(users)
      .where(eq(users.id, clipperUserId));
    const socials = (row?.socialAccounts as any) ?? {};
    const merged = {
      ...socials,
      tiktok: {
        ...(socials.tiktok ?? {}),
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expiresAt: next.expiresAt,
        refreshExpiresAt: next.refreshExpiresAt,
        openId: next.openId,
        scope: next.scope,
      },
    };
    await db.update(users).set({ socialAccounts: merged }).where(eq(users.id, clipperUserId));
  });

  if (!accessToken) {
    // Refresh window expired — the clipper has to re-OAuth. Surface
    // as a thrown error so the sweep loop counts it as a failed fetch
    // and the next sweep retries (which will skip with the OAuth
    // reason since the token is gone).
    throw new Error("TikTok refresh token expired — clipper must reconnect");
  }

  const stats = await getVideoStats(accessToken, [videoId]);
  // If TikTok didn't return our video (deleted / private / wrong owner)
  // we treat that as 0 — the delta won't grow but we don't crash.
  return stats.get(videoId) ?? 0;
}

// Hit Instagram Graph API for a single Reel / Video by URL post code.
// Resolves the post code → media id (paginating /media), then reads
// the `plays` insight. Returns null when IG can't expose plays for
// that media kind (static images, very recent posts) — the sweep
// treats null as "skip with reason" rather than "0 views".
async function fetchInstagramViewCount(
  clipperUserId: string,
  current: InstagramTokenSet,
  postCode: string,
): Promise<number | null> {
  const accessToken = await ensureFreshInstagramToken(current, async (next) => {
    const [row] = await db
      .select({ socialAccounts: users.socialAccounts })
      .from(users)
      .where(eq(users.id, clipperUserId));
    const socials = (row?.socialAccounts as any) ?? {};
    const merged = {
      ...socials,
      instagram: {
        ...(socials.instagram ?? {}),
        accessToken: next.accessToken,
        expiresAt: next.expiresAt,
        businessAccountId: next.businessAccountId,
      },
    };
    await db.update(users).set({ socialAccounts: merged }).where(eq(users.id, clipperUserId));
  });

  if (!accessToken) {
    throw new Error("Instagram token expired — clipper must reconnect");
  }
  const mediaId = await findMediaIdByPostCode(
    accessToken,
    current.businessAccountId,
    postCode,
  );
  if (!mediaId) {
    // Most likely: clipper posted from a different IG account, or post
    // is older than our pagination cap. Treat as null (skip-with-reason).
    return null;
  }
  return getMediaViewCount(accessToken, mediaId);
}

// Hit the YouTube Data API v3 for a single video and return the
// cumulative viewCount as a number. Throws on non-2xx so the caller
// can log and skip without poisoning the whole sweep.
async function fetchYouTubeViewCount(videoId: string, apiKey: string): Promise<number> {
  const url =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as {
    items?: Array<{ statistics?: { viewCount?: string } }>;
  };
  const raw = json.items?.[0]?.statistics?.viewCount;
  if (raw == null) {
    // Video deleted / private / id wrong. Treat as 0 — we don't penalize
    // the clipper but their delta stops growing.
    return 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// Why a row got skipped. Lets the admin UI / sweep log explain coverage
// at a glance instead of "5 rows skipped, somehow".
export type SkipReason =
  | "unknown_platform"      // URL didn't fingerprint to any known platform
  | "no_youtube_api_key"    // YOUTUBE_API_KEY env unset
  | "tiktok_oauth_required" // TikTok view counts need OAuth-scoped access
  | "instagram_oauth_required"
  | "x_paid_api_required";  // X API v2 is paywalled, no free public view counts

export interface PollResult {
  scanned: number;     // rows considered
  polled: number;      // rows where we fetched a count
  credited: number;    // rows where the count grew → new view events
  delta: number;       // total view delta credited
  errors: number;
  // Per-platform skipped counts, for both ops visibility and later
  // capacity planning ("we have N TikTok URLs blocked on OAuth").
  skipped: Record<SkipReason, number>;
}

// Optional per-clipper context that flips per-user gates (e.g., "TikTok
// is supported on this server AND this clipper has connected").
export interface ClipperCoverageContext {
  tiktokConnected?: boolean;
  instagramConnected?: boolean;
}

// Whether the polling sweep can auto-credit views for a given platform.
// When called without context, returns the *server-level* answer: would
// it work if the clipper has finished any per-user OAuth? With context,
// the answer is fully resolved for that clipper.
export function viewPollingSupported(
  platform: SupportedPlatform,
  ctx?: ClipperCoverageContext,
): {
  supported: boolean;
  reason?: SkipReason;
  // True iff the platform requires per-clipper OAuth and the clipper
  // hasn't done it yet (or no context was provided to check). Useful
  // for the UI to render a "Connect <platform>" button.
  needsClipperOAuth?: boolean;
} {
  switch (platform) {
    case "youtube":
      return resolveYoutubeKey()
        ? { supported: true }
        : { supported: false, reason: "no_youtube_api_key" };
    case "tiktok": {
      // Server-side gate first: if env isn't configured, no clipper can
      // connect anyway, so the answer is "no — and don't show OAuth UI".
      if (!isTikTokConfigured()) {
        return { supported: false, reason: "tiktok_oauth_required" };
      }
      // Server can support it; clipper-specific gate.
      if (ctx?.tiktokConnected) return { supported: true };
      return {
        supported: false,
        reason: "tiktok_oauth_required",
        needsClipperOAuth: true,
      };
    }
    case "instagram": {
      // Same shape as TikTok — server config first, then per-clipper.
      if (!isInstagramConfigured()) {
        return { supported: false, reason: "instagram_oauth_required" };
      }
      if (ctx?.instagramConnected) return { supported: true };
      return {
        supported: false,
        reason: "instagram_oauth_required",
        needsClipperOAuth: true,
      };
    }
    case "x":
      return { supported: false, reason: "x_paid_api_required" };
    default:
      return { supported: false, reason: "unknown_platform" };
  }
}

function emptySkipMap(): Record<SkipReason, number> {
  return {
    unknown_platform: 0,
    no_youtube_api_key: 0,
    tiktok_oauth_required: 0,
    instagram_oauth_required: 0,
    x_paid_api_required: 0,
  };
}

// Sweep all approved clipper-campaigns whose campaign primaryGoal is
// "views" and post_url is set. For YouTube rows, fetch the live count,
// credit the delta as `view` events, roll the snapshot forward. Other
// platforms are recognized but skipped with a per-platform reason logged
// (TikTok / IG need OAuth, X needs a paid API tier).
export async function pollAllPostViews(): Promise<PollResult> {
  const result: PollResult = {
    scanned: 0,
    polled: 0,
    credited: 0,
    delta: 0,
    errors: 0,
    skipped: emptySkipMap(),
  };

  const youtubeKey = resolveYoutubeKey();
  if (!youtubeKey) {
    console.warn("[view-polling] YOUTUBE_API_KEY not set (env or db) — YouTube rows will skip");
  }

  // Pull eligible rows in one query, joining users so we can read each
  // clipper's stored TikTok token without a follow-up roundtrip.
  // campaign_goals is JSON; we cast and path-extract primaryGoal in SQL
  // so the predicate uses the existing partial index on clipper_campaigns
  // rather than scanning everything.
  const rows = await db
    .select({
      id: clipperCampaigns.id,
      clipperId: clipperCampaigns.clipperId,
      postUrl: clipperCampaigns.postUrl,
      lastViewCount: clipperCampaigns.lastViewCount,
      socialAccounts: users.socialAccounts,
    })
    .from(clipperCampaigns)
    .innerJoin(campaigns, eq(clipperCampaigns.campaignId, campaigns.id))
    .innerJoin(users, eq(clipperCampaigns.clipperId, users.id))
    .where(
      and(
        eq(clipperCampaigns.applicationStatus, "approved"),
        eq(clipperCampaigns.isCompleted, false),
        isNotNull(clipperCampaigns.postUrl),
        eq(campaigns.status, "active"),
        sql`(${campaigns.campaignGoals}::jsonb->>'primaryGoal') = 'views'`,
      ),
    );

  result.scanned = rows.length;

  for (const row of rows) {
    const fp = fingerprintPostUrl(row.postUrl);

    // Build per-clipper coverage context for the supported() check.
    const social: any = row.socialAccounts ?? {};
    const tiktokToken = social.tiktok as Partial<TikTokTokenSet> | undefined;
    const tiktokConnected = Boolean(
      tiktokToken?.accessToken && tiktokToken?.refreshToken && tiktokToken?.expiresAt,
    );
    const igToken = social.instagram as Partial<InstagramTokenSet> | undefined;
    const instagramConnected = Boolean(
      igToken?.accessToken && igToken?.businessAccountId && igToken?.expiresAt,
    );
    const support = viewPollingSupported(fp.platform, {
      tiktokConnected,
      instagramConnected,
    });

    if (!support.supported) {
      const reason: SkipReason = support.reason ?? "unknown_platform";
      result.skipped[reason] += 1;
      continue;
    }

    // Fetch the live count via the platform-appropriate API.
    let liveCount: number | null = null;
    try {
      if (fp.platform === "youtube" && fp.videoId) {
        liveCount = await fetchYouTubeViewCount(fp.videoId, youtubeKey!);
      } else if (fp.platform === "tiktok" && fp.videoId && tiktokToken) {
        liveCount = await fetchTikTokViewCount(
          row.clipperId,
          tiktokToken as TikTokTokenSet,
          fp.videoId,
        );
      } else if (fp.platform === "instagram" && fp.postCode && igToken) {
        liveCount = await fetchInstagramViewCount(
          row.clipperId,
          igToken as InstagramTokenSet,
          fp.postCode,
        );
      } else {
        // Reachable when fingerprint had no platform-specific id — the
        // URL was a vm.tiktok short link or similar. Skip honestly.
        result.skipped.unknown_platform += 1;
        continue;
      }
    } catch (err: any) {
      console.warn("[view-polling] fetch failed", {
        clipperCampaignId: row.id,
        platform: fp.platform,
        error: err?.message ?? String(err),
      });
      result.errors += 1;
      continue;
    }
    if (liveCount === null) {
      // IG returned "metric not available" (e.g., not a video / too
      // recent). Don't credit but don't error either — try again next
      // sweep. Doesn't advance lastViewPolledAt so the row stays "not
      // verified yet" until insights become available.
      result.skipped.unknown_platform += 1;
      continue;
    }
    result.polled += 1;

    // Snapshot bookkeeping always advances even when delta is zero, so
    // lastViewPolledAt reflects "we tried at this time" not "we credited
    // at this time".
    const last = row.lastViewCount ?? 0;
    const delta = Math.max(0, liveCount - last);

    if (delta > 0) {
      try {
        await trackingService.recordTrackingEvent({
          clipperCampaignId: row.id,
          eventType: "view",
          // eventValue carries the delta — getClipperProgress for views
          // SUMs `coalesce(value, 1)` so the delta lands intact rather
          // than being collapsed to a single row of "1 view".
          eventValue: delta,
          metadata: {
            source: "view_polling",
            platform: fp.platform,
            // Mutually exclusive: YouTube/TikTok use videoId, IG uses
            // postCode + the resolved mediaId, X uses tweetId.
            video_id: fp.videoId,
            post_code: fp.postCode,
            tweet_id: fp.tweetId,
            cumulative: liveCount,
            previous_snapshot: last,
          },
        });
        result.credited += 1;
        result.delta += delta;
      } catch (err: any) {
        console.warn("[view-polling] record failed", {
          clipperCampaignId: row.id,
          error: err?.message ?? String(err),
        });
        result.errors += 1;
        // Don't roll the snapshot forward on failure — next sweep will retry.
        continue;
      }
    }

    await db
      .update(clipperCampaigns)
      .set({ lastViewCount: liveCount, lastViewPolledAt: new Date() })
      .where(eq(clipperCampaigns.id, row.id));
  }

  // Log non-zero skip categories so an operator notices the coverage gap.
  const skipped: Array<[SkipReason, number]> = Object.entries(result.skipped)
    .filter(([, n]) => n > 0) as Array<[SkipReason, number]>;
  if (skipped.length) {
    console.log("[view-polling] skipped breakdown", Object.fromEntries(skipped));
  }

  return result;
}
