'use client'

// ---------------------------------------------------------------------------
// components/blog/blog-comments.tsx
//
// Comment thread that lives at the bottom of every blog article.
//   * Top-level entries appear newest-first; replies (1 level deep) sit
//     beneath their parent in chronological order.
//   * SWR keeps the list live without polling — we revalidate after a
//     successful POST/DELETE and on focus.
//   * Posting is optimistic: the new comment renders straight away with
//     a "Sending…" tag and is reconciled on the server response.
//   * Logged-out readers see the conversation but get a clear "Sign in
//     to comment" CTA at the top of the compose card.
//
// We deliberately keep the visual surface minimal: brand purple as the
// only accent, heavy reliance on whitespace + hairlines, no images
// other than the per-commenter avatar.
// ---------------------------------------------------------------------------

import * as React from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  Loader2,
  MessageCircle,
  Reply,
  Trash2,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface CommentDTO {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  body: string
  status: 'visible' | 'hidden'
  edited: boolean
  created_at: string
  updated_at: string
  user_first_name: string | null
  user_last_name: string | null
  user_username: string | null
  user_avatar_url: string | null
  user_role: 'user' | 'staff' | 'admin' | null
}

interface MeDTO {
  user: null | {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
    username: string | null
  }
}

interface ListResponse {
  comments: CommentDTO[]
  count: number
}

const BRAND = '#7B2D8E'
const MAX_LEN = 2000

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok && res.status !== 401) throw new Error('Failed to load')
  return res.json()
}

// Compact "5m ago", "3h ago", "2d ago", or full date for older.
function formatAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const s = Math.max(0, Math.floor((now - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function fullName(c: CommentDTO): string {
  const fn = c.user_first_name ?? ''
  const ln = c.user_last_name ?? ''
  const joined = `${fn} ${ln}`.trim()
  if (joined) return joined
  return c.user_username ?? 'Reader'
}

function initials(c: CommentDTO): string {
  const fn = c.user_first_name?.[0] ?? ''
  const ln = c.user_last_name?.[0] ?? ''
  return `${fn}${ln}`.toUpperCase() || '?'
}

// Role badge — displayed next to the author name. Admin wears the
// brand purple ShieldCheck; staff uses a quieter neutral pill. Regular
// readers get nothing (no badge inflation).
function RoleBadge({ role }: { role: CommentDTO['user_role'] }) {
  if (role === 'admin') {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
        title="Dermaspace team"
      >
        <ShieldCheck className="w-2.5 h-2.5" aria-hidden />
        Team
      </span>
    )
  }
  if (role === 'staff') {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[9.5px] font-bold uppercase tracking-wider"
        title="Dermaspace staff"
      >
        Staff
      </span>
    )
  }
  return null
}

function Avatar({
  url,
  initials,
  size = 36,
}: { url: string | null; initials: string; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="rounded-full object-cover flex-shrink-0 ring-1 ring-gray-100"
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: BRAND,
        fontSize: size * 0.34,
      }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

interface ComposeProps {
  postId: string
  parentId?: string | null
  me: MeDTO['user']
  placeholder?: string
  /** Called after a successful post; used by the reply box to collapse itself. */
  onPosted?: () => void
  /** Called when the user cancels (reply box only). */
  onCancel?: () => void
  autoFocus?: boolean
}

function ComposeBox({
  postId,
  parentId = null,
  me,
  placeholder = 'Share your thoughts…',
  onPosted,
  onCancel,
  autoFocus,
}: ComposeProps) {
  const [body, setBody] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const taRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (autoFocus) taRef.current?.focus()
  }, [autoFocus])

  // Auto-grow the textarea so writing a longer comment doesn't
  // require scrolling inside a tiny box.
  React.useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [body])

  if (!me) {
    // Signed-out empty state — softer than the previous flat
    // gray card. Tinted purple wash + an inviting subtitle so it
    // feels like an opportunity to participate, not a wall.
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#7B2D8E]/[0.06] to-[#7B2D8E]/[0.02] border border-[#7B2D8E]/15 p-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-white border border-[#7B2D8E]/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4.5 h-4.5 text-[#7B2D8E]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-gray-900 leading-snug">
              Join the conversation
            </p>
            <p className="mt-0.5 text-[13px] text-gray-600 leading-relaxed">
              <Link href="/signin" className="font-semibold text-[#7B2D8E] hover:underline">
                Sign in
              </Link>{' '}
              to share your thoughts and reply to other readers.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const trimmed = body.trim()
  const remaining = MAX_LEN - body.length
  const canSend = trimmed.length > 0 && remaining >= 0 && !sending

  const handleSubmit = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          parent_id: parentId,
          body: trimmed,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not post comment')
      }
      setBody('')
      // Re-fetch so the new comment lands deterministically (avoids
      // duplicate keys if the optimistic + real comment both ended up
      // in the list).
      await mutate(`/api/blog/comments?postId=${postId}`)
      onPosted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setSending(false)
    }
  }

  const meInitials = `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <div className="flex items-start gap-3">
      <Avatar url={me.avatarUrl} initials={meInitials} size={parentId ? 32 : 40} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl border border-gray-200 focus-within:border-[#7B2D8E]/60 focus-within:ring-2 focus-within:ring-[#7B2D8E]/15 transition-all bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <textarea
            ref={taRef}
            rows={parentId ? 2 : 3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            maxLength={MAX_LEN + 200 /* let the user see the over-limit message before we hard cut */}
            className="w-full px-4 pt-3 pb-2 bg-transparent text-[14.5px] text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 h-8 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
              )}
              <span
                className={`text-[11px] tabular-nums ${
                  remaining < 100
                    ? remaining < 0
                      ? 'text-red-500 font-semibold'
                      : 'text-amber-600'
                    : 'text-gray-400'
                }`}
              >
                {remaining < 100 ? `${remaining}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-white text-[12.5px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{ backgroundColor: BRAND }}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="w-3.5 h-3.5" aria-hidden />
              )}
              {parentId ? 'Reply' : 'Post'}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-[12px] text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}

