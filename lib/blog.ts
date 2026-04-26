// ---------------------------------------------------------------------------
// lib/blog.ts
//
// All blog read/write helpers. Exists as a single module so:
//   * the public /blog page can import getPublishedPosts / getPostBySlug
//   * the admin & staff editors share writePost / publishPost
//   * the sitemap and any RSS feed can pull just the slugs they need
//
// Every query is parameterised through the `sql` tagged-template helper
// from `lib/db.ts` (Neon serverless), matching the rest of the codebase.
// We never concatenate user input into SQL.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'
import type { User } from '@/lib/auth'
import { cached, cacheKey, invalidateBlog, KEYS } from '@/lib/redis'
import { schedulePublish, cancelMessage } from '@/lib/qstash'

// `scheduled` lets an author pick a future publish moment. A QStash
// message fires at that exact time and flips the row to 'published'.
// Anything else stays exactly the same as before.
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived'

// Caching strategy
// ----------------
// * Public reads (listing, slug lookup, related, categories) are wrapped
//   with `cached(...)` and a short TTL — plenty short to feel "instant"
//   for editors after a publish, plenty long to absorb traffic spikes.
// * Writes call `invalidateBlog()` to wipe every blog cache family in
//   one shot (the blast radius is tiny — only the blog).
const TTL_LIST = 120 // 2 minutes
const TTL_DETAIL = 300 // 5 minutes
const TTL_CATEGORIES = 600 // 10 minutes
const TTL_RELATED = 300

export interface BlogCategory {
  id: string
  slug: string
  name: string
  description: string | null
  accent_hex: string
  position: number
  post_count?: number
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content_md: string
  cover_image_url: string | null
  cover_image_alt: string | null
  category_id: string | null
  category_slug?: string | null
  category_name?: string | null
  category_accent?: string | null
  author_id: string | null
  author_name: string | null
  author_role: string | null
  status: PostStatus
  published_at: Date | null
  reading_minutes: number
  view_count: number
  featured: boolean
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
  schema_type: string
  tags: string[] | null
  created_at: Date
  updated_at: Date
}

export interface BlogPermissions {
  can_create: boolean
  can_edit: boolean
  can_publish: boolean
  can_delete: boolean
}

// All admins implicitly have every capability; lack of a row for a staff
// member means no access at all (we deliberately fail closed).
export async function getBlogPermissions(user: User | null): Promise<BlogPermissions> {
  if (!user) return { can_create: false, can_edit: false, can_publish: false, can_delete: false }
  if (user.role === 'admin') {
    return { can_create: true, can_edit: true, can_publish: true, can_delete: true }
  }
  if (user.role !== 'staff') {
    return { can_create: false, can_edit: false, can_publish: false, can_delete: false }
  }
  const rows = (await sql`
    SELECT can_create, can_edit, can_publish, can_delete
    FROM blog_permissions
    WHERE user_id = ${user.id}
  `) as BlogPermissions[]
  return rows[0] ?? { can_create: false, can_edit: false, can_publish: false, can_delete: false }
}

// -- Public reads -----------------------------------------------------------

export async function getCategories(): Promise<BlogCategory[]> {
  // Cached because every public listing page reads it on every request and
  // the data changes once in a blue moon.
  return cached(KEYS.blogCategories, TTL_CATEGORIES, async () => {
    const rows = (await sql`
      SELECT
        c.id, c.slug, c.name, c.description, c.accent_hex, c.position,
        COUNT(p.id) FILTER (WHERE p.status = 'published') AS post_count
      FROM blog_categories c
      LEFT JOIN blog_posts p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.position ASC, c.name ASC
    `) as (BlogCategory & { post_count: string })[]
    return rows.map((r) => ({ ...r, post_count: Number(r.post_count) }))
  })
}

export async function getCategoryBySlug(slug: string): Promise<BlogCategory | null> {
  const rows = (await sql`
    SELECT id, slug, name, description, accent_hex, position
    FROM blog_categories WHERE slug = ${slug}
  `) as BlogCategory[]
  return rows[0] ?? null
}

interface ListOptions {
  limit?: number
  offset?: number
  categorySlug?: string
  search?: string
  featuredOnly?: boolean
}

