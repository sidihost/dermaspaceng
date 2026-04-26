-- ============================================================================
-- 213-clear-seeded-blog-cover-images.sql
--
-- The original blog seed (script 211) gave each of the five
-- editorial posts a placeholder `cover_image_url` (e.g.
-- `/dermaspace-derma-ai-launch.jpg`). Those files were never
-- shipped, and the brief is now: posts authored by Dermaspace
-- itself should be text-only, with cover images supplied
-- exclusively by admins/staff through the editor when they
-- publish.
--
-- This script clears `cover_image_url` for the exact slugs that
-- were inserted by 211-seed-blog-content.sql. We do NOT touch
-- any post that an admin has since edited or republished, even
-- if it shares a slug, because we only clear the value when it
-- is still equal to the original placeholder path. That makes
-- the migration safe to re-run and prevents us from undoing
-- legitimate cover uploads.
--
-- The post-card and the /blog/[slug] detail page already render
-- gracefully without a cover (text-only mode with a tinted
-- gradient header), so no UI changes are required.
-- ============================================================================

UPDATE blog_posts
SET cover_image_url = NULL,
    updated_at      = NOW()
WHERE slug = 'introducing-derma-ai-nigerias-first-ai-spa-assistant'
  AND cover_image_url = '/dermaspace-derma-ai-launch.jpg';

UPDATE blog_posts
SET cover_image_url = NULL,
    updated_at      = NOW()
WHERE slug = 'derma-ai-acceptable-use-and-data-policy'
  AND cover_image_url = '/dermaspace-derma-ai-policy.jpg';

UPDATE blog_posts
SET cover_image_url = NULL,
    updated_at      = NOW()
WHERE slug = 'best-luxury-spa-in-lagos-what-makes-dermaspace-different'
  AND cover_image_url = '/dermaspace-luxury-spa-comparison.jpg';

UPDATE blog_posts
SET cover_image_url = NULL,
    updated_at      = NOW()
WHERE slug = 'skincare-routine-for-the-lagos-climate'
  AND cover_image_url = '/dermaspace-lagos-skincare-routine.jpg';

UPDATE blog_posts
SET cover_image_url = NULL,
    updated_at      = NOW()
WHERE slug = 'spa-victoria-island-vs-ikoyi-where-to-book'
  AND cover_image_url = '/dermaspace-vi-vs-ikoyi.jpg';
