-- -----------------------------------------------------------------------------
-- 050-profile-bio-and-social.sql
--
-- Adds public profile fields to the users table:
--   * bio            — short markdown-free text the user can write about
--                      themselves (shown on /[username]).
--   * website        — optional personal / business URL.
--   * instagram, twitter, tiktok, facebook, linkedin, youtube
--                    — social handles. We store *handles* (no leading @, no
--                      full URL) and render links on the public profile by
--                      composing them at display time. This keeps the DB
--                      canonical and lets us change URL formats later
--                      without a data migration.
--
-- Also backfills NULL usernames using the existing `generate_username()`
-- helper (defined in 030-add-username.sql). This fixes the "Profile Not
-- Found" bug where existing users never had a username assigned and so
-- their public URL 404'd.
-- -----------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube VARCHAR(100);

-- Clamp bio length sensibly at the DB layer. 300 chars is roughly 3-4 lines
-- of readable copy — anything longer belongs in a dedicated bio editor
-- (which we don't have yet).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_bio_length_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_bio_length_check CHECK (bio IS NULL OR LENGTH(bio) <= 300);
  END IF;
END$$;

-- Backfill NULL usernames so every existing account has a reachable
-- public profile URL. We use the `generate_username()` function that was
-- already shipped in migration 030 — it sanitizes first_name + adds a
-- numeric suffix when there's a clash. We deliberately do this AFTER
-- the schema changes above so newly-added users get a full, working
-- profile on next login.
UPDATE users
SET username = generate_username(COALESCE(NULLIF(TRIM(first_name), ''), 'user'))
WHERE username IS NULL OR TRIM(username) = '';
