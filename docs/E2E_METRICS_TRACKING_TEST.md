# E2E test — metrics tracking for video content

Goal: prove the full pipeline works for a real post — creator funds a
campaign, clipper applies + posts, our view-polling sweep credits the
clipper for the verified views.

The campaign-funding step uses the **Force fund** test fixture so
no USDC has to move. Everything else is real.

---

## 1. Pre-flight

Things that must be true *before* you start, otherwise the metrics
sweep silently no-ops:

| Item | How to check | Fix if missing |
|---|---|---|
| `YOUTUBE_API_KEY` set on prod | `grep YOUTUBE_API_KEY .env` on the server | Add to `.env`, `pm2 reload`. Get a key from console.cloud.google.com (YouTube Data API v3). |
| TikTok OAuth configured | `grep TIKTOK_CLIENT_KEY .env` | Connect on `/social-integration` as the clipper. |
| Instagram Business OAuth | `grep INSTAGRAM_APP_ID .env` | Connect on `/social-integration` as the clipper. |
| You have two browser sessions ready | Open the prod site in normal Chrome + an incognito window | One for the creator, one for the clipper. |

The poller is permissive: if `YOUTUBE_API_KEY` is unset, YouTube
rows skip silently with a `[view-polling] YOUTUBE_API_KEY not set
— YouTube rows will skip` log line.

---

## 2. Test flow

You have two paths. Pick one.

### Short path (single admin session, ~2 minutes)

For when you just want to prove the polling sweep credits views on a
post URL end-to-end. Skips the manual apply/approve dance.

- [ ] Sign in as admin, open `/admin/campaigns`.
- [ ] Create a campaign as any creator (or use an existing draft).
  primaryGoal=views, target=100, targetPlatforms covers the URL you'll paste.
- [ ] Click **Force fund** on the campaign row.
- [ ] Click **Force-assign clipper** on the same row. Enter:
  - clipper UUID/username/email (any existing user; doesn't need clipper role for tracking — endpoint accepts any user)
  - a real public YouTube/TikTok/IG URL you want to track
  - a reason ("e2e metrics shortcut" works)
- [ ] Click **Run view-poll now** at the top right.
- [ ] Open `/metrics → Social Media` tab as the clipper user (or as the
  creator who owns the campaign). The submission row should be there
  with the polled view count.
- [ ] `/admin/audit` should show a `campaign.force_assign_clipper` row.

### Long path (full UI flow, two browser sessions)

Run these steps in order. Tick each one off as it passes.

### Step 1 — Sign in as creator
- [ ] Log into the admin account at `/auth` (the one you seeded with `scripts/seed-admin.ts`).
- [ ] Switch to your creator account (or use a second tab, same browser).
- [ ] Confirm the sidebar shows "Campaigns" pointing at `/admin/campaigns` (admin) or "My Campaigns" (creator).

### Step 2 — Create a campaign with `primaryGoal=views`
- [ ] Go to `/campaigns/create-enhanced` (creator side).
- [ ] Pick the **views** primary goal.
- [ ] Set a target like 100 views.
- [ ] Set `targetPlatforms` to whichever you'll test (TikTok / YouTube / Instagram).
- [ ] Save the campaign. It lands in `fundingStatus=pending`.

### Step 3 — Force-fund the campaign (admin)
- [ ] Switch to the admin account.
- [ ] Open `/admin/campaigns`.
- [ ] Find the campaign you just created (top of the list).
- [ ] Click **Force fund**, enter a reason like "e2e metrics test".
- [ ] Refresh — the campaign should now show `fundingStatus: funded` + `status: active`.
- [ ] Open `/admin/audit` — confirm there's a `campaign.force_fund` row with your reason.

### Step 4 — Apply as a clipper (incognito)
- [ ] Open an incognito window, register a new clipper account.
- [ ] Connect a social account on `/social-integration` (TikTok or Instagram). **YouTube doesn't need OAuth — the YouTube poller uses the platform-wide YOUTUBE_API_KEY.**
- [ ] Go to `/marketplace`, find your campaign, click Apply.
- [ ] In the application page, pick the **Link to clip** tab.
- [ ] Paste a real URL to a TikTok / YouTube / Instagram post you control.
- [ ] Submit. It lands in `applicationStatus = creator_review`.

### Step 5 — Approve the application (creator)
- [ ] Switch back to the creator window.
- [ ] Go to `/creator/applications`.
- [ ] You should see the clipper's application with the URL embedded inline.
- [ ] Click Approve.

### Step 6 — Set the post URL (clipper)
- [ ] Back to the incognito (clipper) window.
- [ ] Go to `/campaigns` → your applied campaign → "Post URL" field.
- [ ] Paste the same URL as the submission (or a different one if the live post moved).
- [ ] Save. This is the URL the poller will hit.

### Step 7 — Run the view-poll sweep (admin)
- [ ] Switch to admin.
- [ ] Open `/admin/campaigns`.
- [ ] Click **Run view-poll now** at the top right.
- [ ] Toast should appear with "View poll complete".

### Step 8 — Verify metrics credited
- [ ] As the clipper, refresh the campaign assignment page.
- [ ] The "Progress" / "Verified views" number should update to the real view count of your post.
- [ ] If the post just hit the goal threshold (100 verified views), the campaign auto-completion logic should fire and a payout intent should appear in the clipper's `/payouts`.

### Step 9 — Confirm the audit trail
- [ ] As admin, open `/admin/audit`.
- [ ] You should see at least:
  - `campaign.force_fund` (step 3)
  - `guarantee.sweep_run` (only if any subscription guarantee fired — usually none)
- [ ] Anything else you did via the admin pages also shows here.

---

## 3. Things that can go wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| View-poll completes but views don't update | `YOUTUBE_API_KEY` unset OR clipper's TikTok/IG OAuth not connected | See pre-flight. Check `pm2 logs creviatube` for `[view-polling]` lines explaining the skip. |
| Force-fund returns 409 "already funded" | The campaign already had `fundingStatus=funded` | Create a new campaign. |
| Application page rejects URL | URL didn't pass URL validation (must start with http(s)) | Paste the full URL including `https://`. |
| Approve button does nothing | Creator's session expired, or you're not the campaign's creator | Refresh and verify which account you're in. |
| Poll runs but coverage says "not relevant" | The campaign's primaryGoal isn't `views` | Check the campaign goals — verification only fires for matching goal types. |

---

## 4. What this proves (and doesn't)

**Proves:**
- ✅ The full application → approval → URL → polling → metric credit chain works
- ✅ Social-API integration (YouTube / TikTok / Instagram) returns real numbers
- ✅ Goal-completion fires when verified count crosses the threshold
- ✅ Audit log captures admin force-fund + cancel + config actions

**Doesn't prove:**
- ❌ The on-chain USDC funding path actually works (use a real `$1` campaign on Sepolia for that)
- ❌ The auto-payout path actually moves USDC (needs `PAYOUT_PRIVATE_KEY` configured + Sepolia funds)
- ❌ The 30-day guarantee evaluator fires under real conditions (requires waiting 30 days or manipulating `baseline_snapshotted_at`)
- ❌ The admin email notifications actually arrive (check the recipient inbox)
