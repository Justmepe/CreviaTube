-- Phase 1b — persona stage + region foundation
--
-- Adds three nullable columns to users:
--   campaigner_stage     — lifecycle position for campaigners (founder_prelaunch
--                          → early_brand → established_brand, plus solo_creator
--                          as a parallel track). Mutable; users can graduate
--                          themselves via Settings.
--   country_iso          — ISO 3166-1 alpha-2 country code (e.g. "US", "KE").
--                          Captured at signup via IP geolocation; user may
--                          self-attest a different value.
--   country_verified_at  — timestamp when the country claim was last verified
--                          (e.g. matching login IP or KYC). Null = unverified.
--
-- Why one migration: regional targeting and persona stage are both v1
-- foundations and we want them in one schema bump so downstream PRs can
-- assume both are present.
--
-- All columns nullable so existing rows stay valid. The persona resolver
-- handles null gracefully (falls back to accountType-derived persona).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS campaigner_stage    TEXT,
  ADD COLUMN IF NOT EXISTS country_iso         VARCHAR(2),
  ADD COLUMN IF NOT EXISTS country_verified_at TIMESTAMP;

-- Defensive constraint on stage values. Cheaper than a separate enum type
-- and easy to extend without ALTER TYPE rituals.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_campaigner_stage_check;
ALTER TABLE users
  ADD CONSTRAINT users_campaigner_stage_check
  CHECK (campaigner_stage IS NULL OR campaigner_stage IN (
    'founder_prelaunch',
    'early_brand',
    'established_brand',
    'solo_creator'
  ));

-- Index country lookups (marketplace filter + region-coverage queries hit
-- this constantly).
CREATE INDEX IF NOT EXISTS users_country_iso_idx ON users (country_iso);
