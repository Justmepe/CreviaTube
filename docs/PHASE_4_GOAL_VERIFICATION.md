# Phase 4 — Goal Verification System

End-to-end stack for verifying that a clipper genuinely hit a campaign's goal,
across all user types and all supported verification sources. Built on top of
the Phase 3 persona/goal foundation; replaces the count-only stub from
earlier phases.

---

## 1. The shape of the problem

CreviaTube has three campaigner user types — **influencer**, **founder**,
**business** — each with different goal sets. A campaigner picks a goal at
campaign-creation time; once funded, clippers post promotional content; we
need to verify their work *cheated nothing* before releasing the bonus.

The verification stack covers every realistic path:

| Goal | Auto-verification | Manual fallback |
|---|---|---|
| views (YouTube) | YouTube Data API v3 polling | admin credit |
| views (TikTok) | clipper OAuth + Display API | admin credit |
| views (Instagram) | clipper OAuth + Graph API insights | admin credit |
| views (X) | n/a — paywalled | admin credit (primary) |
| follows / subscribes | conversion pixel + server postback | admin credit |
| clicks | tracking-link redirect (`/track/:code`) | admin credit |
| signups / leads / conversions | conversion pixel + server postback | admin credit |
| revenue | Shopify webhook + Stripe webhook + server postback | admin credit |
| code_redemptions | Shopify webhook | admin credit |
| installs | MMP postback (AppsFlyer / Adjust / Firebase) | admin credit |
| ugc_volume | submission approval + post URL | n/a — verification *is* the workflow |

Bot-flagged events are excluded from progress (they still land for audit).
Synthetic test events fired from the integration debug UI are excluded too.

---

## 2. Schema (migrations 0018, 0019)

### Migration 0018 — campaign goals v1
[migrations/0018_campaign_goals_v1.sql](../migrations/0018_campaign_goals_v1.sql)

- `account_type` enum gains `founder` (was `influencer | business`)
- `event_type` enum gains `purchase`, `lead`, `code_redemption` for the new
  goals. Legacy `deposit` / `trade` were stripped earlier (migration 0005).
- `clipper_campaigns` gains:
  - `post_url` (text) — the live URL of the clipper's post
  - `clipper_promo_code` (text, partial-unique) — globally-unique
    short code for offline / e-commerce attribution
- New `campaign_integrations` table — one row per campaign, holds the
  campaigner's per-receiver creds: `pixel_id`, `postback_secret`,
  `shopify_domain`, `shopify_webhook_secret`, `stripe_webhook_secret`,
  `mmp_provider` (CHECK enum: appsflyer / adjust / firebase), `mmp_app_id`,
  `mmp_api_key`. Unique-per-campaign + unique pixel_id.

### Migration 0019 — view-poll snapshots
[migrations/0019_view_poll_snapshot.sql](../migrations/0019_view_poll_snapshot.sql)

- `clipper_campaigns.last_view_count` (INTEGER NOT NULL DEFAULT 0)
- `clipper_campaigns.last_view_polled_at` (TIMESTAMP)
- Partial index `(application_status, post_url) WHERE application_status='approved' AND post_url IS NOT NULL`

### Schema-only (no SQL)
- `users.social_accounts.tiktok` JSON shape extended: `accessToken`,
  `refreshToken`, `expiresAt`, `refreshExpiresAt`, `openId`, `scope`,
  `connectedAt`
- `users.social_accounts.instagram` extended: `accessToken`, `expiresAt`,
  `businessAccountId`, `username`, `connectedAt`
- `campaigns.campaign_goals` JSON adds `revenueGoal`, `leadsGoal`,
  `codeRedemptionsGoal`, `ugcVolumeGoal`; `primaryGoal` enum extended

---

## 3. The goal catalog (single source of truth)

[shared/goal-options.ts](../shared/goal-options.ts)

`GOAL_CATALOG` is the one place that maps each goal id to:
- `audiences` — which user types see it
- `verificationSource` — pixel / webhook / MMP / tracking-link / etc.
- `requiredIntegrationFields` — which `campaign_integrations` columns the
  campaigner must populate
