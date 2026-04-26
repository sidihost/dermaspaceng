// ---------------------------------------------------------------------------
// lib/blog-comments.ts
//
// Read/write helpers for reader comments on the public blog. Lives in its
// own module (rather than `lib/blog.ts`) so the post code path stays
// focused; importers grab whatever they need without dragging the whole
// blog data layer along for the ride.
//
// Data model recap (see `scripts/220-blog-comments.sql`):
//   * blog_comments(id, post_id, user_id, parent_id, body, status, edited)
//   * 1-level threading enforced at the API layer (a comment whose
//     parent is itself a reply is rejected).
//   * `status = 'visible' | 'hidden'`. We never hard-delete — soft
//     delete keeps reply chains intact.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'

// Public-facing comment shape returned by the API. We always join the
// commenter's user row so the UI can render the avatar + role badge
// without a second round-trip.
export interface BlogComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  body: string
  status: 'visible' | 'hidden'
  edited: boolean
  created_at: string
  updated_at: string

  // Joined from `users`. Nullable because a deleted account could
  // (in principle) leave dangling comments — we cascade on delete
  // today, but leaving these optional means a future "preserve
  // comment, anonymise author" toggle won't require a schema change.
  user_first_name: string | null
  user_last_name: string | null
  user_username: string | null
  user_avatar_url: string | null
  user_role: 'user' | 'staff' | 'admin' | null
}

interface ListOptions {
  postId: string
  /** Defaults to 100. The single-blog detail page requests one
   *  page-load; if a popular post ever needs pagination we'd add a
   *  cursor here. */
  limit?: number
  /** Hide soft-deleted comments. Default true. Admins fetching the
   *  moderation view can pass false. */
  visibleOnly?: boolean
}

/**
 * Fetch all comments for a post, joined with the commenter's profile,
 * ordered oldest-first. The UI reorders into top-level + reply chunks
 * client-side — keeping the SQL in one shot avoids an N+1 explosion
 * if a post ever ends up with hundreds of replies.
 */
export async function listCommentsForPost(opts: ListOptions): Promise<BlogComment[]> {
  const { postId, limit = 100, visibleOnly = true } = opts
  const rows = (await sql`
    SELECT
      c.id, c.post_id, c.user_id, c.parent_id, c.body,
      c.status, c.edited, c.created_at, c.updated_at,
      u.first_name AS user_first_name,
      u.last_name  AS user_last_name,
      u.username   AS user_username,
      u.avatar_url AS user_avatar_url,
      u.role       AS user_role
    FROM blog_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ${postId}
      AND (${visibleOnly}::boolean = FALSE OR c.status = 'visible')
    ORDER BY c.created_at ASC
    LIMIT ${limit}
  `) as BlogComment[]
  return rows
}

/** Total visible comment count — cheap counter for the article page. */
export async function countCommentsForPost(postId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n
    FROM blog_comments
    WHERE post_id = ${postId} AND status = 'visible'
  `) as { n: number }[]
  return rows[0]?.n ?? 0
}

interface CreateInput {
  postId: string
  userId: string
  body: string
  parentId?: string | null
}

/**
 * Insert a new comment. Returns the comment with the joined user
 * profile so the UI can render it immediately without a follow-up
 * GET. Validation:
 *   * `body` is trimmed and length-checked (CHECK constraint also
 *     enforces this at the DB level — defence in depth).
 *   * if `parentId` is provided we verify the parent belongs to the
 *     same post AND is itself top-level (no nested replies).
 */
export async function createComment(input: CreateInput): Promise<BlogComment> {
  const body = input.body.trim()
  if (body.length === 0) throw new Error('Comment cannot be empty')
  if (body.length > 2000) throw new Error('Comment is too long (max 2000 characters)')

  let parentId: string | null = null
  if (input.parentId) {
    const parents = (await sql`
      SELECT id, post_id, parent_id
      FROM blog_comments
      WHERE id = ${input.parentId}
      LIMIT 1
    `) as Array<{ id: string; post_id: string; parent_id: string | null }>
    const parent = parents[0]
    if (!parent) throw new Error('Parent comment not found')
    if (parent.post_id !== input.postId) {
      throw new Error('Parent comment is on a different post')
    }
    // Enforce 1-level threading: replies-to-replies collapse onto the
    // top-level parent so the conversation never cascades into an
    // unreadable tree.
    parentId = parent.parent_id ?? parent.id
  }

  const rows = (await sql`
    WITH inserted AS (
      INSERT INTO blog_comments (post_id, user_id, parent_id, body)
      VALUES (${input.postId}, ${input.userId}, ${parentId}, ${body})
      RETURNING *
    )
    SELECT
      i.id, i.post_id, i.user_id, i.parent_id, i.body,
      i.status, i.edited, i.created_at, i.updated_at,
      u.first_name AS user_first_name,
      u.last_name  AS user_last_name,
      u.username   AS user_username,
      u.avatar_url AS user_avatar_url,
      u.role       AS user_role
    FROM inserted i
    LEFT JOIN users u ON u.id = i.user_id
  `) as BlogComment[]

  if (!rows[0]) throw new Error('Failed to create comment')
  return rows[0]
}

/**
 * Soft-delete a comment. Owner OR admin can delete; staff cannot
 * (the moderation surface for staff lives in /admin and isn't
 * wired to the public blog yet).
 */
export async function deleteComment(args: {
  commentId: string
  actorId: string
  actorRole: 'user' | 'staff' | 'admin'
}): Promise<{ ok: boolean; reason?: string }> {
  const rows = (await sql`
    SELECT id, user_id, status FROM blog_comments WHERE id = ${args.commentId} LIMIT 1
  `) as Array<{ id: string; user_id: string; status: string }>
  const row = rows[0]
  if (!row) return { ok: false, reason: 'not-found' }

  const isOwner = row.user_id === args.actorId
  const isAdmin = args.actorRole === 'admin'
  if (!isOwner && !isAdmin) return { ok: false, reason: 'forbidden' }

  // Soft delete — keeps reply chains intact and lets us restore.
  await sql`
    UPDATE blog_comments SET status = 'hidden' WHERE id = ${args.commentId}
  `
  return { ok: true }
}
