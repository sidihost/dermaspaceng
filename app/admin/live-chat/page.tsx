'use client'

/**
 * Admin live-chat oversight.
 *
 * Single page split into three tabs (kept on one route to avoid
 * churning the URL when switching context):
 *
 *   1. Live  — every waiting + active session right now, with the
 *              user, the staff member who picked it up (if any),
 *              waiting time, and a peek button that opens a
 *              read-only transcript drawer.
 *   2. History — closed sessions for the chosen window (7 / 30 / 90
 *              days) with rating and durations.
 *   3. Performance — per-staff scoreboard: handled count, avg
 *              response time, avg resolution time, avg rating.
 *
 * The transcript drawer is read-only — admin can observe but never
 * speak as a staff member, matching the "admin oversees, staff
 * communicates" rule the user described. Killing a stuck session is
 * the only mutating action exposed here.
 */

import { useEffect, useRef, useState } from 'react'
import useSWR, { mutate as swrMutate } from 'swr'
import {
  Headphones,
  Activity,
  History,
  BarChart3,
  Clock,
  Star,
  X,
  AlertTriangle,
  Search,
  Loader2,
  ArrowUpRight,
  Send,
  CheckCircle2,
  MapPin,
  UserCircle,
  Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { markSurfaceSeen } from '@/components/admin/sidebar'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

type Tab = 'live' | 'history' | 'performance'

interface SessionRow {
  id: string
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  user_id: string
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
  staff_id: string | null
  staff_first_name: string | null
  staff_last_name: string | null
  staff_avatar_url: string | null
  initial_topic: string | null
  rating: number | null
  rating_comment: string | null
  unread_for_staff: number
  created_at: string
  accepted_at: string | null
  closed_at: string | null
  last_message_at: string | null
  staff_response_seconds: number | null
  resolution_seconds: number | null
}

interface PerformanceRow {
  staff_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  handled: number
  active_now: number
  avg_response_seconds: number | null
  avg_resolution_seconds: number | null
  avg_rating: number | null
  ratings_count: number
}

interface ListResponse {
  sessions: SessionRow[]
}

interface PerformanceResponse {
  performance: PerformanceRow[]
  range: { from: string; to: string; days: number }
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m ${Math.round(seconds % 60)}s`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m`
}

function StatusBadge({ status }: { status: SessionRow['status'] }) {
  const styles =
    status === 'waiting'
      ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20'
      : status === 'active'
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : status === 'closed'
          ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        styles,
      )}
    >
      {status === 'active' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
      )}
      {status}
    </span>
  )
}

function fullName(first: string | null, last: string | null, fallback: string): string {
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || fallback
}

// Curated display-name presets the admin can sign as. Mirrors the list
// in the ticket reply composer so customers see one consistent set of
// "front desk" voices across email, support, and live chat. Admins can
// also type a custom alias if none of the presets fit (e.g. "Adaeze").
const ADMIN_DISPLAY_PRESETS = ['Admin', 'Franca', 'Itunu', 'Juwon'] as const

// Local-storage key for remembering the last alias the admin used so
// they don't have to re-pick on every page reload. Per-browser is fine
// — admins on a different device would just pick once.
const ADMIN_DISPLAY_KEY = 'admin:liveChatDisplayName'

/**
 * Interactive chat drawer. Slides in from the right; closing removes
 * the active session id from local state which unmounts the drawer.
 *
 * Used to be read-only ("admin oversees, staff communicates") but the
 * team explicitly wants admins to be able to step into ANY live chat
 * to accept it from the queue or take it over from a stuck rep. The
 * existing `/api/admin/live-chat/sessions/[id]/messages` POST already
 * implements first-message-takes-over, so we just expose a composer.
 *
 *   - waiting / active session  → show composer + display-name picker.
 *                                  First send claims the session and
 *                                  drops a "{alias} joined the chat"
 *                                  system event for the customer.
 *   - closed / abandoned        → render in read-only mode like before.
 *
 * The display-name picker is collapsed once a name has been chosen for
 * the session, with a subtle "Replying as Franca · change" link so the
 * admin can swap aliases mid-thread without the picker eating room
 * permanently.
 */
function TranscriptDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  type DrawerMessage = {
    id: string
    sender_role: 'user' | 'staff' | 'admin' | 'system'
    sender_first_name: string | null
    sender_last_name: string | null
    body: string
    created_at: string
    /**
     * Optimistic-only flag — `true` means the row is a client-side
     * draft that hasn't been confirmed by the server yet. We render
     * these with a faint "sending…" affordance and reconcile them
     * against the next /sessions/[id] poll. Server rows never set
     * this field.
     */
    _pending?: boolean
  }

  const sessionUrl = `/api/admin/live-chat/sessions/${sessionId}`
  const { data, isLoading } = useSWR<{
    session: SessionRow & {
      user_phone: string | null
    }
    messages: DrawerMessage[]
  }>(sessionUrl, fetcher, {
    refreshInterval: 3000,
  })

  // Optimistic queue. We append the admin's draft immediately so the
  // UI feels like an iMessage send, then drop the pending row once a
  // server message with the same body shows up in the next poll. This
  // is the same fix we shipped for ticket replies — admins were
  // hitting Send and seeing an empty thread until the next refetch.
  const [pending, setPending] = useState<DrawerMessage[]>([])
  // Drop pending rows whose body is now present in the server feed.
  useEffect(() => {
    if (!data?.messages || pending.length === 0) return
    const serverBodies = new Set(
      data.messages
        .filter((m) => m.sender_role === 'staff' || m.sender_role === 'admin')
        .map((m) => `${m.body}|${new Date(m.created_at).getTime() >> 10}`),
    )
    setPending((prev) =>
      prev.filter((p) => {
        const key = `${p.body}|${new Date(p.created_at).getTime() >> 10}`
        // Keep optimistic rows older than 60s only if the server still
        // hasn't echoed them — otherwise assume the message landed and
        // we just missed the bucket.
        if (serverBodies.has(key)) return false
        const age = Date.now() - new Date(p.created_at).getTime()
        return age < 60_000
      }),
    )
  }, [data, pending.length])

  // Display-name picker state. Persisted to localStorage so admins
  // who reload the page or open another session in the same browser
  // start signed as their last alias rather than re-picking on each
  // session.
  const [displayName, setDisplayName] = useState<string>('')
  const [editingDisplay, setEditingDisplay] = useState<boolean>(false)
  const [customDisplay, setCustomDisplay] = useState<string>('')
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_DISPLAY_KEY)
      if (stored && stored.trim()) {
        setDisplayName(stored.trim())
      } else {
        // No prior alias — open the picker so the admin must pick
        // before the first send. Stops them accidentally posting
        // under their real legal name.
        setEditingDisplay(true)
      }
    } catch {
      setEditingDisplay(true)
    }
  }, [])

  const persistDisplayName = (value: string) => {
    setDisplayName(value)
    setEditingDisplay(false)
    try {
      window.localStorage.setItem(ADMIN_DISPLAY_KEY, value)
    } catch {
      /* localStorage off — alias still works for the session */
    }
  }

  // Composer state.
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const status = data?.session?.status
  const liveStatus = status === 'waiting' || status === 'active'

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!displayName) {
      setEditingDisplay(true)
      setSendError('Pick a display name before replying.')
      return
    }
    setSending(true)
    setSendError(null)

    // Optimistic row — uses the admin's chosen alias for the
    // sender_*_name fields so the bubble reads "Replying as Franca"
    // immediately. Server-side rows will eventually overwrite this
    // with the real database row.
    const optimistic: DrawerMessage = {
      id: `optimistic-${Date.now()}`,
      sender_role: 'admin',
      sender_first_name: displayName,
      sender_last_name: null,
      body: text,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setPending((prev) => [...prev, optimistic])
    setDraft('')

    try {
      const res = await fetch(`${sessionUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: text, displayName }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not send message.')
      }
      // Re-fetch the session immediately so the take-over (status →
      // active, "{alias} joined the chat" event, message append) all
      // land together rather than waiting for the next 3s tick.
      await swrMutate(sessionUrl)
    } catch (err) {
      // Roll back the optimistic row and put the draft back in the
      // textarea so the admin can retry without retyping.
      setPending((prev) => prev.filter((p) => p.id !== optimistic.id))
      setDraft(text)
      setSendError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSending(false)
      // Re-focus the composer so Enter-then-Enter feels like Slack.
      requestAnimationFrame(() => composerRef.current?.focus())
    }
  }

  // Auto-scroll to the bottom whenever new messages arrive.
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [data?.messages?.length, pending.length])

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close transcript"
        className="flex-1 bg-gray-900/40 backdrop-blur-sm hidden sm:block"
        onClick={onClose}
      />
      {/* Drawer: full-screen on phones (no scrim peek), constrained panel
          on tablets / desktop. Uses h-[100dvh] so the iOS URL bar collapsing
          doesn't expose a gap below the composer footer. */}
      <aside className="w-full sm:max-w-md bg-white sm:ring-1 sm:ring-gray-200 flex flex-col h-[100dvh]">
        <header className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
              {liveStatus ? 'Admin conversation' : 'Read-only transcript'}
            </p>
            {data?.session ? (
              <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                {fullName(
                  data.session.user_first_name,
                  data.session.user_last_name,
                  data.session.user_email || 'User',
                )}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Compact session-meta strip. Previously a 2-col label / value
            grid that ate ~140px of vertical room before the first message
            even appeared — and on mobile it visually competed with the
            messages themselves. Now it's a tight row of pill-style facts
            (Status · Rep · First reply · Resolution) that sits under the
            header without dominating, with a "Show details" toggle for
            the longer fields when needed. */}
        {data?.session ? (
          <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-600">
              <StatusBadge status={data.session.status} />
              <span className="inline-flex items-center gap-1">
                <span className="text-gray-400">Rep</span>
                <span className="text-gray-700 font-medium truncate max-w-[100px]">
                  {data.session.staff_id
                    ? fullName(
                        data.session.staff_first_name,
                        data.session.staff_last_name,
                        'Assigned',
                      )
                    : 'Unassigned'}
                </span>
              </span>
              {data.session.staff_response_seconds != null && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">First reply</span>
                  <span className="text-gray-700 font-medium">
                    {formatDuration(data.session.staff_response_seconds)}
                  </span>
                </span>
              )}
              {data.session.resolution_seconds != null && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">Resolved in</span>
                  <span className="text-gray-700 font-medium">
                    {formatDuration(data.session.resolution_seconds)}
                  </span>
                </span>
              )}
              {data.session.rating != null && (
                <span className="inline-flex items-center gap-1 text-[#7B2D8E] font-semibold">
                  <Star className="h-3 w-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                  {data.session.rating}/5
                </span>
              )}
            </div>
            {data.session.initial_topic ? (
              <p className="mt-1.5 text-[11.5px] text-gray-500 line-clamp-2">
                <span className="text-gray-400">Topic · </span>
                <span className="text-gray-700">{data.session.initial_topic}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : null}

          {/*
            Merge the server feed with any pending (optimistic) rows so
            the admin's just-sent message renders immediately. We sort
            by timestamp so reply order is correct even if the server
            poll lands while the admin is mid-second-message.
          */}
          {[...(data?.messages ?? []), ...pending]
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )
            .map((m) => {
              if (m.sender_role === 'system') {
                return (
                  <div
                    key={m.id}
                    className="text-center text-[10.5px] uppercase tracking-wider text-gray-400 py-1"
                  >
                    {m.body}
                  </div>
                )
              }
              const mine = m.sender_role === 'user'
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col',
                    mine ? 'items-start' : 'items-end',
                  )}
                >
                  <span className="text-[10px] text-gray-400 px-1 mb-0.5">
                    {mine
                      ? fullName(
                          m.sender_first_name,
                          m.sender_last_name,
                          'Customer',
                        )
                      : fullName(
                          m.sender_first_name,
                          m.sender_last_name,
                          m.sender_role === 'admin' ? 'Admin' : 'Rep',
                        )}{' '}
                    · {formatRelative(m.created_at)}
                    {m._pending ? (
                      <span className="ml-1 italic text-gray-300">sending…</span>
                    ) : null}
                  </span>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug whitespace-pre-wrap',
                      mine
                        ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        : 'bg-[#7B2D8E] text-white rounded-br-sm',
                      m._pending && 'opacity-60',
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              )
            })}

          {!isLoading && (data?.messages?.length ?? 0) + pending.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E] mb-3">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">
                No messages yet
              </p>
              <p className="mt-1 text-xs text-gray-500 max-w-[260px]">
                {liveStatus
                  ? 'Send the first reply below — it will accept the chat and notify the customer.'
                  : 'This session closed before any messages were exchanged.'}
              </p>
            </div>
          ) : null}
        </div>

        {/*
          Composer footer. Hidden once the chat is closed/abandoned —
          replies don't make sense there and we'd just be confusing
          the admin.
        */}
        {liveStatus ? (
          <footer className="border-t border-gray-100 bg-white px-4 pt-3 pb-3">
            {/* Display-name picker. Either compact "Replying as Franca · change"
                or expanded radio-style picker on first use / when changing. */}
            {editingDisplay ? (
              <div className="mb-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-gray-700 mb-2">
                  Reply as
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ADMIN_DISPLAY_PRESETS.map((preset) => {
                    const active = preset === displayName
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => persistDisplayName(preset)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 transition-colors',
                          active
                            ? 'bg-[#7B2D8E] text-white ring-[#7B2D8E]'
                            : 'bg-white text-gray-700 ring-gray-200 hover:ring-[#7B2D8E]/40 hover:text-[#7B2D8E]',
                        )}
                      >
                        {preset}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customDisplay}
                    onChange={(e) => setCustomDisplay(e.target.value)}
                    placeholder="Or type a custom name"
                    maxLength={30}
                    className="flex-1 px-2.5 py-1 rounded-full text-[11px] bg-white ring-1 ring-gray-200 focus:ring-2 focus:ring-[#7B2D8E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = customDisplay.trim()
                      if (v) persistDisplayName(v)
                    }}
                    disabled={!customDisplay.trim()}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#7B2D8E] text-white disabled:opacity-50"
                  >
                    Use
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10.5px] text-gray-500">
                  Replying as{' '}
                  <span className="font-semibold text-gray-800">
                    {displayName}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setEditingDisplay(true)}
                  className="text-[10.5px] font-medium text-[#7B2D8E] hover:underline"
                >
                  change
                </button>
              </div>
            )}

            {/* Take-over hint when the chat already belongs to another rep
                or is still in the waiting queue. We surface this so the
                admin understands a Send will reassign the chat. */}
            {data?.session ? (
              data.session.staff_id == null ? (
                <p className="text-[10.5px] text-[#7B2D8E] bg-[#7B2D8E]/10 ring-1 ring-[#7B2D8E]/20 rounded-md px-2 py-1 mb-2">
                  This chat is in the waiting queue. Sending will accept it
                  on your behalf and notify the customer.
                </p>
              ) : data.session.staff_id !== '' &&
                fullName(
                  data.session.staff_first_name,
                  data.session.staff_last_name,
                  '',
                ) ? (
                <p className="text-[10.5px] text-[#7B2D8E] bg-[#7B2D8E]/5 ring-1 ring-[#7B2D8E]/20 rounded-md px-2 py-1 mb-2 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Currently with{' '}
                  {fullName(
                    data.session.staff_first_name,
                    data.session.staff_last_name,
                    'a rep',
                  )}
                  . Sending will take over.
                </p>
              ) : null
            ) : null}

            {sendError ? (
              <p className="text-[10.5px] text-rose-600 mb-1.5">{sendError}</p>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Cmd/Ctrl+Enter or plain Enter (without shift) sends.
                  // Shift+Enter inserts a newline like every modern chat.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type a reply… Enter to send, Shift+Enter for a new line"
                rows={2}
                maxLength={2000}
                className="flex-1 resize-none rounded-2xl bg-gray-50 ring-1 ring-gray-200 focus:ring-2 focus:ring-[#7B2D8E] focus:outline-none px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!draft.trim() || sending}
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-[#7B2D8E] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#5A1D6A] transition-colors"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}

/**
 * "Live" tab body. Polls every 4s — same cadence as the staff queue
 * — so admins see the same world-state staff do.
 */
function LiveTab({ onPeek }: { onPeek: (id: string) => void }) {
  const { data } = useSWR<ListResponse>(
    '/api/admin/live-chat/sessions?status=open',
    fetcher,
    { refreshInterval: 4000 },
  )
  const sessions = data?.sessions ?? []
  const waiting = sessions.filter((s) => s.status === 'waiting')
  const active = sessions.filter((s) => s.status === 'active')

  // Clear the sidebar Live Chat badge once the admin lands on the
  // Live tab — same Google / Vercel "seen" baseline used by Support
  // and Consultations. We snapshot the waiting count rather than the
  // total because the badge tracks unattended queue work.
  useEffect(() => {
    markSurfaceSeen('live-chat', waiting.length)
  }, [waiting.length])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Waiting" value={waiting.length} hue="purple" />
        <SummaryCard label="Active" value={active.length} hue="emerald" />
        <SummaryCard
          label="Avg wait"
          value={
            waiting.length === 0
              ? '—'
              : formatDuration(
                  waiting.reduce(
                    (acc, s) =>
                      acc +
                      (Date.now() - new Date(s.created_at).getTime()) / 1000,
                    0,
                  ) / waiting.length,
                )
          }
          hue="purple"
        />
      </div>

      <SessionTable
        rows={sessions}
        emptyHint="Quiet right now — no waiting or active chats."
        onPeek={onPeek}
        showWait
      />
    </div>
  )
}

function HistoryTab({ onPeek }: { onPeek: (id: string) => void }) {
  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const { data } = useSWR<ListResponse>(
    `/api/admin/live-chat/sessions?status=closed&days=${days}`,
    fetcher,
  )
  const sessions = data?.sessions ?? []
  const filtered = search.trim()
    ? sessions.filter((s) => {
        const q = search.toLowerCase()
        return (
          (s.user_first_name || '').toLowerCase().includes(q) ||
          (s.user_last_name || '').toLowerCase().includes(q) ||
          (s.user_email || '').toLowerCase().includes(q) ||
          (s.initial_topic || '').toLowerCase().includes(q) ||
          (s.staff_first_name || '').toLowerCase().includes(q)
        )
      })
    : sessions

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex bg-white rounded-full p-1 ring-1 ring-gray-200 self-start">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                days === d
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Last {d} days
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, rep, or topic"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-full ring-1 ring-gray-200 focus:ring-2 focus:ring-[#7B2D8E] focus:outline-none"
          />
        </div>
      </div>

      <SessionTable
        rows={filtered}
        emptyHint={
          search
            ? 'No history matched your search.'
            : 'No closed sessions in this window.'
        }
        onPeek={onPeek}
      />
    </div>
  )
}

function PerformanceTab() {
  const [days, setDays] = useState(30)
  const { data } = useSWR<PerformanceResponse>(
    `/api/admin/live-chat/performance?days=${days}`,
    fetcher,
  )
  const rows = data?.performance ?? []

  return (
    <div className="space-y-4">
      <div className="inline-flex bg-white rounded-full p-1 ring-1 ring-gray-200">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              days === d
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            Last {d} days
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-[10.5px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Rep</th>
                <th className="text-right font-semibold px-3 py-3">Handled</th>
                <th className="text-right font-semibold px-3 py-3">Active now</th>
                <th className="text-right font-semibold px-3 py-3">Avg first reply</th>
                <th className="text-right font-semibold px-3 py-3">Avg resolution</th>
                <th className="text-right font-semibold px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-xs text-gray-400 py-10">
                    No staff activity in this window yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const name = fullName(r.first_name, r.last_name, 'Rep')
                  return (
                    <tr key={r.staff_id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <StaffAvatar
                            url={r.avatar_url}
                            firstName={r.first_name}
                            lastName={r.last_name}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {name}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {r.ratings_count} rating
                              {r.ratings_count === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-900">
                        {r.handled}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums">
                        {r.active_now > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {r.active_now}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-700">
                        {formatDuration(r.avg_response_seconds)}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-700">
                        {formatDuration(r.avg_resolution_seconds)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {r.avg_rating != null ? (
<span className="inline-flex items-center gap-1 text-[#7B2D8E] font-semibold">
                <Star className="h-3.5 w-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                            {r.avg_rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StaffAvatar({
  url,
  firstName,
  lastName,
}: {
  url: string | null
  firstName: string | null
  lastName: string | null
}) {
  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'S'
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fullName(firstName, lastName, 'Staff')}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
      />
    )
  }
  return (
    <div className="h-9 w-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-semibold flex items-center justify-center ring-1 ring-[#7B2D8E]/20">
      {initials}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hue,
}: {
  label: string
  value: number | string
hue: 'purple' | 'emerald'
}) {
  const color =
    hue === 'purple'
      ? 'text-[#7B2D8E]'
      : hue === 'emerald'
        ? 'text-emerald-600'
        : 'text-[#7B2D8E]'
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 px-5 py-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className={cn('text-2xl font-semibold mt-1 tabular-nums', color)}>
        {value}
      </p>
    </div>
  )
}

function SessionTable({
  rows,
  emptyHint,
  onPeek,
  showWait = false,
}: {
  rows: SessionRow[]
  emptyHint: string
  onPeek: (id: string) => void
  showWait?: boolean
}) {
  // Empty state shared across both layouts.
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 text-center text-xs text-gray-400 py-10">
        {emptyHint}
      </div>
    )
  }

  return (
    <>
      {/* ----------------------------------------------------------------
          Mobile / narrow layout (< md). The previous table was scrolling
          horizontally and clipping the "Waiting / Last activity" header
          plus the trailing CTA, which is what the user flagged in the
          screenshot. We render a stacked card per session below md, so
          everything stays visible without a horizontal scrollbar. The
          whole card is tappable — the dedicated "Peek" button is gone
          on mobile because the card itself is the affordance now (the
          ArrowUpRight glyph hints at "open this chat"). The row label
          still says "Open chat" via aria-label for screen readers.
      ----------------------------------------------------------------- */}
      <div className="md:hidden space-y-2">
        {rows.map((s) => {
          // Determine if guest or logged-in user
          const isGuest = s.is_guest || !s.user_id
          const customer = isGuest
            ? s.guest_name || 'Anonymous Guest'
            : fullName(s.user_first_name, s.user_last_name, s.user_email || 'Customer')
          const customerEmail = isGuest ? s.guest_email : s.user_email
          const customerPhone = isGuest ? s.guest_phone : null
          
          const rep = s.staff_id
            ? fullName(s.staff_first_name, s.staff_last_name, 'Assigned')
            : null
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPeek(s.id)}
              aria-label={`Open chat with ${customer}`}
              className="w-full text-left bg-white rounded-2xl ring-1 ring-gray-100 hover:ring-[#7B2D8E]/30 active:bg-gray-50/60 transition-colors p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate text-[14px]">
                      {customer}
                    </p>
                    {isGuest && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide bg-[#7B2D8E]/10 text-[#7B2D8E]">
                        <UserCircle className="w-3 h-3" />
                        Guest
                      </span>
                    )}
                    <StatusBadge status={s.status} />
                  </div>
                  {customerEmail ? (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {customerEmail}
                    </p>
                  ) : null}
                  {customerPhone ? (
                    <p className="text-[10px] text-gray-500 truncate mt-0.5 inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {customerPhone}
                    </p>
                  ) : null}
                  {s.visitor_location ? (
                    <p className="text-[10px] text-[#7B2D8E] truncate mt-0.5 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {s.visitor_location}
                    </p>
                  ) : null}
                </div>
                <span
                  aria-hidden="true"
                  className="shrink-0 w-8 h-8 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>

              {s.initial_topic ? (
                <p className="text-[12.5px] text-gray-700 mt-2 line-clamp-2">
                  {s.initial_topic}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-500">
                <div className="flex items-center gap-2 min-w-0">
                  {rep ? (
                    <>
                      <StaffAvatar
                        url={s.staff_avatar_url}
                        firstName={s.staff_first_name}
                        lastName={s.staff_last_name}
                      />
                      <span className="truncate">{rep}</span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#7B2D8E] font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Unassigned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  {s.rating != null ? (
                    <span className="inline-flex items-center gap-1 text-[#7B2D8E] font-semibold">
                      <Star className="h-3 w-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                      {s.rating}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    {showWait
                      ? formatRelative(s.last_message_at || s.created_at)
                      : formatRelative(s.closed_at)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ----------------------------------------------------------------
          Desktop layout (md+). Same table as before, but the trailing
          CTA now uses ArrowUpRight + "Open" instead of MessageSquare +
          "Peek". The user pushed back on the chat-bubble glyph as
          weak/unclear, and the new icon better matches the action — it
          opens a side drawer where the admin can both read AND reply.
      ----------------------------------------------------------------- */}
      <div className="hidden md:block bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-[10.5px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Customer</th>
                <th className="text-left font-semibold px-3 py-3">Location</th>
                <th className="text-left font-semibold px-3 py-3">Topic</th>
                <th className="text-left font-semibold px-3 py-3">Rep</th>
                <th className="text-left font-semibold px-3 py-3">Status</th>
                <th className="text-left font-semibold px-3 py-3">
                  {showWait ? 'Waiting / Last activity' : 'Closed'}
                </th>
                <th className="text-left font-semibold px-3 py-3">Rating</th>
                <th className="text-right font-semibold px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((s) => {
                // Determine if guest or logged-in user
                const isGuest = s.is_guest || !s.user_id
                const customer = isGuest
                  ? s.guest_name || 'Anonymous Guest'
                  : fullName(s.user_first_name, s.user_last_name, s.user_email || 'Customer')
                const customerEmail = isGuest ? s.guest_email : s.user_email
                const customerPhone = isGuest ? s.guest_phone : null
                
                const rep = s.staff_id
                  ? fullName(
                      s.staff_first_name,
                      s.staff_last_name,
                      'Assigned',
                    )
                  : null
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {customer}
                          </p>
                          {isGuest && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide bg-[#7B2D8E]/10 text-[#7B2D8E] shrink-0">
                              <UserCircle className="w-3 h-3" />
                              Guest
                            </span>
                          )}
                        </div>
                        {customerEmail ? (
                          <p className="text-[11px] text-gray-500 truncate">
                            {customerEmail}
                          </p>
                        ) : null}
                        {customerPhone ? (
                          <p className="text-[10px] text-gray-400 truncate inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customerPhone}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {s.visitor_location ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#7B2D8E]">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{s.visitor_location}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-gray-700 text-[13px] line-clamp-2">
                        {s.initial_topic || (
                          <span className="text-gray-400 italic">No topic</span>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {rep ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <StaffAvatar
                            url={s.staff_avatar_url}
                            firstName={s.staff_first_name}
                            lastName={s.staff_last_name}
                          />
                          <p className="text-[13px] text-gray-700 truncate">
                            {rep}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#7B2D8E] text-[12px]">
                          <AlertTriangle className="h-3 w-3" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-600">
                      {showWait ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatRelative(s.last_message_at || s.created_at)}
                        </span>
                      ) : (
                        formatRelative(s.closed_at)
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.rating != null ? (
                        <span className="inline-flex items-center gap-1 text-[#7B2D8E] font-semibold text-[13px]">
                          <Star className="h-3 w-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                          {s.rating}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onPeek(s.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default function AdminLiveChatPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [peekId, setPeekId] = useState<string | null>(null)

  const tabs: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
    { id: 'live', label: 'Live', icon: Activity },
    { id: 'history', label: 'History', icon: History },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-[#7B2D8E]">
            <Headphones className="h-5 w-5" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em]">
              Customer care oversight
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 text-balance">
            Live Chat
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-prose">
            Watch every conversation between customers and the front desk in
            real time, audit closed transcripts, and see how each rep is
            performing.
          </p>
        </div>
      </header>

      <nav className="inline-flex bg-white rounded-full p-1 ring-1 ring-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
                active
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'live' && <LiveTab onPeek={(id) => setPeekId(id)} />}
      {tab === 'history' && <HistoryTab onPeek={(id) => setPeekId(id)} />}
      {tab === 'performance' && <PerformanceTab />}

      {peekId ? (
        <TranscriptDrawer sessionId={peekId} onClose={() => setPeekId(null)} />
      ) : null}
    </div>
  )
}
