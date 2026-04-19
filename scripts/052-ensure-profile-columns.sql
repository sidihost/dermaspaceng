-- -----------------------------------------------------------------------------
-- 052-ensure-profile-columns.sql
--
-- Consolidates migrations 050 (bio + socials) and 051 (is_public) into a
-- single idempotent "make sure these columns exist" script.
--
-- WHY THIS EXISTS
-- ---------------
-- The DATABASE_URL for this project was added to Vercel only recently,
-- which means the numbered migrations in /scripts may or may not have
-- been executed against the live Neon instance. Two user-facing bugs
-- both trace back to missing columns:
--
--   1. /[username] public profile page returns "Profile Not Found" even
--      for usernames that clearly exist in the DB. Root cause: the
--      SELECT in /api/user/profile/[username]/route.ts references
--      `bio`, the seven social handle columns, and `is_public`. If any
--      of those columns don't exist the whole query throws, the outer
--      try/catch returns a 500, and the client treats non-OK as 404.
--
--   2. Account Settings keeps showing empty bio / social inputs even
--      after the user has saved values. Root cause: /api/auth/me never
--      returned these columns (fix applied in the same change as this
--      migration) AND the columns may not exist at all.
--
-- This script is written with `ADD COLUMN IF NOT EXISTS` / `DROP
-- CONSTRAINT IF EXISTS` so running it multiple times is safe — it will
-- no-op on any DB that already has the columns.
-- -----------------------------------------------------------------------------

-- ---- Bio + social handles (from 050) ----------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube VARCHAR(200);

-- The original migration 050 added a strict `LENGTH(bio) <= 300` check
-- constraint, but the server-side validator in /api/auth/profile/route.ts
-- already permits up to 500 characters. The mismatch lets the API accept
-- a 301–500 char bio and then the DB write rejects it with a constraint
-- violation, which the frontend shows as a generic "Failed to update
-- profile". Relax the constraint to match the app-level limit (500).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_bio_length_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_bio_length_check;
  END IF;

  ALTER TABLE users
    ADD CONSTRAINT users_bio_length_check
    CHECK (bio IS NULL OR LENGTH(bio) <= 500);
END$$;

-- ---- Privacy toggle (from 051) ----------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Helpful partial index for a future "discover public profiles" query.
CREATE INDEX IF NOT EXISTS idx_users_is_public
  ON users (is_public) WHERE is_public = TRUE;