- `clipperMustProvide` — what the clipper submits (`post_url`, `promo_code`)
- `phase` — `v1` / `v2` (deferred) / `v3` (out-of-scope)

Read by:
- Campaign-creation UI (filter goals by `accountType`)
- Integration-setup UI (which connector cards to render)
- `POST /api/campaigns` server-side validation (reject mismatched goal/audience)
- Clipper-assignment UI (look up label/aggregation for progress display)

`goalsForAccountType(accountType, opts?)` is the helper. `getGoalDefinition(id)`
throws on unknown — callers must pass values from the catalog.

---

## 4. Verification receivers

All event-bearing receivers funnel through
`trackingService.recordTrackingEvent` so goal-completion checks fire
end-to-end on every credited event, regardless of source.

### 4.1 Conversion pixel (browser-side)
[backend/api/conversion-pixel.ts](../backend/api/conversion-pixel.ts) →
`GET /pixel/:pixelId?clipper={trackingCode}&event=signup&value=29.99`

- Public, unauthenticated — runs in the visitor's browser
- Resolves `pixelId` → campaign, `clipper` → clipper-campaign scoped to
  that campaign
- Allowlisted events: `signup, lead, purchase, conversion, subscribe,
  install, code_redemption`
- Returns a 1×1 transparent GIF on every path (including errors) so
  visitor browsers never see internals

### 4.2 Shopify webhook
[backend/api/shopify-webhook.ts](../backend/api/shopify-webhook.ts) →
`POST /api/webhooks/shopify/:campaignId`

- Topic: `orders/paid` (recommended) or `orders/create`
- HMAC verification: base64 `X-Shopify-Hmac-Sha256` against the
  campaign's `shopifyWebhookSecret`, `timingSafeEqual` compare
- Match `discount_codes[].code` against `clipper_promo_code` scoped to
  this campaign (one round-trip via `ANY(array)`)
- Per matched clipper, fires both a `purchase` event (`eventValue =
  total_price`) and a `code_redemption` event
- Idempotency via `shopify_order_id` in metadata — Shopify retries up to
  19× over 48h on non-2xx, so we always 2xx after HMAC passes

### 4.3 Stripe webhook
[backend/api/stripe-webhook.ts](../backend/api/stripe-webhook.ts) →
`POST /api/webhooks/stripe/:campaignId`

- `Stripe-Signature: t=<unix>,v1=<hex>` verified via shared
  `verifyTimestampedHmac` (5-min replay window)
- Handles `checkout.session.completed` (purchase + subscribe if
  mode=subscription), `payment_intent.succeeded` (purchase),
  `invoice.payment_succeeded` (purchase / renewal),
  `customer.subscription.created` (subscribe)
- Clipper resolution from Stripe `metadata.clipperCode` (preferred,
  matches `tracking_code`) → `metadata.clipperPromoCode` (fallback)
- Cents → dollars conversion built in
- Idempotency via Stripe event id

### 4.4 MMP postback
[backend/api/mmp-postback.ts](../backend/api/mmp-postback.ts) →
`GET/POST /api/postback/mmp/:campaignId`

- Token-auth via `?token=` matched with `timingSafeEqual` against
  `campaign_integrations.mmp_api_key`
- Single-shape 401 on auth failure (doesn't leak whether campaign
  exists or has MMP configured)
- After auth: every path returns 200 (with diagnostic `reason`) so MMPs
  stop retrying
- Event-name normalization: `install` / `signup|register` / `purchase|revenue` /
  `subscribe|subscription` → internal event types
- Idempotency via `mmp_external_id` in metadata
- Provider-specific URL templates surfaced in the integration UI for
  AppsFlyer / Adjust / Firebase

### 4.5 Generic server postback
[backend/api/server-postback.ts](../backend/api/server-postback.ts) →
`POST /api/postback/:campaignId`

- `X-Postback-Signature: t=<unix>,v1=<hex>` against `postback_secret`
- Body: `{ event, clipper_code, external_id, value?, metadata? }`
  (snake or camelCase accepted)