// Public listing — only returns published posts, ordered newest first.
// Joins the category in one round-trip so the listing card has everything
// it needs without an N+1.
export async function getPublishedPosts(opts: ListOptions = {}): Promise<BlogPost[]> {
  const { limit = 20, offset = 0, categorySlug, search, featuredOnly = false } = opts
  const key = cacheKey(KEYS.blogPostsList, {
    limit,
    offset,
    cat: categorySlug ?? '',
    q: search ?? '',
    feat: featuredOnly ? 1 : 0,
  })
  return cached(key, TTL_LIST, async () => {
  const rows = (await sql`
    SELECT
      p.*,
      c.slug AS category_slug,
      c.name AS category_name,
      c.accent_hex AS category_accent
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    WHERE p.status = 'published'
      AND p.published_at <= NOW()
      AND (${categorySlug ?? null}::text IS NULL OR c.slug = ${categorySlug ?? null})
      AND (${search ?? null}::text IS NULL OR (
        p.title ILIKE '%' || ${search ?? ''} || '%'
        OR p.excerpt ILIKE '%' || ${search ?? ''} || '%'
      ))
      AND (${featuredOnly}::boolean = FALSE OR p.featured = TRUE)
    ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as BlogPost[]
    return rows
  })
}

export async function countPublishedPosts(opts: { categorySlug?: string; search?: string } = {}): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    WHERE p.status = 'published'
      AND p.published_at <= NOW()
      AND (${opts.categorySlug ?? null}::text IS NULL OR c.slug = ${opts.categorySlug ?? null})
      AND (${opts.search ?? null}::text IS NULL OR (
        p.title ILIKE '%' || ${opts.search ?? ''} || '%'
        OR p.excerpt ILIKE '%' || ${opts.search ?? ''} || '%'
      ))
  `) as { n: number }[]
  return rows[0]?.n ?? 0
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return cached(`${KEYS.blogPostBySlug}:${slug}`, TTL_DETAIL, async () => {
    const rows = (await sql`
      SELECT
        p.*,
        c.slug AS category_slug,
        c.name AS category_name,
        c.accent_hex AS category_accent
      FROM blog_posts p
      LEFT JOIN blog_categories c ON c.id = p.category_id
      WHERE p.slug = ${slug}
      LIMIT 1
    `) as BlogPost[]
    return rows[0] ?? null
  })
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  return cached(`${KEYS.blogRelated}:${post.id}:${limit}`, TTL_RELATED, async () => {
    if (!post.category_id) {
      const rows = (await sql`
        SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.accent_hex AS category_accent
        FROM blog_posts p
        LEFT JOIN blog_categories c ON c.id = p.category_id
        WHERE p.id != ${post.id} AND p.status = 'published'
        ORDER BY p.published_at DESC LIMIT ${limit}
      `) as BlogPost[]
      return rows
    }
    const rows = (await sql`
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.accent_hex AS category_accent
      FROM blog_posts p
      LEFT JOIN blog_categories c ON c.id = p.category_id
      WHERE p.id != ${post.id}
        AND p.status = 'published'
        AND p.category_id = ${post.category_id}
      ORDER BY p.published_at DESC NULLS LAST
      LIMIT ${limit}
    `) as BlogPost[]
    return rows
  })
}

export async function incrementViewCount(postId: string): Promise<void> {
  // Best-effort, swallow errors — a failed counter must never break a page.
  try {
    await sql`UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ${postId}`
  } catch {
    /* noop */
  }
}

// -- Author / admin reads ---------------------------------------------------

export async function getAllPostsForAuthor(user: User): Promise<BlogPost[]> {
  // Admins see everything. Staff only see posts they authored OR posts they
  // have edit permission on (we already enforce edit-on-write in the route).
  if (user.role === 'admin') {
    const rows = (await sql`
      SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.accent_hex AS category_accent
      FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
      ORDER BY p.updated_at DESC
    `) as BlogPost[]
    return rows
  }
  const rows = (await sql`
    SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.accent_hex AS category_accent
    FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
    WHERE p.author_id = ${user.id}
    ORDER BY p.updated_at DESC
  `) as BlogPost[]
  return rows
}

// -- Mutations --------------------------------------------------------------

interface UpsertInput {
  id?: string
  slug: string
  title: string
  excerpt?: string | null
  content_md: string
  cover_image_url?: string | null
  cover_image_alt?: string | null
  category_id?: string | null
  status: PostStatus
  // Future ISO timestamp; required when status === 'scheduled'. Ignored
  // for any other status. We feed this into QStash so the post auto-flips
  // to 'published' at exactly this moment without us running a cron.
  scheduled_for?: string | null
  reading_minutes?: number | null
  featured?: boolean
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string[] | null
  tags?: string[] | null
}

function deriveReadingMinutes(content: string): number {
  // ~220 wpm average reading pace; floor of 1 minute so micro-posts never
  // claim "0 min read".
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}

/**
 * Reconcile QStash with what the author just saved:
 *
 *   * If the previous row had a queued message, cancel it (we either
 *     don't want to publish at the old time anymore, or we're about to
 *     enqueue a fresh one).
 *   * If the new state is `scheduled` with a future timestamp, enqueue a
 *     new QStash message and persist its id so we can cancel it again
 *     on the next edit.
 *
 * Wrapped in try/catch so a transient QStash hiccup never prevents an
 * editor from saving a draft.
 */
async function reconcileQStashSchedule(args: {
  post: BlogPost
  status: PostStatus
  scheduledFor: Date | null
  previousQstashId: string | null
}): Promise<void> {
  try {
    if (args.previousQstashId) {
      await cancelMessage(args.previousQstashId)
      await sql`UPDATE blog_posts SET qstash_message_id = NULL WHERE id = ${args.post.id}`
    }
    if (args.status === 'scheduled' && args.scheduledFor && args.scheduledFor.getTime() > Date.now()) {
      const messageId = await schedulePublish({
        postId: args.post.id,
        slug: args.post.slug,
        publishAt: args.scheduledFor,
      })
      await sql`UPDATE blog_posts SET qstash_message_id = ${messageId} WHERE id = ${args.post.id}`
    }
  } catch (err) {
    console.warn('[blog] reconcileQStashSchedule failed:', err)
  }
}

export async function upsertPost(user: User, input: UpsertInput): Promise<BlogPost> {
  const minutes = input.reading_minutes ?? deriveReadingMinutes(input.content_md)
  // Compute the timestamp we'll store in `published_at`:
  //   * 'published'  → now (or COALESCE with original on update)
  //   * 'scheduled'  → the future moment the author picked
  //   * everything else → null
  let publishedAt: Date | null = null
  if (input.status === 'published') publishedAt = new Date()
  if (input.status === 'scheduled' && input.scheduled_for) {
    publishedAt = new Date(input.scheduled_for)
  }

  // If the author is updating a post that already had a QStash schedule
  // (e.g. they're moving it from 'scheduled' to 'draft', or they picked a
  // new date), we need to cancel the old QStash message before enqueuing
  // a new one. Look it up before we run the UPDATE so we still have the
  // previous value.
  let previousQstashId: string | null = null
  if (input.id) {
    const prev = (await sql`
      SELECT qstash_message_id FROM blog_posts WHERE id = ${input.id}
    `) as { qstash_message_id: string | null }[]
    previousQstashId = prev[0]?.qstash_message_id ?? null
  }

  if (input.id) {
    const rows = (await sql`
      UPDATE blog_posts SET
        slug = ${input.slug},
        title = ${input.title},
        excerpt = ${input.excerpt ?? null},
        content_md = ${input.content_md},
        cover_image_url = ${input.cover_image_url ?? null},
        cover_image_alt = ${input.cover_image_alt ?? null},
        category_id = ${input.category_id ?? null},
        status = ${input.status},
        -- 'published'  → keep an existing publish stamp, or stamp now.
        -- 'scheduled'  → overwrite with the future moment the author picked.
        -- anything else → leave as-is so a published-then-archived post
        --                 still remembers when it first went live.
        published_at = CASE
          WHEN ${input.status} = 'published'
            THEN COALESCE(published_at, ${publishedAt})
          WHEN ${input.status} = 'scheduled'
            THEN ${publishedAt}
          ELSE published_at
        END,
        reading_minutes = ${minutes},
        featured = ${input.featured ?? false},
        seo_title = ${input.seo_title ?? null},
        seo_description = ${input.seo_description ?? null},
        seo_keywords = ${input.seo_keywords ?? null},
        tags = ${input.tags ?? null},
        updated_at = NOW()
      WHERE id = ${input.id}
      RETURNING *
    `) as BlogPost[]

    // Append to revision log (best-effort).
    if (rows[0]) {
      await sql`
        INSERT INTO blog_post_revisions (post_id, edited_by, editor_name, title, content_md, note)
        VALUES (${rows[0].id}, ${user.id}, ${user.first_name + ' ' + user.last_name}, ${input.title}, ${input.content_md}, 'edit')
      `.catch(() => {})

      // Cancel any old QStash schedule, enqueue a new one if needed,
      // and blow away every blog cache family so the editor's preview
      // and the public page reflect the change immediately.
      await reconcileQStashSchedule({
        post: rows[0],
        status: input.status,
        scheduledFor: input.status === 'scheduled' && input.scheduled_for ? new Date(input.scheduled_for) : null,
        previousQstashId,
      })
      await invalidateBlog()
    }
    return rows[0]
  }

  const rows = (await sql`
    INSERT INTO blog_posts (
      slug, title, excerpt, content_md, cover_image_url, cover_image_alt,
      category_id, author_id, author_name, author_role, status, published_at,
      reading_minutes, featured, seo_title, seo_description, seo_keywords, tags
    ) VALUES (
      ${input.slug}, ${input.title}, ${input.excerpt ?? null}, ${input.content_md},
      ${input.cover_image_url ?? null}, ${input.cover_image_alt ?? null},
      ${input.category_id ?? null}, ${user.id},
      ${user.first_name + ' ' + user.last_name}, ${user.role},
      ${input.status}, ${publishedAt}, ${minutes}, ${input.featured ?? false},
      ${input.seo_title ?? null}, ${input.seo_description ?? null},
      ${input.seo_keywords ?? null}, ${input.tags ?? null}
    )
    RETURNING *
  `) as BlogPost[]

  if (rows[0]) {
    await sql`
      INSERT INTO blog_post_revisions (post_id, edited_by, editor_name, title, content_md, note)
      VALUES (${rows[0].id}, ${user.id}, ${user.first_name + ' ' + user.last_name}, ${input.title}, ${input.content_md}, 'create')
    `.catch(() => {})

    // First-create version of the same reconcile + invalidate dance the
    // UPDATE branch runs. There's no previous QStash id to cancel here.
    await reconcileQStashSchedule({
      post: rows[0],
      status: input.status,
      scheduledFor: input.status === 'scheduled' && input.scheduled_for ? new Date(input.scheduled_for) : null,
      previousQstashId: null,
    })
    await invalidateBlog()
  }
  return rows[0]
}

export async function deletePost(id: string): Promise<void> {
  // If the post had a QStash schedule pending, cancel it before we drop
  // the row — otherwise we'd "publish" a non-existent post hours later.
  const rows = (await sql`
    SELECT qstash_message_id FROM blog_posts WHERE id = ${id}
  `) as { qstash_message_id: string | null }[]
  await cancelMessage(rows[0]?.qstash_message_id ?? null)
  await sql`DELETE FROM blog_posts WHERE id = ${id}`
  await invalidateBlog()
}

/**
 * Called by the QStash webhook (`/api/blog/publish-scheduled`) when a
 * scheduled message fires. Atomically flips the post from 'scheduled' to
 * 'published' if it's still in that state — guards against races where
 * an admin manually published or un-scheduled in the meantime.
 */
export async function markScheduledAsPublished(postId: string): Promise<BlogPost | null> {
  const rows = (await sql`
    UPDATE blog_posts
    SET status = 'published',
        published_at = NOW(),
        qstash_message_id = NULL,
        updated_at = NOW()
    WHERE id = ${postId}
      AND status = 'scheduled'
    RETURNING *
  `) as BlogPost[]
  if (rows[0]) await invalidateBlog()
  return rows[0] ?? null
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const rows = (await sql`
    SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.accent_hex AS category_accent
    FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
    WHERE p.id = ${id}
  `) as BlogPost[]
  return rows[0] ?? null
}

// -- Slug helper ------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}
