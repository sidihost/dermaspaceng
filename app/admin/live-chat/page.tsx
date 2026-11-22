'use client'

/**
 * Admin Live Chat Command Center
 *
 * Responsive 3-pane full-screen workspace adhering strictly to Dermaspace's flat design
 * system (#7B2D8E, #FAF6FB, #FFFFFF, border-gray-200;
 * zero shadows, zero gradients, zero red buttons).
 *
 * Tabs:
 *   1. Live Desk   — 3-pane real-time inbox (Queue | Conversation | Profile Details)
 *   2. History     — Closed sessions (7 / 30 / 90 days) with full transcript + profile details
 *   3. Performance — Per-staff response, resolution, and rating scoreboard
 */

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { mutate as swrMutate } from 'swr'
import {
  Activity,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  History,
  Inbox,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  PanelRight,
  Pencil,
  Phone,
  PhoneOff,
  Receipt,
  Search,
  Send,
  Shield,
  Smartphone,
  Star,
  Tablet,
  Ticket,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { markSurfaceSeen } from '@/components/admin/sidebar'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { RepAvatar } from '@/components/shared/derma-inline-live-chat'
import { useNotify } from '@/components/shared/notify'
import { type InspectorContextData } from '@/components/staff/live-chat-inspector'
import { getReceiptHref } from '@/lib/receipt-access'
import { playLiveChatChime } from '@/lib/live-chat-sound'
import {
  filterAgentTimelineMessages,
  formatWaitSeconds,
  getLiveChatStatusMeta,
  getPresenceStatusMeta,
  getTicketStatusMeta,
  mergeIncrementalMessages,
  resolveSupportId,
  sanitizeNetworkErrorMessage,
} from '@/lib/support-and-chat'
import {
  formatChatTimestamp,
  formatLiveChatTranscriptText,
  getVisitorPresence,
  type VisitorMetadata,
  type VisitorPresenceInfo,
} from '@/lib/visitor-telemetry'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (err) {
    if (err instanceof TypeError) {
      await new Promise((r) => window.setTimeout(r, 350))
      return fetch(url, init)
    }
    throw err
  }
}

type Tab = 'live' | 'history' | 'performance'
type QueueFilter = 'all' | 'waiting' | 'active'

interface SessionRow {
  id: string
  support_code?: string | null
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  user_id: string | null
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
  user_phone?: string | null
  user_avatar_url?: string | null
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
  visitor_referrer?: string | null
  visitor_language?: string | null
  visitor_screen?: string | null
  visitor_ip?: string | null
  customer_last_seen_at?: string | null
  customer_typing_at?: string | null
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
  escalated_at?: string
  accepted_at: string | null
  closed_at: string | null
  closed_by?: string | null
  last_message_at: string | null
  last_activity_at?: string | null
  staff_response_seconds: number | null
  resolution_seconds: number | null
  message_count?: number
}

interface SessionMessage {
  id: string
  sender_role: 'user' | 'staff' | 'admin' | 'system'
  sender_id?: string | null
  sender_first_name: string | null
  sender_last_name: string | null
  sender_name?: string | null
  sender_avatar_url?: string | null
  body: string
  created_at: string
  _pending?: boolean
}

interface SessionDetailResponse {
  session: SessionRow
  messages: SessionMessage[]
  currentUserId?: string | null
  customerTyping?: boolean
  customerLastSeenAt?: string | null
  presence?: VisitorPresenceInfo
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

const ADMIN_DISPLAY_PRESETS = ['Admin', 'Franca', 'Itunu', 'Juwon'] as const

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  if (sec < 60) return 'now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

function formatDuration(seconds: number | null | undefined): string {
  return formatWaitSeconds(seconds ?? null)
}

function formatVisitorLocalTime(timezone: string | null | undefined): string | null {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return null
  }
}

function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
  fallback: string,
): string {
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || fallback
}

function getSessionCustomerLabel(session: SessionRow): string {
  const isGuest = Boolean(session.is_guest || !session.user_id)
  return isGuest
    ? session.guest_name?.trim() || 'Anonymous Visitor'
    : fullName(
        session.user_first_name,
        session.user_last_name,
        session.user_email || 'Customer',
      )
}

function getSessionCustomerInitials(session: SessionRow): string {
  const label = getSessionCustomerLabel(session)
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || '?'
  )
}

function isJoinMilestone(body: string): boolean {
  return /\b(joined the chat|took over the chat)\b/i.test(body)
}

