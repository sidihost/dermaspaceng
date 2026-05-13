-- Add Microsoft OAuth fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255) UNIQUE;

-- Create index for Microsoft ID lookups
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
