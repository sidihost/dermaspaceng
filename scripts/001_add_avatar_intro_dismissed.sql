-- Add avatar_intro_dismissed flag so the curated-avatar intro modal
-- shows exactly once per user (not "every visit"). Persisting this
-- server-side instead of localStorage means clearing cookies, signing
-- in from a new device, or browsing in private mode no longer
-- re-triggers the intro.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS avatar_intro_dismissed BOOLEAN NOT NULL DEFAULT FALSE;
