-- Adds a privacy toggle to users: when is_public = FALSE the public
-- profile route at /[username] returns a "private profile" state
-- rather than the user's real data. Default TRUE (so existing users'
-- pages keep working the way they do today); signup's "Make my
-- profile public" toggle controls this for new accounts going
-- forward. Stored as a boolean so we can later extend with per-field
-- visibility (bio_public / socials_public) without another table.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Small index to support the common "list public profiles" kind of
-- lookup we'll likely add later (e.g. a discover / community page).
CREATE INDEX IF NOT EXISTS idx_users_is_public ON users (is_public) WHERE is_public = TRUE;
