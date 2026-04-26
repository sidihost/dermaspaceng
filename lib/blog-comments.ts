// ---------------------------------------------------------------------------
// lib/blog-comments.ts
//
// Read/write helpers for reader comments on the public blog. Lives in
// its own module (rather than `lib/blog.ts`) so the post code path
// stays focused; importers grab whatever they need without dragging
// the whole blog data layer along for the ride.
//
// Data model (see `scripts/220-blog-comments.sql` and
// `scripts/222-blog-comment-extras.sql`):
//   * blog_comments(id, post_id, user_id, parent_id, root_id, body,
//                   gif_url, gif_width, gif_height, gif_provider,
//                   status, edited)
//   * `parent_id` = immediate parent (nullable for top-level).
//   * `root_id`   = top-most ancestor; equals `id` for top-level
//                   comments. Lets us render a flat thread without
//                   walking the chain in JS.
//   * `status = 'visible' | 'hidden'`. We never hard-delete — soft
//     delete keeps reply chains intact.
//   * blog_comment_reactions(id, comment_id, user_id, emoji)
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'

export interface CommentReactionSummary {
  /** The emoji character, e.g. "❤️". */
  emoji: string
  /** How many distinct users have reacted with this emoji. */
  count: number
  /** True if the currently-authenticated user is one of them. Always
   *  false in the unauthenticated read path — the API layer fills
   *  this in before serialising. */
  reactedByMe: boolean
}

// Public-facing comment shape returned by the API. We always join the
// commenter's user row so the UI can render the avatar + role badge
// without a second round-trip.
export interface BlogComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  /** Top-most ancestor. Equals `id` for top-level comments. */
  root_id: string
  body: string
  gif_url: string | null
  gif_width: number | null
  gif_height: number | null
  gif_provider: string | null
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

  /** Aggregated reactions, sorted by count desc. Empty array when
   *  none exist. The API fills `reactedByMe` per-viewer. */
  reactions: CommentReactionSummary[]
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
  /** When provided, each reaction summary's `reactedByMe` is set
   *  based on this user. Pass `null` for logged-out viewers. */
  viewerId?: string | null
}

/**
 * Fetch all comments for a post, joined with the commenter's profile,
 * ordered oldest-first. The UI reorders into top-level + reply chunks
 * client-side — keeping the SQL in one shot avoids an N+1 explosion
 * if a post ever ends up with hundreds of replies.
 *
 * Reactions are aggregated in a second query and merged in JS (one
 * extra round-trip, but it keeps the comments query simple and lets
 * us reuse the existing index plan).
 */
export async function listCommentsForPost(opts: ListOptions): Promise<BlogComment[]> {
  const { postId, limit = 100, visibleOnly = true, viewerId = null } = opts
  const rows = (await sql`
    SELECT
      c.id, c.post_id, c.user_id, c.parent_id, c.root_id, c.body,
      c.gif_url, c.gif_width, c.gif_height, c.gif_provider,
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
  `) as Omit<BlogComment, 'reactions'>[]

  if (rows.length === 0) return []

  // Pull every reaction for these comments in one shot. We aggregate
  // in JS rather than in SQL because we also need the per-viewer
  // `reactedByMe` flag, which depends on whether `viewerId` is in
  // the user_id set for each (comment, emoji) bucket.
  const ids = rows.map((r) => r.id)
  const reactions = (await sql`
    SELECT comment_id, emoji, user_id
    FROM blog_comment_reactions
    WHERE comment_id = ANY(${ids}::uuid[])
  `) as Array<{ comment_id: string; emoji: string; user_id: string }>

  const byComment = new Map<string, Map<string, { users: Set<string> }>>()
  for (const r of reactions) {
    let perEmoji = byComment.get(r.comment_id)
    if (!perEmoji) {
      perEmoji = new Map()
      byComment.set(r.comment_id, perEmoji)
    }
    let bucket = perEmoji.get(r.emoji)
    if (!bucket) {
      bucket = { users: new Set<string>() }
      perEmoji.set(r.emoji, bucket)
    }
    bucket.users.add(r.user_id)
  }

  return rows.map((row) => {
    const perEmoji = byComment.get(row.id)
    const reactionList: CommentReactionSummary[] = perEmoji
      ? Array.from(perEmoji.entries())
          .map(([emoji, b]) => ({
            emoji,
            count: b.users.size,
            reactedByMe: viewerId !== null && b.users.has(viewerId),
          }))
          .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
      : []
    return { ...row, reactions: reactionList }
  })
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
  /** Optional Giphy attachment. When set, body may be empty. */
  gif?: {
    url: string
    width: number
    height: number
    provider?: 'giphy'
  } | null
}

/**
 * Insert a new comment. Returns the comment with the joined user
 * profile so the UI can render it immediately without a follow-up
 * GET. Validation:
 *   * `body` is trimmed and length-checked (CHECK constraint also
 *     enforces this at the DB level — defence in depth).
 *   * If `parentId` is provided we verify the parent belongs to the
 *     same post. Unlike the original 220 implementation, we ALLOW
 *     replies-to-replies — `parent_id` records the immediate parent,
 *     `root_id` points at the top-most ancestor so the UI can still
 *     render a flat 2-tier thread.
 */
