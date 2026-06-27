-- Per-user "recently read" log for the journal.
--
-- Powers the logged-in "Continue reading" rail on /blog. We record one
-- row per (user, post) and bump `viewed_at` on every revisit so the rail
-- always reflects the member's most recent reading order across devices
-- (a localStorage list could not do that, and would be lost on sign-in
-- from a new phone).
--
-- Kept deliberately tiny:
--   * UNIQUE (user_id, post_id) + upsert means a member who re-reads a
--     post never accumulates duplicate rows.
--   * ON DELETE CASCADE on both FKs so the row disappears automatically
--     when either the user or the post is removed.
CREATE TABLE IF NOT EXISTS blog_post_views (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, post_id)
);

-- "What has this user read, newest first" — the exact access pattern the
-- Continue reading rail uses on every blog load.
CREATE INDEX IF NOT EXISTS blog_post_views_user_recent_idx
  ON blog_post_views (user_id, viewed_at DESC);