- Idempotency via `postback_external_id` in metadata
- Same allowlist as the conversion pixel
- Documented with copyable Node.js signing example in the integration UI

### 4.6 Tracking-link redirect (existing, pre-Phase-4)
`GET /track/:trackingCode` — clicks/views via the existing
`trackingService.handleTrackingCallback` path. Bot-detection middleware
flags suspicious traffic (`flagged_as_bot=true`) which is excluded from
goal-progress aggregation but still recorded for audit.

---

## 5. Public-API view polling

[backend/core/services/view-polling.ts](../backend/core/services/view-polling.ts)

Sweeps every 30 minutes (`VIEW_POLL_INTERVAL_MS`, configurable). Selects
approved clipper-campaigns with `post_url` on active `views`-goal
campaigns, dispatches per-platform, credits cumulative-delta as `view`
events with `eventValue=delta`.

### Per-platform support

| Platform | Requirement | Notes |
|---|---|---|
| YouTube | `YOUTUBE_API_KEY` env | Public Data API v3 — no OAuth needed. Quota: 1 unit per video per poll, 10k/day |
| TikTok | `TIKTOK_CLIENT_KEY` + clipper Login Kit OAuth | Display API `video.query` — owner-scoped |
| Instagram | `FACEBOOK_APP_ID` + clipper Business OAuth | Graph API `/insights?metric=plays` — Business or Creator account required |
| X / Twitter | n/a | API paywalled — manual credit only |

`viewPollingSupported(platform, ctx?)` is the single source of truth for
"can this view be auto-verified?" — used by both the sweep loop and the
clipper-assignment UI, which guarantees they never disagree.

### URL fingerprint parser

`fingerprintPostUrl(rawUrl)` recognizes:
- YouTube: `watch?v=`, `youtu.be/`, `/shorts/`
- TikTok: `tiktok.com/@user/video/{id}` (numeric video id)
- Instagram: `/reel/{code}`, `/p/{code}`, `/tv/{code}` (post code)
- X: `x.com/u/status/{id}` (tweet id)

### Skip-reason taxonomy

`PollResult.skipped` is `Record<SkipReason, number>` so admin sweeps
show breakdowns like `{ tiktok_oauth_required: 7,
instagram_oauth_required: 3 }`. Reasons:
- `unknown_platform`, `no_youtube_api_key`,
  `tiktok_oauth_required`, `instagram_oauth_required`,
  `x_paid_api_required`

---

## 6. Per-clipper OAuth flows (TikTok, Instagram)

### 6.1 TikTok Login Kit
- API client: [backend/lib/tiktok-api.ts](../backend/lib/tiktok-api.ts)
- Routes: [backend/api/oauth-tiktok.ts](../backend/api/oauth-tiktok.ts)
- Endpoints: `GET /api/oauth/tiktok/start`, `GET /api/oauth/tiktok/callback`
- Scopes: `user.info.basic`, `video.list`
- CSRF state in `req.session.tiktokOAuth` keyed by user id, 10-min TTL
- Tokens: 24h access + 365d refresh; rotated on every refresh
- `ensureFreshAccessToken` proactively refreshes within 60s of expiry

### 6.2 Instagram Graph API (via Facebook Login)
- API client: [backend/lib/instagram-api.ts](../backend/lib/instagram-api.ts)
- Routes: [backend/api/oauth-instagram.ts](../backend/api/oauth-instagram.ts)
- Endpoints: `GET /api/oauth/instagram/start`, `GET /api/oauth/instagram/callback`
- Scopes: `pages_show_list, instagram_basic, instagram_manage_insights, business_management`
- Three-step token dance: code → short-lived (1h) → long-lived (60d) →
  `/me/accounts` → first Page with linked IG Business Account
- Refreshes proactively within 7 days of expiry
- Shortcode → media id resolution by paginating `/{ig_user}/media`
  (capped at 100 most-recent posts in v1)
- `getMediaViewCount` returns null for media kinds without `plays`
  (static images, very-recent posts) — sweep treats null as skip

