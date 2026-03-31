-- Allow password_hash to be NULL for OAuth users (Google, etc.)
-- OAuth users authenticate via third-party providers and don't have passwords

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
