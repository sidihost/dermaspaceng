-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Fix sessions table to match expected schema
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Fix activity_log to have both column name variants (for different API routes)
-- Some routes use 'actor_id' and 'action', others use 'staff_id' and 'action_type'
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS details TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON activity_log(actor_id);
