-- Admin onboarding columns
--
-- Three additions to `users`:
--
--   * must_change_password — flipped TRUE when the super admin seeds
--     a new admin/staff account with a temporary password. The
--     onboarding wizard runs on first login until this flips back
--     to FALSE (after the user picks their own password).
--
--   * is_super_admin — exactly one row carries this flag (the
--     practice owner / Sidihost super admin). Drives sidebar
--     filtering: regular admins see day-to-day operations only;
--     the super admin sees the tech-heavy sections (Feature
--     Flags, Schedules, System tab in Settings) too.
--
--   * onboarding_completed_at — wall-clock stamp set the moment
--     the user finishes the first-login wizard. We don't gate the
--     wizard on this column (must_change_password is the gate);
--     it's purely audit trail so support can answer "did Itunu
--     ever finish her onboarding?".
--
-- All three are additive and idempotent; this script is safe to
-- re-run.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Only one super admin should ever exist. We don't enforce a
-- partial-unique-index because Postgres can't easily do "exactly
-- one" — instead we rely on the seed script to flip exactly one
-- row, and on the server-side filtering to never grant the flag
-- through a regular admin invite.
CREATE INDEX IF NOT EXISTS idx_users_super_admin
  ON users(is_super_admin) WHERE is_super_admin = TRUE;
