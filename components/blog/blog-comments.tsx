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
//   * GIPHY: the compose box has a GIF button that opens a search
//     panel. The picked GIF rides along with the comment as a
//     `gif: { url, width, height }` payload — the API persists it
//     alongside the body. The button hides itself when the server
//     reports Giphy isn't configured.
//   * SWR keeps the list live without polling; we revalidate after a
//     successful POST/DELETE/REACT.
//
// We deliberately keep the visual surface minimal: brand purple as
// the only accent, heavy reliance on whitespace + hairlines, no
// images other than the per-commenter avatar (and any chosen GIF).
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
  SmilePlus,
  ImagePlay,
  X,
  Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

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

interface GiphyHit {
  id: string
  url: string
  preview: string
  width: number
  height: number
  title: string
}

interface GiphyResponse {
  ok: boolean
  configured: boolean
  results: GiphyHit[]
}

const BRAND = '#7B2D8E'
const MAX_LEN = 2000
// Curated set — the same list the server allows. Order here is the
// order they appear in the picker.
const REACTIONS = ['❤️', '👍', '🎉', '😂', '🤩', '😮', '😢', '🙏', '🔥', '💯'] as const

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok && res.status !== 401) throw new Error('Failed to load')
  return res.json()
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

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
      // Profiles are public and the click should never be intercepted
      // by the parent <article> — using stopPropagation here would be
      // overzealous (no parent click handler to fight), so we just
      // rely on Link's default semantics.
    >
      {children}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Giphy picker — fetched lazily the first time the user opens it.
// ---------------------------------------------------------------------------

interface GiphyDraft {
  url: string
  preview: string
  width: number
  height: number
  title: string
}

