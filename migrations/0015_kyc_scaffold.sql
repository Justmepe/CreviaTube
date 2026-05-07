-- KYC scaffold (region verification tier 3). This is foundation — schema +
-- enforcement hook — without a real third-party verification provider yet.
-- A creator can flag a campaign as "requires KYC clippers"; the apply
-- endpoint then blocks clippers whose kyc_status is not 'approved'.
--
-- Today an admin manually flips kyc_status. When we wire Persona / Onfido /
-- Sumsub, the same column gets driven by their webhooks.

-- Per-user KYC state. nullable status means "never started"; finite
-- terminal states are 'approved' and 'rejected'.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_status TEXT,
  ADD COLUMN IF NOT EXISTS kyc_provider TEXT,
  ADD COLUMN IF NOT EXISTS kyc_reference TEXT,
  ADD COLUMN IF NOT EXISTS kyc_updated_at TIMESTAMP;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_kyc_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_kyc_status_check
  CHECK (kyc_status IS NULL OR kyc_status IN ('pending', 'approved', 'rejected'));

-- Per-campaign opt-in. Most campaigns don't need KYC. Brand campaigns at
-- high budgets / regulated verticals can flip this to filter to KYC-
-- approved clippers only.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS requires_kyc BOOLEAN NOT NULL DEFAULT false;
