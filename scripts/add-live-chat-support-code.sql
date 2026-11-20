-- ============================================================================
-- Migration: Add persistent Support ID (`support_code`) to `live_chat_sessions`
-- ============================================================================
-- Safe to run multiple times (fully idempotent) in Neon / PostgreSQL.
-- Also executed automatically by `ensureLiveChatSupportCodeColumn()` in
-- `lib/live-chat.ts`, so deployments without a manual migration step work too.
-- ============================================================================

ALTER TABLE live_chat_sessions
  ADD COLUMN IF NOT EXISTS support_code TEXT;

-- Backfill any pre-existing sessions that do not yet have a Support ID.
WITH candidates AS (
  SELECT
    id,
    'DS-LC-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)) AS base_code,
    'DS-LC-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) AS long_code,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM live_chat_sessions
  WHERE support_code IS NULL
)
UPDATE live_chat_sessions s
   SET support_code = CASE
     WHEN c.rn = 1 AND NOT EXISTS (
       SELECT 1 FROM live_chat_sessions existing
        WHERE existing.support_code = c.base_code
     ) THEN c.base_code
     ELSE c.long_code
   END
  FROM candidates c
 WHERE s.id = c.id
   AND s.support_code IS NULL;

-- Unique partial index for fast exact lookup by Support ID (e.g. DS-LC-7K4M9P).
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_chat_sessions_support_code
  ON live_chat_sessions (support_code)
  WHERE support_code IS NOT NULL;
