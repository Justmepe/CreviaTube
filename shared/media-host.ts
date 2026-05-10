// Phase 5 — media-host recognition shared between the application page
// (sharing hints next to the URL input) and the creator review page
// (decides whether to render an embedded player vs a fallback link).
//
// Design choice (locked): accept ANY URL. Recognized hosts get an
// embedded player + a sharing-settings hint; unrecognized hosts save
// the URL but render a "we don't preview this host" warning with an
// open-in-new-tab link. We never block submission on host.

export type EmbedKind =
  | "iframe"   // Player embed via <iframe>
  | "video"    // Direct video file URL <video src=…>
  | "none";    // Open-in-new-tab fallback only

export type MediaHostId =
  | "youtube"
  | "youtube_shorts"
  | "vimeo"
  | "streamable"
  | "loom"
  | "google_drive"
  | "dropbox"
  | "tiktok"
  | "instagram"
  | "twitter"
  | "direct_video"
  | "unknown";

export interface MediaHostInfo {
  host: MediaHostId;
  label: string;
  embedKind: EmbedKind;
  // The URL to drop into <iframe src> or <video src>. Null when
  // embedKind === 'none' (host doesn't support embedding via a
  // simple URL).
  embedSrc: string | null;
  // One-line hint to show next to the URL input on the application
  // page. Tells the clipper what sharing setting to use so the URL
  // is actually viewable to the creator. Null when no hint applies.
  sharingHint: string | null;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

// Best-effort URL parse. Returns null on garbage so callers can decide
// what to do (we typically just save and warn).
function safeParse(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl.trim());
  } catch {
    return null;
  }
}

