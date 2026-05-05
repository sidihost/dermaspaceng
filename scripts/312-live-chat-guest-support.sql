-- ---------------------------------------------------------------------------
-- 312-live-chat-guest-support.sql
-- ---------------------------------------------------------------------------
-- Lets non-authenticated visitors talk to the front desk.
--
-- Before this migration `live_chat_sessions.user_id` was NOT NULL with a
-- hard FK to `users(id)`. That meant only signed-in customers could
-- escalate to a human. Real-world support traffic almost always begins
-- before the visitor has an account — a pre-chat form ("name, email,
-- phone, what's this about?") is industry standard, and we want
-- transcript follow-up via email so an open thread can survive the
-- session ending.
--
-- Strategy:
--   * Make `user_id` nullable.
--   * Add `guest_name`, `guest_email`, `guest_phone` for the pre-chat form.
--   * Enforce that EVERY row has either `user_id` (logged-in customer) or
--     `guest_email` (anonymous visitor) via a CHECK constraint, so an
--     orphan row with neither identifier cannot exist.
--   * The session UUID itself doubles as the "auth token" for guests —
--     it's stored in an httpOnly cookie set by `/api/live-chat/request`
--     and verified on every subsequent guest API call.
-- ---------------------------------------------------------------------------

ALTER TABLE live_chat_sessions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE live_chat_sessions
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- The check constraint is added in two steps so the migration is
-- idempotent: drop-if-exists, then add. We avoid `NOT VALID` because
-- there is no legacy data that could fail this rule (every existing
-- row has user_id, all guest_* columns are NULL, so the OR clause
-- remains satisfied).
ALTER TABLE live_chat_sessions
  DROP CONSTRAINT IF EXISTS chk_live_chat_session_owner;

ALTER TABLE live_chat_sessions
  ADD CONSTRAINT chk_live_chat_session_owner
  CHECK (
    user_id IS NOT NULL
    OR guest_email IS NOT NULL
  );

-- Light-touch index so the staff oversight pages can filter "guest
-- vs member" sessions without a full scan once we add that pivot.
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_guest_email
  ON live_chat_sessions(guest_email)
  WHERE guest_email IS NOT NULL;
