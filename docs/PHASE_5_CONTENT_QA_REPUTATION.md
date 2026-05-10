# Phase 5 — Content QA + Clipper Reputation

Builds on Phase 4's verification stack. Where Phase 4 verifies the *outcome*
of a clipper's work (views, revenue, conversions), Phase 5 governs the
*content* itself: reviewing what they submit before publishing, building
trust between specific creator/clipper pairs, and reducing review friction
once trust exists.

---

## 1. Locked design decisions

From the v1 scoping conversation:

- **Rejection reasons** — closed enum with these values:
  `off_brief, low_quality, wrong_format, watermark, ai_generated,
  brand_mismatch, duplicate_submission, other`. Plus the existing free-text
  notes field. Email includes both.
- **Trust threshold** — per-creator tunable (stored on `creator_clipper_trust`,
  not a global env var). Default 5. A brand running a one-off campaign can
  set 3; a high-volume creator can set 10.
- **Auto-approve notification** — when a previously-trusted clipper submits
  and gets auto-approved, send them a celebratory "you're trusted" email,
  not a system-style auto-message. Retention hook.
- **Media URL allowlist** — accept *any* URL. Recognized hosts (Drive /
  YouTube / Streamable / Loom / Vimeo / Dropbox / direct file) get embedded
  on the review page. Unrecognized hosts get a "we don't preview this host"
  warning but the URL still saves and links out.

---

## 2. Slices (each a mergeable PR)

| # | Slice | Schema change | Estimated effort |
|---|---|---|---|
| **A** | **Structured rejection reasons** — enum-backed reason on the review action; email + UI surface it | Add `rejection_reason_code` (text, nullable, CHECK constraint) on `clipper_campaigns` | ~2 hrs |
| **B** | **Per-creator approval count** — visible badge on each application card showing "N approved on your campaigns" + clipper's average rejection reason for context | None — computed from `clipper_campaigns` | ~3 hrs |
| **C** | **Trust threshold + auto-approve toggle** — creator can flip "auto-approve future submissions from @alice on my campaigns"; future applications skip `creator_review` and go straight to `approved`. Per-creator threshold tunable | New table `creator_clipper_trust(creator_id, clipper_id, approved_count, auto_approve_threshold int default 5, auto_approve bool default false, last_approved_at, unique(creator_id, clipper_id))` | ~4 hrs |
| **D** | **Media submission via URL** — application page accepts a URL; review page embeds where the host supports iframe (Drive / YouTube / Streamable / Loom / Vimeo); unrecognized hosts get a warning | Add `submission_url text`, `submission_kind text` (`'text'|'url'`) on `clipper_campaigns` | ~5 hrs |
| **E** | **Cross-campaign reputation profile** — public "Verified track record" block on clipper profile pages: total approved, top creators worked with, completion rate, avg time-to-approval | None — aggregate reads | ~3 hrs |

**Order**: A → B → C → D → E. A and D are loosely orthogonal; D can ship
in parallel if a different engineer picks it up.

---

## 3. Deferred (real engineering, not v1)

- **Technical media QA** — duration / codec / aspect-ratio checks via
  ffprobe; watermark fingerprint matching against a competitor library
- **Native file upload** — signed S3/R2 URLs, virus scanning, transcoding
  pipeline, thumbnail generation
- **ML content moderation** beyond the existing AI-text detection
- **Clipper response-rate tracking** — apply-vs-deliver ratio. Ghosts
  (clippers who apply and never submit a post URL) will damage creator
  trust at scale; we want this signal before it becomes an issue. Track
  `applied_at`, `submitted_at`, `posted_at` deltas; surface as a chip on
  the clipper directory page

---

## 4. New endpoints + UI surfaces (per slice)

**Slice A:**
- `POST /api/clipper-applications/:id/review` body extended: `{ action, notes, reasonCode? }`
- Email template `application-decision.tsx` updated: rejection variant shows the reason category prominently
- `/creator/applications` review modal: rejection-reason dropdown when action=`reject`
- `/clipper/campaigns/:id` shows the structured reason if rejected (already shows freeform notes)

**Slice B:**
- `GET /api/creator/pending-applications` response gains per-application:
  `{ approvedCountFromThisClipper: int, lastApprovedFromThisClipperAt: timestamp | null }`
- Application-card UI shows a chip: "@alice — 7 prior approvals on your campaigns"

**Slice C:**
- New endpoint `PUT /api/creator/clipper-trust/:clipperId` (creator-only) — body `{ autoApprove: bool, threshold?: int }`
- New endpoint `GET /api/creator/clipper-trust` (creator-only) — list of trusted clippers
- Modify approval handler in `storage.reviewClipperApplication`: increments `approved_count` on the trust row
- Modify application submission handler `POST /api/campaigns/:id/apply`: checks the trust row; if `auto_approve=true`, set `applicationStatus='approved'` directly + queue the celebratory email
- New email template `clipper-trusted.tsx` ("You're a trusted clipper for @creator")
- Review modal: "Trust @alice — auto-approve future submissions" toggle when approving (visible only when `approvedCountFromThisClipper >= threshold`)
- Optional: `/creator/trusted-clippers` admin-style list page

**Slice D:**
- `POST /api/campaigns/:id/apply` body extended: `{ submittedContent? | submissionUrl?, submissionKind: 'text'|'url' }`
- `/creator/applications` review page: embed/preview block when `submission_kind='url'`
- Application page `clipper-application.tsx` redesigned:
  one input that accepts text OR URL, with a kind toggle
- Helper module `client/src/features/applications/lib/url-host.ts` — recognizes hosts and returns `{ host, embedKind: 'iframe'|'video'|'none', sharingHint }`

**Slice E:**
- `GET /api/clippers/:id/reputation` — aggregate metrics for any clipper
- `clipper-profile.tsx` page gains a "Verified track record" section

---

## 5. Migrations summary

| Migration | Purpose |
|---|---|
| `0020_rejection_reason_code.sql` | Slice A — adds column + CHECK constraint |
| `0021_creator_clipper_trust.sql` | Slice C — new table, per-creator threshold |
| `0022_submission_kind.sql` | Slice D — adds `submission_url` + `submission_kind` columns |

Slice B and E are read-only; no migrations needed.
