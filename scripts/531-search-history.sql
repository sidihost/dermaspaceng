-- 531-search-history.sql
-- ----------------------------------------------------------------------
-- Per-user history for the semantic service search bar.
--
-- Why a dedicated table
-- ---------------------
-- Anonymous visitors get their recent searches mirrored into
-- localStorage by the client, but signed-in customers expect their
-- history to follow them across devices (the way Google, Spotify, and
-- every modern shopping app handle it). Persisting to Postgres is
-- also a tiny gold mine for the marketing team — it tells us what
-- people are actually asking for in their own words and where the
-- catalog has gaps.
--
-- Shape
-- -----
--   id         · stable PK so the API can let users delete a single
--                row by id without exposing internal autoincrements.
--   user_id    · FK to users; CASCADE so deleting an account also
--                wipes their history (privacy hygiene + GDPR).
--   query      · the raw, trimmed query string. We keep the original
--                casing so when we render it back we don't mangle
--                proper nouns ("Vitamin C", "Hydrafacial").
--   query_norm · lowercased version used for "is this a duplicate?"
--                checks — saves us doing LOWER() on every upsert.
--   created_at · most recent search for this query (we update on
--                duplicates rather than insert a new row, so the
--                history never bloats with the same query repeated).
--
-- Indices
-- -------
--   * (user_id, created_at DESC) drives the dropdown list.
--   * (user_id, query_norm) is a UNIQUE constraint so the upsert in
--     /api/search/history can do ON CONFLICT … DO UPDATE without a
--     race window between SELECT + INSERT.
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS search_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query       TEXT        NOT NULL,
  query_norm  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT search_history_user_query_unique UNIQUE (user_id, query_norm)
);

CREATE INDEX IF NOT EXISTS search_history_user_recent_idx
  ON search_history (user_id, created_at DESC);
