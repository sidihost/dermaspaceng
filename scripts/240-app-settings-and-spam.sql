-- ---------------------------------------------------------------------------
-- 240-app-settings-and-spam.sql
--
-- Adds two pieces:
--
--   1. `app_settings` — a single-row-per-key key/value store for global
--      switches that an admin can flip from the UI without a deploy. Today
--      we use it for the maintenance-mode flag; the schema is generic
--      (JSONB value column) so future flags fit without another migration.
--
--   2. `comment_spam_log` — append-only audit trail of every comment that
--      tripped the spam detector. Includes the user, the offending body,
--      the reason ('external_link' for now), and a timestamp. The detector
--      also flips `users.is_active = false` on first hit so the suspension
--      and the audit row land in the same transaction.
--
-- Both statements are idempotent — safe to re-run.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

-- Seed the maintenance-mode key as "off" so a fresh database has a
-- known baseline. We use ON CONFLICT DO NOTHING so re-runs preserve
-- whatever the admin most recently saved.
INSERT INTO app_settings (key, value)
VALUES (
  'maintenance',
  jsonb_build_object(
    'enabled', false,
    'message', 'We''re polishing things up. Back in a moment.',
    'eta',     null
  )
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS comment_spam_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id      TEXT,
  body         TEXT NOT NULL,
  -- Comma-separated list of offending URLs found in `body`. Stored
  -- as TEXT (rather than TEXT[]) because we only ever read the
  -- aggregate in the admin log view — no need for the array index.
  urls         TEXT NOT NULL DEFAULT '',
  reason       TEXT NOT NULL CHECK (reason IN ('external_link', 'banned_domain', 'manual')),
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_spam_log_user
  ON comment_spam_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_spam_log_recent
  ON comment_spam_log (created_at DESC);
