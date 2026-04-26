-- ============================================================
-- 221 — Legal acceptance (Terms / Privacy / Derma AI Terms)
-- ============================================================
-- Adds the persistent state we need to drive the "big-tech style"
-- terms-of-service banner shown to every Dermaspace user the first
-- time they reach the dashboard, and again whenever we publish a
-- new policy version.
--
-- Why two columns on `users` (instead of just a JOIN to the audit
-- log):
--   * The two questions the app needs to answer on EVERY page load
--     are "have you accepted at least once?" and "have you accepted
--     the *current* version?". Both are answered by reading two
--     columns inline in /api/auth/me — no extra round-trip.
--   * The audit log table is for forensics (who, when, from where)
--     and is append-only. Truncating or replaying the log NEVER
--     touches the user-facing flag.
--
-- Versioning model
-- ----------------
-- We treat the entire legal pack (Terms, Privacy, Derma AI Terms)
-- as a single dated bundle. When ANY of the three docs changes
-- materially we bump `CURRENT_LEGAL_VERSION` in lib/legal.ts and
-- every signed-in user is re-prompted on their next dashboard
-- visit. This avoids hairsplitting about which doc the user
-- accepted — they accept the whole pack, every time.
--
-- The version string is a free-form text (we use ISO dates like
-- "2026-04-26") so we can ship out-of-band hotfixes too.
-- ============================================================

-- 1. Per-user state -----------------------------------------------
-- Both columns are nullable so this migration is safe to run on a
-- live DB — every existing row stays valid, and existing users
-- simply appear "not accepted" on their next dashboard visit, which
-- triggers the modal exactly as designed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS legal_accepted_version TEXT,
  ADD COLUMN IF NOT EXISTS legal_accepted_at      TIMESTAMPTZ;

-- 2. Append-only audit log ---------------------------------------
-- One row per acceptance, ever. We capture the IP and user agent
-- at the moment of acceptance for compliance / dispute resolution,
-- plus a free-form `surface` field so we can tell whether the user
-- accepted during signup, on the dashboard re-prompt, or somewhere
-- else we add later (e.g. a contextual prompt before opening
-- Derma AI for the first time).
-- NOTE on user_id type:
-- The `users.id` column in this project is VARCHAR(36) (see
-- scripts/002-create-users.sql), NOT a native UUID. The FK column
-- type MUST match exactly or Postgres rejects the constraint with
-- "foreign key constraint cannot be implemented". Keep this as
-- VARCHAR(36) even though the values look like UUIDs.
CREATE TABLE IF NOT EXISTS legal_acceptance_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version     TEXT        NOT NULL,
  surface     TEXT        NOT NULL DEFAULT 'unknown',  -- 'signup' | 'dashboard-gate' | 'admin' | ...
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT
);

-- One audit row per (user, version) is enough — re-accepting the
-- same version is a no-op so we don't need duplicate rows. This
-- partial unique index is a defensive guard in case a buggy client
-- POSTs `accept` twice in quick succession; ON CONFLICT below is
-- the actual race-protection.
CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptance_log_user_version_uniq
  ON legal_acceptance_log (user_id, version);

CREATE INDEX IF NOT EXISTS legal_acceptance_log_user_idx
  ON legal_acceptance_log (user_id, accepted_at DESC);

-- 3. Backfill ----------------------------------------------------
-- We do NOT auto-set `legal_accepted_version` on existing rows —
-- the whole point is to make existing users see the new banner.
-- That's deliberate.

-- 4. Sanity check ------------------------------------------------
-- Print the final shape so the migration runner confirms the
-- columns landed where we expect.
DO $$
BEGIN
  RAISE NOTICE 'users.legal_accepted_version present: %',
    EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'legal_accepted_version'
    );
  RAISE NOTICE 'legal_acceptance_log present: %',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'legal_acceptance_log');
END $$;
