# Phase 6 — Premium Monetization (Grand Slam Offer)

The `/premium` page currently advertises four perks and accepts USDC on Base,
but **none of the perks are wired** — payment flips `subscriptions.tier` and
nothing downstream reads it. This phase makes Premium actually deliver value,
repositions it toward creators (the audience that can realistically pay), and
applies Hormozi's Grand Slam Offer framing so the offer pulls instead of
needing to be pushed.

---

## 1. Current state (audit findings)

| Perk advertised | Wired? | Evidence |
|---|---|---|
| Priority placement in clipper marketplace | ❌ | Marketplace sorts by `desc(campaigns.createdAt)` — no premium branch |
| Advanced analytics on campaigns + payouts | ❌ | Only file reading `subscription.tier` is `premium.tsx` itself |
| Lower platform fee on cold-outreach campaigns | ❌ | Fee hardcoded `total * 0.20` at [payments.ts:295](../backend/api/payments.ts#L295) |
| Premium badge on profile | ❌ | No Crown/premium check on profile or leaderboard cards |

Other findings:
- `/premium` nav shown to **both clippers and creators**, all four advertised perks are clipper-centric — incoherent.
- `backend/monetization/subscription-routes.ts` and `communitySubscriptions` table are orphan code — feature-flag map exists but nothing consumes it. Delete in cleanup slice.
- Founders / businesses already have `role='creator'` + distinct `accountType` — not a separate user type. One creator tier covers all three personas.
- **Zero current paid subscribers** (confirmed). No refund flow needed; we can clean-slate.

---

## 2. Locked design decisions

- **Audience-first**: ship Creator Premium first (bigger transactions, more obvious money perks). Loop back to Clipper Premium with redesigned perks later.
- **Stop selling vapor**: hide the `/premium` nav immediately. Page route still serves but unlinked until perks ship.
- **Platform fee stays at 20%** — industry comp (Whop, Crewdog, YouTube affiliate) is 20–30%, so we're not aggressive. No fee discount means the headline perk has to come from elsewhere.
- **Headline perk = Priority Marketplace Placement** — Premium creators' campaigns surface first in the clipper feed, clearly labelled "Featured". Drives more applications, faster fulfillment. Real, measurable ROI.
- **Pricing**: **$15 / 30 days during Founding period (first 50 creators, price locked for life)** → **$29 / 30 days after**. The price-lock is the scarcity engine.
- **Naming**: drop "Premium" (generic). Use **"Founding Creator"** during seat-cap → **"Creator Pro"** after. Naming carries the scarcity.
- **30-day money-back guarantee in USDC** — risk reversal. If your campaigns don't get measurably more applications in 30 days, full refund to your wallet, no friction.
- **No grandfathering needed** — zero existing subscribers.
- **Delete `communitySubscriptions` + `subscription-routes.ts`** in cleanup slice.

---

## 3. The Grand Slam Offer (page copy direction)

Hormozi's value equation: `Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)`. Maximize the numerator, minimize the denominator, stack the offer until the buyer feels stupid saying no.

### Dream outcome (concrete, not fuzzy)
> "Your next campaign gets 3× more clipper applications in the first 48 hours."

Not "priority placement." A specific, measurable thing the buyer can imagine.

### Offer stack (so $15 feels like $150)

**Core**
1. Featured placement at the top of the clipper marketplace for every active campaign
2. Advanced analytics dashboard — per-campaign breakouts, time-to-conversion, top-clipper-per-goal
3. "Founding Creator" badge next to your name on every campaign + clipper-review interaction

**Bonuses (named, valued, time-limited)**
4. **24-hour priority support** — direct Slack/email channel, response in <24h
5. **Early access to new top-tier clippers** — see new diamond/platinum tier clippers 48h before public, message them first
6. **Free campaign brief review** (one-time, manual, us reviewing the brief and suggesting improvements before you fund)

### Risk reversal
**30-day on-chain money-back guarantee** — if your campaigns don't get measurably more applications in 30 days, USDC refunded to your wallet automatically. No back-and-forth, no support ticket.

Implementation: snapshot application counts on signup; cron job at day 30 compares. If <X% lift, auto-trigger refund + cancel subscription.

### Scarcity engine
**Founding Creator — first 50 seats at $15/mo, locked for life.**
After 50, price moves to $29/mo. Public counter on the page: "37 of 50 Founding seats remaining."

This is the strongest lever at this stage — converts price-sensitive early creators *and* gives them a reason to refer.

### Urgency (optional, layered on top of scarcity)
"Founding seats close on [DATE]" — if scarcity alone doesn't drive enough urgency in week 1.

### Time delay
"Your campaigns are Featured within 1 hour of upgrading." Set the expectation that value is immediate, not "after the next billing cycle."

### Effort & sacrifice
One-click upgrade. USDC on Base (already supported). The discount applies to every existing campaign automatically — no per-campaign re-configuration.

---

## 4. Slices (each a mergeable PR)

| # | Slice | Schema change | Effort |
|---|---|---|---|
| **A** | **Nav-hide**. Remove `/premium` from clipper + creator sidebar nav. Page route still serves but unlinked. No refund flow needed (zero subscribers). | None | ~30 min |
| **B** | **Priority marketplace placement**. Premium creators' campaigns get a `featured_until` window; marketplace queries sort featured rows above the rest with a clear "Featured" label. | Add `is_featured boolean` or computed-from-creator-subscription on `campaigns` (read-side join is cleaner) | ~3 hrs |
| **C** | **Founding Creator page + checkout**. Rebuild `/premium` with the Grand Slam page (copy in §3), seat counter ("N of 50 remaining"), 30-day guarantee block, founding-seat lock-in. Re-enable nav for creators only. | New table `founding_seats` (id, taken, taken_at, user_id) seeded with 50 rows. Or just a counter row + transactional decrement. | ~5 hrs |
| **D** | ✅ **30-day money-back guarantee mechanism**. Snapshot baseline application counts at subscription start; sweep evaluates lift; flips to `refund_pending` if lift < threshold (1.5× baseline, or 5 absolute for zero-baseline creators). Admin queue + manual USDC refund out of treasury, audited via `refund_tx_hash`. Triggered email goes out same day. | `baseline_application_count`, `baseline_snapshotted_at`, `guarantee_evaluated_at`, `guarantee_triggered`, `refund_tx_hash` on `subscriptions` | shipped |
| **E** | **Advanced analytics page**. New `/dashboard/analytics` route, Premium-gated. Free creators get a teaser card → upgrade CTA. | None — reads from existing tables | ~5 hrs |
| **F** | **"Founding Creator" badge**. Render a crown badge next to creator names on clipper-side campaign cards, funding modal, and clipper-review interactions. | None | ~2 hrs |
| **G** | **Cleanup**. Delete `backend/monetization/subscription-routes.ts` + `communitySubscriptions` table (after confirming zero rows). | Drop `community_subscriptions` + `subscription_plans` | ~1 hr |
| **H** | **Clipper Premium v2** (deferred, ships after creator side is stable). New perks: leaderboard badge, rank-trend graph, faster review queue position in Premium creators' campaigns. Stays at $5/30d. | Add `plan_kind text` ('creator' \| 'clipper') on `subscriptions` | ~5 hrs |

**Order**: A → C → B → F → D → E → G → H. C ships before B because the page needs to exist before we can drive traffic to a "Featured" perk. F (badge) is cheap and ships parallel to B.

Total effort A–G: ~21 hours. H is ~5 hours, deferred.

---

## 5. New endpoints + UI per slice

**Slice A** — no new endpoints. Remove nav items in `dashboard-layout.tsx`.

**Slice B** — Priority placement
- `GET /api/campaigns` (and the marketplace queries) join `subscriptions` and `ORDER BY (is_subscription_active DESC, created_at DESC)` so Featured rows float to the top.
- Marketplace card UI gets a `<FeaturedBadge />` (subtle gold pill) when the row's creator has active subscription.

**Slice C** — Founding Creator page + seat cap
- New endpoint `GET /api/founding-seats/status` → `{ taken: number, total: 50, isUserFounder: boolean, currentPrice: 15 | 29 }`.
- New endpoint `POST /api/founding-seats/claim` — atomic seat claim during checkout. Idempotent on `user_id`.
- New table `founding_seats(id, user_id nullable, claimed_at)` pre-seeded with 50 rows.
- Re-enable nav for `user.role === 'creator'` only.
- New page copy in `premium.tsx` per §3.

**Slice D** — Guarantee mechanism
- At subscription activation, snapshot `baseline_application_count` (sum of applications across creator's active campaigns in the prior 30 days).
- Cron job `evaluate-guarantees.ts` runs daily; for subscriptions hitting day 30, compares current 30-day app count to baseline. If lift < 50%, triggers refund:
  - USDC refund to payer's wallet from platform reserve
  - `UPDATE subscriptions SET status='refunded', guarantee_triggered=true`
  - Email both directions ("we refunded you" + internal "guarantee fired")
- New `GET /api/subscription/guarantee-status` returns lift-to-date so the creator can see progress.

**Slice E** — Advanced analytics
- New page `client/src/pages/creator-analytics.tsx`, route `/dashboard/analytics`.
- New endpoint `GET /api/creator/analytics` — Premium-gated, returns per-campaign breakouts, time-to-conversion, top-clipper-per-goal.
- 403 with `{ requiresPremium: true }` for free creators; frontend teaser links to `/premium`.

**Slice F** — Badge
- `<FoundingCreatorBadge userId={creatorId} />` reads from `GET /api/users/:id/premium-status` → `{ isPremium, isFounder }`.
- Render in: clipper-side campaign list cards, funding modal, creator profile views, application review modal header.

**Slice G** — Cleanup
- Migration: `DROP TABLE IF EXISTS community_subscriptions; DROP TABLE IF EXISTS subscription_plans;`.
- Delete `backend/monetization/subscription-routes.ts` and unmount.

**Slice H** (deferred) — Clipper Premium
- Reuse `subscriptions` with new `plan_kind` column.
- Clipper perks: leaderboard badge, rank-trend graph, review-queue priority in Premium creators' campaigns.

---

## 6. Migrations summary

| Migration | Purpose |
|---|---|
| `0023_founding_seats.sql` | Slice C — `founding_seats(id uuid, user_id varchar nullable, claimed_at timestamp)`, pre-seeded 50 rows |
| `0024_subscription_guarantee.sql` | Slice D — add `baseline_application_count int`, `evaluated_at timestamp`, `guarantee_triggered boolean` to `subscriptions` |
| `0025_drop_community_subscriptions.sql` | Slice G — remove orphan tables |
| `0026_subscription_plan_kind.sql` | Slice H — adds `plan_kind text` on `subscriptions` |

---

## 7. Page mockup (Slice C target)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 👑 FOUNDING CREATOR                                  🟢 37 of 50 left    │
│                                                                          │
│ Get 3× more clipper applications on your next campaign.                  │
│                                                                          │
│ $15/mo · USDC on Base · Locked for life — even after we raise to $29.    │
│                                                                          │
│ [ Claim my Founding seat → ]                                             │
└──────────────────────────────────────────────────────────────────────────┘

WHAT YOU GET ($150 of value for $15)

  ✓ Featured placement at the top of the clipper marketplace        $50/mo
  ✓ Advanced analytics — per-campaign breakouts, time-to-conversion  $30/mo
  ✓ Founding Creator badge on every campaign                          $20/mo
  ✓ 24-hour priority support channel                                  $20/mo
  ✓ Early access to new top-tier clippers (48h before public)         $30/mo
  ✓ Free campaign brief review (one-time, manual)                  $200 one-time
  ─────────────────────────────────────────────────────────────────────────
                                                              Total: $350+

THE GUARANTEE

  If your campaigns don't get measurably more applications in 30 days,
  we refund your USDC automatically. On-chain. No support tickets, no
  back-and-forth. You stay if it works, you walk if it doesn't.

WHY FOUNDING IS LIMITED

  We're capping it at 50 so we can personally onboard each Founder, learn
  what works, and ship perks that actually move money. Once we hit 50,
  the price moves to $29/mo — but you, locked in at $15 for life.
```

---

## 8. Deferred

- **Tiered Premium** (Pro / Business / Enterprise). Premature — ship one tier, see what people actually pay for.
- **Referral discounts** ("invite a creator, both get a month free"). Growth lever, not v1.
- **Crypto-native perks** (token-gated, NFT pass). Distracting; not until base tier is profitable.
- **Per-campaign Premium boost** (one-off "feature this campaign for 7 days for $5"). Interesting upsell but adds complexity to the marketplace sort; defer until subscription Premium is proven.
- **Auto-payout cadence options** (weekly vs monthly for Premium clippers). Real value, payout-engine changes required, defer to Slice H or later.
