-- Social follow graph for public profiles.
--
-- One row = one "follower_id follows following_id" edge. We enforce
-- the (follower_id, following_id) uniqueness with a primary key so
-- double-tapping the Follow button can't create duplicate edges
-- (the API still does an ON CONFLICT DO NOTHING as a belt-and-braces
-- guard against race conditions).
--
-- Self-follows are blocked with a CHECK so we don't have to defend
-- against them in every read path. This is idempotent; safe to run
-- on a database that already has the table.
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id  VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Fast "who does X follow?" lookups (the profile we're viewing needs
-- `following_count`) and reverse "who follows X?" lookups
-- (`follower_count`). The primary key already covers the first
-- direction, so we only need the reverse index.
CREATE INDEX IF NOT EXISTS user_follows_following_idx
  ON user_follows (following_id);
