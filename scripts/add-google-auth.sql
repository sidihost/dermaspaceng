-- Add Google OAuth fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update existing users to have profile_complete = true if they have a phone
UPDATE users SET profile_complete = true WHERE phone IS NOT NULL AND phone != '';
