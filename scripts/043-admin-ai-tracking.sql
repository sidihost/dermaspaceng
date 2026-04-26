-- Migration: admin AI tooling, page-view tracking, AI chat logging
--
-- Adds three things at once because they share the same admin context:
--
--   1. `ai_chat_logs`  — one row per Derma AI user message so admins can
--                        see how often a customer is leaning on the AI.
--   2. `page_views`    — one row per route the user lands on (collapsed
--                        client-side to avoid double-firing on
--                        SSR/hydrate). Lets admins see the most recent
--                        pages a customer visited.
--   3. `admin_replies.sender_display_name` — when an admin types a
--                        reply on behalf of a salon contact (Franca,
--                        Itunu, "Admin"), this is the name the
--                        customer sees instead of the staff member's
--                        own login name.
--
-- All tables are additive — older code paths that don't know about
-- these columns continue to work unchanged.

CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  -- Anonymous chats land with NULL user_id; we still log the count so
  -- platform-wide AI usage is measurable.
  session_id VARCHAR(64),
  -- Truncated preview of the user prompt (first 200 chars) so admins
  -- don't have to click into anything to see what the user asked.
  prompt_preview TEXT,
  message_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_user ON ai_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_created ON ai_chat_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  -- session_id stored even for signed-in users so we can group by
  -- visit; nullable for fully anonymous visitors.
  session_id VARCHAR(64),
  path TEXT NOT NULL,
  -- Optional human-readable label captured client-side from
  -- document.title — saves an admin from having to recognise routes
  -- like `/services/[slug]` at a glance.
  title TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);

-- Sender display name: only added if the column doesn't already
-- exist so the migration is safely re-runnable in any environment.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_replies' AND column_name = 'sender_display_name'
  ) THEN
    ALTER TABLE admin_replies ADD COLUMN sender_display_name TEXT;
  END IF;
END $$;
