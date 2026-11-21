'use client'

/**
 * Admin live-chat oversight.
 *
 * Single page split into three tabs:
 *   1. Live        — waiting + active sessions in real time
 *   2. History     — closed sessions (7 / 30 / 90 days) with search & rating
 *   3. Performance — per-staff response, resolution, and rating scoreboard
 *
 * Strictly adheres to Dermaspace's flat design system (#7B2D8E, #5A1D6A,
 * #FAF6FB, crisp white cards, neutral borders, #C63D3D destructive confirm)
 * with flat <Dialog> confirmations for ending or deleting chat sessions.
 */

import { useEffect, useRef, useState } from 'react'
import useSWR, { mutate as swrMutate } from 'swr'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Headphones,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Search,
  Send,
  Star,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { markSurfaceSeen } from '@/components/admin/sidebar'
import { useNotify } from '@/components/shared/notify'
import {
  formatWaitSeconds,
  getLiveChatStatusMeta,
  resolveSupportId,
} from '@/lib/support-and-chat'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

type Tab = 'live' | 'history' | 'performance'

interface SessionRow {
  id: string
  support_code?: string | null
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  user_id: string | null
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
  is_guest?: boolean
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  visitor_location?: string | null
  visitor_browser?: string | null
  visitor_os?: string | null
  visitor_device?: string | null
  visitor_timezone?: string | null
  visitor_page_url?: string | null
  visitor_ip?: string | null
  staff_id: string | null
  staff_first_name: string | null
  staff_last_name: string | null
  staff_display_name?: string | null
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

function formatClockTime(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatDuration(seconds: number | null): string {
  return formatWaitSeconds(seconds)
}

function fullName(
  first: string | null,
  last: string | null,
  fallback: string,
): string {
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || fallback
}

function getSessionCustomerLabel(session: SessionRow): string {
  const isGuest = session.is_guest || !session.user_id
  return isGuest
    ? session.guest_name || 'Guest visitor'
    : fullName(
        session.user_first_name,
        session.user_last_name,
        session.user_email || 'Customer',
      )
}

function StatusBadge({ status }: { status: SessionRow['status'] }) {
  const meta = getLiveChatStatusMeta(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
        meta.badgeClass,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          meta.pulse ? 'bg-white' : meta.dotClass,
        )}
      />
      {meta.label}
    </span>
  )
}