function GiphyPicker({
  onPick,
  onClose,
}: {
  onPick: (g: GiphyDraft) => void
  onClose: () => void
}) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<GiphyHit[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [configured, setConfigured] = React.useState(true)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const latestReq = React.useRef(0)

  // Fetch trending on first open, then debounce search as the user
  // types. Debounce + latestReq guards prevent late responses from
  // clobbering newer ones.
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    const reqId = Date.now()
    latestReq.current = reqId
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const url = `/api/giphy/search?limit=12${
          query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''
        }`
        const res = await fetch(url)
        const data = (await res.json()) as GiphyResponse
        if (latestReq.current !== reqId) return
        setConfigured(data.configured !== false)
        setResults(data.results ?? [])
      } catch {
        if (latestReq.current !== reqId) return
        setResults([])
      } finally {
        if (latestReq.current === reqId) setLoading(false)
      }
    }, query.length === 0 ? 0 : 250)

    return () => clearTimeout(handle)
  }, [query])

  if (!configured) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-[13px] text-gray-700 font-medium">GIFs aren&apos;t configured yet</p>
        <p className="mt-1 text-[12px] text-gray-500">
          The site owner needs to add a Giphy API key to enable this.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-[12px] font-semibold text-[#7B2D8E] hover:underline"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-black/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs"
          className="flex-1 bg-transparent text-[13px] text-gray-900 placeholder:text-gray-400 outline-none py-1"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close GIF picker"
          className="inline-flex w-7 h-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto p-2">
        {loading && (
          <div className="flex items-center justify-center py-10 text-[12px] text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading…
          </div>
        )}
        {!loading && (results?.length ?? 0) === 0 && (
          <p className="text-center py-10 text-[12px] text-gray-500">
            {query.trim() ? 'No GIFs match that.' : 'No trending GIFs right now.'}
          </p>
        )}
        {!loading && (results?.length ?? 0) > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {results!.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  onPick({
                    url: g.url,
                    preview: g.preview,
                    width: g.width,
                    height: g.height,
                    title: g.title,
                  })
                }
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 hover:ring-2 hover:ring-[#7B2D8E]/40 transition-all"
                title={g.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.preview}
                  alt={g.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100 bg-gray-50/50 text-center">
        Powered by GIPHY
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compose box — top-level OR reply, with optional GIF attachment.
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
  const [gif, setGif] = React.useState<GiphyDraft | null>(null)
  const [showGiphy, setShowGiphy] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
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
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [body])

  if (!me) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#7B2D8E]/[0.06] to-[#7B2D8E]/[0.02] border border-[#7B2D8E]/15 p-5">
        <p className="text-[14px] font-semibold text-gray-900 leading-snug">
          Join the conversation
        </p>
        <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
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
  const canSend = (trimmed.length > 0 || gif !== null) && remaining >= 0 && !sending

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
          gif: gif
            ? {
                url: gif.url,
                width: gif.width,
                height: gif.height,
              }
            : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not post comment')
      }
      setBody('')
      setGif(null)
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
      <Avatar url={me.avatarUrl} initials={meInitials} size={isReply ? 32 : 40} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl border border-gray-200 focus-within:border-[#7B2D8E]/60 focus-within:ring-2 focus-within:ring-[#7B2D8E]/15 transition-all bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {mention && (
            <div className="flex items-center gap-1.5 px-4 pt-2.5 -mb-1 text-[11.5px] text-gray-500">
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
            className="w-full px-4 pt-3 pb-2 bg-transparent text-[14.5px] text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
          />

          {/* Selected GIF preview — sits between textarea and toolbar
              so removing it doesn't shift the toolbar offscreen. */}
          {gif && (
            <div className="mx-3 mb-2 relative inline-block rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gif.preview}
                alt={gif.title}
                className="block max-h-40 w-auto"
                style={{
                  aspectRatio: `${gif.width} / ${gif.height}`,
                }}
              />
              <button
                type="button"
                onClick={() => setGif(null)}
                aria-label="Remove GIF"
                className="absolute top-1.5 right-1.5 inline-flex w-6 h-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowGiphy((v) => !v)}
                aria-label="Add a GIF"
                aria-expanded={showGiphy}
                className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11.5px] font-semibold transition-colors ${
                  showGiphy
                    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                    : 'text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5'
                }`}
              >
                <ImagePlay className="w-4 h-4" aria-hidden />
                GIF
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 h-8 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                {isReply ? 'Reply' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {showGiphy && (
          <div className="mt-2">
            <GiphyPicker
              onPick={(g) => {
                setGif(g)
                setShowGiphy(false)
              }}
              onClose={() => setShowGiphy(false)}
            />
          </div>
        )}

        {error && (
          <p className="mt-1.5 text-[12px] text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reactions — a strip + add button. Tapping any chip toggles that
// emoji for the viewer; tapping "+" opens a small popover with the
// curated emoji palette.
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

  // Close picker on outside click. We don't trap focus — it's a tiny
  // popover and the buttons inside are reachable via Tab from the
  // anchor button.
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
      // Same friendly nudge as the compose box — surface a sign-in
      // CTA inline rather than failing silently.
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
      // Re-fetch the thread so reaction counts are authoritative
      // (avoids drift if the user reacted from two devices).
      await mutate(`/api/blog/comments?postId=${postId}`)
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
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {comment.reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => toggle(r.emoji)}
          disabled={pending.has(r.emoji)}
          aria-pressed={r.reactedByMe}
          className={`inline-flex items-center gap-1 h-7 pl-1.5 pr-2 rounded-full text-[12px] font-medium transition-colors disabled:opacity-50 ${
            r.reactedByMe
              ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/30'
              : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'
          }`}
        >
          <span aria-hidden className="text-[14px] leading-none">{r.emoji}</span>
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
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
        >
          <SmilePlus className="w-4 h-4" aria-hidden />
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Reactions"
            className="absolute z-20 mt-2 left-0 sm:left-auto sm:right-0 origin-top-left bg-white border border-gray-200 rounded-2xl shadow-xl shadow-black/5 p-1.5 flex flex-wrap gap-0.5 max-w-[14rem]"
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
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-lg leading-none transition-transform hover:scale-110 hover:bg-gray-100 disabled:opacity-50 ${
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
  /** Map of commentId → comment, for resolving "@mention" of the
   *  immediate parent when a reply was a reply-to-a-reply. */
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

  const isOwner = !!me && me.id === comment.user_id
  const canDelete = isOwner

  // Mention prefix. If this is a reply whose immediate parent isn't
  // the root (i.e. they replied to another reply), show
  // "Replying to @first_name" so the conversation stays
  // comprehensible in the flat layout.
  const parent =
    isReply && comment.parent_id ? byId.get(comment.parent_id) : null
  const showsMention = !!parent && parent.id !== comment.root_id
  const mentionName = showsMention ? displayName(parent!) : null

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

  // What name (if any) we should prefix on the new reply. We
  // mention the comment we're replying to so a reply-to-reply still
  // names its target.
  const replyMention = isReply ? displayName(comment) : null

  return (
    <article
      className={
        isReply
          ? 'pl-11 sm:pl-14 relative'
          : 'rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 hover:border-gray-200 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
      }
    >
      {isReply && (
        <span
          aria-hidden
          className="absolute left-4 sm:left-5 top-1 bottom-1 w-px bg-[#7B2D8E]/15"
        />
      )}
      <div className="flex items-start gap-3">
        {/* Avatar — wrapped in a profile link when the commenter has
            a public handle. Hover scales the photo subtly so it
            reads as interactive without a heavy ring. */}
        <ProfileLink
          username={comment.user_username}
          ariaLabel={`View ${fullName(comment)}'s profile`}
          className="block flex-shrink-0 rounded-full transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40"
        >
          <Avatar
            url={comment.user_avatar_url}
            initials={initials(comment)}
            size={isReply ? 32 : 40}
          />
        </ProfileLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap leading-tight">
            {/* Name — same profile link. We render the link as inline
                text so wrapping/truncation behaviour is unchanged from
                the previous plain `<span>` version. */}
            <ProfileLink
              username={comment.user_username}
              ariaLabel={`View ${fullName(comment)}'s profile`}
              className="text-[14px] font-semibold text-gray-900 truncate hover:text-[#7B2D8E] hover:underline decoration-[#7B2D8E]/40 underline-offset-2 transition-colors"
            >
              {fullName(comment)}
            </ProfileLink>
            <RoleBadge role={comment.user_role} />
            {/* @handle pill — small but clickable so power-users have
                another tap target into the profile. Hidden when the
                full name already showed `@username` (legacy rows
                where first/last are blank). */}
            {comment.user_username && fullName(comment) !== comment.user_username && (
              <ProfileLink
                username={comment.user_username}
                className="text-[11.5px] text-gray-400 hover:text-[#7B2D8E] truncate transition-colors"
              >
                @{comment.user_username}
              </ProfileLink>
            )}
            <span className="text-[11.5px] text-gray-500">{formatAgo(comment.created_at)}</span>
            {comment.edited && (
              <span className="text-[10.5px] text-gray-400">(edited)</span>
            )}
          </div>

          {comment.body && comment.body.trim() && (
            <p className="mt-1.5 text-[14.5px] text-gray-800 leading-[1.65] whitespace-pre-wrap break-words">
              {/* If a reply mentions someone, syntax-highlight the
                  prefix as a real link to that user's profile. We
                  prefer the parent commenter's username (resolved
                  upstream via `byId`) so the @handle is correct even
                  when two users share the same first name. Falls
                  back to a styled span if we can't resolve a
                  username for the mentioned user. */}
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

          {comment.gif_url && (
            <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 inline-block max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comment.gif_url}
                alt="GIF"
                className="block max-w-full h-auto"
                style={{
                  width: comment.gif_width ?? undefined,
                  aspectRatio:
                    comment.gif_width && comment.gif_height
                      ? `${comment.gif_width} / ${comment.gif_height}`
                      : undefined,
                  maxWidth: 320,
                }}
                loading="lazy"
              />
            </div>
          )}

          <div className="mt-2 flex items-center gap-4 text-[12px] font-medium">
            {me && (
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

          <ReactionStrip comment={comment} postId={postId} me={me} />

          {showReply && (
            <div className="mt-3.5">
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

          {/* Replies — chronological, no further visual nesting.
              Only rendered on the top-level row. */}
          {!isReply && replies.length > 0 && (
            <div className="mt-5 space-y-5">
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

  // Index by id for fast @mention lookups inside CommentRow.
  const byId = React.useMemo(() => {
    const m = new Map<string, CommentDTO>()
    for (const c of comments) m.set(c.id, c)
    return m
  }, [comments])

  // Group: top-level (id === root_id) sorted newest-first; replies
  // bucketed by root_id and sorted oldest-first. This is what gives
  // us a flat 2-tier view even when a reply is itself a reply.
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
    <section className="mt-14" aria-label="Comments">
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
            <span className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/[0.12] to-[#7B2D8E]/[0.04] items-center justify-center mb-3 ring-1 ring-[#7B2D8E]/15">
              <Quote className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold text-gray-900">
              Start the conversation
            </p>
            <p className="mt-1 text-[13px] text-gray-500 max-w-sm mx-auto leading-relaxed">
              Drop a quick reaction, a tip, or a GIF — be the first to share
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
