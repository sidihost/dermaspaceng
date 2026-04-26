-- One-off helper: apply migration 221 to the live DB and record it
-- in the `_migrations` tracking table so the build runner skips it
-- on the next deploy. Every statement is idempotent so it is safe
-- to re-run.
--
-- This is a TEMPORARY file. After it has been executed once and
-- the next prod deploy succeeds, this file can be deleted (the
-- _runner.mjs will simply mark it as "applied" via its bootstrap
-- path on a fresh DB anyway, since it is a no-op the second time).

-- ---------------------------------------------------------------
-- 0. Ensure the tracking table exists.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS _migrations (
  filename   TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 1. Body of 221-legal-acceptance.sql (kept in sync with that file).
-- ---------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS legal_accepted_version TEXT,
  ADD COLUMN IF NOT EXISTS legal_accepted_at      TIMESTAMPTZ;

-- user_id MUST be VARCHAR(36) to match users.id (see scripts/002).
CREATE TABLE IF NOT EXISTS legal_acceptance_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version     TEXT        NOT NULL,
  surface     TEXT        NOT NULL DEFAULT 'unknown',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptance_log_user_version_uniq
  ON legal_acceptance_log (user_id, version);

CREATE INDEX IF NOT EXISTS legal_acceptance_log_user_idx
  ON legal_acceptance_log (user_id, accepted_at DESC);

-- ---------------------------------------------------------------
-- 2. Record the migration so the build runner skips it next time.
-- ---------------------------------------------------------------
INSERT INTO _migrations (filename)
VALUES ('221-legal-acceptance.sql')
ON CONFLICT (filename) DO NOTHING;
