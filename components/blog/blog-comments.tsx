'use client'

// ---------------------------------------------------------------------------
// components/blog/blog-comments.tsx
//
// Comment thread that lives at the bottom of every blog article.
//   * Top-level entries appear newest-first; every reply (any depth)
//     is bucketed under its top-most ancestor — `root_id` from the
//     server — so the rendered list stays at two visual tiers no
//     matter how deep the conversation goes.
//   * Replies to other replies are allowed: the new comment records
//     the immediate parent and we prefix the body with the
//     "@first_name" mention so context is preserved without nested
//     cards.
//   * Reactions toggle on a per-emoji, per-user basis with optimistic
//     UI; the picker is a compact popover so the reaction strip stays
//     calm until someone wants to add a new flavour.
//   * GIFs were removed — Giphy was overkill for this thread and the
//     extra surface area was reading as clutter on phones.
//   * SWR keeps the list live without polling; we revalidate after a
//     successful POST/DELETE/REACT — and the revalidation is fired
//     and not awaited, so a slow refetch never makes a successful
//     post look like a failure to the user.
//   * Delete uses the brand `<ConfirmDialog>` (an action card) instead
//     of the native browser confirm prompt, which looked like a
//     system error.
//
// We deliberately keep the visual surface minimal: brand purple as
// the only accent, heavy reliance on whitespace + hairlines, no
// images other than the per-commenter avatar.
// ---------------------------------------------------------------------------

import * as React from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  Loader2,
  Quote,
  Reply,
  Trash2,
  Send,
  ShieldCheck,
  ShieldAlert,
  SmilePlus,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ---------------------------------------------------------------------------
// Types — mirror /api/blog/comments shape one-for-one.
// ---------------------------------------------------------------------------

interface ReactionDTO {
  emoji: string
  count: number
  reactedByMe: boolean
}

interface CommentDTO {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  root_id: string
  body: string
  // Legacy fields kept in the DTO so older comments that *did* have a
  // GIF still don't crash the renderer — we just no longer surface
  // the picker, and we ignore the gif fields when displaying so the
  // thread stays text-first.
  gif_url: string | null
  gif_width: number | null
  gif_height: number | null
  gif_provider: string | null
  status: 'visible' | 'hidden'
  edited: boolean
  created_at: string
  updated_at: string
  user_first_name: string | null
  user_last_name: string | null
  user_username: string | null
  user_avatar_url: string | null
  user_role: 'user' | 'staff' | 'admin' | null
  reactions: ReactionDTO[]
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
// Curated set — the same list the server allows. Order here is the
// order they appear in the picker.
const REACTIONS = ['❤️', '👍', '🎉', '😂', '🤩', '😮', '😢', '🙏', '🔥', '💯'] as const

// Compact, opinionated palette for the *body* emoji picker.
// Distinct from REACTIONS (which are a single tap = a reaction) —
// these get inserted into the comment text. Kept to ~40 entries so
// the popover stays one screen tall on phones; covers the most
// common faces, hand gestures, hearts, sparkles, and a handful of
// wellness / spa cues that match Dermaspace's voice (flower, leaf,
// drop, sparkles).
const COMPOSER_EMOJIS = [
  '😀', '😂', '🥰', '😍', '😘', '😎', '🤔', '😴',
  '😮', '😢', '😭', '🙄', '😅', '😇', '🤗', '🤩',
  '👍', '👎', '👏', '🙌', '🙏', '👌', '✌️', '🤞',
  '❤️', '💖', '💜', '💕', '💯', '🔥', '✨', '🌟',
  '🌸', '🌺', '🌿', '💧', '🛁', '💆', '🎉', '☕',
] as const

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok && res.status !== 401) throw new Error('Failed to load')
  return res.json()
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Inserts `text` at the textarea's current selection, replacing any
// selected range. Used by the emoji picker so tapping a face drops
// it where the caret is — not always at the end. Falls back to
// appending if the textarea ref isn't ready yet (e.g. the picker
// somehow opened before the component finished mounting).
function insertAtCursor(
  ta: HTMLTextAreaElement | null,
  text: string,
  setBody: (next: string) => void,
) {
  if (!ta) return
  const start = ta.selectionStart ?? ta.value.length
  const end = ta.selectionEnd ?? ta.value.length
  const next = ta.value.slice(0, start) + text + ta.value.slice(end)
  setBody(next)
  // Restore caret to just after the inserted emoji so the next emoji
  // tap (or keystroke) lands in the right place. Run on the next
  // tick because React hasn't yet flushed the value update.
  requestAnimationFrame(() => {
    if (!ta) return
    ta.focus()
    const caret = start + text.length
    ta.setSelectionRange(caret, caret)
  })
}

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

