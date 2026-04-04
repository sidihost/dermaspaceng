-- Fix passkey challenges table to support multiple challenges per user
-- This is needed for discoverable credentials where we use a session ID

-- Drop the existing table and recreate with a better structure
DROP TABLE IF EXISTS passkey_challenges;

CREATE TABLE passkey_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for looking up by user_id
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user ON passkey_challenges(user_id);

-- Index for cleanup of expired challenges
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON passkey_challenges(expires_at);
