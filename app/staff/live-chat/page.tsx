'use client'

// ---------------------------------------------------------------------------
// Staff Live Chat Software Console
// ---------------------------------------------------------------------------
// Full-height, full-bleed 3-pane workspace:
//   1. Left Inbox Rail   — search, segmented queue tabs (All / Waiting / Mine
//                          / Team), unread counts, visitor location preview,
//                          sound toggle & front-desk identity dialog.
//   2. Center Stage      — crisp conversation header, centered join/handover
//                          milestones, hairline leave/end dividers, grouped
//                          message bubbles, quick replies & composer.
//   3. Right Inspector   — Visitor Environment (Location, Browser, OS, Device,
//                          Screen, Timezone, Current Page, IP) for anonymous
//                          guests & members, plus Wallet / Bookings / Txns.
// ---------------------------------------------------------------------------

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  Download,
  Globe,
  Inbox,
  List,
  Loader2,
  MapPin,
  PanelRight,
  PhoneOff,
  Search,
  Send,
  Settings,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveSupportId } from '@/lib/support-and-chat'
import {
  fetchLiveChatSoundPreference,
  playLiveChatChime,
  saveLiveChatSoundPreference,
  unlockLiveChatAudio,
} from '@/lib/live-chat-sound'
import {
  formatChatTimestamp,
  formatLiveChatTranscriptText,
  getVisitorPresence,
  type VisitorMetadata,
  type VisitorPresenceInfo,
} from '@/lib/visitor-telemetry'
import { RepAvatar } from '@/components/shared/derma-inline-live-chat'
import { useNotify } from '@/components/shared/notify'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LiveChatInspector,
  type InspectorContextData,
} from '@/components/staff/live-chat-inspector'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('failed')
    return r.json()
  })

// --- Types ----------------------------------------------------------------

interface QueueItem {
  id: string
  support_code?: string | null
  user_id: string | null
  is_guest?: boolean
  visitor_location?: string | null
  visitor_browser?: string | null
  visitor_device?: string | null
  assigned_staff_id?: string | null
  assigned_staff_name?: string | null
  assigned_staff_avatar_url?: string | null
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  initial_topic: string | null
  escalated_at: string
  accepted_at: string | null
  last_activity_at: string
  customer_last_seen_at?: string | null
  customer_typing_at?: string | null
  user_first_name: string
  user_last_name: string
  user_avatar_url: string | null
  unread_user_messages: number
}

interface Message {
  id: string
  session_id: string
  sender_role: 'user' | 'staff' | 'system'
  sender_id?: string | null
  sender_name?: string | null
  sender_avatar_url?: string | null
  body: string
  created_at: string
}

interface FullSession {
  id: string
  supportCode?: string | null
  support_code?: string | null
  assigned_staff_id?: string | null
  isAssignedToMe?: boolean
  isGuest?: boolean
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  initial_topic: string | null
  escalated_at: string
  accepted_at: string | null
  closed_at: string | null
  closed_by?: string | null
  last_activity_at?: string | null
  customer_last_seen_at?: string | null
  customer_typing_at?: string | null
  service_rating: number | null
  staff_rating: number | null
  rating_comment: string | null
  visitor?: Partial<VisitorMetadata> | null
  user: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatarUrl: string | null
  }
  staff: {
    id?: string
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

type InboxTab = 'all' | 'waiting' | 'mine' | 'team'

const QUICK_REPLIES = [
  {
    label: 'Warm greeting',
    build: (repName: string) =>
      `Hello! My name is ${repName || 'Customer Care'}, and I will be happy to assist you today.`,
  },
  {
    label: 'Checking booking',
    build: () =>
      'Thank you for sharing those details. Please give me a moment while I check your booking.',
  },
  {
    label: 'Payment check',
    build: () =>
      'I am reviewing your payment record right now and will update you shortly.',
  },
  {
    label: 'Anything else?',
    build: () =>
      'Is there anything else I can help you with today before we wrap up?',
  },
] as const

const AVATAR_SLUGS = [
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'f9',
  'f10',
  'f11',
] as const

function formatRelativeWait(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const ms = Date.now() - new Date(iso).getTime()
    const min = Math.max(0, Math.floor(ms / 60000))
    if (min < 1) return 'now'
    if (min < 60) return `${min}m`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  } catch {
    return ''
  }
}

function isJoinMilestone(body: string): boolean {
  return /\b(joined the chat|took over the chat)\b/i.test(body)
}

// --- Main Page ------------------------------------------------------------