interface CommentRowProps {
  comment: CommentDTO
  replies: CommentDTO[]
  postId: string
  me: MeDTO['user']
  isReply?: boolean
}

function CommentRow({ comment, replies, postId, me, isReply = false }: CommentRowProps) {
  const [showReply, setShowReply] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const isOwner = !!me && me.id === comment.user_id
  const canDelete = isOwner // admin moderation handled in /admin

  const handleDelete = async () => {
    if (!canDelete || deleting) return
    if (!window.confirm('Delete this comment?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/blog/comments/${comment.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
      await mutate(`/api/blog/comments?postId=${postId}`)
    } catch {
      window.alert('Could not delete that comment. Try again in a moment.')
    } finally {
      setDeleting(false)
    }
  }

  // Top-level comments render as a soft card so they feel like
  // discrete contributions; replies stay flat (the indented gutter
  // already does the visual grouping).
  return (
    <article
      className={
        isReply
          ? 'pl-11 sm:pl-14 relative'
          : 'rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 hover:border-gray-200 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
      }
    >
      {/* Subtle reply-thread gutter — a soft brand-purple hairline
          on the left of each reply gives a clear visual lineage to
          the parent comment without nesting cards. */}
      {isReply && (
        <span
          aria-hidden
          className="absolute left-4 sm:left-5 top-1 bottom-1 w-px bg-[#7B2D8E]/15"
        />
      )}
      <div className="flex items-start gap-3">
        <Avatar
          url={comment.user_avatar_url}
          initials={initials(comment)}
          size={isReply ? 32 : 40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap leading-tight">
            <span className="text-[14px] font-semibold text-gray-900 truncate">
              {fullName(comment)}
            </span>
            <RoleBadge role={comment.user_role} />
            <span className="text-[11.5px] text-gray-500">{formatAgo(comment.created_at)}</span>
            {comment.edited && (
              <span className="text-[10.5px] text-gray-400">(edited)</span>
            )}
          </div>
          <p className="mt-1.5 text-[14.5px] text-gray-800 leading-[1.65] whitespace-pre-wrap break-words">
            {comment.body}
          </p>
          <div className="mt-2 flex items-center gap-4 text-[12px] font-medium">
            {!isReply && me && (
              <button
                type="button"
                onClick={() => setShowReply((v) => !v)}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
              >
                <Reply className="w-3.5 h-3.5" aria-hidden />
                Reply
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>

          {showReply && (
            <div className="mt-3.5">
              <ComposeBox
                postId={postId}
                parentId={comment.id}
                me={me}
                placeholder={`Reply to ${comment.user_first_name ?? 'comment'}…`}
                autoFocus
                onPosted={() => setShowReply(false)}
                onCancel={() => setShowReply(false)}
              />
            </div>
          )}

          {/* Replies — chronological, no further nesting. */}
          {replies.length > 0 && (
            <div className="mt-5 space-y-5">
              {replies.map((r) => (
                <CommentRow
                  key={r.id}
                  comment={r}
                  replies={[]}
                  postId={postId}
                  me={me}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export function BlogComments({ postId }: { postId: string }) {
  // Share the cached auth user with the rest of the app instead of
  // owning a duplicate `/api/auth/me` fetch. `useAuth` reads from
  // localStorage synchronously, so the compose box renders the
  // signed-in state on first paint without a network round-trip —
  // and SWR dedupes anyway, but this also keeps us in lockstep with
  // legal-gate and mobile-nav state changes.
  const { user: authUser } = useAuth()
  const me: MeDTO['user'] = authUser
    ? {
        id: authUser.id,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        avatarUrl: authUser.avatarUrl ?? null,
        username: authUser.username ?? null,
      }
    : null

  const { data, isLoading, error } = useSWR<ListResponse>(
    `/api/blog/comments?postId=${postId}`,
    fetcher,
    { revalidateOnFocus: true },
  )

  const comments = data?.comments ?? []
  // Group: top-level (parent_id null) sorted newest-first, replies
  // bucketed by parent and sorted oldest-first.
  const tops = React.useMemo(
    () =>
      [...comments]
        .filter((c) => c.parent_id === null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [comments],
  )
  const repliesByParent = React.useMemo(() => {
    const map = new Map<string, CommentDTO[]>()
    for (const c of comments) {
      if (!c.parent_id) continue
      const arr = map.get(c.parent_id) ?? []
      arr.push(c)
      map.set(c.parent_id, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
    return map
  }, [comments])

  const count = data?.count ?? 0

  return (
    <section className="mt-14" aria-label="Comments">
      {/* Header — matches the eyebrow / section-title rhythm used
          elsewhere on the post (Recommended for you, Share this
          story). Generous bottom padding so the compose box below
          feels like a deliberate next step, not a tacked-on form. */}
      <header className="flex items-baseline justify-between pb-5 mb-1 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#7B2D8E]" aria-hidden />
          <h2 className="text-lg font-semibold text-gray-900">
            Conversation
          </h2>
          {count > 0 && (
            <span className="text-[12px] font-medium text-gray-500 tabular-nums">
              · {count} {count === 1 ? 'comment' : 'comments'}
            </span>
          )}
        </div>
        {count > 0 && (
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]/70">
            Newest first
          </span>
        )}
      </header>

      <div className="pt-6">
        <ComposeBox postId={postId} me={me} />
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading comments…
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-10 text-sm text-gray-500">
            Couldn&apos;t load comments. Refresh to try again.
          </div>
        )}

        {!isLoading && !error && tops.length === 0 && (
          <div className="text-center py-12 px-6">
            <span className="inline-flex w-12 h-12 rounded-full bg-[#7B2D8E]/[0.08] items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold text-gray-900">
              Start the conversation
            </p>
            <p className="mt-1 text-[13px] text-gray-500 max-w-sm mx-auto leading-relaxed">
              Have a question, a tip, or a quick reaction? Be the first to share
              your thoughts on this post.
            </p>
          </div>
        )}

        {tops.length > 0 && (
          <ul className="space-y-4">
            {tops.map((c) => (
              <li key={c.id}>
                <CommentRow
                  comment={c}
                  replies={repliesByParent.get(c.id) ?? []}
                  postId={postId}
                  me={me}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
