-- ---------------------------------------------------------------------------
-- 220-blog-comments.sql
--
-- Adds threaded reader comments to the public blog, plus seeds a sensible
-- default avatar for any admin/staff account that hasn't picked one yet so
-- bylines never fall back to bare initials.
--
-- Idempotent end-to-end: every CREATE / ALTER / UPDATE is guarded so the
-- migration is safe to re-run by the auto-runner (`scripts/_runner.mjs`).
-- ---------------------------------------------------------------------------

-- pgcrypto powers gen_random_uuid(); other tables already rely on it but
-- it's harmless to make the dependency explicit here.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. blog_comments
-- ---------------------------------------------------------------------------
-- One row per posted comment. `parent_id` is nullable so a comment can
-- either be a top-level entry on the post OR a reply to another comment.
-- We deliberately limit threading to one level deep at the application
-- layer (the API rejects a parent_id whose own parent_id is non-null) so
-- the conversation never collapses into an unreadable cascade.
-- Type note: `users.id` in this schema is VARCHAR(255) (the auth
-- module stores uuidv4-as-string), but `blog_posts.id` is UUID. We
-- mirror those types exactly so the FK constraints can be created;
-- mismatched types is what crashed the first attempt at this
-- migration ("foreign key constraint cannot be implemented").
CREATE TABLE IF NOT EXISTS blog_comments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID         NOT NULL,
  user_id     VARCHAR(255) NOT NULL,
  parent_id   UUID                 NULL,
  body        TEXT         NOT NULL,
  -- 'visible' shows in feeds, 'hidden' is a soft-delete (owner deletes
  -- their own comment, or an admin moderates one). We keep the row so
  -- a reply chain isn't orphaned.
  status      VARCHAR(20)  NOT NULL DEFAULT 'visible',
  -- True once the author edits the body after posting. Surfaced in the
  -- UI as a small "(edited)" tag — currently we don't expose an edit
  -- endpoint, but the column lets us light that up later without a
  -- second migration.
  edited      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT blog_comments_status_chk
    CHECK (status IN ('visible','hidden')),
  CONSTRAINT blog_comments_body_chk
    CHECK (char_length(body) BETWEEN 1 AND 2000)
);

-- Foreign keys live in their own DO block so a re-run on a partial
-- schema (e.g. the table was created in a previous, failed migration
-- without all of its FKs) won't error on the duplicate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_post_fk'
  ) THEN
    ALTER TABLE blog_comments
      ADD CONSTRAINT blog_comments_post_fk
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_user_fk'
  ) THEN
    ALTER TABLE blog_comments
      ADD CONSTRAINT blog_comments_user_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_parent_fk'
  ) THEN
    ALTER TABLE blog_comments
      ADD CONSTRAINT blog_comments_parent_fk
      FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Hot path: list-by-post sorted newest-first.
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_created
  ON blog_comments (post_id, created_at DESC);

-- Used by the "your comments" view (future) and to count per-user load
-- for crude rate-limiting.
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_created
  ON blog_comments (user_id, created_at DESC);

-- Threaded read: pull all replies for a given parent in one shot.
-- Partial index keeps the leaf rows out of the way (most rows have a
-- NULL parent_id).
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent
  ON blog_comments (parent_id)
  WHERE parent_id IS NOT NULL;

-- updated_at touch trigger — same shape as the other tables in this
-- schema (e.g. blog_posts, user_notifications).
CREATE OR REPLACE FUNCTION blog_comments_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_comments_touch ON blog_comments;
CREATE TRIGGER blog_comments_touch
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION blog_comments_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Default author avatars
-- ---------------------------------------------------------------------------
-- Any admin or staff member who hasn't chosen a portrait yet gets one of
-- the curated SPA avatars (see lib/spa-avatars.ts) so the byline on the
-- public blog renders a face instead of bare initials. We pick by stored
-- gender; legacy rows with no gender fall through to the male default —
-- the human can swap to any other curated avatar in seconds via the
-- picker, but the public blog never has to ship without one.
UPDATE users
   SET avatar_url = CASE
                      WHEN gender = 'female' THEN '/avatars/f7.jpg'
                      ELSE '/avatars/m1.jpg'
                    END
 WHERE role IN ('admin','staff')
   AND (avatar_url IS NULL OR avatar_url = '');

COMMIT;