### 6.3 Open-redirect-safe `returnTo`
Both flows accept `?returnTo=` for post-OAuth redirect. `safeReturnTo`
filters: must start with `/`, not `//` (protocol-relative),
no CR/LF (header-splitting).

### 6.4 UI on the clipper-assignment page
[client/src/pages/clipper-assignment.tsx](../client/src/pages/clipper-assignment.tsx)

- Green success alert when relevant + connected
- Blue "Connect <platform>" alert with action button when relevant +
  not connected + server config present
- Amber "manual verification required" fallback for X / unknown / no-API-key
- Toast on round-trip via `?<provider>OAuth=connected|error` URL params,
  cleared via `history.replaceState`

---

## 7. Goal-completion logic

[backend/core/services/campaign-completion.ts](../backend/core/services/campaign-completion.ts)
is the live path called from `trackingService.recordTrackingEvent` after
every credited event. The parallel batch path lives in
[backend/core/services/goal-completion.service.ts](../backend/core/services/goal-completion.service.ts)
(used by admin endpoints + scheduled re-checks).

### Aggregation

`getClipperProgress` returns three columns per event type:
- `rowCount` — `count(*)`. Used for `totalPurchases` display (number of orders).
- `countSum` — `sum(coalesce(event_value, 1))`. Used for count-based
  goals. Single-event writes (`value=1` default) AND delta-bearing
  writes (view-polling: `value=N`) both add up correctly.
- `valueSum` — `sum(event_value)`. Used for revenue (purchase events
  where `event_value` is the order amount in $).

### Filters applied

- `flaggedAsBot=false` — bot-detected events excluded from goal
  progress (still recorded for audit)
- `metadata NOT LIKE '%"test":true%'` — synthetic events from the
  integration test tool excluded; plain LIKE rather than JSONB cast
  so malformed metadata can't crash the query

### Goal-target key map

Most targets stored as `${goalType}Goal`. Two exceptions because
camelCase JSON keys read better than snake_case concat:
- `code_redemptions` → `codeRedemptionsGoal`
- `ugc_volume` → `ugcVolumeGoal`

### Reward-rate key map

`GOAL_TO_RATE_KEY` — goal type → reward-rate key. Mirrors the
client-side mapping in `campaign-creation.tsx`. Phase 4 additions:
`revenue→purchase`, `leads→lead`, `code_redemptions→codeRedemption`,
`ugc_volume→post`. Revenue-rate is treated as a percentage of revenue
in `calculateCompletionReward` (other goals: rate × count).

### UGC-volume special case

Has no tracking events — verification is the submission record itself.
`getClipperProgress` reads `applicationStatus='approved'` AND `postUrl
IS NOT NULL` for ugc_volume goals. Approval → completion check fired
immediately ([storage.ts](../backend/storage.ts) →
`reviewClipperApplication`). Post-URL submission also re-checks
([clipper-assignment.ts](../backend/api/clipper-assignment.ts) →
`POST /post-url`).

---

## 8. Operator surface

### Campaign-integration page
[client/src/pages/campaign-integration.tsx](../client/src/pages/campaign-integration.tsx)
→ `/campaigns/:id/integration` (campaign owner or admin)

- One-time-reveal of `pixelId` + `postbackSecret` (hidden behind
  `hasPostbackSecret: true/false` flags afterward)
- "Regenerate" buttons for both — old values stop working immediately
- Conditionally renders Shopify / Stripe / MMP cards based on the
  campaign's primaryGoal `requiredIntegrationFields`
- Provider-specific MMP postback URL templates (AppsFlyer / Adjust /
  Firebase macros)
- Postback signing example in Node.js with copy button
- Test-wiring card — fire synthetic events through the goal-completion
  pipeline. Tagged `metadata.test=true` so they show in diagnostics
  but never move real progress.
- Recent-activity panel — auto-refreshes every 5s, shows last 20
  events with source / value / test flag / bot flag / relative time

### Manual-credit endpoint + UI
[backend/api/admin-credit.ts](../backend/api/admin-credit.ts) →
`POST /api/admin/credit-event`

