'use client'

// ---------------------------------------------------------------------------
// LiveChatOverlay
// ---------------------------------------------------------------------------
// Floating panel that handles the user side of the human-handoff chat. It
// shows up whenever the signed-in user has an open (waiting / active)
// session and disappears once that session closes (or once the user
// dismisses the post-chat rating sheet).
//
// Mount notes:
//   - Mounted once globally from `derma-ai-mount.tsx`. Auto-hides when the
//     user navigates to staff/admin consoles (those have their own chat
//     UIs and we don't want a double surface).
//   - Polls `/api/live-chat/active` every 4s for status, and the message
//     thread every 3s while open. SSE / websockets are deliberately out
//     of scope for this first cut — polling is rugged, reliable, and
//     plays nicely with serverless.
//   - Listens for the `openLiveChat` window event so the AI tool result
//     card and the floating "Sarah is helping you" banner can both
//     trigger expand without us having to hand-thread props.
// ---------------------------------------------------------------------------

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Loader2,
  Send,
  Star,
  X,
  ChevronDown,
  Sparkles,
  Wallet,
  CalendarDays,
  Mail,
  Phone,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ----------------------------------------------------------------

type SessionStatus = 'waiting' | 'active' | 'closed' | 'abandoned'

interface ActiveSessionPayload {
  session: {
    id: string
    status: SessionStatus
    escalatedAt: string
    acceptedAt: string | null
    closedAt: string | null
    ratedAt: string | null
  } | null
  staff: {
    displayName: string
    avatarUrl: string
  } | null
}

interface Message {
  id: string
  session_id: string
  sender_role: 'user' | 'staff' | 'system'
  body: string
  created_at: string
}

interface AccountContext {
  user: {
    firstName: string
    avatarUrl: string | null
  }
  wallet: {
    formatted: string
  }
  bookings?: Array<{
    booking_reference: string
    location_name: string
    appointment_date: string
    status: string
  }>
}

const HIDDEN_PREFIXES = [
  '/admin',
  '/staff',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/complete-profile',
  '/accept-invite',
  '/offline',
  '/blocked',
]

// --- Component ------------------------------------------------------------

