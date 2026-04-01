-- Migration: Fix column name mismatches for passkeys and 2FA

-- Add is_enabled column if it doesn't exist (used by the app instead of totp_enabled)
ALTER TABLE user_2fa_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT false;

-- Copy data from totp_enabled to is_enabled if totp_enabled exists and has data
UPDATE user_2fa_settings SET is_enabled = totp_enabled WHERE totp_enabled IS NOT NULL AND is_enabled IS NULL;

-- Add device_name column if it doesn't exist (used by the app instead of name)
ALTER TABLE passkey_credentials ADD COLUMN IF NOT EXISTS device_name TEXT;

-- Copy data from name to device_name if name exists and has data
UPDATE passkey_credentials SET device_name = name WHERE name IS NOT NULL AND device_name IS NULL;

-- Ensure passkey_challenges table exists with correct structure
CREATE TABLE IF NOT EXISTS passkey_challenges (
  user_id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON passkey_challenges(expires_at);