function extractVisitorMetadata(session: SessionRow): Partial<VisitorMetadata> {
  return {
    location: session.visitor_location ?? null,
    ip: session.visitor_ip ?? null,
    browser: session.visitor_browser ?? null,
    os: session.visitor_os ?? null,
    device: session.visitor_device ?? null,
    timezone: session.visitor_timezone ?? null,
    pageUrl: session.visitor_page_url ?? null,
    referrer: session.visitor_referrer ?? null,
    language: session.visitor_language ?? null,
    screen: session.visitor_screen ?? null,
  }
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdminLiveChatPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null)
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null)

  const openQuery = useSWR<ListResponse>(
    '/api/admin/live-chat/sessions?status=open',
    fetcher,
    { refreshInterval: 2000, revalidateOnFocus: true },
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const targetSession = params.get('session')?.trim()
    if (targetSession) {
      setTab('live')
      setSelectedLiveId(targetSession)
    }
  }, [])

  useEffect(() => {
    const refreshOpen = () => {
      void openQuery.mutate()
    }
    window.addEventListener('live-chat:waiting-changed', refreshOpen)
    return () => {
      window.removeEventListener('live-chat:waiting-changed', refreshOpen)
    }
  }, [openQuery])

  const openSessions = useMemo(() => openQuery.data?.sessions ?? [], [openQuery.data?.sessions])
  const waitingSessions = useMemo(
    () => openSessions.filter((s) => s.status === 'waiting'),
    [openSessions],
  )
  const activeSessions = useMemo(
    () => openSessions.filter((s) => s.status === 'active'),
    [openSessions],
  )

  useEffect(() => {
    markSurfaceSeen('live-chat', waitingSessions.length)
  }, [waitingSessions.length])

  // Auto-select first open session on desktop when entering Live Desk with nothing selected.
  // Never clear an already-selected session if the customer just ended it so admin clearly sees
  // the "Ended by customer" status instead of the conversation vanishing.
  useEffect(() => {
    if (tab !== 'live') return
    if (selectedLiveId) return
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return
    const first = waitingSessions[0] || activeSessions[0] || openSessions[0]
    if (first) setSelectedLiveId(first.id)
  }, [tab, openSessions, waitingSessions, activeSessions, selectedLiveId])

  const avgWait = useMemo(() => {
    if (waitingSessions.length === 0) return '—'
    const avgSec =
      waitingSessions.reduce(
        (acc, s) => acc + Math.max(0, (Date.now() - new Date(s.created_at).getTime()) / 1000),
        0,
      ) / waitingSessions.length
    return formatDuration(avgSec)
  }, [waitingSessions])

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-white min-w-0">
      {/* Full-Screen Top Command Bar (collapses on mobile when viewing an active conversation for full-viewport clarity) */}
      <header
        className={cn(
          'shrink-0 bg-white border-b border-gray-200 px-3 sm:px-5 py-2.5 flex-wrap items-center justify-between gap-2.5',
          tab === 'live' && selectedLiveId ? 'hidden lg:flex' : 'flex',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <Link
            href="/admin"
            aria-label="Back to admin dashboard"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-gray-200 bg-white text-[12px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="h-4 w-px bg-gray-200 hidden sm:inline-block" aria-hidden="true" />
          <h1 className="text-[15.5px] sm:text-[17px] font-bold text-gray-900 tracking-tight">
            Live Chat
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/20 bg-[#FAF6FB] px-2.5 py-0.5 text-[11px] font-semibold text-[#7B2D8E] tabular-nums">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                openSessions.length > 0 ? 'bg-[#7B2D8E]' : 'bg-gray-300',
              )}
            />
            {openSessions.length} open
          </span>
          {waitingSessions.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] px-2.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {waitingSessions.length} waiting
            </span>
          )}
          <span className="hidden xl:inline-flex items-center gap-1 text-[11.5px] text-gray-500 tabular-nums ml-1">
            <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
            Avg wait {avgWait}
          </span>
        </div>

        {/* Segmented Navigation */}
        <nav
          aria-label="Live chat views"
          className="flex w-full sm:w-auto sm:inline-flex bg-[#FAF6FB] rounded-full p-1 border border-gray-200 shrink-0"
        >
          {(
            [
              { id: 'live', label: 'Live Desk', icon: Inbox, count: openSessions.length },
              { id: 'history', label: 'History', icon: History, count: null },
              { id: 'performance', label: 'Performance', icon: BarChart3, count: null },
            ] as const
          ).map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                  active
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-600 hover:text-[#7B2D8E]',
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.count !== null && item.count > 0 && (
                  <span
                    className={cn(
                      'text-[10.5px] tabular-nums',
                      active ? 'text-white/85' : 'text-[#7B2D8E]',
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* TAB 1: FULL-SCREEN LIVE DESK (3-PANE RESPONSIVE WORKSPACE) */}
      {tab === 'live' && (
        <LiveDeskWorkspace
          sessions={openSessions}
          isLoading={openQuery.isLoading}
          selectedId={selectedLiveId}
          onSelect={setSelectedLiveId}
          onSessionRemoved={(removedId) => {
            if (selectedLiveId === removedId) {
              const next = openSessions.find((s) => s.id !== removedId)
              setSelectedLiveId(next ? next.id : null)
            }
          }}
        />
      )}

      {/* TAB 2: HISTORY */}
      {tab === 'history' && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#FBF9FC] p-4 sm:p-6">
          <div className="max-w-[1400px] mx-auto">
            <HistoryTab onOpenSession={(id) => setHistoryDetailId(id)} />
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE */}
      {tab === 'performance' && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#FBF9FC] p-4 sm:p-6">
          <div className="max-w-[1400px] mx-auto">
            <PerformanceTab />
          </div>
        </div>
      )}

      {/* History Full Session Viewer Modal / Drawer */}
      {historyDetailId && (
        <HistorySessionOverlay
          sessionId={historyDetailId}
          onClose={() => setHistoryDetailId(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricTile
// ---------------------------------------------------------------------------

function MetricTile({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Clock
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3.5 py-3 flex items-center gap-3 min-w-0',
        highlight
          ? 'bg-[#FAF6FB] border-[#7B2D8E]/30'
          : 'bg-white border-gray-200',
      )}
    >
      <span
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
          highlight
            ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
            : 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/15',
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500 truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LiveDeskWorkspace — 3-Pane Responsive Command Center
// ---------------------------------------------------------------------------

function LiveDeskWorkspace({
  sessions,
  isLoading,
  selectedId,
  onSelect,
  onSessionRemoved,
}: {
  sessions: SessionRow[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSessionRemoved: (id: string) => void
}) {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(true)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)

  const waitingCount = useMemo(
    () => sessions.filter((s) => s.status === 'waiting').length,
    [sessions],
  )
  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === 'active').length,
    [sessions],
  )

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sessions.filter((s) => {
      if (queueFilter === 'waiting' && s.status !== 'waiting') return false
      if (queueFilter === 'active' && s.status !== 'active') return false
      if (!q) return true
      const code = resolveSupportId(s.support_code, s.id).toLowerCase()
      return (
        code.includes(q) ||
        getSessionCustomerLabel(s).toLowerCase().includes(q) ||
        (s.user_email || '').toLowerCase().includes(q) ||
        (s.guest_email || '').toLowerCase().includes(q) ||
        (s.visitor_location || '').toLowerCase().includes(q) ||
        (s.initial_topic || '').toLowerCase().includes(q) ||
        (s.staff_display_name || '').toLowerCase().includes(q)
      )
    })
  }, [sessions, queueFilter, search])

  return (
    <div className="flex-1 min-h-0 w-full bg-white overflow-hidden flex">
      {/* PANE 1: LEFT QUEUE RAIL */}
      <aside
        className={cn(
          'w-full lg:w-[290px] xl:w-[310px] shrink-0 flex flex-col border-r border-gray-200 bg-white min-h-0',
          selectedId ? 'hidden lg:flex' : 'flex',
        )}
      >
        <div className="p-3 border-b border-gray-200 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, visitor, location…"
              className="w-full rounded-xl border border-gray-200 bg-[#FBF9FC] pl-8 pr-8 py-2 text-base sm:text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear queue search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter open live chats"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#FAF6FB] border border-gray-200/80"
          >
            {(
              [
                { id: 'all', label: 'All', count: sessions.length },
                { id: 'waiting', label: 'Waiting', count: waitingCount },
                { id: 'active', label: 'Active', count: activeCount },
              ] as const
            ).map((f) => {
              const active = queueFilter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setQueueFilter(f.id)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer',
                    active
                      ? 'bg-[#7B2D8E] text-white'
                      : 'text-gray-600 hover:text-[#7B2D8E]',
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      active ? 'text-white/85' : 'text-gray-400',
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Queue Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isLoading && sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
              Loading live sessions…
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-14 px-5 text-center">
              <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-[13px] font-semibold text-gray-900">
                {search
                  ? 'No matching live chats'
                  : queueFilter === 'waiting'
                    ? 'No visitors waiting'
                    : queueFilter === 'active'
                      ? 'No active chats'
                      : 'Queue is quiet'}
              </p>
              <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
                {search
                  ? 'Try another Support ID, name, or city.'
                  : 'Incoming live chats from Derma AI appear here automatically.'}
              </p>
            </div>
          ) : (
            filteredSessions.map((s) => (
              <QueueListRow
                key={s.id}
                session={s}
                selected={selectedId === s.id}
                onSelect={() => {
                  onSelect(s.id)
                  setMobileProfileOpen(false)
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* PANE 2 + PANE 3: CONVERSATION & PROFILE DETAILS */}
      <div
        className={cn(
          'flex-1 min-w-0 flex overflow-hidden bg-[#FBF9FC]',
          selectedId ? 'flex' : 'hidden lg:flex',
        )}
      >
        {selectedId ? (
          <AdminSessionWorkspace
            sessionId={selectedId}
            desktopProfileOpen={desktopProfileOpen}
            mobileProfileOpen={mobileProfileOpen}
            onToggleProfile={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                setMobileProfileOpen((v) => !v)
              } else {
                setDesktopProfileOpen((v) => !v)
              }
            }}
            onCloseMobileProfile={() => setMobileProfileOpen(false)}
            onBack={() => {
              onSelect(null)
              setMobileProfileOpen(false)
            }}
            onDeleted={() => {
              onSessionRemoved(selectedId)
              setMobileProfileOpen(false)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-full bg-white border border-gray-200 text-[#7B2D8E] flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6" />
              </div>
              <h2 className="text-[15.5px] font-semibold text-gray-900">
                Select a live conversation
              </h2>
              <p className="text-[12.5px] text-gray-500 mt-1.5 leading-relaxed">
                Pick any waiting or active chat on the left to inspect anonymous visitor details, check online status, or jump in with a reply.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QueueListRow({
  session,
  selected,
  onSelect,
}: {
  session: SessionRow
  selected: boolean
  onSelect: () => void
}) {
  const name = getSessionCustomerLabel(session)
  const initials = getSessionCustomerInitials(session)
  const supportCode = resolveSupportId(session.support_code, session.id)
  const isGuest = Boolean(session.is_guest || !session.user_id)
  const isWaiting = session.status === 'waiting'
  const presence = getVisitorPresence({
    status: session.status,
    lastSeenAt: session.customer_last_seen_at,
    lastActivityAt: session.last_message_at || session.last_activity_at,
  })
  const repLabel = session.staff_id
    ? session.staff_display_name ||
      fullName(session.staff_first_name, session.staff_last_name, 'Rep')
    : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors cursor-pointer',
        selected ? 'bg-[#FAF6FB]' : 'bg-white hover:bg-[#FBF9FC]',
      )}
    >
      {/* Avatar with real-time online/offline dot */}
      <div className="relative shrink-0 mt-0.5">
        {session.user_avatar_url ? (
          <Image
            src={session.user_avatar_url}
            alt={name}
            width={40}
            height={40}
            referrerPolicy="no-referrer"
            className={cn(
              'w-10 h-10 rounded-full object-cover border',
              selected ? 'border-[#7B2D8E]/40' : 'border-gray-200',
            )}
          />
        ) : (
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold border',
              selected
                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                : 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/20',
            )}
          >
            {initials}
          </div>
        )}
        <span
          aria-hidden="true"
          title={presence.label}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            presence.state === 'online'
              ? 'bg-[#7B2D8E]'
              : isWaiting
                ? 'bg-[#7B2D8E]/55'
                : 'bg-gray-300',
          )}
        />
      </div>

      {/* Main queue info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={cn(
                'text-[13px] font-semibold truncate',
                selected ? 'text-[#7B2D8E]' : 'text-gray-900',
              )}
            >
              {name}
            </p>
            {isGuest && (
              <span className="text-[10px] font-medium text-[#7B2D8E] shrink-0">
                · Guest
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {session.unread_for_staff > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                {session.unread_for_staff}
              </span>
            )}
            <span className="text-[10.5px] text-gray-400 tabular-nums">
              {formatRelative(session.last_message_at || session.created_at)}
            </span>
          </div>
        </div>

        <p className="text-[12px] text-gray-600 line-clamp-1 mt-0.5 leading-snug">
          {session.initial_topic || 'Customer inquiry'}
        </p>

        <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-gray-400 truncate">
          <span className="font-mono font-medium text-[#7B2D8E] shrink-0">
            {supportCode}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              'font-medium shrink-0',
              presence.state === 'online' || isWaiting
                ? 'text-[#7B2D8E]'
                : 'text-gray-500',
            )}
          >
            {presence.state === 'online'
              ? 'Online'
              : isWaiting
                ? 'Waiting'
                : 'Offline'}
          </span>
          {session.visitor_location ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-gray-500">{session.visitor_location}</span>
            </>
          ) : repLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-gray-500">With {repLabel}</span>
            </>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// AdminSessionWorkspace — Center Conversation + Docked/Slide-over Profile Details
// ---------------------------------------------------------------------------

function AdminSessionWorkspace({
  sessionId,
  desktopProfileOpen,
  mobileProfileOpen,
  onToggleProfile,
  onCloseMobileProfile,
  onBack,
  onDeleted,
  isOverlay = false,
}: {
  sessionId: string
  desktopProfileOpen: boolean
  mobileProfileOpen: boolean
  onToggleProfile: () => void
  onCloseMobileProfile: () => void
  onBack?: () => void
  onDeleted: () => void
  isOverlay?: boolean
}) {
  const notify = useNotify()
  const sessionUrl = `/api/admin/live-chat/sessions/${sessionId}`

  const { data, isLoading, mutate } = useSWR<SessionDetailResponse>(
    sessionUrl,
    fetcher,
    { refreshInterval: 2500, revalidateOnFocus: true },
  )

  const [liveMessages, setLiveMessages] = useState<SessionMessage[]>([])
  const [liveCustomerTyping, setLiveCustomerTyping] = useState(false)
  const [livePresence, setLivePresence] = useState<VisitorPresenceInfo | null>(null)
  const seenMsgIdsRef = useRef<Set<string>>(new Set())
  const lastSeenRef = useRef<string | null>(null)
  const hydratedSessionRef = useRef<string | null>(null)

  const [pending, setPending] = useState<SessionMessage[]>([])
  const [displayName, setDisplayName] = useState<string>('Admin')
  const [editingDisplay, setEditingDisplay] = useState<boolean>(false)
  const [customDisplay, setCustomDisplay] = useState<string>('')
  const [savingAlias, setSavingAlias] = useState(false)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [closing, setClosing] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef<boolean>(true)
  const prevMsgCountRef = useRef<number>(0)
  const forceScrollRef = useRef<boolean>(true)
  const typingSentAtRef = useRef<number>(0)
  const typingIdleTimerRef = useRef<number | null>(null)
  const sessionStatusRef = useRef<SessionRow['status'] | undefined>(
    data?.session?.status,
  )
  sessionStatusRef.current = data?.session?.status

  // Reset per-session UI state when switching sessions
  useEffect(() => {
    setDraft('')
    setPending([])
    setLiveMessages([])
    setLiveCustomerTyping(false)
    setLivePresence(null)
    seenMsgIdsRef.current = new Set()
    lastSeenRef.current = null
    hydratedSessionRef.current = null
    setSendError(null)
    setEndDialogOpen(false)
    setDeleteDialogOpen(false)
    isNearBottomRef.current = true
    prevMsgCountRef.current = 0
    forceScrollRef.current = true
    typingSentAtRef.current = 0
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current)
      typingIdleTimerRef.current = null
    }
  }, [sessionId])

  // Seed liveMessages when SWR session detail hydrates
  useEffect(() => {
    if (!data?.messages) return
    for (const m of data.messages) {
      seenMsgIdsRef.current.add(m.id)
    }
    setLiveMessages((prev) => mergeIncrementalMessages(prev, data.messages))
    if (data.messages.length > 0) {
      lastSeenRef.current = data.messages[data.messages.length - 1].created_at
    }
    hydratedSessionRef.current = sessionId
  }, [data?.messages, sessionId])

  // Fast incremental polling (900ms + focus/visibility) for near-instant reply & status reflection
  useEffect(() => {
    if (!sessionId || isOverlay) return
    let cancelled = false
    let inFlight = false

    const tick = async () => {
      if (inFlight) return
      if (typeof document !== 'undefined' && document.hidden) return
      inFlight = true
      try {
        const since = lastSeenRef.current
          ? `?since=${encodeURIComponent(lastSeenRef.current)}`
          : ''
        const res = await fetch(`${sessionUrl}/messages${since}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok || cancelled) return
        const json = (await res.json()) as {
          messages?: SessionMessage[]
          sessionStatus?: SessionRow['status']
          customerTyping?: boolean
          presence?: VisitorPresenceInfo
        }
        setLiveCustomerTyping(Boolean(json.customerTyping))
        if (json.presence) setLivePresence(json.presence)

        if (
          json.sessionStatus &&
          sessionStatusRef.current &&
          sessionStatusRef.current !== json.sessionStatus
        ) {
          void mutate()
          void swrMutate('/api/admin/live-chat/sessions?status=open')
          window.dispatchEvent(new CustomEvent('live-chat:waiting-changed'))
        }

        const incoming = json.messages ?? []
        if (incoming.length === 0) return

        const wasHydrated = hydratedSessionRef.current === sessionId
        hydratedSessionRef.current = sessionId

        let hasNewCustomerMsg = false
        for (const m of incoming) {
          if (!seenMsgIdsRef.current.has(m.id)) {
            seenMsgIdsRef.current.add(m.id)
            if (wasHydrated && m.sender_role === 'user') {
              hasNewCustomerMsg = true
            }
          }
        }
        if (hasNewCustomerMsg) {
          playLiveChatChime('reply', 'staff')
        }

        setLiveMessages((prev) => mergeIncrementalMessages(prev, incoming))
        lastSeenRef.current = incoming[incoming.length - 1].created_at
      } catch {
        // Retry next cycle
      } finally {
        inFlight = false
      }
    }

    const interval = window.setInterval(() => void tick(), 900)
    const onWake = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      void tick()
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [sessionId, sessionUrl, isOverlay, mutate])

  // Load saved admin front-desk display name (graceful default 'Admin' so replies/accept never block)
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
        setDisplayName('Admin')
      } catch {
        if (activeMount) setDisplayName('Admin')
      }
    })()
    return () => {
      activeMount = false
    }
  }, [])

  // Reconcile optimistic messages against server messages
  useEffect(() => {
    if (liveMessages.length === 0 || pending.length === 0) return
    const serverBodies = new Set(
      liveMessages
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
  }, [liveMessages, pending.length])

  const handleFeedScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distFromBottom < 120
  }, [])

  // Throttled admin typing heartbeat so the customer sees "[Name] is typing..."
  const postAdminTyping = useCallback(
    (isTyping: boolean) => {
      fetch(`/api/staff/live-chat/sessions/${sessionId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isTyping,
          displayName: displayName || undefined,
        }),
      }).catch(() => {})
    },
    [sessionId, displayName],
  )

  const notifyAdminTyping = useCallback(
    (isTyping: boolean) => {
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current)
        typingIdleTimerRef.current = null
      }
      if (!isTyping) {
        typingSentAtRef.current = 0
        postAdminTyping(false)
        return
      }
      const now = Date.now()
      if (now - typingSentAtRef.current >= 2200) {
        typingSentAtRef.current = now
        postAdminTyping(true)
      }
      typingIdleTimerRef.current = window.setTimeout(() => {
        typingSentAtRef.current = 0
        postAdminTyping(false)
      }, 4500)
    },
    [postAdminTyping],
  )

  const persistDisplayName = async (value: string) => {
    const cleaned = value.trim()
    if (!cleaned || savingAlias) return
    setSavingAlias(true)
    try {
      const res = await fetchWithRetry('/api/staff/profile', {
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
      await mutate()
      notify.success('Alias updated', `Replies will appear as ${cleaned}.`)
    } catch (err) {
      notify.error(
        'Could not update alias',
        sanitizeNetworkErrorMessage(err, 'Could not save display alias. Please try again.'),
      )
    } finally {
      setSavingAlias(false)
    }
  }

  const session = data?.session ?? null
  const currentUserId = data?.currentUserId ?? null
  const isWaiting = session?.status === 'waiting'
  const isClosed = session?.status === 'closed' || session?.status === 'abandoned'
  const isLiveStatus = session?.status === 'waiting' || session?.status === 'active'
  const isAssignedToOther =
    session?.status === 'active' &&
    Boolean(session.staff_id) &&
    Boolean(currentUserId) &&
    session.staff_id !== currentUserId

  const supportCode = session ? resolveSupportId(session.support_code, session.id) : ''
  const customerLabel = session ? getSessionCustomerLabel(session) : 'Visitor'
  const customerInitials = session ? getSessionCustomerInitials(session) : '?'
  const isGuest = Boolean(session && (session.is_guest || !session.user_id))
  const presence: VisitorPresenceInfo | null = useMemo(() => {
    if (livePresence) return livePresence
    if (data?.presence) return data.presence
    if (!session) return null
    return getVisitorPresence({
      status: session.status,
      lastSeenAt: session.customer_last_seen_at,
      lastActivityAt: session.last_message_at || session.last_activity_at,
    })
  }, [livePresence, data?.presence, session])
  const customerTyping = Boolean(
    (liveCustomerTyping || data?.customerTyping) && isLiveStatus,
  )

  const mergedMessages = useMemo(() => {
    const base = mergeIncrementalMessages(data?.messages ?? [], liveMessages)
    return [...base, ...pending].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [data?.messages, liveMessages, pending])

  const visibleMessages = useMemo(
    () => filterAgentTimelineMessages(mergedMessages),
    [mergedMessages],
  )

  const totalMsgCount = visibleMessages.length
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const hasNewMessages = totalMsgCount > prevMsgCountRef.current
    prevMsgCountRef.current = totalMsgCount
    if (forceScrollRef.current || (hasNewMessages && isNearBottomRef.current)) {
      forceScrollRef.current = false
      el.scrollTop = el.scrollHeight
    }
  }, [totalMsgCount])

  const acceptSessionAction = async () => {
    if (accepting) return
    setAccepting(true)
    setSendError(null)
    try {
      const effectiveAlias = (displayName || 'Admin').trim()
      if (effectiveAlias) {
        await fetchWithRetry('/api/staff/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ displayName: effectiveAlias }),
        }).catch(() => {})
      }
      const res = await fetchWithRetry(sessionUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not accept this chat.')
      }
      await Promise.all([
        mutate(),
        swrMutate('/api/admin/live-chat/sessions?status=open'),
      ])
      window.dispatchEvent(new CustomEvent('live-chat:waiting-changed'))
      notify.success('Chat accepted', `Connected with ${customerLabel}.`)
      window.setTimeout(() => composerRef.current?.focus(), 60)
    } catch (err) {
      const msg = sanitizeNetworkErrorMessage(
        err,
        'Could not accept chat. Check your connection and try again.',
      )
      setSendError(msg)
      notify.error('Could not accept chat', msg)
    } finally {
      setAccepting(false)
    }
  }

  const takeoverSessionAction = async () => {
    if (takingOver) return
    setTakingOver(true)
    setSendError(null)
    try {
      const effectiveAlias = (displayName || 'Admin').trim()
      if (effectiveAlias) {
        await fetchWithRetry('/api/staff/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ displayName: effectiveAlias }),
        }).catch(() => {})
      }
      const res = await fetchWithRetry(sessionUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'takeover' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not take over this chat.')
      }
      await Promise.all([
        mutate(),
        swrMutate('/api/admin/live-chat/sessions?status=open'),
      ])
      window.dispatchEvent(new CustomEvent('live-chat:waiting-changed'))
      notify.success('Chat assigned to you', `${customerLabel} has been notified.`)
      window.setTimeout(() => composerRef.current?.focus(), 60)
    } catch (err) {
      const msg = sanitizeNetworkErrorMessage(
        err,
        'Could not take over chat. Check your connection and try again.',
      )
      setSendError(msg)
      notify.error('Takeover failed', msg)
    } finally {
      setTakingOver(false)
    }
  }

  const endSession = async () => {
    if (closing) return
    setClosing(true)
    setSendError(null)
    try {
      const res = await fetchWithRetry(sessionUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not close session.')
      }
      notifyAdminTyping(false)
      await Promise.all([
        mutate(),
        swrMutate((key) => typeof key === 'string' && key.startsWith('/api/admin/live-chat/')),
      ])
      window.dispatchEvent(new CustomEvent('live-chat:waiting-changed'))
      setEndDialogOpen(false)
      notify.info('Live chat ended', `${supportCode} was closed and moved to history.`)
    } catch (err) {
      const msg = sanitizeNetworkErrorMessage(
        err,
        'Could not end session. Check your connection and try again.',
      )
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
      const res = await fetchWithRetry(sessionUrl, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not delete session.')
      }
      await mutate(undefined, { revalidate: false })
      setDeleteDialogOpen(false)
      window.dispatchEvent(new CustomEvent('live-chat:waiting-changed'))
      notify.success(
        'Live chat deleted',
        `${customerLabel} (${supportCode}) was permanently removed.`,
      )
      onDeleted()
      void swrMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith('/api/admin/live-chat/') &&
          key !== sessionUrl,
      )
    } catch (err) {
      const msg = sanitizeNetworkErrorMessage(
        err,
        'Could not delete chat. Check your connection and try again.',
      )
      setSendError(msg)
      notify.error('Could not delete chat', msg)
    } finally {
      setDeleting(false)
    }
  }

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || sending) return
    const effectiveAlias = (displayName || 'Admin').trim()
    setSending(true)
    setSendError(null)
    notifyAdminTyping(false)

    const optimistic: SessionMessage = {
      id: `optimistic-${Date.now()}`,
      sender_role: 'admin',
      sender_first_name: effectiveAlias,
      sender_last_name: null,
      body: text,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    forceScrollRef.current = true
    isNearBottomRef.current = true
    setPending((prev) => [...prev, optimistic])
    setDraft('')

    try {
      const res = await fetchWithRetry(`${sessionUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: text, displayName: effectiveAlias }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not send message.')
      }
      const json = (await res.json().catch(() => null)) as {
        message?: SessionMessage
      } | null
      if (json?.message) {
        seenMsgIdsRef.current.add(json.message.id)
        setLiveMessages((prev) => mergeIncrementalMessages(prev, [json.message!]))
        lastSeenRef.current = json.message.created_at
      }
      await Promise.all([
        mutate(),
        swrMutate('/api/admin/live-chat/sessions?status=open'),
      ])
    } catch (err) {
      setPending((prev) => prev.filter((p) => p.id !== optimistic.id))
      setDraft(text)
      setSendError(
        sanitizeNetworkErrorMessage(
          err,
          'Could not send reply. Check your connection and try again.',
        ),
      )
    } finally {
      setSending(false)
      requestAnimationFrame(() => composerRef.current?.focus())
    }
  }

  const copySupportCode = () => {
    if (!supportCode || typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(supportCode)
      .then(() => {
        setCopiedId(true)
        notify.info('Support ID copied', supportCode)
        window.setTimeout(() => setCopiedId(false), 1600)
      })
      .catch(() => {})
  }

  const downloadTranscript = () => {
    if (!session) return
    const text = formatLiveChatTranscriptText({
      supportCode,
      customerName: customerLabel,
      customerEmail: session.user_email || session.guest_email,
      topic: session.initial_topic,
      status: session.status,
      visitor: extractVisitorMetadata(session),
      messages: mergedMessages.map((m) => ({
        sender_role: m.sender_role === 'admin' ? 'staff' : m.sender_role,
        sender_name:
          m.sender_role === 'user'
            ? customerLabel
            : fullName(m.sender_first_name, m.sender_last_name, 'Dermaspace Care'),
        body: m.body,
        created_at: m.created_at,
      })),
    })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermaspace-chat-${supportCode.toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify.success('Transcript downloaded', `${supportCode} saved as .txt.`)
  }

  if (isLoading && !session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FBF9FC]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E]" />
          Loading conversation…
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FBF9FC]">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-gray-900">Session unavailable</p>
          <p className="text-xs text-gray-500">
            This live chat may have been removed.
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-1 px-4 py-1.5 rounded-full bg-[#7B2D8E] text-white text-xs font-semibold cursor-pointer"
            >
              Back to queue
            </button>
          )}
        </div>
      </div>
    )
  }

  const repName = session.staff_id
    ? session.staff_display_name ||
      fullName(session.staff_first_name, session.staff_last_name, 'Assigned rep')
    : null
  const envPreview = [
    session.visitor_location,
    session.visitor_browser,
    session.visitor_device,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {/* CENTER CONVERSATION COLUMN */}
      <section className="flex-1 min-w-0 flex flex-col h-full bg-[#FBF9FC] overflow-hidden">
        {/* Clean Single Conversation Header */}
        <header className="h-[66px] shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={isOverlay ? 'Close transcript' : 'Back to queue'}
                className={cn(
                  'w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 flex items-center justify-center shrink-0 cursor-pointer',
                  !isOverlay && 'lg:hidden',
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="relative shrink-0">
              {session.user_avatar_url ? (
                <Image
                  src={session.user_avatar_url}
                  alt={customerLabel}
                  width={38}
                  height={38}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[12px] font-semibold">
                  {customerInitials}
                </div>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                  presence?.state === 'online'
                    ? 'bg-[#7B2D8E]'
                    : session.status === 'waiting'
                      ? 'bg-[#7B2D8E]/55'
                      : 'bg-gray-300',
                )}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 truncate">
                  {customerLabel}
                </h2>
                {isGuest && (
                  <span className="text-[10.5px] font-medium text-[#7B2D8E] shrink-0">
                    Anonymous
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] mt-0.5 truncate">
                <span
                  className={cn(
                    'font-medium shrink-0',
                    presence?.state === 'online' || session.status === 'waiting'
                      ? 'text-[#7B2D8E]'
                      : 'text-gray-500',
                  )}
                >
                  {!isLiveStatus
                    ? session.closed_by === 'user'
                      ? 'Ended by customer'
                      : session.closed_by === 'admin'
                        ? 'Ended by admin'
                        : session.closed_by === 'staff'
                          ? 'Ended by representative'
                          : 'Ended'
                    : presence?.label ||
                      (session.status === 'waiting' ? 'Waiting' : 'Active')}
                </span>
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={copySupportCode}
                  title="Copy Support ID"
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-[#7B2D8E] hover:opacity-80 cursor-pointer shrink-0"
                >
                  <span>{supportCode}</span>
                  {copiedId && <Check className="w-3 h-3 text-[#7B2D8E]" />}
                </button>
                {envPreview && (
                  <>
                    <span className="hidden md:inline text-gray-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden md:inline text-gray-500 truncate">
                      {envPreview}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={downloadTranscript}
              aria-label="Download transcript"
              title="Download transcript"
              className="hidden sm:flex w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] items-center justify-center transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {isLiveStatus && (
              <button
                type="button"
                onClick={() => setEndDialogOpen(true)}
                disabled={closing}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-[#7B2D8E]/30 bg-white text-[11.5px] font-semibold text-[#7B2D8E] hover:bg-[#FAF6FB] hover:border-[#7B2D8E]/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="Delete session"
              title="Delete session"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleProfile}
              aria-label="Toggle profile details"
              title="Profile details"
              className={cn(
                'w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer',
                desktopProfileOpen || mobileProfileOpen
                  ? 'border-[#7B2D8E]/30 bg-[#FAF6FB] text-[#7B2D8E]'
                  : 'border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40',
              )}
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Handover Banner when active with another rep */}
        {!isOverlay && isAssignedToOther && repName && (
          <div className="px-4 py-2 bg-[#FAF6FB] border-b border-[#7B2D8E]/15 flex items-center gap-2 shrink-0">
            <RepAvatar
              src={session.staff_avatar_url}
              name={repName}
              size={22}
            />
            <p className="text-[12px] text-[#7B2D8E] truncate">
              Currently handled by <strong className="font-semibold">{repName}</strong> — reviewing conversation history.
            </p>
          </div>
        )}

        {/* Initial Topic Strip */}
        {session.initial_topic && (
          <div className="px-4 py-2 bg-white border-b border-gray-100 text-[12px] text-gray-600 flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-[#7B2D8E] shrink-0">
              Topic:
            </span>
            <span className="truncate">{session.initial_topic}</span>
          </div>
        )}

        {/* Messages Feed */}
        <div
          ref={scrollerRef}
          onScroll={handleFeedScroll}
          className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-4 min-h-0"
        >
          <div className="max-w-2xl mx-auto space-y-1">
            {visibleMessages.map((m, idx) => {
              const prev = idx > 0 ? visibleMessages[idx - 1] : null
              const next =
                idx < visibleMessages.length - 1 ? visibleMessages[idx + 1] : null
              const sameAsPrev = Boolean(
                prev &&
                  prev.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  prev.sender_role === m.sender_role &&
                  (prev.sender_id || null) === (m.sender_id || null) &&
                  Math.abs(
                    new Date(m.created_at).getTime() -
                      new Date(prev.created_at).getTime(),
                  ) < 180_000,
              )
              const sameAsNext = Boolean(
                next &&
                  next.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  next.sender_role === m.sender_role &&
                  (next.sender_id || null) === (m.sender_id || null) &&
                  Math.abs(
                    new Date(next.created_at).getTime() -
                      new Date(m.created_at).getTime(),
                  ) < 180_000,
              )

              return (
                <div
                  key={m.id}
                  className={cn(sameAsPrev ? 'pt-0.5' : idx === 0 ? '' : 'pt-3.5')}
                >
                  <AdminMessageRow
                    message={m}
                    customerLabel={customerLabel}
                    customerInitials={customerInitials}
                    customerAvatarUrl={session.user_avatar_url ?? null}
                    staffAvatarFallback={session.staff_avatar_url}
                    staffNameFallback={repName}
                    isFirstInGroup={!sameAsPrev}
                    isLastInGroup={!sameAsNext}
                  />
                </div>
              )
            })}

            {visibleMessages.length === 0 && !isWaiting && (
              <div className="text-center text-xs text-gray-400 py-10">
                No messages in this session yet.
              </div>
            )}

            {!isOverlay && isWaiting && (
              <div className="flex justify-center pt-5">
                <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 px-4 py-2 rounded-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B2D8E]" />
                  Visitor is waiting — accept below to join the chat.
                </div>
              </div>
            )}

            {/* Live Visitor Typing Indicator — 3-dot reply bubble */}
            {customerTyping && (
              <div
                className="flex items-end gap-2.5 pt-3"
                role="status"
                aria-live="polite"
                aria-label={`${customerLabel} is replying`}
              >
                <div className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {customerInitials}
                </div>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/70 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/45 animate-bounce" />
                  <span className="sr-only">{customerLabel} is replying</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Bar / Composer */}
        {!isOverlay && isWaiting ? (
          <footer className="shrink-0 bg-white border-t border-gray-200 px-3.5 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            <div className="max-w-2xl mx-auto space-y-2.5">
              {sendError && (
                <p className="text-[11.5px] text-[#C63D3D] bg-[#FDF2F2] border border-[#C63D3D]/25 rounded-xl px-3 py-2">
                  {sendError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void acceptSessionAction()}
                disabled={accepting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white py-2.5 px-5 text-[13.5px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {accepting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Accept &amp; join as {displayName || 'Admin'}
              </button>
            </div>
          </footer>
        ) : !isOverlay && isAssignedToOther ? (
          <footer className="shrink-0 bg-white border-t border-gray-200 px-3.5 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            <div className="max-w-2xl mx-auto space-y-2">
              {sendError && (
                <p className="text-[11.5px] text-[#C63D3D] bg-[#FDF2F2] border border-[#C63D3D]/25 rounded-xl px-3 py-2">
                  {sendError}
                </p>
              )}
              <p className="text-[11.5px] text-gray-500 text-center">
                Taking over reassigns{' '}
                <span className="font-mono font-semibold text-[#7B2D8E]">
                  {supportCode}
                </span>{' '}
                to you and notifies the visitor smoothly.
              </p>
              <button
                type="button"
                onClick={() => void takeoverSessionAction()}
                disabled={takingOver}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white py-2.5 px-5 text-[13.5px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {takingOver ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Take over chat as {displayName || 'Admin'}
              </button>
            </div>
          </footer>
        ) : isLiveStatus && !isOverlay ? (
          <footer className="shrink-0 bg-white border-t border-gray-200 px-3.5 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            <div className="max-w-2xl mx-auto space-y-2.5">
              {/* Compact Alias Bar */}
              {editingDisplay ? (
                <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11.5px] font-semibold text-[#7B2D8E]">
                      Choose front-desk display name
                    </p>
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
                          onClick={() => void persistDisplayName(preset)}
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
                          void persistDisplayName(customDisplay)
                        }
                      }}
                      placeholder="Custom alias (e.g. Adaeze)"
                      maxLength={30}
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-full text-base sm:text-[12px] bg-white border border-gray-200 focus:border-[#7B2D8E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void persistDisplayName(customDisplay)}
                      disabled={!customDisplay.trim() || savingAlias}
                      className="px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                    >
                      {savingAlias ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-[11.5px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {displayName.charAt(0).toUpperCase() || 'A'}
                    </span>
                    <span className="text-gray-500 truncate">
                      Replying as{' '}
                      <strong className="font-semibold text-[#7B2D8E]">
                        {displayName}
                      </strong>
                      {repName && (
                        <span className="hidden sm:inline text-gray-400">
                          {' '}
                          · Assigned to {repName}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {supportCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(
                            `Please keep your support reference ID ${supportCode} for future reference.`,
                          )
                          composerRef.current?.focus()
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-white border border-[#7B2D8E]/30 hover:bg-[#7B2D8E] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
                      >
                        <Ticket className="w-3 h-3" />
                        Share ref ID
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const isPreset = ADMIN_DISPLAY_PRESETS.includes(
                          displayName as (typeof ADMIN_DISPLAY_PRESETS)[number],
                        )
                        setCustomDisplay(isPreset ? '' : displayName)
                        setEditingDisplay(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/45 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Switch alias
                    </button>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-[11.5px] text-[#C63D3D] bg-[#FDF2F2] border border-[#C63D3D]/25 rounded-xl px-3 py-2">
                  {sendError}
                </p>
              )}

              <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#FBF9FC] focus-within:bg-white focus-within:border-[#7B2D8E] px-3 py-2 transition-colors">
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => {
                    const val = e.target.value
                    setDraft(val)
                    notifyAdminTyping(val.trim().length > 0)
                  }}
                  onBlur={() => notifyAdminTyping(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={`Reply to ${customerLabel}…`}
                  rows={1}
                  maxLength={2000}
                  className="flex-1 min-w-0 resize-none bg-transparent py-1 text-base sm:text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-28 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || sending}
                  aria-label="Send reply"
                  className="w-9 h-9 shrink-0 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 transition-colors cursor-pointer"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </footer>
        ) : (
          <footer className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[12px] text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7B2D8E] shrink-0" />
                <span className={cn(session.closed_by === 'user' && 'font-semibold text-[#7B2D8E]')}>
                  {session.closed_by === 'user'
                    ? 'Customer ended this chat.'
                    : session.closed_by === 'admin'
                      ? 'Ended by admin.'
                      : session.closed_by === 'staff'
                        ? 'Ended by representative.'
                        : 'This conversation has ended.'}
                </span>
                {session.rating != null && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                    {session.rating}/5
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isOverlay && isClosed && (
                  <button
                    type="button"
                    onClick={() => void takeoverSessionAction()}
                    disabled={takingOver}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/30 bg-[#FAF6FB] hover:bg-[#7B2D8E] text-[#7B2D8E] hover:text-white px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {takingOver ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    )}
                    Reopen &amp; take over
                  </button>
                )}
                <button
                  type="button"
                  onClick={downloadTranscript}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] px-3 py-1.5 text-[11.5px] font-semibold text-gray-700 hover:text-[#7B2D8E] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  Download transcript
                </button>
              </div>
            </div>
          </footer>
        )}
      </section>

      {/* DOCKED RIGHT PROFILE DETAILS PANEL (xl+) */}
      {desktopProfileOpen && (
        <div className="hidden xl:block w-[308px] 2xl:w-[328px] shrink-0 border-l border-gray-200 h-full overflow-hidden">
          <AdminProfileDetailsPanel
            session={session}
            presence={presence}
            customerTyping={customerTyping}
            onDownloadTranscript={downloadTranscript}
          />
        </div>
      )}

      {/* SLIDE-OVER PROFILE DETAILS DRAWER (< xl) */}
      {mobileProfileOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-gray-900/35"
            onClick={onCloseMobileProfile}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-[360px] h-full bg-white border-l border-gray-200">
            <AdminProfileDetailsPanel
              session={session}
              presence={presence}
              customerTyping={customerTyping}
              onDownloadTranscript={downloadTranscript}
              onClose={onCloseMobileProfile}
            />
          </div>
        </div>
      )}

      {/* Brand-Purple End Chat Action Prompt */}
      <ConfirmDialog
        open={endDialogOpen}
        onCancel={() => setEndDialogOpen(false)}
        title={`End live chat with ${customerLabel}?`}
        description={
          <>
            Close{' '}
            <span className="font-mono font-semibold text-[#7B2D8E]">{supportCode}</span>{' '}
            and send the transcript if an email is on file.
          </>
        }
        confirmLabel="End chat"
        cancelLabel="Keep chatting"
        icon={<PhoneOff className="h-[18px] w-[18px]" />}
        loading={closing}
        onConfirm={() => void endSession()}
      />

      {/* Brand-Purple Delete Session Action Prompt */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        title="Delete this live chat?"
        description={
          <>
            Permanently removes{' '}
            <span className="font-semibold text-gray-900">{customerLabel}</span> (
            <span className="font-mono font-semibold text-[#7B2D8E]">{supportCode}</span>) and
            its messages. This cannot be undone.
          </>
        }
        confirmLabel="Delete chat"
        cancelLabel="Keep it"
        icon={<Trash2 className="h-[18px] w-[18px]" />}
        loading={deleting}
        onConfirm={() => void deleteSession()}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// AdminProfileDetailsPanel — Rich Anonymous Visitor & Member Profile Details
// ---------------------------------------------------------------------------

function AdminProfileDetailsPanel({
  session,
  presence,
  customerTyping,
  onDownloadTranscript,
  onClose,
}: {
  session: SessionRow
  presence: VisitorPresenceInfo | null
  customerTyping: boolean
  onDownloadTranscript: () => void
  onClose?: () => void
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const isGuest = Boolean(session.is_guest || !session.user_id)
  const contextQuery = useSWR<InspectorContextData>(
    !isGuest ? `/api/staff/live-chat/sessions/${session.id}/user-context` : null,
    fetcher,
  )
  const customerName = getSessionCustomerLabel(session)
  const initials = getSessionCustomerInitials(session)
  const supportCode = resolveSupportId(session.support_code, session.id)
  const email = session.user_email || session.guest_email || null
  const phone = session.user_phone || session.guest_phone || null
  const repName = session.staff_id
    ? session.staff_display_name ||
      fullName(session.staff_first_name, session.staff_last_name, 'Assigned rep')
    : 'Waiting in queue'

  const localTime = useMemo(
    () => formatVisitorLocalTime(session.visitor_timezone),
    [session.visitor_timezone],
  )
  const timezoneSummary = session.visitor_timezone
    ? localTime
      ? `${session.visitor_timezone} (${localTime})`
      : session.visitor_timezone
    : null
  const deviceSummary = [session.visitor_device, session.visitor_screen]
    .filter(Boolean)
    .join(' · ')

  const DeviceIcon =
    session.visitor_device === 'Mobile'
      ? Smartphone
      : session.visitor_device === 'Tablet'
        ? Tablet
        : Laptop

  const copyValue = (key: string, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedField(key)
        window.setTimeout(() => setCopiedField(null), 1600)
      })
      .catch(() => {})
  }

  return (
    <aside className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="h-[66px] shrink-0 px-4 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-gray-900 truncate">
            Profile Details
          </h3>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {isGuest
              ? 'Anonymous visitor · Not signed in'
              : 'Registered Dermaspace member'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile details"
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {/* Identity + Real-Time Online / Away Status */}
        <section className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {session.user_avatar_url ? (
                <Image
                  src={session.user_avatar_url}
                  alt={customerName}
                  width={44}
                  height={44}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[13px] font-semibold">
                  {initials}
                </div>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                  presence?.state === 'online'
                    ? 'bg-[#7B2D8E]'
                    : presence?.state === 'away'
                      ? 'bg-[#7B2D8E]/45'
                      : 'bg-gray-300',
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-900 truncate">
                {customerName}
              </p>
              <p className="text-[11px] font-medium text-[#7B2D8E] truncate mt-0.5">
                {isGuest ? 'Anonymous Visitor (Guest)' : 'Signed-in Account'}
              </p>
            </div>
          </div>

          {/* Coherent Presence Status Banner (never duplicated "Offline ... Offline") */}
          {presence && (() => {
            const meta = getPresenceStatusMeta(presence, session.status)
            return (
              <div
                className={cn(
                  'flex items-center justify-between gap-2 rounded-xl border px-3 py-2',
                  meta.containerClass,
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className={cn('w-2 h-2 rounded-full shrink-0', meta.dotClass)}
                  />
                  <span className={cn('text-[12px] font-semibold truncate', meta.textClass)}>
                    {meta.leftLabel}
                  </span>
                </div>
                <span className="text-[10.5px] text-gray-500 shrink-0">
                  {meta.rightLabel}
                </span>
              </div>
            )
          })()}

          {/* Contact & Support ID */}
          <div className="space-y-2 pt-0.5">
            <ProfileDetailRow
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email"
              value={email || 'Not provided'}
              muted={!email}
              onCopy={email ? () => copyValue('email', email) : undefined}
              copied={copiedField === 'email'}
            />
            <ProfileDetailRow
              icon={<Phone className="w-3.5 h-3.5" />}
              label="Phone"
              value={phone || 'Not provided'}
              muted={!phone}
              onCopy={phone ? () => copyValue('phone', phone) : undefined}
              copied={copiedField === 'phone'}
            />
            <ProfileDetailRow
              icon={<Ticket className="w-3.5 h-3.5" />}
              label="Support ID"
              value={supportCode}
              mono
              onCopy={() => copyValue('support', supportCode)}
              copied={copiedField === 'support'}
            />
          </div>
        </section>

        {/* Visitor Environment — Highlighted for Anonymous Users */}
        <section className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold text-gray-900 tracking-wide">
              Visitor Environment
            </h4>
            {isGuest && (
              <span className="text-[10px] font-semibold text-[#7B2D8E]">
                Anonymous telemetry
              </span>
            )}
          </div>

          <ProfileDetailRow
            icon={<MapPin className="w-3.5 h-3.5" />}
            label="Location"
            value={session.visitor_location || 'Not detected'}
            muted={!session.visitor_location}
          />
          <ProfileDetailRow
            icon={<Globe className="w-3.5 h-3.5" />}
            label="Browser"
            value={session.visitor_browser || 'Not captured'}
            muted={!session.visitor_browser}
          />
          <ProfileDetailRow
            icon={<Monitor className="w-3.5 h-3.5" />}
            label="Operating system"
            value={session.visitor_os || 'Not captured'}
            muted={!session.visitor_os}
          />
          <ProfileDetailRow
            icon={<DeviceIcon className="w-3.5 h-3.5" />}
            label="Device & screen"
            value={deviceSummary || 'Not captured'}
            muted={!deviceSummary}
          />
          <ProfileDetailRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Timezone & local time"
            value={timezoneSummary || 'Not captured'}
            muted={!timezoneSummary}
          />
          {session.visitor_page_url && (
            <div className="flex items-start gap-2.5 text-[12px]">
              <span className="mt-0.5 text-[#7B2D8E] shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] text-gray-400">Started on page</p>
                {session.visitor_page_url.startsWith('/') ? (
                  <Link
                    href={session.visitor_page_url}
                    className="text-[12px] font-medium text-[#7B2D8E] hover:underline break-all block mt-0.5"
                  >
                    {session.visitor_page_url}
                  </Link>
                ) : (
                  <p className="text-[12px] font-medium text-gray-800 break-all mt-0.5">
                    {session.visitor_page_url}
                  </p>
                )}
              </div>
            </div>
          )}
          {session.visitor_referrer && (
            <ProfileDetailRow
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              label="Referrer"
              value={session.visitor_referrer}
            />
          )}
          <ProfileDetailRow
            icon={<Shield className="w-3.5 h-3.5" />}
            label="IP address"
            value={session.visitor_ip || 'Not captured'}
            mono
            muted={!session.visitor_ip}
            onCopy={
              session.visitor_ip
                ? () => copyValue('ip', session.visitor_ip!)
                : undefined
            }
            copied={copiedField === 'ip'}
          />
          {session.visitor_language && (
            <ProfileDetailRow
              icon={<Globe className="w-3.5 h-3.5" />}
              label="Language"
              value={session.visitor_language}
            />
          )}
        </section>

        {/* Session Metrics & Representative */}
        <section className="p-4 space-y-2.5">
          <h4 className="text-[11px] font-semibold text-gray-900 tracking-wide">
            Session Details
          </h4>
          <ProfileDetailRow
            icon={<UserRound className="w-3.5 h-3.5" />}
            label="Representative"
            value={repName}
          />
          <ProfileDetailRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Started"
            value={formatChatTimestamp(session.escalated_at || session.created_at) || 'Just now'}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-2.5 py-2">
              <p className="text-[10px] font-medium text-gray-500">First reply</p>
              <p className="text-[12.5px] font-semibold text-gray-900 tabular-nums mt-0.5">
                {formatDuration(session.staff_response_seconds)}
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-2.5 py-2">
              <p className="text-[10px] font-medium text-gray-500">Resolution</p>
              <p className="text-[12.5px] font-semibold text-gray-900 tabular-nums mt-0.5">
                {formatDuration(session.resolution_seconds)}
              </p>
            </div>
          </div>

          {session.rating != null && (
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/20 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#7B2D8E]">
                  Customer feedback
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                  {session.rating}/5
                </span>
              </div>
              {session.rating_comment && (
                <p className="text-[11.5px] text-gray-700 mt-1 leading-relaxed">
                  &ldquo;{session.rating_comment}&rdquo;
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onDownloadTranscript}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] px-3 py-2.5 text-[12px] font-medium text-gray-800 hover:text-[#7B2D8E] transition-colors cursor-pointer mt-1"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-[#7B2D8E]" />
              Download transcript
            </span>
            <span className="text-[10.5px] text-gray-400">.txt</span>
          </button>
        </section>

        {/* Account History (Member Wallet, Bookings, Transactions, Tickets) */}
        <section className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold text-gray-900 tracking-wide">
              Account History
            </h4>
            {!isGuest && contextQuery.data?.wallet?.formatted && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                <Wallet className="w-3.5 h-3.5" />
                {contextQuery.data.wallet.formatted}
              </span>
            )}
          </div>

          {!isGuest && contextQuery.isLoading && !contextQuery.data ? (
            <div className="py-4 text-center text-[12px] text-gray-400">
              <Loader2 className="w-4 h-4 mx-auto animate-spin text-[#7B2D8E] mb-1.5" />
              Loading account records…
            </div>
          ) : isGuest ? (
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-3.5 py-3 text-[12px] text-gray-600 leading-relaxed flex items-start gap-2.5">
              <UserRound className="w-4 h-4 text-[#7B2D8E] shrink-0 mt-0.5" />
              <p>
                This visitor is chatting anonymously via the pre-chat form. Use
                location, browser, and contact details above to assist or follow up.
              </p>
            </div>
          ) : contextQuery.data ? (
            <>
              {/* Bookings */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                  Recent bookings ({contextQuery.data.bookings.length})
                </p>
                {contextQuery.data.bookings.length === 0 ? (
                  <p className="text-[11.5px] text-gray-400 py-1">
                    No bookings on file.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {contextQuery.data.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="py-2 flex items-center justify-between gap-2 text-[11.5px]"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/booking/${encodeURIComponent(b.booking_reference)}`}
                            className="font-medium text-[#7B2D8E] hover:underline truncate block"
                          >
                            {b.booking_reference}
                          </Link>
                          <p className="text-[10.5px] text-gray-400 truncate">
                            {b.location_name} ·{' '}
                            {new Date(b.appointment_date).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 block">
                            {b.status}
                          </span>
                          <Link
                            href={`/booking/${encodeURIComponent(b.booking_reference)}`}
                            className="text-[10.5px] font-medium text-[#7B2D8E] hover:underline"
                          >
                            Receipt
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                  Recent transactions ({contextQuery.data.transactions.length})
                </p>
                {contextQuery.data.transactions.length === 0 ? (
                  <p className="text-[11.5px] text-gray-400 py-1">
                    No transactions on file.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {contextQuery.data.transactions.slice(0, 5).map((tx) => {
                      const receiptHref = getReceiptHref({
                        reference: tx.reference,
                        bookingReference: tx.metadata?.booking_reference,
                        metadataType: tx.metadata?.type,
                      })
                      const failed =
                        tx.status === 'failed' ||
                        tx.status === 'declined' ||
                        tx.status === 'cancelled'
                      return (
                        <div
                          key={tx.id}
                          className="py-2 flex items-center justify-between gap-2 text-[11.5px]"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {tx.description || tx.type}
                            </p>
                            <div className="flex items-center gap-2 text-[10.5px] text-gray-400">
                              <span>
                                {tx.payment_method || tx.type} ·{' '}
                                {new Date(tx.created_at).toLocaleDateString('en-NG', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              {receiptHref && (
                                <Link
                                  href={receiptHref}
                                  className="inline-flex items-center gap-0.5 font-medium text-[#7B2D8E] hover:underline"
                                >
                                  <Receipt className="w-2.5 h-2.5" />
                                  Receipt
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <p
                              className={cn(
                                'font-semibold',
                                failed ? 'text-[#C63D3D]' : 'text-gray-900',
                              )}
                            >
                              ₦{Math.round(Number(tx.amount)).toLocaleString()}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] font-medium capitalize',
                                failed
                                  ? 'text-[#C63D3D]'
                                  : tx.status === 'success' || tx.status === 'completed'
                                    ? 'text-[#7B2D8E]'
                                    : 'text-gray-500',
                              )}
                            >
                              {tx.status}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Support tickets */}
              {contextQuery.data.tickets.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                    Support tickets ({contextQuery.data.tickets.length})
                  </p>
                  <div className="divide-y divide-gray-100">
                    {contextQuery.data.tickets.map((t) => {
                      const sMeta = getTicketStatusMeta(t.status)
                      return (
                        <div
                          key={t.ticket_id}
                          className="py-2 flex items-center justify-between gap-2 text-[11.5px]"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {t.subject}
                            </p>
                            <p className="text-[10.5px] text-gray-400">
                              {t.category} · {t.ticket_id}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10.5px] font-medium text-[#5A1D6A]">
                            {sMeta.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </aside>
  )
}

function ProfileDetailRow({
  icon,
  label,
  value,
  mono = false,
  muted = false,
  onCopy,
  copied = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  muted?: boolean
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 text-[12px]">
      <span className="mt-0.5 text-[#7B2D8E] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] text-gray-400 leading-none">{label}</p>
        <div className="flex items-center justify-between gap-1.5 mt-1">
          <p
            className={cn(
              'text-[12px] truncate',
              mono && 'font-mono tabular-nums',
              muted ? 'text-gray-400' : 'font-medium text-gray-900',
            )}
            title={value}
          >
            {value}
          </p>
          {onCopy && !muted && (
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copy ${label}`}
              className="p-1 rounded-md text-gray-400 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3 h-3 text-[#7B2D8E]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminMessageRow — Join Avatar Milestones + Clean Grouped Bubbles
// ---------------------------------------------------------------------------

function AdminMessageRow({
  message,
  customerLabel,
  customerInitials,
  customerAvatarUrl,
  staffAvatarFallback,
  staffNameFallback,
  isFirstInGroup,
  isLastInGroup,
}: {
  message: SessionMessage
  customerLabel: string
  customerInitials: string
  customerAvatarUrl: string | null
  staffAvatarFallback: string | null
  staffNameFallback: string | null
  isFirstInGroup: boolean
  isLastInGroup: boolean
}) {
  const stamp = useMemo(
    () => formatChatTimestamp(message.created_at),
    [message.created_at],
  )

  if (message.sender_role === 'system') {
    // Customer-facing join milestones ("X joined the chat") belong on the customer
    // view only — hide plain join notices in Admin view so the timeline stays focused.
    if (isJoinMilestone(message.body) && !/took over/i.test(message.body)) {
      return null
    }
    const isCustomerEnded = /customer ended/i.test(message.body)
    return (
      <div className="py-2.5" role="status">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'h-px flex-1',
              isCustomerEnded ? 'bg-[#7B2D8E]/25' : 'bg-gray-200',
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              'text-[11px] font-medium text-center',
              isCustomerEnded ? 'text-[#7B2D8E] font-semibold' : 'text-gray-500',
            )}
          >
            {message.body}
          </span>
          <span
            className={cn(
              'h-px flex-1',
              isCustomerEnded ? 'bg-[#7B2D8E]/25' : 'bg-gray-200',
            )}
            aria-hidden="true"
          />
        </div>
        {stamp && (
          <p className="text-center text-[10.5px] text-gray-400 mt-1 tabular-nums">
            {stamp}
          </p>
        )}
      </div>
    )
  }

  // Visitor / customer bubble (left)
  if (message.sender_role === 'user') {
    return (
      <div className="flex items-end gap-2">
        <div className="w-7 shrink-0">
          {isLastInGroup &&
            (customerAvatarUrl ? (
              <Image
                src={customerAvatarUrl}
                alt={customerLabel}
                width={28}
                height={28}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[10px] font-semibold">
                {customerInitials}
              </div>
            ))}
        </div>
        <div className="max-w-[80%] sm:max-w-[74%]">
          <div
            className={cn(
              'bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl',
              isLastInGroup && 'rounded-bl-md',
            )}
          >
            <p className="text-[13px] text-gray-900 whitespace-pre-wrap leading-relaxed break-words">
              {message.body}
            </p>
          </div>
          {isLastInGroup && stamp && (
            <p className="text-[10.5px] text-gray-400 mt-1 ml-1 tabular-nums">
              {stamp}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Staff / admin bubble (right)
  const senderLabel =
    message.sender_name ||
    fullName(
      message.sender_first_name,
      message.sender_last_name,
      message.sender_role === 'admin' ? 'Admin' : 'Rep',
    )

  return (
    <div className="flex items-end justify-end gap-2">
      <div className="max-w-[80%] sm:max-w-[74%] flex flex-col items-end">
        {isFirstInGroup && (
          <p className="text-[10.5px] font-medium text-[#7B2D8E] mr-1 mb-1">
            {senderLabel}
            {message._pending && <span className="ml-1.5 text-gray-400">Sending…</span>}
          </p>
        )}
        <div
          className={cn(
            'bg-[#7B2D8E] text-white px-3.5 py-2.5 rounded-2xl',
            isLastInGroup && 'rounded-br-md',
            message._pending && 'opacity-70',
          )}
        >
          <p className="text-[13px] whitespace-pre-wrap leading-relaxed break-words">
            {message.body}
          </p>
        </div>
        {isLastInGroup && stamp && (
          <p className="text-[10.5px] text-gray-400 mt-1 mr-1 tabular-nums">
            {stamp}
          </p>
        )}
      </div>
      <div className="w-7 shrink-0">
        {isLastInGroup && (
          <RepAvatar
            src={message.sender_avatar_url || staffAvatarFallback}
            name={senderLabel}
            size={28}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistorySessionOverlay — Full 2-Pane Transcript + Profile Details Modal
// ---------------------------------------------------------------------------

function HistorySessionOverlay({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(true)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <button
        type="button"
        aria-label="Close session viewer"
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/35"
      />
      <div className="relative z-10 w-full max-w-5xl h-[100dvh] sm:h-[86dvh] bg-white sm:rounded-2xl sm:border sm:border-gray-200 overflow-hidden flex">
        <AdminSessionWorkspace
          sessionId={sessionId}
          desktopProfileOpen={desktopProfileOpen}
          mobileProfileOpen={mobileProfileOpen}
          onToggleProfile={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1280) {
              setMobileProfileOpen((v) => !v)
            } else {
              setDesktopProfileOpen((v) => !v)
            }
          }}
          onCloseMobileProfile={() => setMobileProfileOpen(false)}
          onBack={onClose}
          onDeleted={onClose}
          isOverlay
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistoryTab — Searchable Closed Sessions (Responsive Cards + Table)
// ---------------------------------------------------------------------------

function HistoryTab({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const notify = useNotify()
  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { data, isLoading, mutate } = useSWR<ListResponse>(
    `/api/admin/live-chat/sessions?status=closed&days=${days}`,
    fetcher,
  )

  const handleDeleteHistorySession = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const target = deleteTarget
    const targetCode = resolveSupportId(target.support_code, target.id)
    const targetName = getSessionCustomerLabel(target)
    try {
      const res = await fetch(`/api/admin/live-chat/sessions/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not delete session.')
      }
      setDeleteTarget(null)
      await mutate()
      void swrMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/admin/live-chat/'),
      )
      notify.success(
        'Live chat deleted',
        `${targetName} (${targetCode}) was permanently removed.`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete session.'
      notify.error('Could not delete chat', msg)
    } finally {
      setDeleting(false)
    }
  }

  const sessions = data?.sessions ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) => {
      const code = resolveSupportId(s.support_code, s.id).toLowerCase()
      return (
        code.includes(q) ||
        getSessionCustomerLabel(s).toLowerCase().includes(q) ||
        (s.user_email || '').toLowerCase().includes(q) ||
        (s.guest_email || '').toLowerCase().includes(q) ||
        (s.visitor_location || '').toLowerCase().includes(q) ||
        (s.initial_topic || '').toLowerCase().includes(q) ||
        (s.staff_display_name || '').toLowerCase().includes(q) ||
        (s.staff_first_name || '').toLowerCase().includes(q)
      )
    })
  }, [sessions, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200 shrink-0">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Support ID, visitor, location, rep, or topic"
            className="w-full pl-9 pr-3 py-2 text-base sm:text-sm bg-white rounded-full border border-gray-200 focus:border-[#7B2D8E] focus:outline-none"
          />
        </div>
      </div>

      {isLoading && sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
          Loading chat history…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 px-4 text-center text-xs text-gray-500">
          {search
            ? 'No closed chats matched your search.'
            : 'No closed live chats in this window.'}
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Cards */}
          <div className="lg:hidden space-y-2.5">
            {filtered.map((s) => {
              const code = resolveSupportId(s.support_code, s.id)
              const name = getSessionCustomerLabel(s)
              const isGuest = Boolean(s.is_guest || !s.user_id)
              const rep = s.staff_id
                ? s.staff_display_name ||
                  fullName(s.staff_first_name, s.staff_last_name, 'Rep')
                : 'Unassigned'
              return (
                <div
                  key={s.id}
                  className="w-full bg-white rounded-2xl border border-gray-200 hover:border-[#7B2D8E]/40 p-4 space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenSession(s.id)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13.5px] font-semibold text-gray-900 truncate">
                          {name}
                        </p>
                        {isGuest && (
                          <span className="text-[10.5px] font-medium text-[#7B2D8E]">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[#7B2D8E] mt-0.5">
                        {code}
                        {s.closed_by === 'user' && (
                          <span className="font-sans text-[10.5px] text-gray-500 ml-1.5">
                            · Ended by customer
                          </span>
                        )}
                      </p>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusPill status={s.status} />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        aria-label={`Delete live chat ${code}`}
                        title="Delete chat"
                        className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenSession(s.id)}
                    className="w-full text-left space-y-2.5 cursor-pointer"
                  >
                    <p className="text-[12px] text-gray-600 line-clamp-1">
                      {s.initial_topic || 'Customer inquiry'}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                      <span className="truncate">
                        Rep: <strong className="font-medium text-gray-800">{rep}</strong>
                        {s.visitor_location ? ` · ${s.visitor_location}` : ''}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.rating != null && (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-[#7B2D8E] tabular-nums">
                            <Star className="w-3 h-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                            {s.rating}/5
                          </span>
                        )}
                        <span className="tabular-nums text-gray-400">
                          {formatRelative(s.closed_at || s.last_message_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#FAF6FB] text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Visitor</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Representative</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Closed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const code = resolveSupportId(s.support_code, s.id)
                    const name = getSessionCustomerLabel(s)
                    const isGuest = Boolean(s.is_guest || !s.user_id)
                    const rep = s.staff_id
                      ? s.staff_display_name ||
                        fullName(s.staff_first_name, s.staff_last_name, 'Rep')
                      : '—'
                    return (
                      <tr
                        key={s.id}
                        onClick={() => onOpenSession(s.id)}
                        className="hover:bg-[#FAF6FB]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 text-[13px] truncate max-w-[180px]">
                                {name}
                              </span>
                              {isGuest && (
                                <span className="text-[10px] font-semibold text-[#7B2D8E]">
                                  Guest
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-[#7B2D8E]">
                              {code}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[12px] text-gray-600">
                          <div className="truncate max-w-[180px]">
                            {s.visitor_location || '—'}
                          </div>
                          {(s.visitor_browser || s.visitor_device) && (
                            <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                              {[s.visitor_browser, s.visitor_device]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[12.5px] text-gray-700 max-w-[220px] truncate">
                          {s.initial_topic || 'Customer inquiry'}
                        </td>
                        <td className="py-3 px-4 text-[12.5px] font-medium text-gray-800 whitespace-nowrap">
                          {rep}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {s.rating != null ? (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                              <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                              {s.rating}/5
                            </span>
                          ) : (
                            <span className="text-[12px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[12px] text-gray-500 whitespace-nowrap tabular-nums">
                          <div>{formatRelative(s.closed_at || s.last_message_at)}</div>
                          {s.closed_by === 'user' && (
                            <div className="text-[10.5px] font-medium text-[#7B2D8E]">
                              By customer
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenSession(s.id)
                              }}
                              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] hover:opacity-80 cursor-pointer"
                            >
                              Open
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(s)
                              }}
                              aria-label={`Delete live chat ${code}`}
                              title="Delete chat"
                              className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* Brand-Purple Delete History Session Prompt */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="Delete this live chat?"
        description={
          deleteTarget ? (
            <>
              Permanently removes{' '}
              <span className="font-semibold text-gray-900">
                {getSessionCustomerLabel(deleteTarget)}
              </span>{' '}
              (
              <span className="font-mono font-semibold text-[#7B2D8E]">
                {resolveSupportId(deleteTarget.support_code, deleteTarget.id)}
              </span>
              ) and its messages.
            </>
          ) : undefined
        }
        confirmLabel="Delete chat"
        cancelLabel="Keep it"
        icon={<Trash2 className="h-[18px] w-[18px]" />}
        loading={deleting}
        onConfirm={() => void handleDeleteHistorySession()}
      />
    </div>
  )
}

function StatusPill({ status }: { status: SessionRow['status'] }) {
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

// ---------------------------------------------------------------------------
// PerformanceTab — Per-Staff Response, Resolution & Rating Scoreboard
// ---------------------------------------------------------------------------

function PerformanceTab() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useSWR<PerformanceResponse>(
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
              'flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
              days === d
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
          Loading performance…
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-500 py-10">
          No staff activity in this window yet.
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Cards */}
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
                      <RepAvatar src={r.avatar_url} name={name} size={38} />
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
                      {r.active_now > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          {r.active_now} live
                        </span>
                      )}
                      {r.avg_rating != null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-full px-2 py-0.5 tabular-nums">
                          <Star className="h-3 w-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                          {r.avg_rating.toFixed(1)}
                        </span>
                      )}
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

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#FAF6FB] text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Representative</th>
                    <th className="py-3 px-4">Live now</th>
                    <th className="py-3 px-4">Handled</th>
                    <th className="py-3 px-4">Avg first reply</th>
                    <th className="py-3 px-4">Avg resolution</th>
                    <th className="py-3 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const name = fullName(r.first_name, r.last_name, 'Rep')
                    return (
                      <tr key={r.staff_id} className="hover:bg-[#FAF6FB]/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <RepAvatar src={r.avatar_url} name={name} size={34} />
                            <span className="font-semibold text-gray-900 text-[13px]">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          {r.active_now > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] text-white px-2.5 py-0.5 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              {r.active_now} live
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {r.handled}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {formatDuration(r.avg_response_seconds)}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {formatDuration(r.avg_resolution_seconds)}
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          {r.avg_rating != null ? (
                            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#7B2D8E]">
                              <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                              {r.avg_rating.toFixed(1)}
                              <span className="text-gray-400 font-normal text-[11px]">
                                ({r.ratings_count})
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
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