export default function LiveChatOverlay() {
  const pathname = usePathname() || ''
  const blocked = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  const [active, setActive] = useState<ActiveSessionPayload | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountContext | null>(null)

  // Rating sheet state (shown after the chat closes if not yet rated).
  const [showRating, setShowRating] = useState(false)
  const [serviceRating, setServiceRating] = useState(0)
  const [staffRating, setStaffRating] = useState(0)
  const [comment, setComment] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)

  const lastFetchedRef = useRef<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const sessionId = active?.session?.id || null
  const status = active?.session?.status || null

  // ---- Active session polling -------------------------------------------
  // Bursty when expanded (every 3s) so accept/close transitions feel snappy;
  // calmer when collapsed (every 8s) to keep the overhead invisible.
  useEffect(() => {
    if (blocked) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await fetch('/api/live-chat/active', { credentials: 'include' })
        if (!res.ok) return
        const json = (await res.json()) as ActiveSessionPayload
        if (cancelled) return
        setActive(json)
        // Auto-prompt the rating sheet when the session closes and hasn't
        // been rated yet.
        if (json.session?.status === 'closed' && !json.session.ratedAt) {
          setShowRating(true)
          setExpanded(false)
        }
      } catch {
        /* offline / transient — keep last state */
      }
    }
    tick()
    const interval = window.setInterval(tick, expanded ? 3000 : 8000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [blocked, expanded])

  // ---- Message polling --------------------------------------------------
  useEffect(() => {
    if (!sessionId || !expanded) return
    let cancelled = false
    const tick = async () => {
      try {
        const since = lastFetchedRef.current
          ? `?since=${encodeURIComponent(lastFetchedRef.current)}`
          : ''
        const res = await fetch(
          `/api/live-chat/sessions/${sessionId}/messages${since}`,
          { credentials: 'include' },
        )
        if (!res.ok) return
        const json = (await res.json()) as { messages: Message[] }
        if (cancelled) return
        if (json.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id))
            const merged = [...prev]
            for (const m of json.messages) {
              if (!seen.has(m.id)) merged.push(m)
            }
            merged.sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            )
            return merged
          })
          lastFetchedRef.current =
            json.messages[json.messages.length - 1].created_at
        }
      } catch {
        /* transient */
      }
    }
    tick()
    const interval = window.setInterval(tick, 3000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [sessionId, expanded])

  // ---- One-off account context for the side panel ----------------------
  // Mirrors what the staff-side context panel shows so the user can scan
  // their own info without leaving the chat (matches the "user can
  // communicate access user account like payment what happened" brief).
  useEffect(() => {
    if (!sessionId || !expanded || account) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/live-chat/snapshot', {
          credentials: 'include',
        })
        if (!res.ok) return
        const json = (await res.json()) as {
          user?: { firstName?: string; avatarUrl?: string | null }
          wallet?: { formatted?: string }
          bookings?: AccountContext['bookings']
        }
        if (cancelled) return
        setAccount({
          user: {
            firstName: json.user?.firstName || 'You',
            avatarUrl: json.user?.avatarUrl || null,
          },
          wallet: {
            formatted: json.wallet?.formatted || '\u20A60',
          },
          bookings: json.bookings,
        })
      } catch {
        /* offline — leave account null and render dashes */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, expanded, account])

  // ---- Auto-scroll to bottom on new messages ---------------------------
  useEffect(() => {
    if (!expanded) return
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, expanded])

  // ---- React to "openLiveChat" events fired by the AI card / banners --
  useEffect(() => {
    const handler = () => setExpanded(true)
    window.addEventListener('openLiveChat', handler)
    return () => window.removeEventListener('openLiveChat', handler)
  }, [])

  // ---- Send a message --------------------------------------------------
  const send = useCallback(async () => {
    const body = draft.trim()
    if (!body || !sessionId) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/live-chat/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body }),
        },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Could not send message.')
        return
      }
      const json = (await res.json()) as { message: Message }
      setMessages((prev) => [...prev, json.message])
      lastFetchedRef.current = json.message.created_at
      setDraft('')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSending(false)
    }
  }, [draft, sessionId])

  // ---- End the chat ---------------------------------------------------
  const endChat = useCallback(async () => {
    if (!sessionId) return
    try {
      await fetch(`/api/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
    } catch {
      /* fall through to rating */
    }
    setExpanded(false)
    setShowRating(true)
  }, [sessionId])

  // ---- Submit a rating ------------------------------------------------
  const submitRating = useCallback(async () => {
    if (!sessionId) return
    if (serviceRating < 1 || staffRating < 1) {
      setError('Please rate both the service and the representative.')
      return
    }
    setSavingRating(true)
    try {
      await fetch(`/api/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'rate',
          service: serviceRating,
          staff: staffRating,
          comment: comment.trim() || null,
        }),
      })
      setRatingDone(true)
      // Clear local state so the overlay disappears on the next poll.
      setActive(null)
      setMessages([])
      setDraft('')
      lastFetchedRef.current = null
      setTimeout(() => {
        setShowRating(false)
        setRatingDone(false)
        setServiceRating(0)
        setStaffRating(0)
        setComment('')
      }, 1500)
    } catch {
      setError('Could not save your rating. Please try again.')
    } finally {
      setSavingRating(false)
    }
  }, [sessionId, serviceRating, staffRating, comment])

  // -----------------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------------
  if (blocked) return null

  // Nothing to show when there's no open session AND no rating sheet.
  if (!active?.session && !showRating) return null

  // -----------------------------------------------------------------------
  // Banner — collapsed state. Shows even on top of Derma AI.
  // -----------------------------------------------------------------------
  const banner =
    active?.session && !expanded ? (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[58] w-[min(92vw,360px)] flex items-center gap-3 rounded-full bg-white shadow-lg shadow-[#7B2D8E]/15 ring-1 ring-[#7B2D8E]/15 pl-1.5 pr-4 py-1.5 hover:shadow-xl transition-shadow"
      >
        <div className="relative shrink-0">
          {status === 'active' && active.staff ? (
            <Image
              src={active.staff.avatarUrl}
              alt={active.staff.displayName}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center ring-2 ring-white">
              <Loader2 className="w-4 h-4 text-[#7B2D8E] animate-spin" />
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7B2D8E]">
            {status === 'active' ? 'Live now' : 'In queue'}
          </p>
          <p className="text-[13px] font-semibold text-gray-900 truncate">
            {status === 'active' && active.staff
              ? `${active.staff.displayName} is here to help`
              : 'Connecting to a representative…'}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 rotate-180" />
      </button>
    ) : null

  // -----------------------------------------------------------------------
  // Expanded chat panel
  // -----------------------------------------------------------------------
  const panel =
    expanded && active?.session ? (
      <ExpandedPanel
        session={active.session}
        staff={active.staff}
        messages={messages}
        draft={draft}
        setDraft={setDraft}
        send={send}
        sending={sending}
        error={error}
        onClose={() => setExpanded(false)}
        onEndChat={endChat}
        scrollerRef={scrollerRef}
        account={account}
      />
    ) : null

  // -----------------------------------------------------------------------
  // Rating sheet
  // -----------------------------------------------------------------------
  const rating = showRating ? (
    <RatingSheet
      done={ratingDone}
      saving={savingRating}
      serviceRating={serviceRating}
      staffRating={staffRating}
      setServiceRating={setServiceRating}
      setStaffRating={setStaffRating}
      comment={comment}
      setComment={setComment}
      onSubmit={submitRating}
      onSkip={() => {
        setShowRating(false)
        setActive(null)
      }}
      staffName={active?.staff?.displayName}
      error={error}
    />
  ) : null

  return (
    <>
      {banner}
      {panel}
      {rating}
    </>
  )
}

// ---------------------------------------------------------------------------
// ExpandedPanel — the full conversation view.
// ---------------------------------------------------------------------------

function ExpandedPanel(props: {
  session: NonNullable<ActiveSessionPayload['session']>
  staff: ActiveSessionPayload['staff']
  messages: Message[]
  draft: string
  setDraft: (v: string) => void
  send: () => void
  sending: boolean
  error: string | null
  onClose: () => void
  onEndChat: () => void
  scrollerRef: React.RefObject<HTMLDivElement | null>
  account: AccountContext | null
}) {
  const {
    session,
    staff,
    messages,
    draft,
    setDraft,
    send,
    sending,
    error,
    onClose,
    onEndChat,
    scrollerRef,
    account,
  } = props
  const isWaiting = session.status === 'waiting'
  const isClosed =
    session.status === 'closed' || session.status === 'abandoned'

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center pointer-events-none">
      {/* Backdrop — soft so the page underneath remains visible. */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full md:w-[min(92vw,920px)] h-[88vh] md:h-[min(720px,88vh)] bg-white md:rounded-3xl rounded-t-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col md:flex-row pointer-events-auto animate-slide-up">
        {/* Conversation column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
            <div className="relative shrink-0">
              {staff ? (
                <Image
                  src={staff.avatarUrl}
                  alt={staff.displayName}
                  width={44}
                  height={44}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#7B2D8E]/10"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center ring-2 ring-[#7B2D8E]/10">
                  <Loader2 className="w-4 h-4 text-[#7B2D8E] animate-spin" />
                </div>
              )}
              {!isClosed && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 truncate">
                {staff?.displayName || 'Customer Care'}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {isWaiting
                  ? 'Connecting to the next available representative…'
                  : isClosed
                    ? 'Chat ended'
                    : 'Dermaspace front desk · Online'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimise"
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onEndChat}
              disabled={isClosed}
              className="hidden md:inline-flex text-[11px] font-semibold text-gray-500 hover:text-rose-600 px-3 py-1.5 rounded-full border border-gray-200 hover:border-rose-200 disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-200"
            >
              End chat
            </button>
          </header>

          {/* Messages */}
          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-[#F8F4FA] via-white to-white"
          >
            {messages.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-12">
                {isWaiting
                  ? 'You\u2019re in line — a representative will be with you shortly.'
                  : 'Send a message to get started.'}
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  staff={staff}
                />
              ))
            )}
            {isWaiting && (
              <div className="flex justify-center pt-2">
                <div className="inline-flex items-center gap-2 text-[11px] text-[#7B2D8E] bg-[#7B2D8E]/5 px-3 py-1.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Waiting for a representative
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-gray-100 px-3 py-2.5 bg-white">
            {error && (
              <p className="text-[11px] text-rose-600 mb-2 px-1">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={
                  isClosed
                    ? 'This chat has ended.'
                    : isWaiting
                      ? 'Type a question — we\u2019ll deliver it the moment a rep joins.'
                      : 'Write your message…'
                }
                disabled={isClosed || sending}
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]/40 max-h-32"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending || isClosed}
                className="shrink-0 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 hover:bg-[#6B2278] transition-colors"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={onEndChat}
              disabled={isClosed}
              className="md:hidden mt-2 text-[11px] font-semibold text-gray-500 hover:text-rose-600 disabled:opacity-40"
            >
              End chat
            </button>
          </div>
        </div>

        {/* Account context column (desktop only) */}
        <aside className="hidden md:flex w-72 shrink-0 border-l border-gray-100 bg-gray-50/50 flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
              Your snapshot
            </p>
            <p className="text-[12px] text-gray-500 mt-1">
              The representative can see this too — handy for quick questions
              about your account.
            </p>
          </div>

          <div className="p-4 space-y-3">
            <ContextCard
              icon={<Wallet className="w-4 h-4" />}
              label="Wallet balance"
              value={account?.wallet.formatted || '\u2014'}
              href="/dashboard/wallet"
            />
            <ContextCard
              icon={<CalendarDays className="w-4 h-4" />}
              label="Upcoming bookings"
              value={
                account?.bookings && account.bookings.length > 0
                  ? `${account.bookings.length} scheduled`
                  : 'None scheduled'
              }
              href="/dashboard/bookings"
            />
            <ContextCard
              icon={<Mail className="w-4 h-4" />}
              label="Account hub"
              value="Profile & settings"
              href="/dashboard"
            />
            <ContextCard
              icon={<Phone className="w-4 h-4" />}
              label="Or call us"
              value="+234 901 797 2919"
              href="tel:+2349017972919"
              external
            />
          </div>

          <div className="mt-auto p-4 text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
            Conversations are recorded for quality. The representative can
            see your name, account email, last 8 transactions, and your last
            5 bookings. They cannot see passwords, payment-card numbers, or
            two-factor codes.
          </div>
        </aside>
      </div>
    </div>
  )
}

function ContextCard({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
  external?: boolean
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-3 py-3 hover:border-[#7B2D8E]/30 hover:shadow-sm transition-all"
    >
      <div className="w-9 h-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-gray-400">
          {label}
        </p>
        <p className="text-[13px] font-semibold text-gray-900 truncate">
          {value}
        </p>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7B2D8E] transition-colors" />
    </Link>
  )
}

function MessageBubble({
  message,
  staff,
}: {
  message: Message
  staff: ActiveSessionPayload['staff']
}) {
  const time = useMemo(() => {
    try {
      return new Date(message.created_at).toLocaleTimeString('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }, [message.created_at])

  if (message.sender_role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-white border border-gray-100 px-3 py-1 rounded-full">
          <Sparkles className="w-3 h-3 text-[#7B2D8E]" />
          {message.body}
        </div>
      </div>
    )
  }

  if (message.sender_role === 'staff') {
    return (
      <div className="flex items-end gap-2">
        {staff ? (
          <Image
            src={staff.avatarUrl}
            alt={staff.displayName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#7B2D8E]/10" />
        )}
        <div className="max-w-[80%]">
          <div className="bg-white border border-gray-100 px-3.5 py-2 rounded-2xl rounded-bl-sm shadow-sm">
            <p className="text-[13.5px] text-gray-900 whitespace-pre-wrap leading-relaxed">
              {message.body}
            </p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 ml-2">{time}</p>
        </div>
      </div>
    )
  }

  // user
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="bg-[#7B2D8E] text-white px-3.5 py-2 rounded-2xl rounded-br-sm shadow-sm">
          <p className="text-[13.5px] whitespace-pre-wrap leading-relaxed">
            {message.body}
          </p>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 mr-2 text-right">{time}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RatingSheet — appears once a session closes.
// ---------------------------------------------------------------------------

function RatingSheet(props: {
  done: boolean
  saving: boolean
  serviceRating: number
  staffRating: number
  setServiceRating: (n: number) => void
  setStaffRating: (n: number) => void
  comment: string
  setComment: (v: string) => void
  onSubmit: () => void
  onSkip: () => void
  staffName?: string
  error: string | null
}) {
  const {
    done,
    saving,
    serviceRating,
    staffRating,
    setServiceRating,
    setStaffRating,
    comment,
    setComment,
    onSubmit,
    onSkip,
    staffName,
    error,
  } = props

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={onSkip}
        aria-hidden
      />
      <div className="relative w-full md:w-[440px] bg-white md:rounded-3xl rounded-t-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden pointer-events-auto animate-slide-up">
        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-emerald-500 fill-emerald-500" />
            </div>
            <p className="text-[15px] font-semibold text-gray-900">
              Thank you for the feedback.
            </p>
            <p className="text-[12px] text-gray-500 mt-1">
              We use every rating to improve.
            </p>
          </div>
        ) : (
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
                  Quick feedback
                </p>
                <p className="text-[16px] font-semibold text-gray-900 leading-tight mt-1">
                  How was your experience?
                </p>
              </div>
              <button
                type="button"
                onClick={onSkip}
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <RatingRow
              label="Overall service"
              value={serviceRating}
              onChange={setServiceRating}
            />
            <div className="h-3" />
            <RatingRow
              label={staffName ? `${staffName}'s help` : 'The representative'}
              value={staffRating}
              onChange={setStaffRating}
            />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Anything you'd like to add? (optional)"
              className="mt-4 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]/40"
            />

            {error && (
              <p className="text-[11px] text-rose-600 mt-2">{error}</p>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={onSkip}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full text-[13px] font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#7B2D8E] hover:bg-[#6B2278] disabled:opacity-60"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit rating
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-gray-700 mb-1.5">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
              n <= value
                ? 'text-amber-400 hover:text-amber-500'
                : 'text-gray-300 hover:text-amber-300',
            )}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
          >
            <Star
              className={cn('w-6 h-6', n <= value && 'fill-current')}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
