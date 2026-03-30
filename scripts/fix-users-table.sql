-- Add missing is_active column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for is_active lookups
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