export async function createComment(input: CreateInput): Promise<BlogComment> {
  const body = input.body.trim()
  const gif = input.gif ?? null

  if (body.length === 0 && !gif) {
    throw new Error('Comment cannot be empty')
  }
  if (body.length > 2000) {
    throw new Error('Comment is too long (max 2000 characters)')
  }
  if (gif && (!gif.url || !/^https?:\/\//i.test(gif.url))) {
    throw new Error('Invalid GIF URL')
  }

  // Resolve immediate parent + root ancestor.
  let parentId: string | null = null
  let rootId: string | null = null
  if (input.parentId) {
    const parents = (await sql`
      SELECT id, post_id, root_id
      FROM blog_comments
      WHERE id = ${input.parentId}
      LIMIT 1
    `) as Array<{ id: string; post_id: string; root_id: string }>
    const parent = parents[0]
    if (!parent) throw new Error('Parent comment not found')
    if (parent.post_id !== input.postId) {
      throw new Error('Parent comment is on a different post')
    }
    parentId = parent.id
    rootId = parent.root_id
  }

  // Two-step insert: row first to get the generated id (so a top-level
  // comment can set `root_id := id`), then UPDATE if needed. We use a
  // CTE so it's still a single round-trip.
  const rows = (await sql`
    WITH inserted AS (
      INSERT INTO blog_comments (
        post_id, user_id, parent_id, body,
        gif_url, gif_width, gif_height, gif_provider,
        root_id
      )
      VALUES (
        ${input.postId}, ${input.userId}, ${parentId}, ${body},
        ${gif?.url ?? null}, ${gif?.width ?? null}, ${gif?.height ?? null},
        ${gif?.provider ?? (gif ? 'giphy' : null)},
        ${rootId /* nullable here; we backfill below for top-level */}
      )
      RETURNING *
    ),
    finalised AS (
      UPDATE blog_comments
         SET root_id = COALESCE(blog_comments.root_id, blog_comments.id)
       WHERE id = (SELECT id FROM inserted)
       RETURNING *
    )
    SELECT
      f.id, f.post_id, f.user_id, f.parent_id, f.root_id, f.body,
      f.gif_url, f.gif_width, f.gif_height, f.gif_provider,
      f.status, f.edited, f.created_at, f.updated_at,
      u.first_name AS user_first_name,
      u.last_name  AS user_last_name,
      u.username   AS user_username,
      u.avatar_url AS user_avatar_url,
      u.role       AS user_role
    FROM finalised f
    LEFT JOIN users u ON u.id = f.user_id
  `) as Omit<BlogComment, 'reactions'>[]

  if (!rows[0]) throw new Error('Failed to create comment')
  return { ...rows[0], reactions: [] }
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

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

const REACTION_ALLOWLIST = new Set([
  '❤️', '👍', '🎉', '😂', '🤩', '😮', '😢', '🙏', '🔥', '💯',
])

export function isAllowedReaction(emoji: string): boolean {
  return REACTION_ALLOWLIST.has(emoji)
}

/**
 * Toggle a reaction. Inserts on first call, deletes on second so the
 * same UI control acts as both "react" and "un-react". Returns the
 * resulting state ('added' | 'removed') so the client can show the
 * right optimistic update without re-fetching.
 *
 * The unique constraint on (comment_id, user_id, emoji) makes the
 * UPSERT race-safe — two parallel POSTs from the same user collapse
 * to a single row.
 */
export async function toggleReaction(args: {
  commentId: string
  userId: string
  emoji: string
}): Promise<{ state: 'added' | 'removed' }> {
  if (!isAllowedReaction(args.emoji)) {
    throw new Error('Reaction not allowed')
  }
  // Verify comment exists + is visible (soft-deleted comments
  // shouldn't accumulate new reactions).
  const exists = (await sql`
    SELECT id FROM blog_comments
    WHERE id = ${args.commentId} AND status = 'visible'
    LIMIT 1
  `) as Array<{ id: string }>
  if (!exists[0]) throw new Error('Comment not found')

  // Try delete first — if the row exists, this is an "un-react".
  const deleted = (await sql`
    DELETE FROM blog_comment_reactions
    WHERE comment_id = ${args.commentId}
      AND user_id    = ${args.userId}
      AND emoji      = ${args.emoji}
    RETURNING id
  `) as Array<{ id: string }>

  if (deleted.length > 0) {
    return { state: 'removed' }
  }

  // Otherwise insert. ON CONFLICT DO NOTHING covers the rare race
  // where a delete-then-insert from a parallel request collides.
  await sql`
    INSERT INTO blog_comment_reactions (comment_id, user_id, emoji)
    VALUES (${args.commentId}, ${args.userId}, ${args.emoji})
    ON CONFLICT (comment_id, user_id, emoji) DO NOTHING
  `
  return { state: 'added' }
}
