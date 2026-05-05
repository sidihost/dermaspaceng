-- ---------------------------------------------------------------------------
-- 310-live-chat-system.sql
-- ---------------------------------------------------------------------------
-- Adds the "Derma AI handoff to a human representative" surface used by:
--   * Users  → ask Derma AI to connect to a representative; chat in real time
--   * Staff  → /staff/live-chat queue, accept / decline / close a session
--   * Admins → /admin/live-chat oversight + /admin/live-chat/performance
--
-- Three tables. We deliberately keep the message body inline (TEXT) because
-- everything else in the product (support tickets, blog comments) does the
-- same — there is no need for an attachments table at this point.
--
-- Status machine for a session:
--     ai_only      → user is still chatting with the AI (no DB row yet)
--     waiting      → user asked for a human; appears in staff queue
--     active       → a staff member accepted; both sides chat in real time
--     closed       → ended by staff or user; rating window open
--     abandoned    → user left without rating before close; preserved for
--                    admin review
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS live_chat_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The first AI message that triggered the escalation. Useful in the
  -- staff queue so the staff member sees CONTEXT ("user asked about
  -- recovering a failed payment") before accepting.
  initial_topic     TEXT,
  -- One of: 'waiting' | 'active' | 'closed' | 'abandoned'
  status            TEXT NOT NULL DEFAULT 'waiting',
  assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Snapshots of which AI conversation triggered the handoff so admins
  -- can scroll back through the AI exchange that preceded it without
  -- having to dig into IndexedDB on the client.
  ai_transcript     JSONB,
  -- Rating block — populated when the user closes the session and
  -- (optionally) leaves a review. Service rating is "how was the help?"
  -- (1–5), staff rating is "how was the rep?" (1–5). Both stay null
  -- until the user submits — admins can therefore tell the difference
  -- between "skipped" and "1 star".
  service_rating    SMALLINT CHECK (service_rating IS NULL OR service_rating BETWEEN 1 AND 5),
  staff_rating      SMALLINT CHECK (staff_rating IS NULL OR staff_rating BETWEEN 1 AND 5),
  rating_comment    TEXT,
  -- Lifecycle timestamps. We keep all five so the performance dashboard
  -- can compute first-response time, accept time, total handle time
  -- and idle time without needing to scan messages.
  escalated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at       TIMESTAMPTZ,
  first_reply_at    TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  rated_at          TIMESTAMPTZ,
  -- A single source of truth for the most-recent activity on this
  -- session. Updated by a trigger on live_chat_messages so the queue
  -- can sort "stale waits" to the top without us having to remember
  -- to bump it from every code path.
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by         TEXT,                -- 'user' | 'staff' | 'admin' | 'timeout'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_status
  ON live_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_user
  ON live_chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_staff
  ON live_chat_sessions(assigned_staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_activity
  ON live_chat_sessions(last_activity_at DESC);

-- ---------------------------------------------------------------------------
-- Messages — one row per "bubble" in the conversation.
-- sender_role:
--   'user'   → the customer
--   'staff'  → the assigned representative
--   'system' → "Sarah joined the chat", "Chat ended", etc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,             -- 'user' | 'staff' | 'system'
  sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session
  ON live_chat_messages(session_id, created_at ASC);

-- Bump `last_activity_at` and capture `first_reply_at` on the very first
-- staff reply, so the staff performance dashboard has the data it needs
-- without us writing two queries from the API layer.
CREATE OR REPLACE FUNCTION live_chat_messages_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE live_chat_sessions
     SET last_activity_at = NEW.created_at,
         first_reply_at   = COALESCE(
           first_reply_at,
           CASE WHEN NEW.sender_role = 'staff' THEN NEW.created_at ELSE NULL END
         )
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_live_chat_messages_after_insert ON live_chat_messages;
CREATE TRIGGER trg_live_chat_messages_after_insert
  AFTER INSERT ON live_chat_messages
  FOR EACH ROW EXECUTE FUNCTION live_chat_messages_after_insert();

-- ---------------------------------------------------------------------------
-- Staff profile — each front-desk staff member gets an avatar slug and a
-- short display name shown in the chat header / "Sarah joined the chat"
-- system message. Persistent so a single staff member shows up under the
-- same identity across every conversation.
--
-- We deliberately keep front-desk avatars to the female pool (matches the
-- product brief) but allow admins to override per-row if needed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_slug   TEXT NOT NULL DEFAULT 'f1',   -- one of f1..f11
  display_name  TEXT,                          -- shown in chat; falls back to first_name
  status        TEXT NOT NULL DEFAULT 'offline', -- 'online' | 'offline' | 'busy'
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_status
  ON staff_profiles(status);
