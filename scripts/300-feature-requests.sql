-- Feature Requests board
--
-- A public product-feedback board (Canny / big-tech roadmap style):
-- signed-in clients submit ideas, everyone can browse and upvote them,
-- and admin/staff triage them through a status pipeline.
--
-- Two tables:
--   feature_requests       one row per idea
--   feature_request_votes  one row per (request, user) upvote — the
--                          unique constraint makes a vote idempotent and
--                          lets us derive the vote count with a COUNT(*).
--
-- user_id columns are character varying to match the existing users.id
-- type across this database.

CREATE TABLE IF NOT EXISTS feature_requests (
  id            TEXT PRIMARY KEY,
  user_id       VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(140) NOT NULL,
  description   TEXT NOT NULL,
  category      VARCHAR(40) NOT NULL DEFAULT 'general',
  -- pipeline: open -> under_review -> planned -> in_progress -> shipped | declined
  status        VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_note    TEXT,
  pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_request_votes (
  request_id  TEXT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id     VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created ON feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_request ON feature_request_votes(request_id);
