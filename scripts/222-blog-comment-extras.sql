-- ---------------------------------------------------------------------------
-- 222-blog-comment-extras.sql
--
-- Three-in-one extension to the comments system landed in 220:
--
--   1. Optional Giphy attachment per comment (`gif_url`, `gif_width`,
--      `gif_height`, `gif_provider`). A comment may have a body, OR a
--      GIF, OR both — but never neither (enforced by the CHECK).
--
--   2. A `root_id` column that points at the top-most ancestor of a
--      reply chain. Lets us render a flat "comment + replies" UI even
--      when a reply is itself a reply, without an N+1 walk in JS.
--      Backfilled for legacy rows that pre-date this migration.
--
--   3. A `blog_comment_reactions` table — one row per (comment, user,
--      emoji) so every reaction is uniquely owned and we can let a
--      reader toggle it off later.
--
-- Idempotent end-to-end: every CREATE / ALTER / DROP is guarded so
-- the auto-runner can re-execute the file safely.
-- ---------------------------------------------------------------------------

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Giphy attachment columns
-- ---------------------------------------------------------------------------
-- We store the rendered URL (typically a 480w MP4-or-GIF from Giphy's
-- "fixed_height" rendition) plus the dimensions so the page can
-- reserve the right slot during SSR / before the asset loads — no
-- layout-shift on the comment card. `gif_provider` is forward-looking;
-- "giphy" is the only value we ship today.
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS gif_url      TEXT;
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS gif_width    INT;
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS gif_height   INT;
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS gif_provider VARCHAR(20);

-- Replace the body-length CHECK so a comment can be GIF-only (empty
-- text). The "<= 2000" cap stays so a very large pasted essay still
-- bounces.
ALTER TABLE blog_comments DROP CONSTRAINT IF EXISTS blog_comments_body_chk;
ALTER TABLE blog_comments
  ADD CONSTRAINT blog_comments_body_chk
  CHECK (
    char_length(body) <= 2000
    AND (char_length(btrim(body)) >= 1 OR gif_url IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- 2. root_id — top-most ancestor of a reply chain
-- ---------------------------------------------------------------------------
-- Migration 220 collapsed reply-to-reply onto the top-level parent so
-- threading was implicitly 1-level deep. We're now allowing a reader
-- to reply to a reply (the requirement explicitly asked for it), but
-- we still want the rendered list to stay FLAT — top-level entries +
-- one bucket of chronological replies under each. `root_id` is how
-- we get there without walking the parent_id chain in JS on every
-- page load.
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS root_id UUID;

-- Backfill: every legacy row was either top-level (parent_id NULL,
-- root_id := id) or a flat reply (parent_id := root_id := top).
UPDATE blog_comments
   SET root_id = COALESCE(parent_id, id)
 WHERE root_id IS NULL;

-- Now make the column NOT NULL — every row should have a root.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_comments' AND column_name = 'root_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE blog_comments ALTER COLUMN root_id SET NOT NULL;
  END IF;
END$$;

-- FK on root_id so a corrupted root reference fails fast.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_root_fk'
  ) THEN
    ALTER TABLE blog_comments
      ADD CONSTRAINT blog_comments_root_fk
      FOREIGN KEY (root_id) REFERENCES blog_comments(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Hot path: pull every comment in a thread in chronological order.
CREATE INDEX IF NOT EXISTS idx_blog_comments_root_created
  ON blog_comments (root_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- 3. Reactions
-- ---------------------------------------------------------------------------
-- One row per (comment, user, emoji). The unique constraint makes
-- "toggle reaction" trivial — UPSERT on click, DELETE on click again.
-- We store the emoji as a short string (the actual character, e.g.
-- "❤️") rather than a code so the read path doesn't need a join to
-- a separate emoji catalog and we can ship more emojis client-side
-- without a migration.
CREATE TABLE IF NOT EXISTS blog_comment_reactions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID         NOT NULL,
  user_id     VARCHAR(255) NOT NULL,
  emoji       VARCHAR(16)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comment_reactions_comment_fk'
  ) THEN
    ALTER TABLE blog_comment_reactions
      ADD CONSTRAINT blog_comment_reactions_comment_fk
      FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comment_reactions_user_fk'
  ) THEN
    ALTER TABLE blog_comment_reactions
      ADD CONSTRAINT blog_comment_reactions_user_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comment_reactions_unique'
  ) THEN
    ALTER TABLE blog_comment_reactions
      ADD CONSTRAINT blog_comment_reactions_unique
      UNIQUE (comment_id, user_id, emoji);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_blog_comment_reactions_comment
  ON blog_comment_reactions (comment_id);

COMMIT;