export default function StaffLiveChatPage() {
  const notify = useNotify()
  const [selected, setSelected] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inboxTab, setInboxTab] = useState<InboxTab>('all')
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false)

  const trimmedQuery = searchQuery.trim()
  const queueUrl =
    trimmedQuery.length >= 2
      ? `/api/staff/live-chat/queue?q=${encodeURIComponent(trimmedQuery)}`
      : '/api/staff/live-chat/queue'

  const queueQuery = useSWR<{
    waiting: QueueItem[]
    mine: QueueItem[]
    others?: QueueItem[]
    searchResults?: QueueItem[]
    currentUserId?: string
  }>(queueUrl, fetcher, { refreshInterval: 5000, revalidateOnFocus: true })

  const profileQuery = useSWR<{ profile: StaffProfile }>(
    '/api/staff/profile',
    fetcher,
  )

  const [soundEnabled, setSoundEnabled] = useState(true)
  const queueHydratedRef = useRef(false)
  const seenWaitingIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let activeMount = true
    void fetchLiveChatSoundPreference('staff').then((enabled) => {
      if (activeMount) setSoundEnabled(enabled)
    })
    return () => {
      activeMount = false
    }
  }, [])

  const toggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    void saveLiveChatSoundPreference('staff', next)
    if (next) {
      unlockLiveChatAudio()
      window.setTimeout(() => playLiveChatChime('reply'), 30)
      notify.info('Sound enabled', 'You will hear alerts for new chats and replies.')
    } else {
      notify.info('Sound muted', 'Notification chimes are muted.')
    }
  }, [soundEnabled, notify])

  // Gentle chime when a new customer joins the waiting queue
  useEffect(() => {
    const waiting = queueQuery.data?.waiting
    if (!waiting) return
    if (!queueHydratedRef.current) {
      queueHydratedRef.current = true
      seenWaitingIdsRef.current = new Set(waiting.map((w) => w.id))
      return
    }
    let hasNewWaiting = false
    for (const w of waiting) {
      if (!seenWaitingIdsRef.current.has(w.id)) {
        seenWaitingIdsRef.current.add(w.id)
        hasNewWaiting = true
      }
    }
    if (hasNewWaiting) {
      playLiveChatChime('queue', 'staff')
    }
  }, [queueQuery.data?.waiting])

  // Auto-select first open session on desktop only
  useEffect(() => {
    if (selected) return
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return
    const data = queueQuery.data
    if (!data) return
    const candidate = data.waiting[0] || data.mine[0] || data.others?.[0]
    if (candidate) setSelected(candidate.id)
  }, [selected, queueQuery.data])

  const waiting = useMemo(() => queueQuery.data?.waiting || [], [queueQuery.data?.waiting])
  const mine = useMemo(() => queueQuery.data?.mine || [], [queueQuery.data?.mine])
  const others = useMemo(() => queueQuery.data?.others || [], [queueQuery.data?.others])
  const searchResults = useMemo(
    () => queueQuery.data?.searchResults || [],
    [queueQuery.data?.searchResults],
  )
  const totalOpen = waiting.length + mine.length + others.length

  const visibleRows = useMemo(() => {
    if (trimmedQuery.length >= 2) return searchResults
    if (inboxTab === 'waiting') return waiting
    if (inboxTab === 'mine') return mine
    if (inboxTab === 'team') return others
    return [...waiting, ...mine, ...others]
  }, [trimmedQuery, searchResults, inboxTab, waiting, mine, others])

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-white">
      {/* =================================================================
          PANE 1 — LEFT INBOX RAIL
      ================================================================= */}
      <aside
        className={cn(
          'w-full lg:w-[320px] xl:w-[344px] shrink-0 flex flex-col border-r border-gray-200 bg-white min-h-0',
          selected ? 'hidden lg:flex' : 'flex',
        )}
      >
        {/* Rail Header */}
        <div className="h-[68px] shrink-0 px-3.5 border-b border-gray-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/staff"
              aria-label="Back to staff dashboard"
              title="Back to dashboard"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] flex items-center justify-center shrink-0 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-semibold text-gray-900 tracking-tight truncate">
                  Live Chat
                </h1>
                <span className="text-[11px] font-semibold text-[#7B2D8E] tabular-nums">
                  {totalOpen} open
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {waiting.length > 0
                  ? `${waiting.length} waiting in queue`
                  : 'Front-desk support inbox'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Mute notification sounds' : 'Unmute notification sounds'}
              title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
              className={cn(
                'w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer',
                soundEnabled
                  ? 'border-[#7B2D8E]/25 bg-[#FAF6FB] text-[#7B2D8E] hover:border-[#7B2D8E]/50'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-gray-700',
              )}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                unlockLiveChatAudio()
                setShowProfileDialog(true)
              }}
              aria-label="Edit your front-desk identity"
              title={profileQuery.data?.profile?.displayName || 'Edit identity'}
              className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] transition-colors cursor-pointer"
            >
              {profileQuery.data?.profile ? (
                <RepAvatar
                  src={profileQuery.data.profile.avatarUrl}
                  name={profileQuery.data.profile.displayName}
                  size={26}
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-[#FAF6FB] text-[#7B2D8E] flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="text-[11.5px] font-medium text-gray-700 max-w-[78px] truncate">
                {profileQuery.data?.profile?.displayName || 'Identity'}
              </span>
            </button>
          </div>
        </div>

        {/* Search + Segmented Filter Tabs */}
        <div className="px-3.5 pt-3 pb-2.5 border-b border-gray-100 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Support ID, client, or topic…"
              className="w-full rounded-xl border border-gray-200 bg-[#FBF9FC] pl-8 pr-8 py-2 text-base sm:text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {trimmedQuery.length < 2 && (
            <div
              role="tablist"
              aria-label="Conversation queue filters"
              className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#FAF6FB] border border-gray-200/80"
            >
              {(
                [
                  { id: 'all', label: 'All', count: totalOpen },
                  { id: 'waiting', label: 'Queue', count: waiting.length },
                  { id: 'mine', label: 'Mine', count: mine.length },
                  { id: 'team', label: 'Team', count: others.length },
                ] as const
              ).map((tab) => {
                const active = inboxTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setInboxTab(tab.id)}
                    className={cn(
                      'px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer',
                      active
                        ? 'bg-[#7B2D8E] text-white'
                        : 'text-gray-600 hover:text-[#7B2D8E]',
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'text-[10px] tabular-nums',
                        active ? 'text-white/85' : 'text-gray-400',
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {queueQuery.isLoading && visibleRows.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
              Loading conversations…
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-[13px] font-semibold text-gray-900">
                {trimmedQuery.length >= 2
                  ? 'No matching chats'
                  : inboxTab === 'waiting'
                    ? 'Queue is clear'
                    : inboxTab === 'mine'
                      ? 'No active chats assigned'
                      : inboxTab === 'team'
                        ? 'No team chats right now'
                        : 'No open live chats'}
              </p>
              <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
                {trimmedQuery.length >= 2
                  ? 'Try another Support ID (DS-LC-…), client name, or email.'
                  : 'New customer requests from Derma AI appear here automatically.'}
              </p>
            </div>
          ) : (
            visibleRows.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                selected={selected === item.id}
                onSelect={() => {
                  unlockLiveChatAudio()
                  setSelected(item.id)
                  setMobileInspectorOpen(false)
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* =================================================================
          PANE 2 + PANE 3 — CONVERSATION STAGE & VISITOR INSPECTOR
      ================================================================= */}
      <div
        className={cn(
          'flex-1 min-w-0 flex overflow-hidden bg-[#FBF9FC]',
          selected ? 'flex' : 'hidden lg:flex',
        )}
      >
        <ConversationStage
          sessionId={selected}
          currentUserId={queueQuery.data?.currentUserId || null}
          myDisplayName={profileQuery.data?.profile?.displayName || ''}
          inspectorOpen={inspectorOpen}
          mobileInspectorOpen={mobileInspectorOpen}
          onToggleInspector={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1280) {
              setMobileInspectorOpen((v) => !v)
            } else {
              setInspectorOpen((v) => !v)
            }
          }}
          onCloseMobileInspector={() => setMobileInspectorOpen(false)}
          onBack={() => {
            setSelected(null)
            setMobileInspectorOpen(false)
          }}
          onAccepted={() => queueQuery.mutate()}
          onClosed={() => {
            queueQuery.mutate()
            setSelected(null)
            setMobileInspectorOpen(false)
          }}
          waitingCount={waiting.length}
        />
      </div>

      {/* Staff Identity Dialog */}
      <ProfileDialog
        open={showProfileDialog}
        profile={profileQuery.data?.profile || null}
        onOpenChange={setShowProfileDialog}
        onSaved={() => {
          profileQuery.mutate()
          globalMutate('/api/staff/live-chat/queue')
          notify.success(
            'Identity updated',
            'Your display name and avatar are live for new replies.',
          )
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// InboxRow
// ---------------------------------------------------------------------------

function InboxRow({
  item,
  selected,
  onSelect,
}: {
  item: QueueItem
  selected: boolean
  onSelect: () => void
}) {
  const fullName = `${item.user_first_name || 'Guest'} ${item.user_last_name || ''}`.trim()
  const initials = `${item.user_first_name?.[0] || '?'}${item.user_last_name?.[0] || ''}`.toUpperCase()
  const supportCode = resolveSupportId(item.support_code, item.id)
  const isGuest = Boolean(item.is_guest || !item.user_id)
  const isWaiting = item.status === 'waiting'
  const waited = formatRelativeWait(item.last_activity_at || item.escalated_at)
  const itemPresence = getVisitorPresence({
    status: item.status,
    lastSeenAt: item.customer_last_seen_at,
    lastActivityAt: item.last_activity_at,
  })

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors cursor-pointer',
        selected
          ? 'bg-[#FAF6FB]'
          : 'bg-white hover:bg-[#FBF9FC]',
      )}
    >
      {/* Avatar + live status indicator */}
      <div className="relative shrink-0 mt-0.5">
        {item.user_avatar_url ? (
          <Image
            src={item.user_avatar_url}
            alt={fullName}
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
          title={itemPresence.label}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            itemPresence.state === 'online'
              ? 'bg-[#7B2D8E]'
              : isWaiting
                ? 'bg-[#7B2D8E]/55'
                : 'bg-gray-300',
          )}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={cn(
                'text-[13.5px] font-semibold truncate',
                selected ? 'text-[#7B2D8E]' : 'text-gray-900',
              )}
            >
              {fullName}
            </p>
            {isGuest && (
              <span className="text-[10px] font-medium text-[#7B2D8E] shrink-0">
                · Guest
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.unread_user_messages > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                {item.unread_user_messages}
              </span>
            )}
            <span className="text-[10.5px] text-gray-400 tabular-nums">
              {waited}
            </span>
          </div>
        </div>

        <p className="text-[12px] text-gray-600 line-clamp-1 mt-0.5 leading-snug">
          {item.initial_topic || 'Customer inquiry'}
        </p>

        <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-gray-400 truncate">
          <span className="font-mono font-medium text-[#7B2D8E]">
            {supportCode}
          </span>
          {item.visitor_location && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5 text-gray-500 truncate">
                <MapPin className="w-2.5 h-2.5 text-[#7B2D8E] shrink-0" />
                <span className="truncate">{item.visitor_location}</span>
              </span>
            </>
          )}
          {!item.visitor_location && item.assigned_staff_name && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-gray-500">
                With {item.assigned_staff_name}
              </span>
            </>
          )}
          {!item.visitor_location && !item.assigned_staff_name && isWaiting && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#7B2D8E] font-medium">Waiting</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ConversationStage (Center Pane + Docked / Drawer Right Inspector)
// ---------------------------------------------------------------------------

function ConversationStage({
  sessionId,
  currentUserId,
  myDisplayName,
  inspectorOpen,
  mobileInspectorOpen,
  onToggleInspector,
  onCloseMobileInspector,
  onBack,
  onAccepted,
  onClosed,
  waitingCount,
}: {
  sessionId: string | null
  currentUserId: string | null
  myDisplayName: string
  inspectorOpen: boolean
  mobileInspectorOpen: boolean
  onToggleInspector: () => void
  onCloseMobileInspector: () => void
  onBack: () => void
  onAccepted: () => void
  onClosed: () => void
  waitingCount: number
}) {
  const notify = useNotify()

  const sessionQuery = useSWR<{
    session: FullSession
    customerTyping?: boolean
    presence?: VisitorPresenceInfo
  }>(
    sessionId ? `/api/staff/live-chat/sessions/${sessionId}` : null,
    fetcher,
    { refreshInterval: 5000 },
  )
  const contextQuery = useSWR<InspectorContextData>(
    sessionId ? `/api/staff/live-chat/sessions/${sessionId}/user-context` : null,
    fetcher,
  )

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [closing, setClosing] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerTyping, setCustomerTyping] = useState(false)
  const [livePresence, setLivePresence] = useState<VisitorPresenceInfo | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const typingSentAtRef = useRef<number>(0)
  const typingIdleTimerRef = useRef<number | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const lastSeenRef = useRef<string | null>(null)
  const seenMsgIdsRef = useRef<Set<string>>(new Set())

  const postStaffTyping = useCallback(
    (isTyping: boolean) => {
      if (!sessionId) return
      fetch(`/api/staff/live-chat/sessions/${sessionId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isTyping, displayName: myDisplayName || undefined }),
      }).catch(() => {})
    },
    [sessionId, myDisplayName],
  )

  const notifyStaffTyping = useCallback(
    (isTyping: boolean) => {
      if (!sessionId) return
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current)
        typingIdleTimerRef.current = null
      }
      if (!isTyping) {
        typingSentAtRef.current = 0
        postStaffTyping(false)
        return
      }
      const now = Date.now()
      if (now - typingSentAtRef.current >= 2200) {
        typingSentAtRef.current = now
        postStaffTyping(true)
      }
      typingIdleTimerRef.current = window.setTimeout(() => {
        typingSentAtRef.current = 0
        postStaffTyping(false)
      }, 4500)
    },
    [sessionId, postStaffTyping],
  )

  const refetchAll = useCallback(async (id: string) => {
    const res = await fetch(
      `/api/staff/live-chat/sessions/${id}/messages`,
      { credentials: 'include', cache: 'no-store' },
    )
    if (!res.ok) return
    const json = (await res.json()) as {
      messages: Message[]
      customerTyping?: boolean
      presence?: VisitorPresenceInfo
    }
    seenMsgIdsRef.current = new Set(json.messages.map((m) => m.id))
    setMessages(json.messages)
    setCustomerTyping(Boolean(json.customerTyping))
    if (json.presence) setLivePresence(json.presence)
    const last = json.messages[json.messages.length - 1]
    lastSeenRef.current = last?.created_at || null
  }, [])

  const isNearBottomRef = useRef<boolean>(true)
  const prevMsgCountRef = useRef<number>(0)
  const forceScrollRef = useRef<boolean>(true)
  const sessionStatusRef = useRef<FullSession['status'] | undefined>(
    sessionQuery.data?.session?.status,
  )
  sessionStatusRef.current = sessionQuery.data?.session?.status
  const mutateSession = sessionQuery.mutate

  const handleFeedScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distFromBottom < 120
  }, [])

  // Reset state on session switch
  useEffect(() => {
    setDraft('')
    setError(null)
    setEndDialogOpen(false)
    setShowQuickReplies(false)
    setCustomerTyping(false)
    setLivePresence(null)
    setMessages([])
    seenMsgIdsRef.current = new Set()
    lastSeenRef.current = null
    typingSentAtRef.current = 0
    isNearBottomRef.current = true
    prevMsgCountRef.current = 0
    forceScrollRef.current = true
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current)
      typingIdleTimerRef.current = null
    }
    if (sessionId) void refetchAll(sessionId)
  }, [sessionId, refetchAll])

  // Incremental message + presence + typing + closed-state polling (1.5s)
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const since = lastSeenRef.current
          ? `?since=${encodeURIComponent(lastSeenRef.current)}`
          : ''
        const res = await fetch(
          `/api/staff/live-chat/sessions/${sessionId}/messages${since}`,
          { credentials: 'include', cache: 'no-store' },
        )
        if (!res.ok || cancelled) return
        const json = (await res.json()) as {
          messages: Message[]
          customerTyping?: boolean
          presence?: VisitorPresenceInfo
          sessionStatus?: FullSession['status']
          closedBy?: string | null
        }
        setCustomerTyping(Boolean(json.customerTyping))
        if (json.presence) setLivePresence(json.presence)
        // If customer (or admin) ended the chat while staff is viewing it,
        // refresh session metadata immediately so "Customer ended this chat" renders live.
        if (
          (json.sessionStatus === 'closed' || json.sessionStatus === 'abandoned') &&
          sessionStatusRef.current !== json.sessionStatus
        ) {
          void mutateSession()
          void globalMutate('/api/staff/live-chat/queue')
        }
        if (json.messages.length === 0) return

        let hasNewUserMessage = false
        for (const m of json.messages) {
          if (!seenMsgIdsRef.current.has(m.id)) {
            seenMsgIdsRef.current.add(m.id)
            if (m.sender_role === 'user') hasNewUserMessage = true
          }
        }
        if (hasNewUserMessage) {
          playLiveChatChime('reply', 'staff')
        }

        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const m of json.messages) {
            if (!seen.has(m.id)) merged.push(m)
          }
          return merged
        })
        const last = json.messages[json.messages.length - 1]
        if (last) lastSeenRef.current = last.created_at
      } catch {
        // Retry next cycle
      }
    }

    const interval = window.setInterval(tick, 1500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [sessionId, mutateSession])

  // Smart auto-scroll: only scroll on session open, when staff sends a message,
  // or when new messages arrive while already near the bottom — never hijack scroll-up.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const hasNewMessages = messages.length > prevMsgCountRef.current
    prevMsgCountRef.current = messages.length
    if (forceScrollRef.current || (hasNewMessages && isNearBottomRef.current)) {
      forceScrollRef.current = false
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  const session = sessionQuery.data?.session
  const effectivePresence: VisitorPresenceInfo | null = useMemo(() => {
    if (livePresence) return livePresence
    if (sessionQuery.data?.presence) return sessionQuery.data.presence
    if (!session) return null
    return getVisitorPresence({
      status: session.status,
      lastSeenAt: session.customer_last_seen_at,
      lastActivityAt: session.last_activity_at,
    })
  }, [livePresence, sessionQuery.data?.presence, session])
  const effectiveCustomerTyping =
    customerTyping || Boolean(sessionQuery.data?.customerTyping)

  const accept = useCallback(async () => {
    if (!sessionId) return
    setAccepting(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.error || 'Could not accept this chat.'
        setError(msg)
        notify.error('Could not accept chat', msg)
        return
      }
      await sessionQuery.mutate()
      await refetchAll(sessionId)
      onAccepted()
      notify.success('Chat accepted', 'You are now connected with the visitor.')
      window.setTimeout(() => composerRef.current?.focus(), 60)
    } finally {
      setAccepting(false)
    }
  }, [sessionId, sessionQuery, refetchAll, onAccepted, notify])

  const takeover = useCallback(async () => {
    if (!sessionId) return
    setTakingOver(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'takeover' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.error || 'Could not take over this chat.'
        setError(msg)
        notify.error('Takeover failed', msg)
        return
      }
      await sessionQuery.mutate()
      await refetchAll(sessionId)
      onAccepted()
      notify.success('Chat assigned to you', 'Customer has been notified smoothly.')
      window.setTimeout(() => composerRef.current?.focus(), 60)
    } finally {
      setTakingOver(false)
    }
  }, [sessionId, sessionQuery, refetchAll, onAccepted, notify])

  const closeChat = useCallback(async () => {
    if (!sessionId) return
    setClosing(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.error || 'Could not end this chat.'
        setError(msg)
        notify.error('Could not end chat', msg)
        return
      }
      setEndDialogOpen(false)
      notify.info('Live chat ended', 'The session has been closed and transcript dispatched.')
      onClosed()
    } finally {
      setClosing(false)
    }
  }, [sessionId, onClosed, notify])

  const send = useCallback(async () => {
    const body = draft.trim()
    if (!body || !sessionId || sending) return
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
        setError(json.error || 'Could not send message.')
        return
      }
      setDraft('')
      setShowQuickReplies(false)
      notifyStaffTyping(false)
      const json = (await res.json().catch(() => null)) as {
        message: Message
      } | null
      if (json?.message) {
        seenMsgIdsRef.current.add(json.message.id)
        setMessages((prev) =>
          prev.some((m) => m.id === json.message.id)
            ? prev
            : [...prev, json.message],
        )
        lastSeenRef.current = json.message.created_at
      }
    } catch {
      setError('Network error while sending.')
    } finally {
      setSending(false)
    }
  }, [draft, sessionId, sending, notifyStaffTyping])

  // Empty state (no conversation selected)
  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FBF9FC]">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-white border border-gray-200 text-[#7B2D8E] flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6" />
          </div>
          <h2 className="text-[16px] font-semibold text-gray-900">
            Select a conversation
          </h2>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
            {waitingCount > 0
              ? `${waitingCount} customer${waitingCount === 1 ? ' is' : 's are'} waiting in the queue. Pick a chat on the left to connect right away.`
              : 'Choose any conversation from the inbox on the left to reply, inspect visitor details, or take over from a teammate.'}
          </p>
        </div>
      </div>
    )
  }

  if (sessionQuery.error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FBF9FC]">
        <div className="text-center max-w-xs space-y-2.5">
          <AlertCircle className="w-7 h-7 text-[#7B2D8E] mx-auto" />
          <p className="text-[15px] font-semibold text-gray-900">
            Could not load conversation
          </p>
          <p className="text-[12.5px] text-gray-500">
            This session may have been removed or closed.
          </p>
          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => sessionQuery.mutate()}
              className="rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 px-4 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (sessionQuery.isLoading || !session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FBF9FC]">
        <div className="flex items-center gap-2 text-[13px] text-gray-500">
          <Loader2 className="w-4 h-4 text-[#7B2D8E] animate-spin" />
          Loading conversation…
        </div>
      </div>
    )
  }

  const isWaiting = session.status === 'waiting'
  const isClosed = session.status === 'closed' || session.status === 'abandoned'
  const isAssignedToOther =
    session.status === 'active' &&
    Boolean(session.assigned_staff_id) &&
    session.isAssignedToMe === false
  const supportCode = resolveSupportId(
    session.supportCode || session.support_code,
    session.id,
  )
  const customerFullName =
    `${session.user.firstName || 'Guest'} ${session.user.lastName || ''}`.trim()
  const visitor = contextQuery.data?.visitor || session.visitor || null
  const envSubtitle = [visitor?.location, visitor?.browser, visitor?.device]
    .filter(Boolean)
    .join(' · ')

  const copySupportCode = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(supportCode)
      .then(() => {
        setCopiedId(true)
        notify.info('Support ID copied', supportCode)
        window.setTimeout(() => setCopiedId(false), 1800)
      })
      .catch(() => {})
  }

  const downloadTranscript = () => {
    const text = formatLiveChatTranscriptText({
      supportCode,
      customerName: customerFullName,
      customerEmail: session.user.email,
      topic: session.initial_topic,
      status: session.status,
      visitor,
      messages,
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

  return (
    <>
      {/* Center Conversation Column */}
      <section className="flex-1 min-w-0 flex flex-col h-full bg-[#FBF9FC] overflow-hidden">
        {/* Crisp White Top Header (matching reference clarity) */}
        <header className="h-[68px] shrink-0 bg-white border-b border-gray-200 px-3.5 sm:px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to inbox"
              className="lg:hidden w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <UserAvatar
              firstName={session.user.firstName}
              lastName={session.user.lastName}
              url={session.user.avatarUrl}
              status={session.status}
              presenceState={effectivePresence?.state}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-[15px] font-semibold text-gray-900 truncate">
                  {customerFullName}
                </h2>
                {session.isGuest && (
                  <span className="text-[11px] font-medium text-[#7B2D8E] shrink-0">
                    Anonymous
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5 truncate">
                <span
                  className={cn(
                    'font-medium shrink-0',
                    effectivePresence?.state === 'online' || isWaiting
                      ? 'text-[#7B2D8E]'
                      : 'text-gray-500',
                  )}
                >
                  {isClosed
                    ? session.closed_by === 'user'
                      ? 'Ended by customer'
                      : session.closed_by === 'admin'
                        ? 'Ended by admin'
                        : 'Ended'
                    : effectivePresence?.label ||
                      (session.status === 'active'
                        ? 'Online'
                        : 'Waiting in queue')}
                </span>
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={copySupportCode}
                  title="Copy Support ID"
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#7B2D8E] hover:opacity-80 cursor-pointer shrink-0"
                >
                  <span>{supportCode}</span>
                  {copiedId && <Check className="w-3 h-3 text-[#7B2D8E]" />}
                </button>
                {envSubtitle && (
                  <>
                    <span className="hidden md:inline text-gray-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1 text-gray-500 truncate">
                      <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{envSubtitle}</span>
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
              aria-label="Download chat transcript"
              title="Download transcript"
              className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {!isWaiting && !isClosed && !isAssignedToOther && (
              <button
                type="button"
                onClick={() => setEndDialogOpen(true)}
                disabled={closing}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full border border-[#7B2D8E]/25 bg-white text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#FAF6FB] hover:border-[#7B2D8E]/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleInspector}
              aria-label="Toggle visitor and customer details"
              title="Toggle visitor & customer details"
              className={cn(
                'w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer',
                inspectorOpen || mobileInspectorOpen
                  ? 'border-[#7B2D8E]/30 bg-[#FAF6FB] text-[#7B2D8E]'
                  : 'border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40',
              )}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Handover or Topic Context Bar */}
        {isAssignedToOther && session.staff && (
          <div className="px-4 sm:px-5 py-2 bg-[#FAF6FB] border-b border-[#7B2D8E]/15 flex items-center gap-2.5 shrink-0">
            <RepAvatar
              src={session.staff.avatarUrl}
              name={session.staff.displayName}
              size={22}
            />
            <p className="text-[12px] text-[#7B2D8E] truncate">
              Currently handled by{' '}
              <span className="font-semibold">{session.staff.displayName}</span> —
              reviewing conversation history.
            </p>
          </div>
        )}

        {session.initial_topic && (
          <div className="px-4 sm:px-5 py-2 bg-white border-b border-gray-100 text-[12px] text-gray-600 flex items-center gap-2 shrink-0">
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
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 min-h-0"
        >
          <div className="max-w-3xl mx-auto space-y-1">
            {messages.map((m, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null
              const next = idx < messages.length - 1 ? messages[idx + 1] : null
              const sameSenderAsPrev = Boolean(
                prev &&
                  prev.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  prev.sender_role === m.sender_role &&
                  (prev.sender_id || null) === (m.sender_id || null) &&
                  Math.abs(
                    new Date(m.created_at).getTime() -
                      new Date(prev.created_at).getTime(),
                  ) < 180000,
              )
              const sameSenderAsNext = Boolean(
                next &&
                  next.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  next.sender_role === m.sender_role &&
                  (next.sender_id || null) === (m.sender_id || null) &&
                  Math.abs(
                    new Date(next.created_at).getTime() -
                      new Date(m.created_at).getTime(),
                  ) < 180000,
              )

              return (
                <div
                  key={m.id}
                  className={cn(
                    sameSenderAsPrev ? 'pt-0.5' : idx === 0 ? '' : 'pt-3.5',
                  )}
                >
                  <MessageRow
                    message={m}
                    currentUserId={currentUserId}
                    userName={customerFullName}
                    userAvatarUrl={session.user.avatarUrl}
                    staffFallback={session.staff}
                    isFirstInGroup={!sameSenderAsPrev}
                    isLastInGroup={!sameSenderAsNext}
                  />
                </div>
              )
            })}

            {effectiveCustomerTyping && !isClosed && (
              <div
                className="flex items-end gap-2.5 pt-3"
                role="status"
                aria-live="polite"
                aria-label={`${session.user.firstName || 'Visitor'} is replying`}
              >
                <div className="w-7 shrink-0">
                  {session.user.avatarUrl ? (
                    <Image
                      src={session.user.avatarUrl}
                      alt={customerFullName}
                      width={28}
                      height={28}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[10px] font-semibold">
                      {(customerFullName?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/70 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/45 animate-bounce" />
                  <span className="sr-only">
                    {session.user.firstName || 'Visitor'} is replying
                  </span>
                </div>
              </div>
            )}

            {isWaiting && (
              <div className="flex justify-center pt-5">
                <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 px-4 py-2 rounded-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B2D8E]" />
                  Visitor is waiting — accept below to join the chat.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer / Action Bar */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-3.5 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-2.5 px-3 py-2 rounded-xl bg-[#FDF2F2] border border-[#C63D3D]/25 text-[12px] text-[#C63D3D] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                  className="p-0.5 text-[#C63D3D]/70 hover:text-[#C63D3D] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isWaiting ? (
              <button
                type="button"
                onClick={accept}
                disabled={accepting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white py-2.5 px-5 text-[13.5px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {accepting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Accept &amp; join as {myDisplayName || 'representative'}
              </button>
            ) : isAssignedToOther ? (
              <div className="space-y-2">
                <p className="text-[11.5px] text-gray-500 text-center">
                  Taking over reassigns{' '}
                  <span className="font-mono font-semibold text-[#7B2D8E]">
                    {supportCode}
                  </span>{' '}
                  to you and notifies the visitor smoothly.
                </p>
                <button
                  type="button"
                  onClick={takeover}
                  disabled={takingOver}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white py-2.5 px-5 text-[13.5px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {takingOver ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  Take over chat as {myDisplayName || 'representative'}
                </button>
              </div>
            ) : isClosed ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 py-0.5">
                <div className="flex items-center gap-2.5 text-[12.5px] text-gray-600">
                  <span className={cn(session.closed_by === 'user' && 'font-semibold text-[#7B2D8E]')}>
                    {session.closed_by === 'user'
                      ? 'Customer ended this chat.'
                      : session.closed_by === 'admin'
                        ? 'Ended by admin.'
                        : 'This conversation has ended.'}
                  </span>
                  {session.service_rating != null && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E] tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                      {session.service_rating}/5
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={takeover}
                  disabled={takingOver}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/30 bg-[#FAF6FB] hover:bg-[#7B2D8E] text-[#7B2D8E] hover:text-white px-4 py-2 text-[12px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {takingOver ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  )}
                  Reopen &amp; take over
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {showQuickReplies && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {supportCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(
                            `Please keep your support reference ID ${supportCode} for future reference.`,
                          )
                          setShowQuickReplies(false)
                          composerRef.current?.focus()
                        }}
                        className="px-3 py-1.5 rounded-full border border-[#7B2D8E]/35 bg-white hover:bg-[#7B2D8E] text-[11.5px] font-semibold text-[#7B2D8E] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Share reference ID
                      </button>
                    )}
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr.label}
                        type="button"
                        onClick={() => {
                          setDraft(qr.build(myDisplayName))
                          setShowQuickReplies(false)
                          composerRef.current?.focus()
                        }}
                        className="px-3 py-1.5 rounded-full border border-[#7B2D8E]/25 bg-[#FAF6FB] hover:bg-[#7B2D8E] text-[11.5px] font-medium text-[#7B2D8E] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#FBF9FC] focus-within:bg-white focus-within:border-[#7B2D8E] px-2.5 py-2 transition-colors">
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies((v) => !v)}
                    aria-label="Toggle quick replies"
                    title="Quick replies"
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                      showQuickReplies
                        ? 'bg-[#7B2D8E] text-white'
                        : 'text-gray-500 hover:text-[#7B2D8E] hover:bg-[#FAF6FB]',
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => {
                      const val = e.target.value
                      setDraft(val)
                      notifyStaffTyping(val.trim().length > 0)
                    }}
                    onBlur={() => notifyStaffTyping(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        forceScrollRef.current = true
                        isNearBottomRef.current = true
                        void send()
                      }
                    }}
                    placeholder={`Reply to ${session.user.firstName || 'visitor'}…`}
                    rows={1}
                    className="flex-1 min-w-0 resize-none bg-transparent py-1.5 px-1 text-base sm:text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-32 leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      forceScrollRef.current = true
                      isNearBottomRef.current = true
                      void send()
                    }}
                    disabled={!draft.trim() || sending}
                    aria-label="Send message"
                    className="shrink-0 w-9 h-9 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 transition-colors cursor-pointer"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Docked Right Inspector (xl+) */}
      {inspectorOpen && (
        <div className="hidden xl:block w-[328px] 2xl:w-[348px] shrink-0 border-l border-gray-200 h-full overflow-hidden">
          <LiveChatInspector
            customerName={customerFullName}
            customerEmail={session.user.email}
            customerPhone={session.user.phone}
            customerAvatarUrl={session.user.avatarUrl}
            supportCode={supportCode}
            isGuest={Boolean(session.isGuest)}
            topic={session.initial_topic}
            escalatedAt={session.escalated_at}
            rating={session.service_rating}
            ratingComment={session.rating_comment}
            visitorFallback={session.visitor}
            presence={effectivePresence}
            customerTyping={effectiveCustomerTyping}
            assignedStaffName={session.staff?.displayName || null}
            data={contextQuery.data}
            loading={contextQuery.isLoading}
            onDownloadTranscript={downloadTranscript}
          />
        </div>
      )}

      {/* Slide-over Inspector Drawer for < xl viewports */}
      {mobileInspectorOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobileInspector}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-[360px] h-full bg-white border-l border-gray-200">
            <LiveChatInspector
              customerName={customerFullName}
              customerEmail={session.user.email}
              customerPhone={session.user.phone}
              customerAvatarUrl={session.user.avatarUrl}
              supportCode={supportCode}
              isGuest={Boolean(session.isGuest)}
              topic={session.initial_topic}
              escalatedAt={session.escalated_at}
              rating={session.service_rating}
              ratingComment={session.rating_comment}
              visitorFallback={session.visitor}
              presence={effectivePresence}
              customerTyping={effectiveCustomerTyping}
              assignedStaffName={session.staff?.displayName || null}
              data={contextQuery.data}
              loading={contextQuery.isLoading}
              onDownloadTranscript={downloadTranscript}
              onClose={onCloseMobileInspector}
            />
          </div>
        </div>
      )}

      {/* Brand-Purple End Chat Action Prompt */}
      <ConfirmDialog
        open={endDialogOpen}
        onCancel={() => setEndDialogOpen(false)}
        title="End this live chat?"
        description={
          <>
            Close{' '}
            <span className="font-mono font-semibold text-[#7B2D8E]">{supportCode}</span>{' '}
            with <span className="font-semibold text-gray-900">{customerFullName}</span>{' '}
            and send the transcript.
          </>
        }
        confirmLabel="End chat"
        cancelLabel="Keep chatting"
        icon={<PhoneOff className="h-[18px] w-[18px]" />}
        loading={closing}
        onConfirm={() => void closeChat()}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Avatars & Reference-Style Message Rows
// ---------------------------------------------------------------------------

function UserAvatar({
  firstName,
  lastName,
  url,
  status,
  presenceState,
}: {
  firstName: string
  lastName: string
  url: string | null
  status: FullSession['status']
  presenceState?: VisitorPresenceInfo['state']
}) {
  const initials = `${firstName?.[0] || '?'}${lastName?.[0] || ''}`.toUpperCase()
  const dotClass =
    presenceState === 'online'
      ? 'bg-[#7B2D8E]'
      : presenceState === 'away'
        ? 'bg-[#7B2D8E]/45'
        : presenceState === 'offline'
          ? 'bg-gray-300'
          : status === 'active'
            ? 'bg-[#7B2D8E]'
            : status === 'waiting'
              ? 'bg-[#7B2D8E]/55'
              : 'bg-gray-300'
  return (
    <div className="relative shrink-0">
      {url ? (
        <Image
          src={url}
          alt={firstName}
          width={40}
          height={40}
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-full object-cover border border-gray-200"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[12px] font-semibold">
          {initials}
        </div>
      )}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
          dotClass,
        )}
      />
    </div>
  )
}

function MessageRow({
  message,
  currentUserId,
  userName,
  userAvatarUrl,
  staffFallback,
  isFirstInGroup,
  isLastInGroup,
}: {
  message: Message
  currentUserId: string | null
  userName: string
  userAvatarUrl: string | null
  staffFallback: FullSession['staff']
  isFirstInGroup: boolean
  isLastInGroup: boolean
}) {
  const stamp = useMemo(
    () => formatChatTimestamp(message.created_at),
    [message.created_at],
  )

  // System messages — customer-facing join milestones ("X joined the chat")
  // belong on the customer chat only; keep handover/ended dividers compact here.
  if (message.sender_role === 'system') {
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
              'text-[11.5px] font-medium text-center',
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

  // Customer / Visitor bubble (left)
  if (message.sender_role === 'user') {
    return (
      <div className="flex items-end gap-2.5">
        <div className="w-7 shrink-0">
          {isLastInGroup &&
            (userAvatarUrl ? (
              <Image
                src={userAvatarUrl}
                alt={userName}
                width={28}
                height={28}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[10px] font-semibold">
                {(userName?.[0] || '?').toUpperCase()}
              </div>
            ))}
        </div>

        <div className="max-w-[76%] sm:max-w-[70%]">
          <div
            className={cn(
              'bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl',
              isLastInGroup && 'rounded-bl-md',
            )}
          >
            <p className="text-[13.5px] text-gray-900 whitespace-pre-wrap leading-relaxed break-words">
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

  // Staff bubble (right)
  const isFromMe = Boolean(currentUserId && message.sender_id === currentUserId)
  const senderLabel = message.sender_name || (isFromMe ? 'You' : 'Previous rep')

  return (
    <div className="flex items-end justify-end gap-2.5">
      <div className="max-w-[76%] sm:max-w-[70%] flex flex-col items-end">
        {isFirstInGroup && (
          <p className="text-[10.5px] font-medium text-[#7B2D8E] mr-1 mb-1">
            {isFromMe ? `${senderLabel} (You)` : senderLabel}
          </p>
        )}
        <div
          className={cn(
            'px-3.5 py-2.5 rounded-2xl',
            isLastInGroup && 'rounded-br-md',
            isFromMe
              ? 'bg-[#7B2D8E] text-white'
              : 'bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/25',
          )}
        >
          <p className="text-[13.5px] whitespace-pre-wrap leading-relaxed break-words">
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
            src={message.sender_avatar_url}
            name={senderLabel}
            size={28}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProfileDialog — flat, zero-shadow front-desk identity editor
// ---------------------------------------------------------------------------

function ProfileDialog({
  open,
  profile,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  profile: StaffProfile | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState<string>(profile?.avatarSlug || 'f1')
  const [displayName, setDisplayName] = useState<string>(profile?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSlug(profile?.avatarSlug || 'f1')
    setDisplayName(profile?.displayName || '')
    setError(null)
  }, [open, profile])

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
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Could not save your profile.')
        return
      }
      onSaved()
      onOpenChange(false)
    } catch {
      setError('Network error while saving profile.')
    } finally {
      setSaving(false)
    }
  }, [slug, displayName, onSaved, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white shadow-none p-6">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold text-gray-900">
            Front-desk identity
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-gray-500">
            Choose the display name and avatar customers see in live chat and transcripts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Live Preview */}
          <div className="flex items-center gap-3 rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 p-3">
            <Image
              src={`/avatars/${slug}.jpg`}
              alt=""
              width={44}
              height={44}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover border border-[#7B2D8E]/20 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-gray-900 truncate">
                {displayName.trim() || 'Customer Care'}
              </p>
              <p className="text-[11px] font-medium text-[#7B2D8E]">
                Available
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="staff-live-display-name"
              className="text-[12px] font-semibold text-gray-700 mb-1.5 block"
            >
              Display name
            </label>
            <input
              id="staff-live-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Sarah O."
              className="w-full rounded-xl border border-gray-200 bg-[#FBF9FC] px-3.5 py-2.5 text-base sm:text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
            />
          </div>

          <div>
            <p className="text-[12px] font-semibold text-gray-700 mb-2">
              Avatar
            </p>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_SLUGS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlug(s)}
                  className={cn(
                    'relative aspect-square rounded-xl overflow-hidden border-2 transition-colors cursor-pointer',
                    slug === s
                      ? 'border-[#7B2D8E]'
                      : 'border-transparent hover:border-[#7B2D8E]/35',
                  )}
                >
                  <Image
                    src={`/avatars/${s}.jpg`}
                    alt=""
                    width={64}
                    height={64}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {slug === s && (
                    <span className="absolute inset-0 bg-[#7B2D8E]/20 flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-[#C63D3D]">{error}</p>}
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save identity
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
