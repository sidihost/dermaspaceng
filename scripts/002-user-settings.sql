-- User Settings Migration
-- Adds auth_provider column to users table and notification columns to wallet_settings

-- Add auth_provider column to users table (for Google OAuth detection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';

-- Add notification columns to wallet_settings table
ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;
ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS budget_alerts BOOLEAN DEFAULT true;
ALTER TABLE wallet_settings ADD COLUMN IF NOT EXISTS promotional_emails BOOLEAN DEFAULT false;

-- Create index for auth_provider queries
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
