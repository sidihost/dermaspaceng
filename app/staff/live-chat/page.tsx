'use client'

// ---------------------------------------------------------------------------
// Staff Live Chat console.
// ---------------------------------------------------------------------------
// Two-column layout:
//   * Left  — queue (waiting + my active sessions), avatar/display-name
//             editor, presence indicator.
//   * Right — selected conversation (messages, composer, accept/close)
//             with a stacked customer-context panel for quick lookups.
//
// The page polls the queue every 5s and the open conversation's messages
// every 3s. SWR with `refreshInterval` is the simplest tool that gives
// us cross-tab dedup and revalidation on focus.
// ---------------------------------------------------------------------------

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  Loader2,
  Send,
  Check,
  ChevronRight,
  Settings,
  X,
  Wallet,
  CalendarDays,
  Mail,
  Phone,
  Headphones,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('failed')
    return r.json()
  })

// --- Shared types ---------------------------------------------------------

interface QueueItem {
  id: string
  user_id: string
  status: 'waiting' | 'active'
  initial_topic: string | null
  escalated_at: string
  accepted_at: string | null
  last_activity_at: string
  user_first_name: string
  user_last_name: string
  user_avatar_url: string | null
  unread_user_messages: number
}

interface Message {
  id: string
  session_id: string
  sender_role: 'user' | 'staff' | 'system'
  body: string
  created_at: string
}

interface FullSession {
  id: string
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  initial_topic: string | null
  escalated_at: string
  accepted_at: string | null
  closed_at: string | null
  service_rating: number | null
  staff_rating: number | null
  rating_comment: string | null
  user: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatarUrl: string | null
  }
  staff: {
    displayName: string
    avatarUrl: string
  } | null
}

interface StaffProfile {
  avatarSlug: string
  displayName: string
  avatarUrl: string
  status?: string
}

// --- Page -----------------------------------------------------------------

