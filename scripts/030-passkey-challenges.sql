-- Passkey challenges table for temporary storage during WebAuthn ceremonies
CREATE TABLE IF NOT EXISTS passkey_challenges (
  user_id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add device_type and backed_up columns to passkey_credentials if not exists
ALTER TABLE passkey_credentials ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE passkey_credentials ADD COLUMN IF NOT EXISTS backed_up BOOLEAN DEFAULT FALSE;

-- Index for cleanup of expired challenges
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON passkey_challenges(expires_at);
