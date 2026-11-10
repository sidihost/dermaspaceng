-- Add an opt-in, admin-managed Christmas snowfall effect.
-- Start disabled so deployment does not change the public site by default.
INSERT INTO feature_flags (key, label, description, scope, enabled, visibility)
VALUES (
  'christmas-animation',
  'Christmas snowfall',
  'Subtle, brand-colored snowfall on public pages',
  'site',
  FALSE,
  'off'
)
ON CONFLICT (key) DO NOTHING;
