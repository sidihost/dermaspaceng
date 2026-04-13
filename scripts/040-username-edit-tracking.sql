-- Add username edit tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changes_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_last_change_month TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_username_changes ON users(username_changes_this_month);