const ADMIN_DISPLAY_PRESETS = ['Admin', 'Franca', 'Itunu', 'Juwon'] as const

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

  const [pending, setPending] = useState<DrawerMessage[]>([])
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
        if (serverBodies.has(key)) return false
        const age = Date.now() - new Date(p.created_at).getTime()
        return age < 60_000
      }),
    )
  }, [data, pending.length])

  // Display-name alias stored in PostgreSQL via /api/staff/profile
  const [displayName, setDisplayName] = useState<string>('')
  const [editingDisplay, setEditingDisplay] = useState<boolean>(false)
  const [customDisplay, setCustomDisplay] = useState<string>('')
  useEffect(() => {
    let activeMount = true
    ;(async () => {
      try {
        const res = await fetch('/api/staff/profile', { credentials: 'include' })
        if (!activeMount) return
        if (res.ok) {
          const json = (await res.json().catch(() => null)) as {
            profile?: { displayName?: string | null }
          } | null
          const stored = json?.profile?.displayName?.trim()
          if (stored) {
            setDisplayName(stored)
            return
          }
        }
        setEditingDisplay(true)
      } catch {
        if (activeMount) setEditingDisplay(true)
      }
    })()
    return () => {
      activeMount = false
    }
  }, [])

  const notify = useNotify()
  const [savingAlias, setSavingAlias] = useState(false)

  const persistDisplayName = async (value: string) => {
    const cleaned = value.trim()
    if (!cleaned || savingAlias) return
    setSavingAlias(true)
    try {
      const res = await fetch('/api/staff/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: cleaned }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not save alias.')
      }
      setDisplayName(cleaned)
      setEditingDisplay(false)
      await swrMutate(sessionUrl)
      notify.success('Alias updated', `Replies will appear as ${cleaned}.`)
    } catch (err) {
      notify.error(
        'Could not update alias',
        err instanceof Error ? err.message : 'Please try again.',
      )
    } finally {
      setSavingAlias(false)
    }
  }

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const status = data?.session?.status
  const liveStatus = status === 'waiting' || status === 'active'
  const supportCode = data?.session
    ? resolveSupportId(data.session.support_code, data.session.id)
    : ''
  const customerLabel = data?.session
    ? getSessionCustomerLabel(data.session)
    : 'Customer'

  const endSession = async () => {
    if (closing) return
    setClosing(true)
    setSendError(null)
    try {
      const res = await fetch(sessionUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not close session.')
      }
      await Promise.all([
        swrMutate(sessionUrl),
        swrMutate('/api/admin/live-chat/sessions?status=open'),
        swrMutate(
          (key) =>
            typeof key === 'string' && key.startsWith('/api/admin/live-chat/'),
        ),
      ])
      setEndDialogOpen(false)
      notify.info(
        'Live chat ended',
        `${supportCode} was closed and moved to history.`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to end session.'
      setSendError(msg)
      notify.error('Could not end chat', msg)
    } finally {
      setClosing(false)
    }
  }

  const deleteSession = async () => {
    if (deleting) return
    setDeleting(true)
    setSendError(null)
    try {
      const res = await fetch(sessionUrl, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not delete session.')
      }
      await swrMutate(
        (key) =>
          typeof key === 'string' && key.startsWith('/api/admin/live-chat/'),
      )
      setDeleteDialogOpen(false)
      notify.success(
        'Live chat deleted',
        `${customerLabel} (${supportCode}) was permanently removed.`,
      )
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete session.'
      setSendError(msg)
      notify.error('Could not delete chat', msg)
    } finally {
      setDeleting(false)
    }
  }

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!displayName) {
      setEditingDisplay(true)
      setSendError('Select or enter a front desk display name before replying.')
      return
    }
    setSending(true)
    setSendError(null)

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
      await swrMutate(sessionUrl)
    } catch (err) {
      setPending((prev) => prev.filter((p) => p.id !== optimistic.id))
      setDraft(text)
      setSendError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSending(false)
      requestAnimationFrame(() => composerRef.current?.focus())
    }
  }

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [data?.messages?.length, pending.length])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close transcript drawer"
        className="absolute inset-0 bg-gray-900/40"
        onClick={onClose}
      />
      <aside className="relative z-10 w-full sm:max-w-lg h-[100dvh] bg-white sm:border-l border-gray-200 flex flex-col">
        {/* Drawer Header */}
        <header className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-[max(0.875rem,env(safe-area-inset-top))] sm:pt-4 pb-3.5 border-b border-gray-200 bg-white">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
                {liveStatus ? 'Live session' : 'Closed transcript'}
              </span>
              {supportCode && (
                <span className="font-mono text-[10px] font-semibold text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-full px-2 py-0.5">
                  {supportCode}
                </span>
              )}
            </div>
            {data?.session ? (
              <p className="text-[15px] font-semibold text-gray-900 truncate mt-1">
                {customerLabel}
              </p>
            ) : (
              <div className="h-4 w-32 bg-gray-100 rounded mt-1" />
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {liveStatus && (
              <button
                type="button"
                onClick={() => setEndDialogOpen(true)}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#7B2D8E]/30 bg-[#FAF6FB] text-[#5A1D6A] hover:border-[#7B2D8E] transition-colors cursor-pointer"
              >
                End chat
              </button>
            )}
            {data?.session && (
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#C63D3D] hover:border-[#C63D3D]/35 hover:bg-[#C63D3D]/5 transition-colors cursor-pointer"
                aria-label="Delete chat session"
                title="Delete chat session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Session metadata grid */}
        {data?.session ? (
          <div className="px-4 sm:px-5 py-3 border-b border-gray-200 bg-[#FAF6FB] text-[12px] text-gray-600 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Status
              </p>
              <div className="mt-0.5">
                <StatusBadge status={data.session.status} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Representative
              </p>
              <p className="font-medium text-gray-900 truncate mt-0.5">
                {data.session.staff_id
                  ? data.session.staff_display_name ||
                    fullName(
                      data.session.staff_first_name,
                      data.session.staff_last_name,
                      'Assigned',
                    )
                  : 'Waiting in queue'}
              </p>
            </div>
            {(data.session.visitor_location ||
              data.session.visitor_browser ||
              data.session.visitor_os ||
              data.session.visitor_device) && (
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Visitor environment
                </p>
                <p className="text-gray-700 truncate mt-0.5">
                  {[
                    data.session.visitor_location,
                    data.session.visitor_browser,
                    data.session.visitor_os,
                    data.session.visitor_device,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Topic
              </p>
              <p className="text-gray-800 truncate mt-0.5">
                {data.session.initial_topic || 'Customer inquiry'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                First reply
              </p>
              <p className="text-gray-800 tabular-nums mt-0.5">
                {formatDuration(data.session.staff_response_seconds)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {data.session.rating != null ? 'Customer rating' : 'Resolution'}
              </p>
              {data.session.rating != null ? (
                <p className="text-[#7B2D8E] font-semibold inline-flex items-center gap-1 tabular-nums mt-0.5">
                  <Star className="h-3.5 w-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                  {data.session.rating}/5
                </p>
              ) : (
                <p className="text-gray-800 tabular-nums mt-0.5">
                  {formatDuration(data.session.resolution_seconds)}
                </p>
              )}
            </div>
            {data.session.rating_comment && (
              <div className="col-span-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-[11.5px] text-gray-700">
                &ldquo;{data.session.rating_comment}&rdquo;
              </div>
            )}
          </div>
        ) : null}

        {/* Transcript scroll region */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-gray-50/70"
        >
          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : null}

          {[...(data?.messages ?? []), ...pending]
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )
            .map((m) => {
              if (m.sender_role === 'system') {
                const t = formatClockTime(m.created_at)
                return (
                  <div key={m.id} className="py-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex-1 h-px bg-[#7B2D8E]/15" />
                      <span className="text-[11px] font-medium text-[#5A1D6A] text-center px-2">
                        {m.body}
                      </span>
                      <span className="flex-1 h-px bg-[#7B2D8E]/15" />
                    </div>
                    {t && (
                      <p className="text-center text-[10px] text-gray-400 mt-0.5 tabular-nums">
                        {t}
                      </p>
                    )}
                  </div>
                )
              }
              const isCustomer = m.sender_role === 'user'
              const senderLabel = isCustomer
                ? fullName(
                    m.sender_first_name,
                    m.sender_last_name,
                    customerLabel,
                  )
                : fullName(
                    m.sender_first_name,
                    m.sender_last_name,
                    m.sender_role === 'admin' ? 'Admin' : 'Rep',
                  )
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col',
                    isCustomer ? 'items-start' : 'items-end',
                  )}
                >
                  <span className="text-[10.5px] text-gray-500 px-1 mb-1">
                    <span className="font-medium text-gray-700">
                      {senderLabel}
                    </span>{' '}
                    · {formatClockTime(m.created_at) || formatRelative(m.created_at)}
                    {m._pending ? (
                      <span className="ml-1.5 text-[#7B2D8E]">Sending…</span>
                    ) : null}
                  </span>
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                      isCustomer
                        ? 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                        : 'bg-[#7B2D8E] text-white rounded-br-sm',
                      m._pending && 'opacity-70',
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              )
            })}

          {!isLoading && (data?.messages?.length ?? 0) + pending.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-10">
              No messages in this session yet.
            </div>
          ) : null}
        </div>

        {/* Sleek Composer + Alias Bar */}
        {liveStatus ? (
          <footer className="border-t border-gray-200 bg-white px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {editingDisplay ? (
              <div className="mb-3 rounded-2xl bg-[#FAF6FB] border border-[#7B2D8E]/25 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B2D8E]">
                      Front desk display name
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Customers see this name in the live chat and email transcript.
                    </p>
                  </div>
                  {displayName && (
                    <button
                      type="button"
                      onClick={() => setEditingDisplay(false)}
                      aria-label="Close alias editor"
                      className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_DISPLAY_PRESETS.map((preset) => {
                    const active = preset === displayName
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => persistDisplayName(preset)}
                        className={cn(
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-medium border transition-colors cursor-pointer',
                          active
                            ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/50 hover:text-[#7B2D8E]',
                        )}
                      >
                        {active && <Check className="w-3 h-3" />}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customDisplay.trim()) {
                        e.preventDefault()
                        persistDisplayName(customDisplay)
                      }
                    }}
                    placeholder="Or enter a custom alias (e.g. Adaeze)"
                    maxLength={30}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-full text-base sm:text-[12px] bg-white border border-gray-200 focus:border-[#7B2D8E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void persistDisplayName(customDisplay)}
                    disabled={!customDisplay.trim() || savingAlias}
                    className="px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {savingAlias ? 'Saving…' : 'Save alias'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/20 px-3 py-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {displayName.charAt(0).toUpperCase() || 'A'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 leading-none">
                      Replying as
                    </p>
                    <p className="text-[12.5px] font-semibold text-[#5A1D6A] truncate mt-0.5">
                      {displayName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const isPreset = ADMIN_DISPLAY_PRESETS.includes(
                      displayName as (typeof ADMIN_DISPLAY_PRESETS)[number],
                    )
                    setCustomDisplay(isPreset ? '' : displayName)
                    setEditingDisplay(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-[#7B2D8E]/25 hover:border-[#7B2D8E]/50 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  Switch alias
                </button>
              </div>
            )}

            {data?.session ? (
              data.session.staff_id == null ? (
                <p className="text-[11px] text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-xl px-3 py-1.5 mb-2">
                  Waiting in queue — sending your reply accepts this chat and notifies the customer.
                </p>
              ) : fullName(
                  data.session.staff_first_name,
                  data.session.staff_last_name,
                  '',
                ) ? (
                <p className="text-[11px] text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-xl px-3 py-1.5 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#7B2D8E]" />
                  <span>
                    Currently assigned to{' '}
                    <strong>
                      {fullName(
                        data.session.staff_first_name,
                        data.session.staff_last_name,
                        'a rep',
                      )}
                    </strong>
                    . Replying takes over smoothly.
                  </span>
                </p>
              ) : null
            ) : null}

            {sendError ? (
              <p className="text-[11.5px] text-[#C63D3D] bg-[#C63D3D]/10 border border-[#C63D3D]/25 rounded-xl px-3 py-2 mb-2">
                {sendError}
              </p>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder="Write a reply to the customer… Enter to send"
                rows={2}
                maxLength={2000}
                className="flex-1 min-w-0 resize-none rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#7B2D8E] focus:outline-none px-3.5 py-2.5 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!draft.trim() || sending}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-full bg-[#7B2D8E] text-white disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[#5A1D6A] transition-colors cursor-pointer"
                aria-label="Send reply"
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

      {/* Flat End Chat Confirmation Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={(o) => !closing && setEndDialogOpen(o)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white shadow-none p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              End live chat with {customerLabel}?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Session <span className="font-mono font-semibold text-[#5A1D6A]">{supportCode}</span> will
              be marked closed, the transcript will be emailed if an address is on file, and the
              customer can rate or continue with Derma AI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              disabled={closing}
              onClick={() => setEndDialogOpen(false)}
              className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={closing}
              onClick={() => void endSession()}
              className="h-9 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {closing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {closing ? 'Ending…' : 'End chat'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flat Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => !deleting && setDeleteDialogOpen(o)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white shadow-none p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Delete chat session permanently?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              This will permanently remove <span className="font-semibold text-gray-900">{customerLabel}</span>{' '}
              (<span className="font-mono font-semibold text-[#5A1D6A]">{supportCode}</span>) and all
              messages in this conversation. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteDialogOpen(false)}
              className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void deleteSession()}
              className="h-9 px-4 rounded-lg bg-[#C63D3D] hover:bg-[#A83232] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LiveTab({ onPeek }: { onPeek: (id: string) => void }) {
  const { data } = useSWR<ListResponse>(
    '/api/admin/live-chat/sessions?status=open',
    fetcher,
    { refreshInterval: 4000 },
  )
  const sessions = data?.sessions ?? []
  const waiting = sessions.filter((s) => s.status === 'waiting')
  const active = sessions.filter((s) => s.status === 'active')

  useEffect(() => {
    markSurfaceSeen('live-chat', waiting.length)
  }, [waiting.length])

  const avgWait =
    waiting.length === 0
      ? '—'
      : formatDuration(
          waiting.reduce(
            (acc, s) =>
              acc + (Date.now() - new Date(s.created_at).getTime()) / 1000,
            0,
          ) / waiting.length,
        )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <SummaryCard
          icon={Clock}
          label="Waiting"
          value={waiting.length}
          tone="deep"
        />
        <SummaryCard
          icon={MessageSquare}
          label="Active"
          value={active.length}
          tone="primary"
        />
        <SummaryCard
          icon={Activity}
          label="Avg wait"
          value={avgWait}
          tone="muted"
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
        const code = resolveSupportId(s.support_code, s.id).toLowerCase()
        return (
          code.includes(q) ||
          (s.user_first_name || '').toLowerCase().includes(q) ||
          (s.user_last_name || '').toLowerCase().includes(q) ||
          (s.user_email || '').toLowerCase().includes(q) ||
          (s.guest_name || '').toLowerCase().includes(q) ||
          (s.guest_email || '').toLowerCase().includes(q) ||
          (s.initial_topic || '').toLowerCase().includes(q) ||
          (s.staff_first_name || '').toLowerCase().includes(q)
        )
      })
    : sessions

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
                days === d
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Last {d}d
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Support ID, customer, rep, or topic"
            className="w-full pl-9 pr-3 py-2 text-base sm:text-sm bg-white rounded-full border border-gray-200 focus:border-[#7B2D8E] focus:outline-none"
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
      <div className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              'flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
              days === d
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400 py-10">
          No staff activity in this window yet.
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-2.5">
            {rows.map((r) => {
              const name = fullName(r.first_name, r.last_name, 'Rep')
              return (
                <div
                  key={r.staff_id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StaffAvatar
                        url={r.avatar_url}
                        firstName={r.first_name}
                        lastName={r.last_name}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {r.ratings_count} rating{r.ratings_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.active_now > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          {r.active_now} live
                        </span>
                      ) : null}
                      {r.avg_rating != null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-full px-2 py-0.5 tabular-nums">
                          <Star className="h-3 w-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                          {r.avg_rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <div className="rounded-xl bg-[#FAF6FB] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Handled
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {r.handled}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF6FB] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        First reply
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatDuration(r.avg_response_seconds)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF6FB] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Resolution
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatDuration(r.avg_resolution_seconds)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAF6FB] text-[10.5px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
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
                  {rows.map((r) => {
                    const name = fullName(r.first_name, r.last_name, 'Rep')
                    return (
                      <tr key={r.staff_id} className="hover:bg-[#FAF6FB]/50">
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
        className="h-9 w-9 rounded-full object-cover border border-gray-200 shrink-0"
      />
    )
  }
  return (
    <div className="h-9 w-9 rounded-full bg-[#FAF6FB] text-[#7B2D8E] text-xs font-semibold flex items-center justify-center border border-[#7B2D8E]/20 shrink-0">
      {initials}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock
  label: string
  value: number | string
  tone: 'primary' | 'deep' | 'muted'
}) {
  const valueColor =
    tone === 'primary'
      ? 'text-[#7B2D8E]'
      : tone === 'deep'
        ? 'text-[#5A1D6A]'
        : 'text-gray-900'
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-3.5 py-3 sm:px-5 sm:py-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 truncate">
          {label}
        </p>
        <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <p
        className={cn(
          'text-xl sm:text-2xl font-semibold mt-1.5 tabular-nums truncate',
          valueColor,
        )}
      >
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
  const notify = useNotify()
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const confirmDeleteSession = async () => {
    if (!deleteTarget || deletingId) return
    const target = deleteTarget
    const customerLabel = getSessionCustomerLabel(target)
    const supportCode = resolveSupportId(target.support_code, target.id)
    setDeletingId(target.id)
    try {
      const res = await fetch(`/api/admin/live-chat/sessions/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not delete live chat session.')
      }
      await swrMutate(
        (key) =>
          typeof key === 'string' && key.startsWith('/api/admin/live-chat/'),
      )
      setDeleteTarget(null)
      notify.success(
        'Live chat deleted',
        `${customerLabel} (${supportCode}) was permanently removed.`,
      )
    } catch (err) {
      notify.error(
        'Could not delete chat',
        err instanceof Error ? err.message : 'Please try again.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400 py-12">
        {emptyHint}
      </div>
    )
  }

  return (
    <>
      {/* Mobile & tablet cards (< lg) */}
      <div className="lg:hidden space-y-2.5">
        {rows.map((s) => {
          const isGuest = s.is_guest || !s.user_id
          const customer = getSessionCustomerLabel(s)
          const customerEmail = isGuest ? s.guest_email : s.user_email
          const customerPhone = isGuest ? s.guest_phone : null
          const rep = s.staff_id
            ? s.staff_display_name ||
              fullName(s.staff_first_name, s.staff_last_name, 'Assigned')
            : null
          const isDeleting = deletingId === s.id

          return (
            <div
              key={s.id}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-[#7B2D8E]/35 transition-colors p-4"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onPeek(s.id)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                  aria-label={`Open chat with ${customer}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate text-[14px]">
                      {customer}
                    </p>
                    <span className="font-mono text-[10px] font-semibold text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-full px-2 py-0.5">
                      {resolveSupportId(s.support_code, s.id)}
                    </span>
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
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    disabled={isDeleting}
                    className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-[#C63D3D] hover:border-[#C63D3D]/35 hover:bg-[#C63D3D]/5 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={`Delete chat with ${customer}`}
                    title="Delete chat session"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPeek(s.id)}
                    aria-label={`Open chat with ${customer}`}
                    className="w-8 h-8 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center hover:bg-[#7B2D8E]/15 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
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
            </div>
          )
        })}
      </div>

      {/* Desktop layout (lg+) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF6FB] text-[10.5px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
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
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((s) => {
                const isGuest = s.is_guest || !s.user_id
                const customer = getSessionCustomerLabel(s)
                const customerEmail = isGuest ? s.guest_email : s.user_email
                const customerPhone = isGuest ? s.guest_phone : null
                const rep = s.staff_id
                  ? s.staff_display_name ||
                    fullName(s.staff_first_name, s.staff_last_name, 'Assigned')
                  : null
                const isDeleting = deletingId === s.id

                return (
                  <tr key={s.id} className="hover:bg-[#FAF6FB]/50">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 truncate">
                            {customer}
                          </p>
                          <span className="font-mono text-[10px] font-semibold text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-full px-2 py-0.5 shrink-0">
                            {resolveSupportId(s.support_code, s.id)}
                          </span>
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
                          <span className="truncate max-w-[120px]">
                            {s.visitor_location}
                          </span>
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
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-[#C63D3D] hover:border-[#C63D3D]/35 hover:bg-[#C63D3D]/5 transition-colors cursor-pointer"
                          aria-label={`Delete chat with ${customer}`}
                          title="Delete chat session"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPeek(s.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/10 transition-colors cursor-pointer"
                        >
                          Open
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flat Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white shadow-none p-6">
          {deleteTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Delete chat session permanently?
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  This will permanently remove{' '}
                  <span className="font-semibold text-gray-900">
                    {getSessionCustomerLabel(deleteTarget)}
                  </span>{' '}
                  (
                  <span className="font-mono font-semibold text-[#5A1D6A]">
                    {resolveSupportId(deleteTarget.support_code, deleteTarget.id)}
                  </span>
                  ) and its full message history. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  disabled={!!deletingId}
                  onClick={() => setDeleteTarget(null)}
                  className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!deletingId}
                  onClick={() => void confirmDeleteSession()}
                  className="h-9 px-4 rounded-lg bg-[#C63D3D] hover:bg-[#A83232] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {deletingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {deletingId ? 'Deleting…' : 'Delete permanently'}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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
            real time, audit closed transcripts, and monitor representative response quality.
          </p>
        </div>
      </header>

      <nav className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
                active
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
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
