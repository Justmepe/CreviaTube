-- 2FA: Authenticator (TOTP) + Email-based OTP. Both are independent of
-- the SMS path we don't have. Users can enable TOTP for the strongest
-- option, or fall back to email OTP for sensitive actions.
--
-- TOTP secrets are stored in plaintext for v1. Encryption-at-rest is its
-- own project (needs a KMS or a stable env-supplied key) — left as a
-- follow-up. Treat the secret column as you'd treat a password column:
-- never log it, never expose in API responses.

ALTER TABLE users
  -- TOTP (RFC 6238) — base32 secret + enabled flag.
  ADD COLUMN IF NOT EXISTS totp_secret      TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled     BOOLEAN NOT NULL DEFAULT false,
  -- Email OTP — short-lived 6-digit code, stored as a hash so a leaked
  -- DB doesn't expose live codes. Expires fast, single-use.
  ADD COLUMN IF NOT EXISTS email_otp_hash   TEXT,
  ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMP;