- Admin-only
- Body: `{ clipperCampaignId, eventType, count|value, reason,
  evidenceUrl?, externalId? }`
- Caps: `MAX_COUNT=1M`, `MAX_VALUE=1M`, reason required (≤ 1000 chars)
- Triggers goal-completion check after insert — credit that crosses
  threshold releases bonus immediately
- Audit trail: `admin_event_credited` to `metric_events` + structured
  stdout
- UI: [client/src/pages/admin-credit-event.tsx](../client/src/pages/admin-credit-event.tsx)
  → `/admin/credit-event`, linked from `/admin/metrics`

### Admin manual view-poll trigger
`POST /api/admin/poll-views` runs the YouTube-and-friends sweep on
demand and returns `PollResult` with the per-reason skip breakdown.

---

## 9. Clipper surface

### Application flow
- Apply: `POST /api/campaigns/:id/apply` (existing)
- Creator approves: `storage.reviewClipperApplication`
  - Mints unique 8-char promo code from a no-ambiguous-glyphs alphabet
    (no I/O/0/1) on first approval
  - Re-approval preserves the existing code so live posts keep
    attributing
  - Fires UGC-volume completion check

### Assignment detail page
[client/src/pages/clipper-assignment.tsx](../client/src/pages/clipper-assignment.tsx)
→ `/clipper/campaigns/:id` (clipper-or-admin only)

- Tracking link with copy button — embed in bio / post description
- Promo code (large monospace + copy)
- Post URL submission form — fires goal-completion check on save
- Progress bar with goal-aware formatting (`$1,234.56` for revenue,
  `1,234` for counts)
- Coverage banner: green connected / blue Connect-OAuth /
  amber manual-only

### Clipper-assignment GET endpoint
`GET /api/clipper-campaigns/:id` returns `{ assignment, campaign,
progress, coverage }`. The `coverage` block:
```ts
{
  platform: "youtube" | "tiktok" | "instagram" | "x" | "unknown";
  goalType: string | null;
  relevant: boolean;          // true when goal=views AND platform matters
  autoVerified: boolean;
  reason: SkipReason | null;
  needsClipperOAuth: boolean;
  tiktokConnected: boolean;
  instagramConnected: boolean;
  instagramUsername: string | null;
}
```

---

## 10. Operator config — env vars

| Var | Used for | Required? |
|---|---|---|
| `YOUTUBE_API_KEY` | YouTube view polling | Optional — sweep no-ops without it |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth | Required for TikTok view polling |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Instagram OAuth | Required for IG view polling |
| `VIEW_POLL_INTERVAL_MS` | Sweep cadence (default 30 min) | Optional |
| `SCHEDULER_DISABLED` | Set `true` for tests / cold dev | Optional |
| `APP_URL` | Base URL for OAuth redirect URIs and pixel embeds | Required for production |

OAuth redirect URIs to register in each provider's developer portal:
- TikTok: `${APP_URL}/api/oauth/tiktok/callback`
- Facebook (for Instagram): `${APP_URL}/api/oauth/instagram/callback`

---

## 11. New API endpoints (full list)

```
POST   /api/campaigns                              campaign creation, validates goal vs accountType
GET    /api/campaigns/:id/integration              read integration config (secrets redacted)
PUT    /api/campaigns/:id/integration              upsert integration; ?regenerate=pixel|postback rolls secrets
GET    /api/campaigns/:id/integration/recent-events    diagnostic event stream
POST   /api/campaigns/:id/integration/test         fire synthetic test event
GET    /pixel/:pixelId                             conversion-pixel receiver (1×1 GIF)
POST   /api/webhooks/shopify/:campaignId           Shopify orders webhook
POST   /api/webhooks/stripe/:campaignId            Stripe events webhook
GET    /api/postback/mmp/:campaignId               MMP postback (AppsFlyer / Adjust / Firebase)
POST   /api/postback/mmp/:campaignId               MMP postback (POST variant)
POST   /api/postback/:campaignId                   generic server postback
GET    /api/oauth/tiktok/start                     TikTok Login Kit start
GET    /api/oauth/tiktok/callback                  TikTok callback
GET    /api/oauth/instagram/start                  Instagram OAuth start
GET    /api/oauth/instagram/callback               Instagram callback
GET    /api/clipper-campaigns/:id                  clipper assignment detail
POST   /api/clipper-campaigns/:id/post-url         clipper submits post URL
POST   /api/admin/poll-views                       manual view-polling sweep
POST   /api/admin/credit-event                     admin manual credit
```

