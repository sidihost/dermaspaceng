-- Add an admin-managed Christmas snowfall effect, enabled by default.
-- Super-admins can turn it off from the feature-flags dashboard.
INSERT INTO feature_flags (key, label, description, scope, enabled, visibility)
VALUES (
  'christmas-animation',
  'Christmas snowfall',
  'Subtle, brand-colored snowfall on public pages',
  'site',
  TRUE,
  'on'
)
ON CONFLICT (key) DO NOTHING;
