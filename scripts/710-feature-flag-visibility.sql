-- 710-feature-flag-visibility.sql
--
-- Adds a 3-way `visibility` state to feature_flags so a feature can be:
--   'on'      -> visible to everyone (same as the old enabled = true)
--   'preview' -> visible only to admins + staff (internal testing)
--   'off'     -> visible to nobody (same as the old enabled = false)
--
-- The legacy `enabled` boolean is kept and mirrored (enabled = visibility <> 'off')
-- so any code path that still reads `enabled` degrades safely: a preview flag
-- reads as "on" for the app while the role check in lib/feature-flags.ts is what
-- actually restricts it to staff/admins.
--
-- Idempotent: safe to re-run.

ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS visibility varchar(16);

UPDATE feature_flags
SET visibility = CASE WHEN enabled THEN 'on' ELSE 'off' END
WHERE visibility IS NULL;

ALTER TABLE feature_flags ALTER COLUMN visibility SET DEFAULT 'on';
ALTER TABLE feature_flags ALTER COLUMN visibility SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_flags_visibility_chk'
  ) THEN
    ALTER TABLE feature_flags
      ADD CONSTRAINT feature_flags_visibility_chk
      CHECK (visibility IN ('on', 'preview', 'off'));
  END IF;
END $$;