function displayName(c: CommentDTO): string {
  return c.user_first_name?.trim() || c.user_username?.trim() || 'them'
}

function initials(c: CommentDTO): string {
  const fn = c.user_first_name?.[0] ?? ''
  const ln = c.user_last_name?.[0] ?? ''
  return `${fn}${ln}`.toUpperCase() || '?'
}

// Role badge — Admin wears the brand purple ShieldCheck; staff uses
// a quieter neutral pill. Regular readers get nothing.
function RoleBadge({ role }: { role: CommentDTO['user_role'] }) {
  if (role === 'admin') {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
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
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[9px] font-bold uppercase tracking-wider"
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
  size = 32,
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

// `<ProfileLink>` wraps avatar + name in a Next link to `/[username]`
// when the commenter has a public handle. The fallback for legacy
// rows (no username) is a non-interactive `<span>`, so older comments
// never throw a dead link into the thread.
function ProfileLink({
  username,
  ariaLabel,
  className,
  children,
}: {
  username: string | null
  ariaLabel?: string
  className?: string
  children: React.ReactNode
}) {
  if (!username) {
    return <span className={className}>{children}</span>
  }
  return (
    <Link
      href={`/${username}`}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Compose box — top-level OR reply.
// ---------------------------------------------------------------------------

interface ComposeProps {
  postId: string
  parentId?: string | null
  /** When replying to a reply, this is the @first_name we prepend to
   *  the body so context is preserved in the flat thread. */
  mention?: string | null
  me: MeDTO['user']
  placeholder?: string
  onPosted?: () => void
  onCancel?: () => void
  autoFocus?: boolean
}

function ComposeBox({
  postId,
  parentId = null,
  mention = null,
  me,
  placeholder = 'Share your thoughts…',
  onPosted,
  onCancel,
  autoFocus,
}: ComposeProps) {
  const [body, setBody] = React.useState('')
  const [showEmoji, setShowEmoji] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Latches `true` once the API responds with `{ suspended: true }`.
  // We keep it sticky for the lifetime of this composer instance so
  // the user sees the "your account has been suspended" banner until
  // they reload — by which point the suspended-account check on the
  // server will have signed them out anyway. No need to ever flip it
  // back to false from inside the composer.
  const [suspended, setSuspended] = React.useState(false)
  const taRef = React.useRef<HTMLTextAreaElement>(null)
  const isReply = parentId !== null

  React.useEffect(() => {
    if (autoFocus) taRef.current?.focus()
  }, [autoFocus])

  // Auto-grow the textarea so writing a longer comment doesn't
  // require scrolling inside a tiny box.
  React.useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [body])

  if (!me) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#7B2D8E]/[0.06] to-[#7B2D8E]/[0.02] border border-[#7B2D8E]/15 p-4">
        <p className="text-[13px] font-semibold text-gray-900 leading-snug">
          Join the conversation
        </p>
        <p className="mt-1 text-[12px] text-gray-600 leading-relaxed">
          <Link href="/signin" className="font-semibold text-[#7B2D8E] hover:underline">
            Sign in
          </Link>{' '}
          to share your thoughts and reply to other readers.
        </p>
      </div>
    )
  }

  const trimmed = body.trim()
  const remaining = MAX_LEN - body.length
  const canSend = trimmed.length > 0 && remaining >= 0 && !sending && !suspended

  const handleSubmit = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      // Prepend the mention prefix so the visible text shows
      // "@Sarah  …" — keeps context in a flat thread without
      // nested cards. We only do this if the user hasn't already
      // started their comment with the prefix themselves.
      const finalBody =
        mention && !trimmed.toLowerCase().startsWith(`@${mention.toLowerCase()}`)
          ? trimmed
            ? `@${mention} ${trimmed}`
            : `@${mention}`
          : trimmed
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          parent_id: parentId,
          body: finalBody,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; suspended?: boolean }
        if (data.suspended) {
          setSuspended(true)
        }
        throw new Error(data.error || 'Could not post comment')
      }
      // Success — clear local state immediately so the user sees the
      // box reset before we even try to revalidate. We deliberately
      // do NOT `await` the SWR mutate here: a slow re-fetch (e.g.
      // wobbly mobile data) used to make the success path read as
      // "Failed to create comment" because the awaited promise threw
      // even though the comment was already created server-side.
      // Firing-and-forgetting means the post lands in the feed when
      // the network catches up, but the composer never lies about
      // success.
      setBody('')
      mutate(`/api/blog/comments?postId=${postId}`).catch(() => {
        /* silently ignored — next focus revalidation will heal it */
      })
      onPosted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setSending(false)
    }
  }

  const meInitials = `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <div className="flex items-start gap-2.5">
      <Avatar url={me.avatarUrl} initials={meInitials} size={isReply ? 28 : 32} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl border border-gray-200 focus-within:border-[#7B2D8E]/60 focus-within:ring-2 focus-within:ring-[#7B2D8E]/15 transition-all bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {mention && (
            <div className="flex items-center gap-1.5 px-3.5 pt-2 -mb-0.5 text-[11px] text-gray-500">
              <Reply className="w-3 h-3" aria-hidden />
              Replying to{' '}
              <span className="font-semibold text-[#7B2D8E]">@{mention}</span>
            </div>
          )}
          <textarea
            ref={taRef}
            rows={isReply ? 2 : 3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            maxLength={MAX_LEN + 200}
            className="w-full px-3.5 pt-2.5 pb-1.5 bg-transparent text-[13.5px] text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
            style={{ minHeight: isReply ? 64 : 84 }}
          />

          <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
            <div className="flex items-center gap-1 relative">
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                aria-label="Add an emoji"
                aria-expanded={showEmoji}
                className={`inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-semibold transition-colors ${
                  showEmoji
                    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                    : 'text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5'
                }`}
              >
                <SmilePlus className="w-3.5 h-3.5" aria-hidden />
                Emoji
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-2.5 h-7 text-[11px] font-medium text-gray-500 hover:text-gray-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
              )}

              {/* Emoji picker — small popover anchored to the toolbar.
                  Inserts at cursor position when possible, falls back
                  to appending at the end. */}
              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-2 z-30 w-[260px] rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] p-1.5">
                  <div className="grid grid-cols-8 gap-0.5">
                    {COMPOSER_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          insertAtCursor(taRef.current, emoji, setBody)
                          setShowEmoji(false)
                        }}
                        className="h-7 w-7 rounded-lg text-[16px] leading-none flex items-center justify-center hover:bg-[#7B2D8E]/5 transition-colors"
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10.5px] tabular-nums ${
                  remaining < 100
                    ? remaining < 0
                      ? 'text-red-500 font-semibold'
                      : 'text-amber-600'
                    : 'text-gray-400'
                }`}
              >
                {remaining < 100 ? `${remaining}` : ''}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-white text-[11.5px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ backgroundColor: BRAND }}
              >
                {sending ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                ) : (
                  <Send className="w-3 h-3" aria-hidden />
                )}
                {isReply ? 'Reply' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {/* Suspension banner — shown when the spam detector has just
            taken action against this account. */}
        {suspended ? (
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-700" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-rose-900 leading-tight">
                Account suspended
              </p>
              <p className="text-[11.5px] text-rose-800 mt-0.5 leading-relaxed">
                External links aren&apos;t allowed in comments. Your account has been
                suspended pending review. Contact{' '}
                <a
                  href="mailto:support@dermaspaceng.com"
                  className="font-semibold underline"
                >
                  support@dermaspaceng.com
                </a>{' '}
                if you believe this is a mistake.
              </p>
            </div>
          </div>
        ) : error ? (
          <p className="mt-1.5 text-[11.5px] text-red-600">{error}</p>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reactions — a strip + add button.
// ---------------------------------------------------------------------------

function ReactionStrip({
  comment,
  postId,
  me,
}: {
  comment: CommentDTO
  postId: string
  me: MeDTO['user']
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState<Set<string>>(new Set())
  const popoverRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (!popoverRef.current) return
      if (!popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const toggle = async (emoji: string) => {
    if (!me) {
      window.location.href = '/signin'
      return
    }
    if (pending.has(emoji)) return
    setPending((s) => new Set(s).add(emoji))
    try {
      const res = await fetch(`/api/blog/comments/${comment.id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error('failed')
      mutate(`/api/blog/comments?postId=${postId}`).catch(() => {})
    } catch {
      // Swallow — the optimistic state will reset on the next fetch.
    } finally {
      setPending((s) => {
        const n = new Set(s)
        n.delete(emoji)
        return n
      })
      setOpen(false)
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {comment.reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => toggle(r.emoji)}
          disabled={pending.has(r.emoji)}
          aria-pressed={r.reactedByMe}
          className={`inline-flex items-center gap-1 h-6 pl-1.5 pr-2 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50 ${
            r.reactedByMe
              ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/30'
              : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'
          }`}
        >
          <span aria-hidden className="text-[12px] leading-none">{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Add a reaction"
          className="inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
        >
          <SmilePlus className="w-3.5 h-3.5" aria-hidden />
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Reactions"
            className="absolute z-20 mt-2 left-0 sm:left-auto sm:right-0 origin-top-left bg-white border border-gray-200 rounded-2xl shadow-xl shadow-black/5 p-1 flex flex-wrap gap-0.5 max-w-[12rem]"
          >
            {REACTIONS.map((emoji) => {
              const mine = comment.reactions.find((r) => r.emoji === emoji)?.reactedByMe
              return (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
                  onClick={() => toggle(emoji)}
                  disabled={pending.has(emoji)}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base leading-none transition-transform hover:scale-110 hover:bg-gray-100 disabled:opacity-50 ${
                    mine ? 'bg-[#7B2D8E]/10' : ''
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comment row — top-level OR reply.
// ---------------------------------------------------------------------------

interface CommentRowProps {
  comment: CommentDTO
  replies: CommentDTO[]
  byId: Map<string, CommentDTO>
  postId: string
  me: MeDTO['user']
  isReply?: boolean
}

function CommentRow({
  comment,
  replies,
  byId,
  postId,
  me,
  isReply = false,
}: CommentRowProps) {
  const [showReply, setShowReply] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const isOwner = !!me && me.id === comment.user_id
  const canDelete = isOwner

  const parent =
    isReply && comment.parent_id ? byId.get(comment.parent_id) : null
  const showsMention = !!parent && parent.id !== comment.root_id
  const mentionName = showsMention ? displayName(parent!) : null

  const handleDelete = async () => {
    if (!canDelete || deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/blog/comments/${comment.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete that comment.')
      // Fire-and-forget revalidation so a slow refetch doesn't make
      // a successful delete look like it failed.
      mutate(`/api/blog/comments?postId=${postId}`).catch(() => {})
    } finally {
      setDeleting(false)
    }
    // No catch here on purpose — letting the error bubble up to the
    // ConfirmDialog keeps the action card open so the user can retry.
  }

  const replyMention = isReply ? displayName(comment) : null

  return (
    <article
      className={
        isReply
          ? 'pl-9 sm:pl-12 relative'
          : 'rounded-2xl border border-gray-100 bg-white p-3 sm:p-3.5 hover:border-gray-200 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
      }
    >
      {isReply && (
        <span
          aria-hidden
          className="absolute left-3 sm:left-4 top-1 bottom-1 w-px bg-[#7B2D8E]/15"
        />
      )}
      <div className="flex items-start gap-2.5">
        <ProfileLink
          username={comment.user_username}
          ariaLabel={`View ${fullName(comment)}'s profile`}
          className="block flex-shrink-0 rounded-full transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40"
        >
          <Avatar
            url={comment.user_avatar_url}
            initials={initials(comment)}
            size={isReply ? 26 : 32}
          />
        </ProfileLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap leading-tight">
            <ProfileLink
              username={comment.user_username}
              ariaLabel={`View ${fullName(comment)}'s profile`}
              className="text-[12.5px] font-semibold text-gray-900 truncate hover:text-[#7B2D8E] hover:underline decoration-[#7B2D8E]/40 underline-offset-2 transition-colors"
            >
              {fullName(comment)}
            </ProfileLink>
            <RoleBadge role={comment.user_role} />
            {comment.user_username && fullName(comment) !== comment.user_username && (
              <ProfileLink
                username={comment.user_username}
                className="text-[10.5px] text-gray-400 hover:text-[#7B2D8E] truncate transition-colors"
              >
                @{comment.user_username}
              </ProfileLink>
            )}
            <span className="text-[10.5px] text-gray-500">{formatAgo(comment.created_at)}</span>
            {comment.edited && (
              <span className="text-[9.5px] text-gray-400">(edited)</span>
            )}
          </div>

          {comment.body && comment.body.trim() && (
            <p className="mt-1 text-[13px] text-gray-800 leading-[1.55] whitespace-pre-wrap break-words">
              {mentionName &&
              comment.body.toLowerCase().startsWith(`@${mentionName.toLowerCase()}`) ? (
                <>
                  {parent?.user_username ? (
                    <Link
                      href={`/${parent.user_username}`}
                      className="font-semibold hover:underline"
                      style={{ color: BRAND }}
                    >
                      @{mentionName}
                    </Link>
                  ) : (
                    <span
                      className="font-semibold"
                      style={{ color: BRAND }}
                    >
                      @{mentionName}
                    </span>
                  )}
                  {comment.body.slice(`@${mentionName}`.length)}
                </>
              ) : (
                comment.body
              )}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-3.5 text-[11px] font-medium">
            {me && (
              <button
                type="button"
                onClick={() => setShowReply((v) => !v)}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
              >
                <Reply className="w-3 h-3" aria-hidden />
                Reply
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" aria-hidden />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>

          <ReactionStrip comment={comment} postId={postId} me={me} />

          {showReply && (
            <div className="mt-3">
              <ComposeBox
                postId={postId}
                parentId={comment.id}
                mention={replyMention}
                me={me}
                placeholder={`Reply to ${displayName(comment)}…`}
                autoFocus
                onPosted={() => setShowReply(false)}
                onCancel={() => setShowReply(false)}
              />
            </div>
          )}

          {!isReply && replies.length > 0 && (
            <div className="mt-4 space-y-3.5">
              {replies.map((r) => (
                <CommentRow
                  key={r.id}
                  comment={r}
                  replies={[]}
                  byId={byId}
                  postId={postId}
                  me={me}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Brand-styled confirmation card. Replaces window.confirm() so
          the destructive action lands inside the app's design system
          (an action card matching the rest of the dashboard) rather
          than the system's grey alert box. */}
      {canDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          icon={<Trash2 className="w-5 h-5" />}
          title="Delete this comment?"
          description="This will permanently remove your comment from the conversation. You can&apos;t undo this."
          confirmLabel="Yes, delete"
          cancelLabel="Keep comment"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function BlogComments({ postId }: { postId: string }) {
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

  const byId = React.useMemo(() => {
    const m = new Map<string, CommentDTO>()
    for (const c of comments) m.set(c.id, c)
    return m
  }, [comments])

  const tops = React.useMemo(
    () =>
      [...comments]
        .filter((c) => c.id === c.root_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [comments],
  )
  const repliesByRoot = React.useMemo(() => {
    const map = new Map<string, CommentDTO[]>()
    for (const c of comments) {
      if (c.id === c.root_id) continue
      const arr = map.get(c.root_id) ?? []
      arr.push(c)
      map.set(c.root_id, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
    return map
  }, [comments])

  const count = data?.count ?? 0

  return (
    <section className="mt-10" aria-label="Comments">
      <header className="flex items-baseline justify-between pb-3 mb-1 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[#7B2D8E]" aria-hidden />
          <h2 className="text-[15px] font-semibold text-gray-900">
            Conversation
          </h2>
          {count > 0 && (
            <span className="text-[11px] font-medium text-gray-500 tabular-nums">
              · {count} {count === 1 ? 'comment' : 'comments'}
            </span>
          )}
        </div>
        {count > 0 && (
          <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]/70">
            Newest first
          </span>
        )}
      </header>

      <div className="pt-4">
        <ComposeBox postId={postId} me={me} />
      </div>

      <div className="mt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-[12px] text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading comments…
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-8 text-[12px] text-gray-500">
            Couldn&apos;t load comments. Refresh to try again.
          </div>
        )}

        {!isLoading && !error && tops.length === 0 && (
          <div className="text-center py-10 px-6">
            <span className="inline-flex w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/[0.12] to-[#7B2D8E]/[0.04] items-center justify-center mb-2.5 ring-1 ring-[#7B2D8E]/15">
              <Quote className="w-4 h-4 text-[#7B2D8E]" aria-hidden />
            </span>
            <p className="text-[13px] font-semibold text-gray-900">
              Start the conversation
            </p>
            <p className="mt-0.5 text-[12px] text-gray-500 max-w-sm mx-auto leading-relaxed">
              Drop a quick reaction or a tip — be the first to share
              your thoughts on this post.
            </p>
          </div>
        )}

        {tops.length > 0 && (
          <ul className="space-y-3">
            {tops.map((c) => (
              <li key={c.id}>
                <CommentRow
                  comment={c}
                  replies={repliesByRoot.get(c.id) ?? []}
                  byId={byId}
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