export default function StaffLiveChatPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showProfileSheet, setShowProfileSheet] = useState(false)

  const queueQuery = useSWR<{ waiting: QueueItem[]; mine: QueueItem[] }>(
    '/api/staff/live-chat/queue',
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true },
  )

  const profileQuery = useSWR<{ profile: StaffProfile }>(
    '/api/staff/profile',
    fetcher,
  )

  // Auto-select first active or waiting session if none chosen.
  useEffect(() => {
    if (selected) return
    const data = queueQuery.data
    if (!data) return
    const candidate = data.mine[0] || data.waiting[0]
    if (candidate) setSelected(candidate.id)
  }, [selected, queueQuery.data])

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Live Chat</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customers connect from Derma AI when they need a real person.
            Pick up a chat from the queue and respond inline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowProfileSheet(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 text-[12px] font-semibold text-gray-700 hover:text-[#7B2D8E]"
        >
          {profileQuery.data?.profile ? (
            <Image
              src={profileQuery.data.profile.avatarUrl}
              alt=""
              width={22}
              height={22}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <Settings className="w-4 h-4" />
          )}
          {profileQuery.data?.profile?.displayName || 'Set your avatar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
        <QueueColumn
          loading={queueQuery.isLoading}
          waiting={queueQuery.data?.waiting || []}
          mine={queueQuery.data?.mine || []}
          selected={selected}
          onSelect={setSelected}
        />

        <ConversationColumn
          sessionId={selected}
          onAccepted={() => queueQuery.mutate()}
          onClosed={() => {
            queueQuery.mutate()
            setSelected(null)
          }}
          myDisplayName={profileQuery.data?.profile.displayName || ''}
        />
      </div>

      {showProfileSheet && (
        <ProfileSheet
          profile={profileQuery.data?.profile || null}
          onClose={() => setShowProfileSheet(false)}
          onSaved={() => {
            profileQuery.mutate()
            globalMutate('/api/staff/live-chat/queue')
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QueueColumn — split into "Waiting" and "Yours" so urgent pickups surface
// at the top.
// ---------------------------------------------------------------------------

function QueueColumn({
  loading,
  waiting,
  mine,
  selected,
  onSelect,
}: {
  loading: boolean
  waiting: QueueItem[]
  mine: QueueItem[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <aside className="bg-white rounded-2xl border border-gray-100 p-2 max-h-[calc(100vh-180px)] overflow-y-auto">
      <Section title="Waiting" count={waiting.length} accent>
        {loading && waiting.length === 0 ? (
          <SectionEmpty label="Loading queue…" />
        ) : waiting.length === 0 ? (
          <SectionEmpty label="No customers in line." />
        ) : (
          waiting.map((q) => (
            <QueueRow
              key={q.id}
              item={q}
              selected={selected === q.id}
              onSelect={() => onSelect(q.id)}
            />
          ))
        )}
      </Section>
      <Section title="Your active chats" count={mine.length}>
        {mine.length === 0 ? (
          <SectionEmpty label="No active conversations." />
        ) : (
          mine.map((q) => (
            <QueueRow
              key={q.id}
              item={q}
              selected={selected === q.id}
              onSelect={() => onSelect(q.id)}
            />
          ))
        )}
      </Section>
    </aside>
  )
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string
  count: number
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="px-1.5 pt-3">
      <div className="flex items-center justify-between mb-2 px-1.5">
        <p
          className={cn(
            'text-[10px] font-semibold tracking-[0.16em] uppercase',
            accent ? 'text-[#7B2D8E]' : 'text-gray-500',
          )}
        >
          {title}
        </p>
        <span
          className={cn(
            'text-[10px] font-semibold rounded-full px-2 py-0.5',
            accent && count > 0
              ? 'bg-[#7B2D8E] text-white'
              : 'bg-gray-100 text-gray-500',
          )}
        >
          {count}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <p className="text-[12px] text-gray-400 px-3 py-4 text-center">{label}</p>
  )
}

function QueueRow({
  item,
  selected,
  onSelect,
}: {
  item: QueueItem
  selected: boolean
  onSelect: () => void
}) {
  const initials = `${item.user_first_name?.[0] || '?'}${item.user_last_name?.[0] || ''}`.toUpperCase()
  const waited = useMemo(() => {
    try {
      const ms = Date.now() - new Date(item.escalated_at).getTime()
      const min = Math.max(0, Math.floor(ms / 60000))
      if (min < 1) return 'just now'
      if (min < 60) return `${min}m`
      const h = Math.floor(min / 60)
      return `${h}h ${min % 60}m`
    } catch {
      return ''
    }
  }, [item.escalated_at])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors group',
        selected
          ? 'bg-[#7B2D8E] text-white'
          : 'hover:bg-gray-50 text-gray-700',
      )}
    >
      <div
        className={cn(
          'shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold ring-1',
          selected
            ? 'bg-white/20 text-white ring-white/30'
            : 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/10',
        )}
      >
        {item.user_avatar_url ? (
          <Image
            src={item.user_avatar_url}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-[13px] font-semibold truncate',
              selected ? 'text-white' : 'text-gray-900',
            )}
          >
            {item.user_first_name} {item.user_last_name}
          </p>
          {item.unread_user_messages > 0 && (
            <span
              className={cn(
                'shrink-0 text-[10px] font-bold rounded-full px-1.5 py-px',
                selected ? 'bg-white text-[#7B2D8E]' : 'bg-[#7B2D8E] text-white',
              )}
            >
              {item.unread_user_messages}
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-[11px] leading-snug line-clamp-2',
            selected ? 'text-white/80' : 'text-gray-500',
          )}
        >
          {item.initial_topic || 'No topic provided'}
        </p>
        <p
          className={cn(
            'text-[10px] mt-0.5',
            selected ? 'text-white/70' : 'text-gray-400',
          )}
        >
          {item.status === 'waiting' ? `Waiting ${waited}` : `Active · ${waited}`}
        </p>
      </div>
      <ChevronRight
        className={cn(
          'w-4 h-4 mt-3 shrink-0 transition-opacity',
          selected ? 'text-white' : 'text-gray-300 group-hover:text-gray-500',
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// ConversationColumn
// ---------------------------------------------------------------------------

function ConversationColumn({
  sessionId,
  onAccepted,
  onClosed,
  myDisplayName,
}: {
  sessionId: string | null
  onAccepted: () => void
  onClosed: () => void
  myDisplayName: string
}) {
  const sessionQuery = useSWR<{ session: FullSession }>(
    sessionId ? `/api/staff/live-chat/sessions/${sessionId}` : null,
    fetcher,
    { refreshInterval: 5000 },
  )
  const messagesQuery = useSWR<{ messages: Message[] }>(
    sessionId ? `/api/staff/live-chat/sessions/${sessionId}/messages` : null,
    fetcher,
    { refreshInterval: 3000 },
  )
  const contextQuery = useSWR(
    sessionId ? `/api/staff/live-chat/sessions/${sessionId}/user-context` : null,
    fetcher,
  )

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // Reset state when switching session.
  useEffect(() => {
    setDraft('')
    setError(null)
  }, [sessionId])

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messagesQuery.data?.messages?.length])

  const session = sessionQuery.data?.session
  const messages = messagesQuery.data?.messages || []

  const accept = useCallback(async () => {
    if (!sessionId) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/staff/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Could not accept this chat.')
        return
      }
      sessionQuery.mutate()
      messagesQuery.mutate()
      onAccepted()
    } finally {
      setAccepting(false)
    }
  }, [sessionId, sessionQuery, messagesQuery, onAccepted])

  const closeChat = useCallback(async () => {
    if (!sessionId) return
    if (!window.confirm('End this chat?')) return
    setClosing(true)
    try {
      await fetch(`/api/staff/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      onClosed()
    } finally {
      setClosing(false)
    }
  }, [sessionId, onClosed])

  const send = useCallback(async () => {
    const body = draft.trim()
    if (!body || !sessionId) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/staff/live-chat/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body }),
        },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Could not send.')
        return
      }
      setDraft('')
      messagesQuery.mutate()
    } catch {
      setError('Network error.')
    } finally {
      setSending(false)
    }
  }, [draft, sessionId, messagesQuery])

  if (!sessionId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 min-h-[420px] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
            <Headphones className="w-6 h-6 text-[#7B2D8E]" />
          </div>
          <p className="text-[14px] font-semibold text-gray-900">
            No conversation selected
          </p>
          <p className="text-[12px] text-gray-500 mt-1 max-w-[280px] mx-auto">
            Pick a customer from the queue to view the conversation. New
            arrivals show up automatically every few seconds.
          </p>
        </div>
      </div>
    )
  }

  if (sessionQuery.isLoading || !session) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 min-h-[420px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#7B2D8E] animate-spin" />
      </div>
    )
  }

  const isWaiting = session.status === 'waiting'
  const isClosed = session.status === 'closed' || session.status === 'abandoned'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,300px] gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col min-h-[480px] max-h-[calc(100vh-180px)]">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <UserAvatar
            firstName={session.user.firstName}
            lastName={session.user.lastName}
            url={session.user.avatarUrl}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 truncate">
              {session.user.firstName} {session.user.lastName}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {session.user.email}
              {session.user.phone ? ` · ${session.user.phone}` : ''}
            </p>
          </div>
          <StatusPill status={session.status} />
        </header>

        {/* Topic banner */}
        {session.initial_topic && (
          <div className="px-4 py-2 bg-[#7B2D8E]/5 border-b border-[#7B2D8E]/10 text-[12px] text-[#7B2D8E]">
            <Sparkles className="w-3 h-3 inline mr-1.5 mb-0.5" />
            {session.initial_topic}
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-[#F8F4FA] via-white to-white"
        >
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              userName={session.user.firstName}
              userAvatarUrl={session.user.avatarUrl}
            />
          ))}
          {isWaiting && (
            <div className="flex justify-center pt-2">
              <div className="inline-flex items-center gap-2 text-[11px] text-[#7B2D8E] bg-[#7B2D8E]/5 px-3 py-1.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                Customer is waiting — accept to start chatting.
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="border-t border-gray-100 px-3 py-2.5">
          {error && (
            <div className="mb-2 px-2 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          {isWaiting ? (
            <button
              type="button"
              onClick={accept}
              disabled={accepting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] text-white py-2.5 text-[13px] font-semibold hover:bg-[#6B2278] disabled:opacity-60"
            >
              {accepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Accept &amp; join as {myDisplayName || 'representative'}
            </button>
          ) : isClosed ? (
            <div className="text-center text-[12px] text-gray-400 py-2">
              This chat has ended.
              {session.staff_rating != null && (
                <span className="ml-2">
                  Rated {session.staff_rating}/5 by the customer.
                </span>
              )}
            </div>
          ) : (
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
                placeholder="Reply to the customer…"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]/40 max-h-32"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending}
                className="shrink-0 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={closeChat}
                disabled={closing}
                className="shrink-0 hidden md:inline-flex items-center px-3 py-2 rounded-full text-[11px] font-semibold text-gray-500 hover:text-rose-600 border border-gray-200 hover:border-rose-200"
              >
                {closing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'End'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customer context column */}
      <CustomerContextPanel data={contextQuery.data} loading={contextQuery.isLoading} />
    </div>
  )
}

function StatusPill({ status }: { status: FullSession['status'] }) {
  const map: Record<FullSession['status'], { label: string; className: string }> = {
    waiting: {
      label: 'Waiting',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    active: {
      label: 'Active',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    closed: {
      label: 'Closed',
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    },
    abandoned: {
      label: 'Abandoned',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  }
  const cfg = map[status]
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider rounded-full border px-2.5 py-1',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  )
}

function UserAvatar({
  firstName,
  lastName,
  url,
}: {
  firstName: string
  lastName: string
  url: string | null
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt={firstName}
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7B2D8E]/10"
      />
    )
  }
  const initials = `${firstName?.[0] || '?'}${lastName?.[0] || ''}`.toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center text-[12px] font-semibold ring-2 ring-[#7B2D8E]/10">
      {initials}
    </div>
  )
}

function MessageRow({
  message,
  userName,
  userAvatarUrl,
}: {
  message: Message
  userName: string
  userAvatarUrl: string | null
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

  if (message.sender_role === 'user') {
    return (
      <div className="flex items-end gap-2">
        {userAvatarUrl ? (
          <Image
            src={userAvatarUrl}
            alt={userName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-semibold">
            {(userName?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="max-w-[70%]">
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

  // staff (you)
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%]">
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
// CustomerContextPanel
// ---------------------------------------------------------------------------

function CustomerContextPanel({
  data,
  loading,
}: {
  data: unknown
  loading: boolean
}) {
  type ContextData = {
    user: {
      email: string
      phone: string | null
      memberSince: string
      isActive: boolean
    }
    wallet: { formatted: string }
    transactions: Array<{
      id: number
      type: string
      amount: number
      status: string
      payment_method: string | null
      description: string | null
      created_at: string
    }>
    bookings: Array<{
      id: number
      booking_reference: string
      location_name: string
      appointment_date: string
      status: string
      total_price: number
    }>
    tickets: Array<{
      ticket_id: string
      category: string
      subject: string
      status: string
    }>
  }
  const c = data as ContextData | undefined

  return (
    <aside className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#7B2D8E]">
          Customer snapshot
        </p>
        <p className="text-[11px] text-gray-500 mt-1">
          Read-only view. You can&apos;t edit account details from here —
          escalate to admin if a fix is needed.
        </p>
      </div>

      {loading || !c ? (
        <div className="py-6 text-center text-[12px] text-gray-400">
          <Loader2 className="w-4 h-4 mx-auto animate-spin text-[#7B2D8E] mb-2" />
          Loading account info…
        </div>
      ) : (
        <>
          <ContextCard icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={c.user.email} />
          {c.user.phone && (
            <ContextCard icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={c.user.phone} />
          )}
          <ContextCard
            icon={<Wallet className="w-3.5 h-3.5" />}
            label="Wallet"
            value={c.wallet.formatted}
          />

          <SubSection title={`Recent transactions (${c.transactions.length})`}>
            {c.transactions.length === 0 ? (
              <SubSectionEmpty label="No transactions on file." />
            ) : (
              c.transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="text-[11px] flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {tx.payment_method || tx.type} ·{' '}
                      {new Date(tx.created_at).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-[12px] font-semibold tabular-nums',
                        tx.status === 'failed' || tx.status === 'declined'
                          ? 'text-rose-600'
                          : 'text-gray-900',
                      )}
                    >
                      ₦{Math.round(Number(tx.amount) / 100).toLocaleString()}
                    </p>
                    <p
                      className={cn(
                        'text-[9px] uppercase tracking-wider font-semibold',
                        tx.status === 'success'
                          ? 'text-emerald-600'
                          : tx.status === 'failed' || tx.status === 'declined'
                            ? 'text-rose-600'
                            : 'text-amber-600',
                      )}
                    >
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </SubSection>

          <SubSection title={`Recent bookings (${c.bookings.length})`}>
            {c.bookings.length === 0 ? (
              <SubSectionEmpty label="No bookings on file." />
            ) : (
              c.bookings.map((b) => (
                <div
                  key={b.id}
                  className="text-[11px] flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">
                      {b.booking_reference}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {b.location_name} ·{' '}
                      {new Date(b.appointment_date).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </SubSection>

          {c.tickets.length > 0 && (
            <SubSection title="Open tickets">
              {c.tickets.map((t) => (
                <div
                  key={t.ticket_id}
                  className="text-[11px] flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">
                      {t.subject}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {t.category} · {t.ticket_id}
                    </p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-600">
                    {t.status}
                  </span>
                </div>
              ))}
            </SubSection>
          )}
        </>
      )}
    </aside>
  )
}

function ContextCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="w-7 h-7 rounded-full bg-white text-[#7B2D8E] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p className="text-[12px] font-semibold text-gray-900 truncate">
          {value}
        </p>
      </div>
    </div>
  )
}

function SubSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-gray-400 mb-1">
        {title}
      </p>
      <div>{children}</div>
    </div>
  )
}

function SubSectionEmpty({ label }: { label: string }) {
  return <p className="text-[11px] text-gray-400 py-2">{label}</p>
}

// ---------------------------------------------------------------------------
// ProfileSheet — staff member edits her display name and avatar slug.
// ---------------------------------------------------------------------------

const AVATAR_SLUGS = [
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
] as const

function ProfileSheet({
  profile,
  onClose,
  onSaved,
}: {
  profile: StaffProfile | null
  onClose: () => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState<string>(profile?.avatarSlug || 'f1')
  const [displayName, setDisplayName] = useState<string>(profile?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSlug(profile?.avatarSlug || 'f1')
    setDisplayName(profile?.displayName || '')
  }, [profile])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/staff/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          avatarSlug: slug,
          displayName: displayName.trim() || undefined,
        }),
      })
      if (!res.ok) {
        setError('Could not save your profile.')
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }, [slug, displayName, onSaved, onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden pointer-events-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
              Your front-desk identity
            </p>
            <p className="text-[16px] font-semibold text-gray-900 mt-1">
              How customers see you
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-5">
          <div>
            <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Sarah O."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]/40"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Shown in the chat header and the &quot;Sarah joined the chat&quot; system message.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
              Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_SLUGS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlug(s)}
                  className={cn(
                    'relative aspect-square rounded-2xl overflow-hidden ring-2 transition-all',
                    slug === s
                      ? 'ring-[#7B2D8E] scale-95'
                      : 'ring-transparent hover:ring-[#7B2D8E]/20',
                  )}
                >
                  <Image
                    src={`/avatars/${s}.jpg`}
                    alt=""
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                  {slug === s && (
                    <span className="absolute inset-0 bg-[#7B2D8E]/15 flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              All front-desk avatars are pre-approved. Pick whichever feels closest to you.
            </p>
          </div>

          {error && <p className="text-[11px] text-rose-600">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full text-[13px] font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#7B2D8E] hover:bg-[#6B2278] disabled:opacity-60"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save profile
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <PreviewCard label="Preview" url={`/avatars/${slug}.jpg`} name={displayName || 'Customer Care'} />
          <CalendarPlaceholder count={0} />
        </div>
      </div>
    </div>
  )
}

function PreviewCard({
  label,
  url,
  name,
}: {
  label: string
  url: string
  name: string
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <Image
          src={url}
          alt=""
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
        />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-gray-900 truncate">
            {name}
          </p>
          <p className="text-[10px] text-emerald-600">Online</p>
        </div>
      </div>
    </div>
  )
}

function CalendarPlaceholder({ count }: { count: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
        Today
      </p>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-white text-[#7B2D8E] flex items-center justify-center">
          <CalendarDays className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-gray-900">
            {count} chats handled
          </p>
          <p className="text-[10px] text-gray-400">Updates as you take chats.</p>
        </div>
      </div>
    </div>
  )
}
