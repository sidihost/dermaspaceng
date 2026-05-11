-- Server-side persistence for Derma AI chat history.
--
-- Until now, conversations lived only in localStorage. The moment a
-- user cleared their browser cache (or signed in on a new device),
-- the entire history disappeared. We now back the same JSON payload
-- the client already serialises (sessions list + active conversation)
-- with one DB row per user, so the chat survives cache wipes,
-- reinstalls and cross-device sign-ins.
--
-- The schema is intentionally a single row per user holding two JSONB
-- blobs:
--   - `sessions` : the full list of saved conversations (sidebar).
--   - `active`   : the live conversation + open/closed flag (so the
--                  chat reopens where you left off).
--
-- We keep the original shape the client uses (so reads + writes are a
-- pure passthrough); querying inside the JSON isn't needed. A size
-- guard in the API route caps writes at 1 MB so a runaway client
-- can't fill the DB.

CREATE TABLE IF NOT EXISTS derma_chat_sessions (
  user_id     VARCHAR(36) PRIMARY KEY
              REFERENCES users(id) ON DELETE CASCADE,
  sessions    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  active      JSONB,
  updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_derma_chat_sessions_updated_at
  ON derma_chat_sessions(updated_at DESC);