export function recognizeMediaHost(rawUrl: string | null | undefined): MediaHostInfo {
  if (!rawUrl) {
    return {
      host: "unknown",
      label: "Unknown",
      embedKind: "none",
      embedSrc: null,
      sharingHint: null,
    };
  }
  const u = safeParse(rawUrl);
  if (!u) {
    return {
      host: "unknown",
      label: "Unknown",
      embedKind: "none",
      embedSrc: null,
      sharingHint: "URL doesn't parse — double-check it.",
    };
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname;

  // ── YouTube ─────────────────────────────────────────────────────────
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const videoId = u.searchParams.get("v");
    if (videoId) {
      return {
        host: "youtube",
        label: "YouTube",
        embedKind: "iframe",
        embedSrc: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
        sharingHint: "Set the video's privacy to Unlisted or Public so the creator can watch.",
      };
    }
    const shorts = path.match(/^\/shorts\/([^/?#]+)/);
    if (shorts) {
      return {
        host: "youtube_shorts",
        label: "YouTube Shorts",
        embedKind: "iframe",
        embedSrc: `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}`,
        sharingHint: "Set the Short to Unlisted or Public so the creator can watch.",
      };
    }
  }
  if (host === "youtu.be") {
    const id = path.replace(/^\//, "");
    if (id) {
      return {
        host: "youtube",
        label: "YouTube",
        embedKind: "iframe",
        embedSrc: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
        sharingHint: "Set the video's privacy to Unlisted or Public so the creator can watch.",
      };
    }
  }

  // ── Vimeo ───────────────────────────────────────────────────────────
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/(?:\/video)?\/(\d+)/);
    if (m) {
      return {
        host: "vimeo",
        label: "Vimeo",
        embedKind: "iframe",
        embedSrc: `https://player.vimeo.com/video/${m[1]}`,
        sharingHint: "Set Privacy to 'Anyone with the link' or higher.",
      };
    }
  }

  // ── Streamable ──────────────────────────────────────────────────────
  if (host === "streamable.com") {
    const m = path.match(/^\/([a-z0-9]+)/i);
    if (m) {
      return {
        host: "streamable",
        label: "Streamable",
        embedKind: "iframe",
        embedSrc: `https://streamable.com/e/${m[1]}`,
        sharingHint: null, // Streamable links are public by default.
      };
    }
  }

  // ── Loom ────────────────────────────────────────────────────────────
  if (host === "loom.com" || host.endsWith(".loom.com")) {
    const m = path.match(/^\/share\/([a-z0-9]+)/i);
    if (m) {
      return {
        host: "loom",
        label: "Loom",
        embedKind: "iframe",
        embedSrc: `https://www.loom.com/embed/${m[1]}`,
        sharingHint: "Use the 'Share' link Loom gives you (workspace links won't embed).",
      };
    }
  }

  // ── Google Drive ────────────────────────────────────────────────────
  // Two URL shapes:
  //   /file/d/{id}/view
  //   /open?id={id}
  if (host === "drive.google.com") {
    const m = path.match(/\/file\/d\/([^/]+)/);
    const id = m?.[1] ?? u.searchParams.get("id");
    if (id) {
      return {
        host: "google_drive",
        label: "Google Drive",
        embedKind: "iframe",
        embedSrc: `https://drive.google.com/file/d/${id}/preview`,
        sharingHint: 'Sharing must be "Anyone with the link can view" — viewers in your domain only won\'t work.',
      };
    }
  }

  // ── Dropbox ─────────────────────────────────────────────────────────
  // Dropbox share links serve the file when ?raw=1 (or ?dl=1 to download).
  // Direct video files render in <video>; PDFs etc. fall back to link.
  if (host === "dropbox.com" || host === "www.dropbox.com") {
    if (VIDEO_EXT.test(path)) {
      // Force raw stream by replacing dl=0 with raw=1 (or appending).
      const fixed = new URL(u.toString());
      fixed.searchParams.delete("dl");
      fixed.searchParams.set("raw", "1");
      return {
        host: "dropbox",
        label: "Dropbox",
        embedKind: "video",
        embedSrc: fixed.toString(),
        sharingHint: 'Set the link sharing to "Anyone with the link" — anything stricter won\'t play.',
      };
    }
    return {
      host: "dropbox",
      label: "Dropbox",
      embedKind: "none",
      embedSrc: null,
      sharingHint: 'Set link sharing to "Anyone with the link". Non-video files won\'t preview here — the creator clicks through.',
    };
  }

  // ── TikTok ──────────────────────────────────────────────────────────
  // TikTok blocks iframe embed for unverified videos in many cases.
  // Treat as "not embeddable" for v1; rely on the creator clicking through.
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return {
      host: "tiktok",
      label: "TikTok",
      embedKind: "none",
      embedSrc: null,
      sharingHint: "TikTok previews aren't embedded — the creator opens the link in a new tab.",
    };
  }

  // ── Instagram ───────────────────────────────────────────────────────
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return {
      host: "instagram",
      label: "Instagram",
      embedKind: "none",
      embedSrc: null,
      sharingHint: "Instagram links open in a new tab. Make sure your account is public so the creator can view.",
    };
  }

  // ── X / Twitter ─────────────────────────────────────────────────────
  if (host === "x.com" || host === "twitter.com") {
    return {
      host: "twitter",
      label: "X (Twitter)",
      embedKind: "none",
      embedSrc: null,
      sharingHint: "X posts open in a new tab. Public account required so the creator can view.",
    };
  }

  // ── Direct video file URLs ──────────────────────────────────────────
  // CDN / S3 / generic web hosts. <video src=…> handles MP4/WebM natively.
  if (VIDEO_EXT.test(path)) {
    return {
      host: "direct_video",
      label: "Direct video file",
      embedKind: "video",
      embedSrc: rawUrl,
      sharingHint: null,
    };
  }

  // ── Unknown host ────────────────────────────────────────────────────
  // Save it, render an open-in-new-tab fallback. Don't block — clippers
  // come in with Notion pages, internal tooling, all kinds of weird
  // links. Blocking creates support tickets.
  return {
    host: "unknown",
    label: host,
    embedKind: "none",
    embedSrc: null,
    sharingHint:
      "We don't preview this host inline — the creator will open it in a new tab. Make sure the link is publicly viewable.",
  };
}
