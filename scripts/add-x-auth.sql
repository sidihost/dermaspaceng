-- Add X (Twitter) OAuth fields to users table.
-- Mirrors the shape of add-google-auth.sql so the account-linking logic
-- in the callback route stays symmetrical with the Google flow.
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_username VARCHAR(255);

-- Index for lookup by X id on callback.
CREATE INDEX IF NOT EXISTS idx_users_x_id ON users(x_id);
