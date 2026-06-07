-- Persist whether a user has seen + dismissed the Help Center intro modal.
-- Server-side is the source of truth so the modal never re-appears, even
-- when the user clears their browser cache / uses a private window.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS help_intro_dismissed BOOLEAN DEFAULT FALSE;
