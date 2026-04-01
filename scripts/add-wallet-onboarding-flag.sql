-- Add wallet onboarding seen flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_onboarding_seen BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_onboarding ON users(wallet_onboarding_seen);
