-- ============================================================
-- 650 — Profile change log, account deletion, data export
-- ============================================================
-- Backs the "big-tech style" account-management features the team
-- asked for in batch 2 of the dermaspaceng polish sprint:
--   1. Profile change history (audit who/what/when on every edit)
--   2. Account deletion requests (soft-delete with 14-day grace)
--   3. Data export requests (right-to-portability)
--
-- Why three small tables instead of one big audit_log:
--   - Each surface has its OWN status / lifecycle (pending → ready,
--     pending → cancelled → deleted) so a single audit log would
--     end up with a sea of nullable columns.
--   - Admin views render each as its own card (Profile changes,
--     Pending deletion, Pending export). Splitting keeps each
--     query trivial: SELECT … WHERE user_id = $1 ORDER BY created_at.
--   - Forensic / compliance teams need to be able to drop the
--     change log without affecting deletion / export records.
-- ============================================================

-- 1. Profile change log -----------------------------------------
-- One row per ATOMIC field change. We capture old + new value as
-- TEXT so the same table can audit everything: name, username,
-- email, phone, bio, social handles, gender, isPublic, etc.
-- Boolean / numeric fields are stringified at write time.
--
-- `surface` records WHERE the change came from so admins can tell
-- a self-edit from an admin-impersonation edit.
--
-- We don't enforce a NOT NULL on `old_value` / `new_value` —
-- "set" (NULL → "Itunu") and "clear" ("Itunu" → NULL) are both
-- valid and meaningful in the UI.
CREATE TABLE IF NOT EXISTS profile_change_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field       TEXT        NOT NULL,           -- 'first_name' | 'username' | 'email' | ...
  old_value   TEXT,
  new_value   TEXT,
  surface     TEXT        NOT NULL DEFAULT 'self', -- 'self' | 'admin' | 'impersonation'
  changed_by  VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profile_change_log_user_idx
  ON profile_change_log (user_id, created_at DESC);

-- 2. Account deletion requests ----------------------------------
-- Soft-delete model: the user files a request; we mark a
-- `deletion_scheduled_for` 14 days out; on the cron pass we
-- anonymise the row (email → deleted+id@dermaspace.local,
-- name → 'Deleted user', avatar/bio/socials NULL) but keep
-- bookings + tickets pointing at it for audit / financial
-- reasons.
--
-- The user can cancel any time before `deletion_scheduled_for`
-- — that flips status to 'cancelled' and the row is left alone.
--
-- We DON'T add `deletion_scheduled_for` directly on `users`
-- because (a) most users never delete and we don't want a
-- nullable column on every row; (b) keeping the request as a
-- separate table lets us preserve the WHY (reason, ip, etc.)
-- after the user is anonymised and the request status flips
-- to 'completed'.
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id                      BIGSERIAL   PRIMARY KEY,
  user_id                 VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason                  TEXT,
  status                  TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending'   → user filed it, grace period running
  -- 'cancelled' → user changed their mind
  -- 'completed' → cron job anonymised the account
  requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletion_scheduled_for  TIMESTAMPTZ NOT NULL,  -- requested_at + 14 days
  cancelled_at            TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  ip_address              TEXT,
  user_agent              TEXT
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_idx
  ON account_deletion_requests (user_id, requested_at DESC);

-- Only one OPEN deletion request per user at a time. Re-filing
-- after a cancellation is fine because cancelled rows fail this
-- partial unique check.
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_pending
  ON account_deletion_requests (user_id)
  WHERE status = 'pending';

-- 3. Data export requests ---------------------------------------
-- Same shape as deletion_requests — it's a small workflow with
-- pending / ready / cancelled states. The user clicks "Request
-- my data" and we drop a row here; a follow-up job builds a JSON
-- bundle of their bookings, tickets, wallet, preferences, and
-- emails them a download link. `download_url` is filled in when
-- ready and expires 7 days after `ready_at`.
CREATE TABLE IF NOT EXISTS data_export_requests (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'ready' | 'expired' | 'cancelled'
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at      TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  download_url  TEXT,
  ip_address    TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS data_export_requests_user_idx
  ON data_export_requests (user_id, requested_at DESC);

-- Only one in-flight export per user.
CREATE UNIQUE INDEX IF NOT EXISTS data_export_requests_one_pending
  ON data_export_requests (user_id)
  WHERE status = 'pending';

-- 4. Anonymisation helper -------------------------------------
-- Add a couple of state columns on `users` so the rest of the
-- app can short-circuit on deleted accounts without joining to
-- account_deletion_requests every time. We'll set these in the
-- soft-delete completion step.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Sanity check
DO $$
BEGIN
  RAISE NOTICE 'profile_change_log present: %',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_change_log');
  RAISE NOTICE 'account_deletion_requests present: %',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'account_deletion_requests');
  RAISE NOTICE 'data_export_requests present: %',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'data_export_requests');
  RAISE NOTICE 'users.deleted_at present: %',
    EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'deleted_at'
    );
END $$;
