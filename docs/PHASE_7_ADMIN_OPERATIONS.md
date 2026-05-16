# Phase 7 — Admin Operations & Notifications

The platform has shipped Phases 4-6 (verification stack, content QA, Founding
Creator Premium with guarantee), but the admin surface hasn't kept up. Several
admin endpoints have no UI, several admin pages show mock data, no admin
notifications are wired, and critical ops levers (cancel a campaign, override
the platform fee, raise the Founding seat cap) don't exist at all. This phase
fills those gaps.

---

## 1. Audit findings

### Admin pages that work
- `/admin/users` — fully wired (search, KYC patch, status patch, delete)
- `/admin/metrics` — real funnel + time-series + persona mix from `metric_events`
- `/admin/credit-event` — real manual credit posting
- `/admin/bot-monitoring` — real, but **not linked from the admin nav**
- `/admin/control` (ComprehensiveAdminDashboard) — real stats, but **not linked from the admin nav**, and references types for `/api/admin/notifications` and `/api/admin/enterprise-requests` that don't exist

### Admin pages showing **mock data**
- `/admin/revenue` — `/api/admin/revenue-transactions` returns hardcoded mock rows ([routes.ts:2533-2538](../backend/routes.ts#L2533-L2538))
- `/admin/payouts` — `/api/admin/payout-stats` and `/api/admin/payout-history` return hardcoded numbers and 4 mock rows ([routes.ts:2621-2682](../backend/routes.ts#L2621-L2682))
- `/admin/revenue-stats` — `sources.subscriptions / apiAccess / transactions` are hardcoded `0` ([routes.ts:2510-2512](../backend/routes.ts#L2510-L2512))

### Admin backend endpoints without a UI
- `POST /api/admin/poll-views` — curl-only manual view-poll trigger
- `POST /api/admin/process-goal-completions` — curl-only
- `POST /api/admin/guarantees/sweep` — Phase 6 Slice D; admin has to curl this daily
- `GET  /api/admin/guarantees/pending-refunds` — known gap; the refund queue we promised
- `POST /api/admin/guarantees/:userId/mark-refunded` — same
- `GET  /api/admin/transactions` — orphan endpoint, no consumer
- `GET  /api/admin/campaigns` — orphan endpoint, no admin "all campaigns" page

### Admin notifications
**Zero wired.** No `ADMIN_EMAIL` env var, no `notifyAdmin` helper, no cc/bcc on `sendEmail`. Three audit checks (signup / funding / subscription) all confirmed silent.

### Dead admin code
- `backend/modules/admin/admin.service.ts` — only self-reference; imports schemas that don't exist
- `backend/core/database/connection.ts` — only importer is the dead service above; imports `community-schema` + `community-monetization-schema` that were deleted
- `client/src/features/admin/components/admin-analytics.tsx` — orphan, not routed

### Missing admin tooling (greenfield)
- Cancel campaign + refund the unspent escrow
- Cancel subscription (non-guarantee) + refund pro-rata
- Audit log of admin actions (who suspended whom, who refunded what, when, why)
- Configurable platform fee (hardcoded `0.20` in 4 places)
- Configurable Founding seat cap (hardcoded `50`)
- Withdrawal approval queue (endpoint lists withdrawals but no approve/reject UI)
- Email-send failure dashboard (rows exist in `email_log` with `status='failed'`)

---

## 2. Locked design decisions

- **Notifications go to one admin email for v1.** `ADMIN_EMAIL` env var, single recipient. Multi-admin distribution lists can plug in later as a generalisation.
- **Per-event emails for v1, digest if it gets noisy.** Three triggers ship in Slice A (signup, funding, subscription). Re-evaluate cadence after a week of real volume.
- **Fix mock data in-place, don't add new dashboards.** The /admin/revenue and /admin/payouts pages exist; pointing them at real queries is one PR per endpoint. Resist the urge to redesign.
- **Audit log is its own table, not metric_events.** Different access pattern (admin-action history) and different retention story (forever vs. rolling). New `admin_audit_log` table seeded by every state-changing admin endpoint.
- **Refunds (campaign cancel, subscription cancel) follow the guarantee pattern.** Mark `refund_pending`, surface in queue, admin pastes the txHash. No automated treasury signing.
- **Configurable platform fee + seat cap stored as runtime config, not env vars.** A `platform_config` key/value table lets us flip values without a deploy. Cached in memory with a 60s TTL.

---

## 3. Slices

| # | Slice | Schema change | Effort |
|---|---|---|---|
| **A** | **Admin notifications**. `ADMIN_EMAIL` env var, `notifyAdmin(kind, subject, react)` helper short-circuiting when unset, 3 templates: `AdminNewSignup`, `AdminCampaignFunded`, `AdminSubscriptionPaid`. Wired at the existing trigger sites. | None | ~2 hrs |
| **B** | **Guarantee refund queue UI**. `/admin/refunds` page surfaces the queue from Phase 6 Slice D. Two actions per row: copy-wallet-address (for the manual treasury USDC send) and mark-refunded (paste txHash). "Run sweep now" button at the top. | None | ~3 hrs |
| **C** | **Replace mock data**. Three endpoints get real queries: `/api/admin/revenue-transactions` (recent `payments.confirmed` rows + campaign-funding events), `/api/admin/payout-stats` (sum + count from `payouts`), `/api/admin/payout-history` (recent payout rows). Drop the orphan `/api/admin/transactions`. | None | ~3 hrs |
| **D** | **Admin nav cleanup**. Add Bot monitoring, Refunds, Control to the admin sidebar. Fix "Campaigns" link (currently goes to the creator-facing page) — point at `/admin/campaigns` (which gets a basic admin all-campaigns list page using the orphan `GET /api/admin/campaigns` endpoint). Remove dead admin code (`admin.service.ts`, `connection.ts`, `admin-analytics.tsx`). | None | ~3 hrs |
| **E** | **Cancel campaign + refund unspent escrow**. `POST /api/admin/campaigns/:id/cancel` flips the campaign status, marks the budget escrow as `refund_pending`, surfaces in the existing refunds queue from Slice B. | Maybe a `cancellation_reason` column on `campaigns`; `escrow.status='refund_pending'` already supported | ~4 hrs |
| **F** | **Cancel subscription**. `POST /api/admin/subscriptions/:userId/cancel` for non-guarantee admin cancellations (refund pro-rata or zero, admin choice). Same `refund_pending` flow. | None | ~2 hrs |
| **G** | **Audit log**. New `admin_audit_log` table (`actor_id`, `action`, `target_type`, `target_id`, `payload`, `created_at`). All state-changing admin endpoints write a row. Read-only `/admin/audit` page with filters. | New table | ~5 hrs |
| **H** | **Configurable platform config**. `platform_config` table (key/value), 60s in-memory cache. `/admin/config` page surfaces the two starter knobs: platform fee bps (currently 2000) and Founding seat cap (currently 50). Migration backfills the current values. | New table | ~4 hrs |
| **I** | **Withdrawal approval queue**. `admin-payouts.tsx` already lists withdrawals; add approve/reject buttons that call the existing endpoints. | None | ~2 hrs |

**Total effort A-I: ~28 hours.**

Order: **A → B → C → D → E → F → G → H → I**. A unblocks visibility on what's happening on prod. B and C are high-leverage finishes of work already started. The rest is roughly priority order.

---

## 4. New endpoints + UI surfaces

**Slice A**
- New `backend/lib/admin-notify.ts` exporting `notifyAdmin(kind, subject, reactElement)`. Short-circuits when `process.env.ADMIN_EMAIL` unset (so dev/local doesn't try to email).
- New `EmailKind` variants: `admin_new_signup`, `admin_campaign_funded`, `admin_subscription_paid`.
- Templates: `backend/emails/admin-new-signup.tsx`, `admin-campaign-funded.tsx`, `admin-subscription-paid.tsx`. Terse: who, what, when, dollar amounts, deep link to the relevant admin page.
- Call sites: `backend/auth.ts:131-155` (signup), `backend/api/payments.ts:215-226` (fundCampaign), `backend/api/payments.ts:202-214` (activateSubscription).

**Slice B**
- New page `client/src/pages/admin-refunds.tsx`, route `/admin/refunds`.
- Reads `GET /api/admin/guarantees/pending-refunds`. Each row shows: user, baseline app count, refund-to wallet, USDC amount, original tx (Basescan link). Mark-refunded modal takes the on-chain txHash + posts to `/api/admin/guarantees/:userId/mark-refunded`.
- "Run sweep" button posts to `/api/admin/guarantees/sweep` and shows the result toast.

**Slice C**
- Rewrite `GET /api/admin/revenue-transactions` ([routes.ts:2533-2538](../backend/routes.ts#L2533-L2538)) — join `payment_intents` ∪ `payouts` ordered by time desc, page-limited to ~50.
- Rewrite `GET /api/admin/payout-stats` ([routes.ts:2621-2628](../backend/routes.ts#L2621-L2628)) — `SUM(amount)`, `COUNT(*)`, `COUNT(*) WHERE status='failed'`.
- Rewrite `GET /api/admin/payout-history` ([routes.ts:2641-2682](../backend/routes.ts#L2641-L2682)) — `SELECT FROM payouts ORDER BY created_at DESC LIMIT 50`.
- Delete `GET /api/admin/transactions` (orphan).

**Slice D**
- Add nav entries in `dashboard-layout.tsx:47-59`: Bot monitoring → `/admin/bot-monitoring`, Refunds → `/admin/refunds`, Control → `/admin/control`. Fix "Campaigns" → `/admin/campaigns`.
- New page `client/src/pages/admin-campaigns.tsx` reading `GET /api/admin/campaigns`. Simple table.
- Delete `backend/modules/admin/admin.service.ts`, `backend/core/database/connection.ts`, `client/src/features/admin/components/admin-analytics.tsx`.

**Slice E**
- `POST /api/admin/campaigns/:id/cancel` body `{ reason: string }`. Updates campaign status, marks the escrow row `refund_pending`, writes audit log row (or holds for Slice G).

**Slice F**
- `POST /api/admin/subscriptions/:userId/cancel` body `{ reason: string, refundAmountUsdc?: string }`. Marks subscription `refund_pending` (if refund > 0) or `cancelled` directly. Audit log row.

**Slice G**
- Migration: `admin_audit_log` table.
- New `backend/lib/audit.ts` exporting `logAdminAction({ actor, action, targetType, targetId, payload })`.
- New page `client/src/pages/admin-audit.tsx`, route `/admin/audit`. Filters: actor, action, date range.

**Slice H**
- Migration: `platform_config(key, value, updated_at)` with rows pre-seeded: `platform_fee_bps=2000`, `founding_seats_total=50`.
- New `backend/lib/platform-config.ts` reading from DB with 60s in-memory cache.
- Replace the 4 hardcoded `0.20` sites + 1 hardcoded `50` site with the cached lookup.
- New page `client/src/pages/admin-config.tsx`, route `/admin/config`. Renders each key with an edit-in-place input.

**Slice I**
- Approve / reject buttons in `admin-payouts.tsx`, wired to existing `PATCH /api/admin/withdrawals/:id`.

---

## 5. Migrations summary

| Migration | Purpose |
|---|---|
| `0025_admin_audit_log.sql` | Slice G — new audit log table |
| `0026_platform_config.sql` | Slice H — config k/v table, pre-seeded with current defaults |
| `0027_campaign_cancellation.sql` | Slice E — optional `cancellation_reason` column on campaigns |

---

## 6. Deferred

- **Impersonate-as-user** (support tool). High value but high security risk (session forgery surface) — needs dedicated audit and a strict consent flow before any admin should be allowed to assume another user's identity.
- **Feature flags admin UI**. `platformFeatures` table exists ([routes.ts:2764+](../backend/routes.ts#L2764)) but per-user overrides aren't designed yet. Defer until we have a real flag with real users.
- **Email-send failure dashboard**. `email_log.status='failed'` rows are visible via raw DB; an admin page to retry them is real value but not urgent — email failures are rare and admin notifications (Slice A) will surface the worst cases as they happen.
- **Daily / weekly digest** instead of per-event admin emails. Wait until volume actually justifies it.
- **Bot-detection threshold alerting** (admin email when a bot event crosses score > X). Useful but needs the threshold story sorted first.
- **Slack / Telegram webhook delivery** alongside email. Trivial to add once `notifyAdmin` exists, but pick a channel after watching email noise for a week.
