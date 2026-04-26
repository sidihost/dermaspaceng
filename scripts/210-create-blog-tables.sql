-- ---------------------------------------------------------------------------
-- 210 — Blog system
--
-- Adds three tables that power the public /blog and the admin / staff
-- editors:
--
--   * blog_categories     — taxonomy (Skincare, Wellness, AI, Lagos guide…)
--   * blog_posts          — long-form articles authored by admins / staff
--   * blog_post_revisions — append-only edit history (who edited what, when)
--   * blog_permissions    — per-staff capabilities granted by an admin
--
-- All foreign keys reference the existing `users` table.
--
-- Idempotent — every CREATE statement is wrapped in IF NOT EXISTS so this
-- file is safe to re-run.
-- ---------------------------------------------------------------------------

-- Categories -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  -- Tailwind-friendly hex (no leading hash) so the listing card can pick a
  -- subtle accent without us shipping a separate colour palette table.
  accent_hex  VARCHAR(7) DEFAULT '#7B2D8E',
  position    INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Posts ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               VARCHAR(255) UNIQUE NOT NULL,
  title              VARCHAR(255) NOT NULL,
  excerpt            TEXT,
  -- Body is stored as Markdown. Rendered to HTML on the server with `marked`
  -- so search engines see full HTML and we keep edit-history diff-friendly.
  content_md         TEXT NOT NULL,
  cover_image_url    TEXT,
  cover_image_alt    VARCHAR(255),
  category_id        UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  -- Author attribution. We snapshot the display name at write-time so a
  -- profile rename never silently re-attributes historical articles.
  author_id          VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  author_name        VARCHAR(255),
  author_role        VARCHAR(20),
  status             VARCHAR(20) NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','published','archived')),
  published_at       TIMESTAMP,
  reading_minutes    INT DEFAULT 5,
  view_count         INT DEFAULT 0,
  featured           BOOLEAN DEFAULT FALSE,
  -- SEO overrides — fall back to title/excerpt when null.
  seo_title          VARCHAR(255),
  seo_description    TEXT,
  seo_keywords       TEXT[],
  -- JSON-LD overrides (e.g. switch from Article to FAQPage for Q&A posts).
  schema_type        VARCHAR(50) DEFAULT 'Article',
  -- Tags are a small, denormalised array; categories are the primary
  -- taxonomy and live in their own table.
  tags               TEXT[],
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

-- Lookup speed for the public listing pages and the admin tables.
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub
  ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category
  ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author
  ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured
  ON blog_posts(featured) WHERE featured = TRUE;

-- Append-only revision history. Lets us diff drafts vs. published copy and
-- revert mistakes without trusting a single mutable `content_md` column.
CREATE TABLE IF NOT EXISTS blog_post_revisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  edited_by   VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  editor_name VARCHAR(255),
  title       VARCHAR(255),
  content_md  TEXT,
  note        VARCHAR(255),
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blog_revisions_post
  ON blog_post_revisions(post_id, created_at DESC);

-- Per-staff permissions. Admins implicitly have all four caps; rows here
-- only matter for `role = 'staff'` users. Lack of a row == no access.
CREATE TABLE IF NOT EXISTS blog_permissions (
  user_id     VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  can_create  BOOLEAN DEFAULT FALSE,
  can_edit    BOOLEAN DEFAULT FALSE,
  can_publish BOOLEAN DEFAULT FALSE,
  can_delete  BOOLEAN DEFAULT FALSE,
  granted_by  VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  granted_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
