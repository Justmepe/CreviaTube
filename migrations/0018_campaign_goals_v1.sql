-- Phase 4 — campaign-goal verification foundation (v1).
--
-- Three things shipping together because the goal-tracking flow needs all
-- of them to work end-to-end:
--   1. Founder/entrepreneur as a distinct account_type. Today the enum is
--      (influencer | business); a "founder" was forced into one or the other
--      and their goal set (waitlist signups, app installs, pre-orders) is
--      different from both.
--   2. Submission-level proof fields on clipper_campaigns: post_url (the
--      live post we can poll/verify) and clipper_promo_code (per-clipper
--      unique code for offline / e-commerce attribution).
--   3. campaign_integrations table — per-campaign creds the campaigner
--      provides so we can ingest conversion signals: server postback secret,
--      conversion pixel id, Shopify/Stripe webhook secrets, MMP token for
--      app installs.
--
-- New event_type values mirror the new goal types: purchase (revenue,
-- $-valued), lead (form fills / demo bookings), code_redemption (promo-code
-- attribution from a Shopify/Stripe webhook).
--
-- The campaigns.campaign_goals column stays JSON; new goal fields are
-- additive on the TS type, no SQL change needed there.

-- 1. account_type: add 'founder'. ALTER TYPE ADD VALUE must run outside a
-- transaction in Postgres; drizzle-kit / our runner handles this per-statement.
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'founder';

-- 2. event_type: extend with v1 goal-mapped event kinds.
--   purchase        — sales/revenue event, $ amount stored in event_value
--   lead            — qualified-lead form fill (distinct from generic signup)
--   code_redemption — promo-code redeemed at checkout (Shopify/Stripe webhook)
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'purchase';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'code_redemption';

-- 3. clipper_campaigns proof fields.
--   post_url            — the live URL of the clipper's post on their
--                         platform (YouTube / TikTok / IG / X). Required
--                         for any goal that verifies against the public
--                         post (views, engagement, UGC volume).
--   clipper_promo_code  — per-clipper unique short code; the clipper
--                         shares it in their post, the campaigner's
--                         Shopify/Stripe webhook fires when redeemed,
--                         we use the code to attribute the sale back.
ALTER TABLE clipper_campaigns
  ADD COLUMN IF NOT EXISTS post_url           TEXT,
  ADD COLUMN IF NOT EXISTS clipper_promo_code TEXT;

-- Promo codes need to be globally unique (webhook lookup is by code alone —
-- we don't always know the campaign at receive time). Partial unique index
-- so rows without a code are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS clipper_campaigns_promo_code_idx
  ON clipper_campaigns (clipper_promo_code)
  WHERE clipper_promo_code IS NOT NULL;

-- 4. campaign_integrations — one row per campaign, holds the creds/config
-- the campaigner provides so we can receive conversion signals.
--
-- All fields are nullable because each goal type uses a different subset
-- (a "drive-traffic" campaign needs none of these; a "sales" campaign
-- needs shopify_domain + shopify_webhook_secret; an "installs" campaign
-- needs the MMP block).
CREATE TABLE IF NOT EXISTS campaign_integrations (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Generic server postback. We generate postback_secret and show it once
  -- to the campaigner; their backend HMAC-signs incoming conversions.
  postback_secret      TEXT,

  -- Conversion pixel. We generate pixel_id; the campaigner embeds
  --   <img src="{base}/pixel/{pixel_id}?clipper={code}&event=signup"/>
  -- on their thank-you page. No secret because pixels are client-side.
  pixel_id             TEXT,

  -- Shopify
  shopify_domain        TEXT,
  shopify_webhook_secret TEXT,

  -- Stripe
  stripe_webhook_secret TEXT,

  -- Mobile Measurement Partner (for app-install goals).
  mmp_provider TEXT,    -- 'appsflyer' | 'adjust' | 'firebase'
  mmp_app_id   TEXT,
  mmp_api_key  TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- One integration row per campaign. We enforce this via a unique index
-- rather than making campaign_id a PK because we want a real id column
-- (some downstream code prefers an opaque id over a foreign-key value).
CREATE UNIQUE INDEX IF NOT EXISTS campaign_integrations_campaign_id_idx
  ON campaign_integrations (campaign_id);

-- pixel_id needs to be globally unique — it's the URL path component the
-- campaigner embeds, so collisions would route conversions to the wrong
-- campaign.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_integrations_pixel_id_idx
  ON campaign_integrations (pixel_id)
  WHERE pixel_id IS NOT NULL;

-- Constrain mmp_provider values defensively (cheaper than a separate enum
-- type, easy to extend with another DROP/ADD CONSTRAINT pair).
ALTER TABLE campaign_integrations
  DROP CONSTRAINT IF EXISTS campaign_integrations_mmp_provider_check;
ALTER TABLE campaign_integrations
  ADD CONSTRAINT campaign_integrations_mmp_provider_check
  CHECK (mmp_provider IS NULL OR mmp_provider IN ('appsflyer', 'adjust', 'firebase'));
