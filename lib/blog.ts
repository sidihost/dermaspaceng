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

export type PostStatus = 'draft' | 'published' | 'archived'

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
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
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

export async function upsertPost(user: User, input: UpsertInput): Promise<BlogPost> {
  const minutes = input.reading_minutes ?? deriveReadingMinutes(input.content_md)
  const publishedAt =
    input.status === 'published'
      ? // If we're publishing for the first time, stamp now; if already
        // published we keep the original published_at via COALESCE below.
        new Date()
      : null

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
        published_at = CASE
          WHEN ${input.status} = 'published'
            THEN COALESCE(published_at, ${publishedAt})
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
  }
  return rows[0]
}

export async function deletePost(id: string): Promise<void> {
  await sql`DELETE FROM blog_posts WHERE id = ${id}`
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
