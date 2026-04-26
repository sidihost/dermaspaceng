-- Feedback submissions from /feedback. Mirrors the contact_messages /
-- support_tickets shape so the admin Support inbox could (later) merge
-- these in too, but kept as its own table because the form is multi-
-- step and stores extra fields (rating, experience, category) that
-- don't map cleanly onto contact_messages.
--
-- Idempotent: every column add / index uses IF NOT EXISTS so we can
-- re-run this script after schema drift without errors.

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id           SERIAL PRIMARY KEY,
  user_id      VARCHAR(36),                              -- nullable; anonymous submissions allowed
  name         VARCHAR(120),
  email        VARCHAR(255),
  category     VARCHAR(40)  NOT NULL,                    -- service | staff | facility | booking | suggestion | complaint
  experience   VARCHAR(20)  NOT NULL,                    -- positive | neutral | negative
  rating       INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 10),
  message      TEXT         NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'new',      -- new | in_review | actioned | closed
  user_agent   TEXT,
  source       VARCHAR(20)  NOT NULL DEFAULT 'web',      -- web | shake | api
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

-- Most admin queries are "newest first" or filtered by status, so cover
-- both paths with cheap btree indexes.
CREATE INDEX IF NOT EXISTS feedback_submissions_created_at_idx
  ON feedback_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_submissions_status_idx
  ON feedback_submissions (status);

CREATE INDEX IF NOT EXISTS feedback_submissions_user_id_idx
  ON feedback_submissions (user_id)
  WHERE user_id IS NOT NULL;
