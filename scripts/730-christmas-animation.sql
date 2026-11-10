-- ---------------------------------------------------------------------------
-- 730-christmas-animation.sql
--
-- Registers the seasonal "Christmas animation" switch so it can be turned
-- on / off from the admin console at /admin/features (Off / Admin only /
-- Everyone).
--
-- Seeded OFF on purpose: the overlay is purely decorative, so a deploy must
-- never change what visitors see until an admin deliberately flips it on.
-- `ON CONFLICT (key) DO NOTHING` keeps whatever value an admin has already
-- set, so re-running this migration is a no-op.
--
-- The `visibility` column is added by 710-feature-flag-visibility.sql, which
-- sorts earlier and therefore runs first. Idempotent: safe to re-run.
-- ---------------------------------------------------------------------------

INSERT INTO feature_flags (key, label, description, scope, enabled, visibility)
VALUES (
  'christmas_animation',
  'Christmas animation',
  'Gentle seasonal snowfall overlay on the public site. Decorative only.',
  'site',
  FALSE,
  'off'
)
ON CONFLICT (key) DO NOTHING;