---

## 12. Known limitations / future work

- **TikTok / Instagram production review.** Both providers require app
  audit before sensitive scopes (`video.list`, `instagram_manage_insights`)
  work outside the sandbox. Engineering work is done; ops decision.
- **IG media-id caching.** First poll resolves shortcode → media id by
  paginating `/media`. Caching the resolved id on `clipper_campaigns`
  would cut subsequent calls to one. Small follow-up.
- **TikTok batched polling.** v1 hits `video.query` once per video.
  Display API supports up to 20 ids per call — group by clipper to
  amortize.
- **Token-rotation alerts.** Long-lived IG tokens silently expire
  after 60d if a clipper goes inactive. Email/in-app warning at T-7d
  would be friendly.
- **Multi-page IG.** v1 picks the first Page with an IG Business
  Account. Users with multiple IG-linked Pages get no chooser.
- **X / Twitter.** Permanent manual-credit until the platform
  decides this market matters.
- **`return null` vs `Element` typing.** The wouter `ProtectedRoute`
  prop typing forced one workaround in `admin-credit-event.tsx` (return
  empty layout instead of null on non-admin). Worth tightening later.

---

## Appendix A — files touched

### New backend files (Phase 4)
- `migrations/0018_campaign_goals_v1.sql`
- `migrations/0019_view_poll_snapshot.sql`
- `shared/goal-options.ts`
- `backend/api/campaign-integrations.ts`
- `backend/api/conversion-pixel.ts`
- `backend/api/shopify-webhook.ts`
- `backend/api/stripe-webhook.ts`
- `backend/api/mmp-postback.ts`
- `backend/api/server-postback.ts`
- `backend/api/oauth-tiktok.ts`
- `backend/api/oauth-instagram.ts`
- `backend/api/clipper-assignment.ts`
- `backend/api/admin-credit.ts`
- `backend/lib/webhook-signing.ts`
- `backend/lib/tiktok-api.ts`
- `backend/lib/instagram-api.ts`
- `backend/core/services/view-polling.ts`

### New frontend files (Phase 4)
- `client/src/pages/campaign-integration.tsx`
- `client/src/pages/clipper-assignment.tsx`
- `client/src/pages/admin-credit-event.tsx`

### Significantly extended files
- `shared/schema.ts` — accountType enum, eventTypeEnum, campaignGoals JSON,
  clipperCampaigns proof fields + view-poll snapshot, campaignIntegrations
  table, socialAccounts JSON
- `backend/core/services/campaign-completion.ts` — three-column
  aggregation, bot+test filters, all 11 v1 goals
- `backend/core/services/goal-completion.service.ts` — same
- `backend/core/services/tracking-service.ts` — `TrackedEventType` union,
  eventValue passthrough
- `backend/storage.ts` — promo-code minting, UGC approval trigger
- `backend/routes.ts` — registered every new router, server-side
  goal/accountType validation
- `backend/lib/scheduler.ts` — view-polling tick
- `backend/lib/metrics.ts` — `admin_event_credited` taxonomy
- `client/src/pages/campaign-creation.tsx` — new goals, persona-aware
  goal picker, reward-rate fields
- `client/src/pages/auth-page.tsx` — founder signup option
- `client/src/pages/campaign-funding.tsx` — "Configure integration" link
- `client/src/pages/admin-metrics.tsx` — "Manual credit" link
- `client/src/features/personas/types.ts` + `resolver.ts` — founder
  accountType
- `client/src/features/dashboard/components/clipper-dashboard.tsx` —
  "Manage" button on each tracking-link row
- `client/src/App.tsx` — three new routes
