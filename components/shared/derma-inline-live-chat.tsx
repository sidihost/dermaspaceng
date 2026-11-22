'use client'

// ---------------------------------------------------------------------------
// Inline Live Representative Handoff (runs seamlessly INSIDE Derma AI)
// ---------------------------------------------------------------------------
// Strict Dermaspace palette (#7B2D8E, #FAF6FB, white, neutral
// grays, #C63D3D error states) — zero shadows, zero gradients, zero
// Sparkles/Zap icons, and zero representative names inside the post-chat
// review card. Preserves full live-chat transcript inside Derma AI's stream
// after the session ends so both the customer and Derma AI retain full
// context of everything discussed in between.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Minus,
  Settings,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildLiveChatFeedbackComment,
  buildLiveChatTranscriptDownloadText,
  formatMessageDayLabel,
  hasSupportIdBeenSharedInChat,
  isDifferentCalendarDay,
  mergeIncrementalMessages,
  NEGATIVE_FEEDBACK_REASONS,
  POSITIVE_FEEDBACK_REASONS,
  resolveSupportId,
  sanitizeNetworkErrorMessage,
} from '@/lib/support-and-chat'
import { formatChatTimestamp } from '@/lib/visitor-telemetry'
import {
  fetchLiveChatSoundPreference,
  isLiveChatSoundEnabled,
  playLiveChatChime,
  saveLiveChatSoundPreference,
  unlockLiveChatAudio,
} from '@/lib/live-chat-sound'
import { syncBrowserPushSubscription } from './permissions-panel'

export type InlineLiveStatus = 'waiting' | 'active' | 'closed' | 'abandoned'

export interface InlineLiveSession {
  id: string
  supportCode?: string | null
  status: InlineLiveStatus
  escalatedAt: string
  acceptedAt: string | null
  closedAt: string | null
  ratedAt: string | null
  isGuest?: boolean
  guest?: {
    name?: string | null
    email?: string | null
    phone?: string | null
  } | null
}

export interface InlineLiveStaff {
  id?: string
  displayName: string
  avatarUrl: string
}

export interface InlineLivePayload {
  session: InlineLiveSession | null
  staff: InlineLiveStaff | null
  staffTyping?: boolean
  staffTypingName?: string | null
}

export interface InlineLiveMessage {
  id: string
  session_id: string
  sender_role: 'user' | 'staff' | 'system'
  sender_id?: string | null
  sender_name?: string | null
  sender_avatar_url?: string | null
  body: string
  read_at?: string | null
  created_at: string
}

export interface DermaLiveChatStatusDetail {
  isLiveMode: boolean
  status: InlineLiveStatus | null
  staff: InlineLiveStaff | null
  unreadCount?: number
}

export interface TranscriptEntry {
  role: string
  content: string
}

export interface FinalizedLiveSessionPayload {
  session: InlineLiveSession
  staff: InlineLiveStaff | null
  messages: InlineLiveMessage[]
}

export interface UseInlineLiveChatOptions {
  isOpen: boolean
  enabled?: boolean
  onSessionChange?: () => void
  onSessionFinalized?: (payload: FinalizedLiveSessionPayload) => void
  onLiveChatLeftAndClosed?: () => void
}

function triggerTranscriptTextDownload(
  supportCode: string | null,
  messages: InlineLiveMessage[],
) {
  if (typeof window === 'undefined') return
  const content = buildLiveChatTranscriptDownloadText({
    supportCode,
    messages,
  })
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = supportCode
    ? `dermaspace-chat-${supportCode.toLowerCase()}.txt`
    : 'dermaspace-live-chat-transcript.txt'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// RepAvatar & CustomerAvatar — resilient native <img> portraits with
// Dermaspace concentric #7B2D8E circle framing & monogram fallback.
// Native <img> (with referrerPolicy="no-referrer") guarantees external R2/CDN,
// Google OAuth, data:image/*, and local /avatars/* URLs never fail through
// Next.js /_next/image optimizer and silently downgrade to a stranger's photo.
// ---------------------------------------------------------------------------

export function RepAvatar({
  src,
  name,
  size = 36,
  brandCircles = false,
  className,
}: {
  src?: string | null
  name?: string | null
  size?: number
  brandCircles?: boolean
  className?: string
}) {
  const cleanSrc = (src ?? '').trim()
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [cleanSrc])

  const label = (name ?? '').trim() || 'Representative'
  const initial = label.charAt(0).toUpperCase() || 'D'

  const core =
    cleanSrc && !imgFailed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cleanSrc}
        alt={label}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size }}
        className={cn(
          'rounded-full object-cover shrink-0 bg-[#FAF6FB]',
          brandCircles ? 'border-2 border-white' : 'border border-[#7B2D8E]/25',
          className,
        )}
      />
    ) : (
      <div
        aria-label={label}
        style={{ width: size, height: size }}
        className={cn(
          'rounded-full bg-[#7B2D8E] text-white font-semibold flex items-center justify-center shrink-0 select-none',
          brandCircles && 'border-2 border-white',
          size <= 28 ? 'text-[11px]' : size >= 52 ? 'text-[18px]' : 'text-[13px]',
          className,
        )}
      >
        {initial}
      </div>
    )

  if (!brandCircles) return core

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[#7B2D8E]/20 p-[3px] shrink-0"
      aria-hidden={false}
    >
      <span className="inline-flex items-center justify-center rounded-full bg-[#7B2D8E] p-[2px]">
        {core}
      </span>
    </span>
  )
}

export function CustomerAvatar({
  src,
  name,
  initials,
  size = 36,
  className,
}: {
  src?: string | null
  name?: string | null
  initials?: string | null
  size?: number
  className?: string
}) {
  const cleanSrc = (src ?? '').trim()
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [cleanSrc])

  const label = (name ?? '').trim() || 'Visitor'
  const badgeText =
    (initials ?? '').trim() ||
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') ||
    '?'

  if (cleanSrc && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cleanSrc}
        alt={label}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size }}
        className={cn(
          'rounded-full object-cover shrink-0 border border-gray-200 bg-[#FAF6FB]',
          className,
        )}
      />
    )
  }

  return (
    <div
      aria-label={label}
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center font-semibold shrink-0 select-none',
        size <= 28 ? 'text-[10px]' : size <= 38 ? 'text-[12px]' : 'text-[13px]',
        className,
      )}
    >
      {badgeText}
    </div>
  )
}

function collectClientVisitorHints() {
  if (typeof window === 'undefined') return null
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
    const pageUrl = `${window.location.pathname}${window.location.search}` || '/'
    const referrer = document.referrer || null
    const language = navigator.language || null
    const screen =
      window.innerWidth && window.innerHeight
        ? `${window.innerWidth}×${window.innerHeight}`
        : null
    return {
      pageUrl,
      referrer,
      timezone,
      language,
      screen,
    }
  } catch {
    return null
  }
}

export function useInlineLiveChat({
  isOpen,
  enabled = true,
  onSessionChange,
  onSessionFinalized,
  onLiveChatLeftAndClosed,
}: UseInlineLiveChatOptions) {
  const [active, setActive] = useState<InlineLivePayload | null>(null)
  const [messages, setMessages] = useState<InlineLiveMessage[]>([])
  const [connecting, setConnecting] = useState(false)
  const [sending, setSending] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [staffTyping, setStaffTyping] = useState(false)
  const [staffTypingName, setStaffTypingName] = useState<string | null>(null)
  const customerTypingLastSentRef = useRef<number>(0)
  const customerTypingTimeoutRef = useRef<number | null>(null)
  const customerTypingActiveRef = useRef<boolean>(false)

  // Inline guest pre-chat state
  const [guestFormOpen, setGuestFormOpen] = useState(false)
  const [guestTopic, setGuestTopic] = useState<string | null>(null)
  const [guestTranscript, setGuestTranscript] = useState<TranscriptEntry[]>([])
  const [guestSubmitting, setGuestSubmitting] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  // Inline post-chat rating state
  const [showRating, setShowRating] = useState(false)
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null)
  const [ratingSupportCode, setRatingSupportCode] = useState<string | null>(null)
  const [serviceRating, setServiceRating] = useState(0)
  const [staffRating, setStaffRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)

  const showRatingRef = useRef(false)
  useEffect(() => {
    showRatingRef.current = showRating
  }, [showRating])

  const activeRef = useRef<InlineLivePayload | null>(null)
  const messagesRef = useRef<InlineLiveMessage[]>([])
  const finalizedSessionIdsRef = useRef<Set<string>>(new Set())
  const onSessionFinalizedRef = useRef(onSessionFinalized)
  const onLiveChatLeftAndClosedRef = useRef(onLiveChatLeftAndClosed)
  useEffect(() => {
    activeRef.current = active
  }, [active])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  useEffect(() => {
    onSessionFinalizedRef.current = onSessionFinalized
  }, [onSessionFinalized])
  useEffect(() => {
    onLiveChatLeftAndClosedRef.current = onLiveChatLeftAndClosed
  }, [onLiveChatLeftAndClosed])

  const lastFetchedRef = useRef<string | null>(null)
  const hydratedSessionRef = useRef<string | null>(null)
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const prevStatusRef = useRef<InlineLiveStatus | null>(null)
  const prevStaffKeyRef = useRef<string | null>(null)
  const ratingDoneTimeoutRef = useRef<number | null>(null)
  const [justConnected, setJustConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const isOpenRef = useRef(isOpen)

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen && (typeof document === 'undefined' || !document.hidden)) {
      setUnreadCount(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!enabled) return
    void fetchLiveChatSoundPreference('customer')
  }, [enabled])

  useEffect(() => {
    return () => {
      if (ratingDoneTimeoutRef.current !== null) {
        window.clearTimeout(ratingDoneTimeoutRef.current)
      }
      if (customerTypingTimeoutRef.current !== null) {
        window.clearTimeout(customerTypingTimeoutRef.current)
      }
    }
  }, [])

  const session = active?.session ?? null
  const staff = active?.staff ?? null
  const sessionId = session?.id ?? null
  const status = session?.status ?? null
  const isLiveMode = status === 'waiting' || status === 'active'
  const staffKey = staff ? `${staff.id || ''}:${staff.displayName}` : null

  useEffect(() => {
    if (!isLiveMode) setUnreadCount(0)
  }, [isLiveMode])

  // Broadcast live chat status, unread badge & assigned rep avatar so DermaAIMount's
  // floating launcher switches from ButterflyLogo to the rep avatar inside
  // brand #7B2D8E concentric circles during live chat, and reverts on end.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const detail: DermaLiveChatStatusDetail = {
      isLiveMode,
      status,
      staff: isLiveMode ? staff : null,
      unreadCount: isLiveMode ? unreadCount : 0,
    }
    try {
      ;(
        window as unknown as {
          __dermaLiveChatStatus?: DermaLiveChatStatusDetail
        }
      ).__dermaLiveChatStatus = detail
      window.dispatchEvent(
        new CustomEvent<DermaLiveChatStatusDetail>('dermaLiveChatStatus', {
          detail,
        }),
      )
    } catch {
      /* ignore custom event errors on restricted environments */
    }
  }, [isLiveMode, status, staff, unreadCount])

  const syncAllMessages = useCallback(async (targetSessionId: string) => {
    try {
      const res = await fetch(
        `/api/live-chat/sessions/${targetSessionId}/messages`,
        { credentials: 'include', cache: 'no-store' },
      )
      if (!res.ok) return null
      const json = (await res.json()) as { messages?: InlineLiveMessage[] }
      const full = json.messages ?? []
      if (full.length > 0) {
        for (const m of full) seenMessageIdsRef.current.add(m.id)
        setMessages((prev) => {
          const merged = mergeIncrementalMessages(prev, full)
          messagesRef.current = merged
          return merged
        })
        lastFetchedRef.current = full[full.length - 1].created_at
      }
      return full
    } catch {
      return null
    }
  }, [])

  // Commits a finished live-chat session into the parent Derma AI message stream
  // exactly once so messages NEVER disappear after close/rating/skip.
  const commitFinalizedSessionToHistory = useCallback(
    (overrideMessages?: InlineLiveMessage[]) => {
      const currentPayload = activeRef.current
      const currentSession = currentPayload?.session
      if (!currentSession) return
      if (finalizedSessionIdsRef.current.has(currentSession.id)) return
      finalizedSessionIdsRef.current.add(currentSession.id)

      const snapshotMessages =
        overrideMessages && overrideMessages.length > 0
          ? overrideMessages
          : messagesRef.current

      onSessionFinalizedRef.current?.({
        session: currentSession,
        staff: currentPayload?.staff ?? null,
        messages: snapshotMessages,
      })
    },
    [],
  )

  // Detect waiting -> active OR staff handover for brief inline notice
  useEffect(() => {
    const prevStatus = prevStatusRef.current
    const prevStaffKey = prevStaffKeyRef.current
    prevStatusRef.current = status
    prevStaffKeyRef.current = staffKey

    const newlyJoined = prevStatus === 'waiting' && status === 'active'
    const handedOver =
      status === 'active' &&
      Boolean(prevStaffKey) &&
      Boolean(staffKey) &&
      prevStaffKey !== staffKey

    if (newlyJoined || handedOver) {
      setJustConnected(true)
      const t = window.setTimeout(() => setJustConnected(false), 5000)
      return () => window.clearTimeout(t)
    }
  }, [status, staffKey])

  const fetchActive = useCallback(async (): Promise<InlineLivePayload | null> => {
    try {
      const res = await fetch('/api/live-chat/active', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) return null
      const json = (await res.json()) as InlineLivePayload

      // Never wipe out an active post-chat rating card or visible ended transcript
      if (!json.session && showRatingRef.current) {
        return json
      }

      // If a staff/admin closed or removed the session remotely while we were
      // waiting/active, sync final system messages ("Rep left the chat" +
      // "Chat ended") so nothing vanishes.
      const prevSession = activeRef.current?.session
      const prevWasOpen =
        prevSession &&
        (prevSession.status === 'waiting' || prevSession.status === 'active')

      if (
        prevWasOpen &&
        (!json.session ||
          json.session.status === 'closed' ||
          json.session.status === 'abandoned')
      ) {
        await syncAllMessages(prevSession.id)
        // If the session is no longer returned by /api/live-chat/active (e.g.,
        // deleted by admin or expired past rating window), preserve the full
        // conversation in Derma AI history before clearing transient live state.
        if (!json.session) {
          commitFinalizedSessionToHistory()
          setMessages([])
          messagesRef.current = []
          lastFetchedRef.current = null
        }
      } else if (
        json.session?.status === 'closed' &&
        messagesRef.current.length === 0
      ) {
        await syncAllMessages(json.session.id)
      }

      activeRef.current = json
      setActive(json)
      setStaffTyping(Boolean(json.staffTyping))
      setStaffTypingName(json.staffTypingName ?? null)
      if (json.session?.status === 'closed' && !json.session.ratedAt) {
        setConfirmLeaveOpen(false)
        setOptionsOpen(false)
        setStaffTyping(false)
        setStaffTypingName(null)
        setRatingDone(false)
        setRatingSessionId(json.session.id)
        setRatingSupportCode(
          resolveSupportId(json.session.supportCode, json.session.id),
        )
        setShowRating(true)
      }
      return json
    } catch {
      return null
    }
  }, [syncAllMessages, commitFinalizedSessionToHistory])

  // Poll /api/live-chat/active while chat is open (or once on mount to resume)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      await fetchActive()
    }
    run()
    if (!isOpen && !isLiveMode) return
    const ms = isOpen && isLiveMode ? 3000 : isOpen ? 8000 : 12000
    const id = window.setInterval(run, ms)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, isOpen, isLiveMode, fetchActive])

  // Reset hydration tracking when session changes
  useEffect(() => {
    if (hydratedSessionRef.current !== sessionId) {
      hydratedSessionRef.current = null
      seenMessageIdsRef.current = new Set()
      lastFetchedRef.current = null
      setOptionsOpen(false)
      setConfirmLeaveOpen(false)
    }
  }, [sessionId])

  // Poll messages + session status + assigned rep while live session is active.
  // Polls fast (900ms) when panel is open & visible, and gently (2600ms passive)
  // when minimized or backgrounded so unread counts, chimes, and OS alerts fire reliably.
  useEffect(() => {
    if (!enabled || !sessionId || !isLiveMode) return
    let cancelled = false
    let inFlight = false
    let timerId: number | null = null

    const isActivelyViewing = () =>
      isOpenRef.current && (typeof document === 'undefined' || !document.hidden)

    const scheduleNext = () => {
      if (cancelled) return
      if (timerId !== null) window.clearTimeout(timerId)
      const delayMs = isActivelyViewing() ? 900 : 2600
      timerId = window.setTimeout(() => {
        void pollMessages()
      }, delayMs)
    }

    const pollMessages = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const params = new URLSearchParams()
        if (lastFetchedRef.current) params.set('since', lastFetchedRef.current)
        if (!isActivelyViewing()) params.set('passive', '1')
        const qs = params.toString() ? `?${params.toString()}` : ''
        const res = await fetch(
          `/api/live-chat/sessions/${sessionId}/messages${qs}`,
          { credentials: 'include', cache: 'no-store' },
        )
        if (!res.ok || cancelled) return
        const json = (await res.json()) as {
          messages?: InlineLiveMessage[]
          staffTyping?: boolean
          staffTypingName?: string | null
          sessionStatus?: InlineLiveStatus
          acceptedAt?: string | null
          closedAt?: string | null
          closedBy?: string | null
          staff?: InlineLiveStaff | null
        }
        const incoming = json.messages ?? []
        if (cancelled) return

        setStaffTyping(Boolean(json.staffTyping))
        setStaffTypingName(json.staffTypingName ?? null)

        // Immediately propagate status / staff join / handover / close transitions
        // instead of waiting for the slower /api/live-chat/active poll.
        const currentPayload = activeRef.current
        if (currentPayload?.session && currentPayload.session.id === sessionId) {
          const nextStatus = json.sessionStatus ?? currentPayload.session.status
          const nextStaff =
            json.staff !== undefined ? json.staff : currentPayload.staff
          const staffChanged =
            (currentPayload.staff?.id || '') !== (nextStaff?.id || '') ||
            (currentPayload.staff?.displayName || '') !==
              (nextStaff?.displayName || '') ||
            (currentPayload.staff?.avatarUrl || '') !==
              (nextStaff?.avatarUrl || '')
          const statusChanged = currentPayload.session.status !== nextStatus

          if (statusChanged || staffChanged) {
            const updatedPayload: InlineLivePayload = {
              ...currentPayload,
              session: {
                ...currentPayload.session,
                status: nextStatus,
                acceptedAt: json.acceptedAt ?? currentPayload.session.acceptedAt,
                closedAt: json.closedAt ?? currentPayload.session.closedAt,
              },
              staff: nextStaff,
            }
            activeRef.current = updatedPayload
            setActive(updatedPayload)
            if (nextStatus === 'closed' || nextStatus === 'abandoned') {
              void fetchActive()
            }
          }
        }

        const wasHydrated = hydratedSessionRef.current === sessionId
        hydratedSessionRef.current = sessionId

        if (incoming.length === 0) return

        const newStaffMessages: InlineLiveMessage[] = []
        for (const m of incoming) {
          if (!seenMessageIdsRef.current.has(m.id)) {
            seenMessageIdsRef.current.add(m.id)
            if (wasHydrated && m.sender_role === 'staff') {
              newStaffMessages.push(m)
            }
          }
        }

        if (newStaffMessages.length > 0) {
          playLiveChatChime('reply', 'customer')
          if (!isActivelyViewing()) {
            setUnreadCount((c) => c + newStaffMessages.length)
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted' &&
              isLiveChatSoundEnabled('customer')
            ) {
              const latest = newStaffMessages[newStaffMessages.length - 1]
              const sender =
                latest.sender_name?.trim() ||
                json.staff?.displayName ||
                activeRef.current?.staff?.displayName ||
                'Dermaspace Support'
              try {
                const notif = new Notification(`${sender} · Dermaspace`, {
                  body: latest.body.slice(0, 140),
                  icon: '/icons/icon-192x192.png',
                  tag: `live-chat-${sessionId}`,
                })
                notif.onclick = () => {
                  try {
                    window.focus()
                    window.dispatchEvent(new Event('openDermaAI'))
                    setUnreadCount(0)
                    notif.close()
                  } catch {
                    /* ignore */
                  }
                }
              } catch {
                /* Notification constructor unavailable in restricted SW-only contexts */
              }
            }
          }
        }

        setMessages((prev) => {
          const merged = mergeIncrementalMessages(prev, incoming)
          messagesRef.current = merged
          return merged
        })
        lastFetchedRef.current = incoming[incoming.length - 1].created_at
        onSessionChange?.()
      } catch {
        /* transient */
      } finally {
        inFlight = false
        scheduleNext()
      }
    }

    void pollMessages()
    const onWake = () => {
      if (isActivelyViewing()) {
        setUnreadCount(0)
      }
      void pollMessages()
      void fetchActive()
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      cancelled = true
      if (timerId !== null) window.clearTimeout(timerId)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [enabled, sessionId, isLiveMode, isOpen, onSessionChange, fetchActive])

  // Throttled customer typing heartbeat -> staff & admin see "Visitor is typing…"
  const notifyCustomerTyping = useCallback(
    (isTyping: boolean) => {
      if (!sessionId || !isLiveMode) return
      const now = Date.now()
      if (customerTypingTimeoutRef.current !== null) {
        window.clearTimeout(customerTypingTimeoutRef.current)
        customerTypingTimeoutRef.current = null
      }

      if (isTyping) {
        customerTypingTimeoutRef.current = window.setTimeout(() => {
          customerTypingTimeoutRef.current = null
          if (!customerTypingActiveRef.current) return
          customerTypingActiveRef.current = false
          fetch(`/api/live-chat/sessions/${sessionId}/typing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ isTyping: false }),
          }).catch(() => {})
        }, 4200)

        if (
          customerTypingActiveRef.current &&
          now - customerTypingLastSentRef.current < 2400
        ) {
          return
        }
        customerTypingActiveRef.current = true
        customerTypingLastSentRef.current = now
        fetch(`/api/live-chat/sessions/${sessionId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isTyping: true }),
        }).catch(() => {})
      } else if (customerTypingActiveRef.current) {
        customerTypingActiveRef.current = false
        customerTypingLastSentRef.current = 0
        fetch(`/api/live-chat/sessions/${sessionId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isTyping: false }),
        }).catch(() => {})
      }
    },
    [sessionId, isLiveMode],
  )

  // Trigger live representative handoff
  const triggerHandoff = useCallback(
    async (
      topic?: string | null,
      transcript?: TranscriptEntry[],
    ): Promise<'started' | 'already_active' | 'guest_form' | 'error'> => {
      setError(null)
      setGuestError(null)

      if (
        session &&
        (session.status === 'waiting' || session.status === 'active')
      ) {
        return 'already_active'
      }

      // If an unrated closed session was still displayed, commit it to history first
      if (session?.status === 'closed' || showRatingRef.current) {
        commitFinalizedSessionToHistory()
      }

      unlockLiveChatAudio()
      setConnecting(true)
      try {
        const res = await fetch('/api/live-chat/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            topic: topic ? topic.slice(0, 500) : 'Customer support',
            transcript: transcript?.slice(-20) ?? null,
            visitor: collectClientVisitorHints(),
          }),
        })

        if (res.ok) {
          const created = (await res.json().catch(() => null)) as {
            sessionId?: string
            supportCode?: string
            status?: InlineLiveStatus
          } | null
          setShowRating(false)
          setRatingDone(false)
          setRatingSessionId(null)
          setGuestFormOpen(false)
          setOptionsOpen(false)
          setConfirmLeaveOpen(false)
          setMessages([])
          messagesRef.current = []
          lastFetchedRef.current = null
          const updated = await fetchActive()
          if (!updated?.session && created?.sessionId) {
            setActive({
              session: {
                id: created.sessionId,
                supportCode: resolveSupportId(
                  created.supportCode,
                  created.sessionId,
                ),
                status: created.status || 'waiting',
                escalatedAt: new Date().toISOString(),
                acceptedAt: null,
                closedAt: null,
                ratedAt: null,
              },
              staff: null,
            })
          }
          onSessionChange?.()
          return 'started'
        }

        const data = (await res.json().catch(() => ({}))) as {
          guestFormRequired?: boolean
          signinRequired?: boolean
          error?: string
        }

        if (res.status === 401 || data.guestFormRequired || data.signinRequired) {
          setGuestTopic(topic || 'Customer support')
          setGuestTranscript(transcript?.slice(-20) ?? [])
          setGuestFormOpen(true)
          onSessionChange?.()
          return 'guest_form'
        }

        setError(
          data.error ||
            'Could not reach our front desk right now. Please try again.',
        )
        return 'error'
      } catch {
        setError('Connection hiccup while reaching support. Please try again.')
        return 'error'
      } finally {
        setConnecting(false)
      }
    },
    [session, fetchActive, onSessionChange, commitFinalizedSessionToHistory],
  )

  const submitGuestHandoff = useCallback(
    async (input: { name: string; email: string; phone?: string }) => {
      const name = input.name.trim()
      const email = input.email.trim()
      const phone = input.phone?.trim() || ''

      if (name.length < 2) {
        setGuestError('Please enter your name.')
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setGuestError('Please enter a valid email address.')
        return false
      }

      unlockLiveChatAudio()
      setGuestSubmitting(true)
      setGuestError(null)
      try {
        const res = await fetch('/api/live-chat/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            topic: guestTopic || 'Customer support',
            transcript: guestTranscript.length > 0 ? guestTranscript : null,
            guest: { name, email, phone: phone || undefined },
            visitor: collectClientVisitorHints(),
          }),
        })
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setGuestError(
            json.error || 'Could not start live support. Please try again.',
          )
          return false
        }
        const created = (await res.json().catch(() => null)) as {
          sessionId?: string
          supportCode?: string
          status?: InlineLiveStatus
        } | null

        setGuestFormOpen(false)
        setShowRating(false)
        setRatingDone(false)
        setOptionsOpen(false)
        setConfirmLeaveOpen(false)
        setMessages([])
        messagesRef.current = []
        lastFetchedRef.current = null
        const updated = await fetchActive()
        if (!updated?.session && created?.sessionId) {
          setActive({
            session: {
              id: created.sessionId,
              supportCode: resolveSupportId(
                created.supportCode,
                created.sessionId,
              ),
              status: created.status || 'waiting',
              escalatedAt: new Date().toISOString(),
              acceptedAt: null,
              closedAt: null,
              ratedAt: null,
            },
            staff: null,
          })
        }
        onSessionChange?.()
        return true
      } catch {
        setGuestError('Network error. Please try again.')
        return false
      } finally {
        setGuestSubmitting(false)
      }
    },
    [guestTopic, guestTranscript, fetchActive, onSessionChange],
  )

  const cancelGuestHandoff = useCallback(() => {
    setGuestFormOpen(false)
    setGuestError(null)
  }, [])

  const sendLiveMessage = useCallback(
    async (rawBody: string): Promise<boolean> => {
      const body = rawBody.trim()
      if (!body || !sessionId || sending) return false
      customerTypingActiveRef.current = false
      if (customerTypingTimeoutRef.current !== null) {
        window.clearTimeout(customerTypingTimeoutRef.current)
        customerTypingTimeoutRef.current = null
      }
      unlockLiveChatAudio()
      setSending(true)
      setError(null)
      const attemptPost = () =>
        fetch(`/api/live-chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body }),
        })
      try {
        let res: Response
        try {
          res = await attemptPost()
        } catch (firstErr) {
          if (firstErr instanceof TypeError) {
            await new Promise((r) => window.setTimeout(r, 350))
            res = await attemptPost()
          } else {
            throw firstErr
          }
        }
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setError(
            json.error || 'Could not send message. Please try again.',
          )
          return false
        }
        const { message } = (await res.json()) as {
          message: InlineLiveMessage
        }
        seenMessageIdsRef.current.add(message.id)
        setMessages((prev) => {
          const next = mergeIncrementalMessages(prev, [message])
          messagesRef.current = next
          return next
        })
        lastFetchedRef.current = message.created_at
        onSessionChange?.()
        return true
      } catch (err) {
        setError(
          sanitizeNetworkErrorMessage(
            err,
            'Connection hiccup — please try sending again.',
          ),
        )
        return false
      } finally {
        setSending(false)
      }
    },
    [sessionId, sending, onSessionChange],
  )

  const endLiveChat = useCallback(async () => {
    if (!sessionId) return
    setError(null)
    setRatingError(null)
    setConfirmLeaveOpen(false)
    setOptionsOpen(false)
    try {
      const res = await fetch(`/api/live-chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setError(json.error || 'Could not end live session right now.')
        return
      }
      const json = (await res.json().catch(() => ({}))) as {
        messages?: InlineLiveMessage[]
      }

      if (Array.isArray(json.messages) && json.messages.length > 0) {
        for (const m of json.messages) seenMessageIdsRef.current.add(m.id)
        setMessages(json.messages)
        messagesRef.current = json.messages
        lastFetchedRef.current =
          json.messages[json.messages.length - 1].created_at
      } else {
        await syncAllMessages(sessionId)
      }

      const code = session
        ? resolveSupportId(session.supportCode, session.id)
        : null
      setRatingSessionId(sessionId)
      setRatingSupportCode(code)
      setShowRating(true)
      setActive((prev) => {
        const nextPayload = prev?.session
          ? {
              ...prev,
              session: {
                ...prev.session,
                status: 'closed' as const,
                closedAt: new Date().toISOString(),
              },
            }
          : null
        activeRef.current = nextPayload
        return nextPayload
      })
      onSessionChange?.()
    } catch {
      setError('Could not end live session right now.')
    }
  }, [sessionId, session, onSessionChange, syncAllMessages])

  const resetRatingAndClearTransient = useCallback(
    (commitHistory: boolean) => {
      if (ratingDoneTimeoutRef.current !== null) {
        window.clearTimeout(ratingDoneTimeoutRef.current)
        ratingDoneTimeoutRef.current = null
      }
      if (commitHistory) {
        commitFinalizedSessionToHistory()
      }
      setShowRating(false)
      setRatingDone(false)
      setRatingError(null)
      setRatingSessionId(null)
      setRatingSupportCode(null)
      setServiceRating(0)
      setStaffRating(0)
      setRatingComment('')
      setActive(null)
      activeRef.current = null
      setMessages([])
      messagesRef.current = []
      lastFetchedRef.current = null
    },
    [commitFinalizedSessionToHistory],
  )

  const submitRating = useCallback(async () => {
    const targetSessionId = ratingSessionId || session?.id || null
    if (!targetSessionId) {
      setRatingError(
        'Could not locate this chat session. Please refresh and try again.',
      )
      return
    }
    if (serviceRating < 1) {
      setRatingError('Please pick a star rating before submitting.')
      return
    }
    const effectiveStaffRating =
      staffRating >= 1 ? staffRating : serviceRating
    setSavingRating(true)
    setError(null)
    setRatingError(null)
    try {
      const res = await fetch(`/api/live-chat/sessions/${targetSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'rate',
          service: serviceRating,
          staff: effectiveStaffRating,
          comment: ratingComment.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setRatingError(
          json.error || 'Could not save your rating. Please try again.',
        )
        return
      }
      // Commit messages immediately to the permanent Derma AI thread and clear
      // the transient live feed buffer right away so bubbles never render twice
      // during the 1.5s post-rating thank-you banner.
      commitFinalizedSessionToHistory()
      setMessages([])
      messagesRef.current = []
      lastFetchedRef.current = null
      setRatingDone(true)
      if (ratingDoneTimeoutRef.current !== null) {
        window.clearTimeout(ratingDoneTimeoutRef.current)
      }
      ratingDoneTimeoutRef.current = window.setTimeout(() => {
        ratingDoneTimeoutRef.current = null
        resetRatingAndClearTransient(false)
      }, 1500)
    } catch {
      setRatingError(
        'Connection issue while saving your rating. Please try again.',
      )
    } finally {
      setSavingRating(false)
    }
  }, [
    ratingSessionId,
    session?.id,
    serviceRating,
    staffRating,
    ratingComment,
    commitFinalizedSessionToHistory,
    resetRatingAndClearTransient,
  ])

  const skipRating = useCallback(async () => {
    const id = ratingSessionId || session?.id || null
    resetRatingAndClearTransient(true)
    if (id) {
      fetch(`/api/live-chat/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'skip_rating' }),
      }).catch(() => {})
    }
  }, [ratingSessionId, session?.id, resetRatingAndClearTransient])

  // Called by Derma AI composer if the user starts chatting with AI right
  // after the live chat ended before submitting/skipping the review card.
  const dismissClosedReviewIntoHistory = useCallback(() => {
    if (!isLiveMode && (showRatingRef.current || activeRef.current?.session?.status === 'closed')) {
      const id = ratingSessionId || session?.id || null
      resetRatingAndClearTransient(true)
      if (id) {
        fetch(`/api/live-chat/sessions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'skip_rating' }),
        }).catch(() => {})
      }
    }
  }, [isLiveMode, ratingSessionId, session?.id, resetRatingAndClearTransient])

  const leaveAndClearChat = useCallback(
    async (
      feedback?: {
        rating?: number | null
        staffRating?: number | null
        comment?: string | null
      } | null,
    ) => {
      const targetSessionId = ratingSessionId || sessionId
      if (leaving) return
      setLeaving(true)
      setError(null)
      setRatingError(null)
      try {
        if (targetSessionId) {
          const isStillOpen =
            activeRef.current?.session?.status === 'waiting' ||
            activeRef.current?.session?.status === 'active'
          const rawRating = feedback?.rating
          const validRating =
            typeof rawRating === 'number' &&
            Number.isFinite(rawRating) &&
            rawRating >= 1 &&
            rawRating <= 5
              ? Math.round(rawRating)
              : null
          const rawStaffRating = feedback?.staffRating
          const validStaffRating =
            typeof rawStaffRating === 'number' &&
            Number.isFinite(rawStaffRating) &&
            rawStaffRating >= 1 &&
            rawStaffRating <= 5
              ? Math.round(rawStaffRating)
              : validRating
          const cleanComment =
            typeof feedback?.comment === 'string' && feedback.comment.trim()
              ? feedback.comment.trim().slice(0, 500)
              : undefined

          const payload = isStillOpen
            ? {
                action: 'close',
                finalize: true,
                ...(validRating ? { rating: validRating, staff: validStaffRating ?? validRating } : {}),
                ...(cleanComment ? { comment: cleanComment } : {}),
              }
            : validRating
              ? {
                  action: 'rate',
                  service: validRating,
                  staff: validStaffRating ?? validRating,
                  ...(cleanComment ? { comment: cleanComment } : {}),
                }
              : { action: 'skip_rating' }

          await fetch(`/api/live-chat/sessions/${targetSessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          }).catch(() => {})
        }
      } finally {
        if (ratingDoneTimeoutRef.current !== null) {
          window.clearTimeout(ratingDoneTimeoutRef.current)
          ratingDoneTimeoutRef.current = null
        }
        if (customerTypingTimeoutRef.current !== null) {
          window.clearTimeout(customerTypingTimeoutRef.current)
          customerTypingTimeoutRef.current = null
        }
        customerTypingActiveRef.current = false
        setConfirmLeaveOpen(false)
        setOptionsOpen(false)
        setShowRating(false)
        setRatingDone(false)
        setRatingError(null)
        setRatingSessionId(null)
        setRatingSupportCode(null)
        setServiceRating(0)
        setStaffRating(0)
        setRatingComment('')
        setStaffTyping(false)
        setStaffTypingName(null)
        setActive(null)
        activeRef.current = null
        setMessages([])
        messagesRef.current = []
        lastFetchedRef.current = null
        seenMessageIdsRef.current = new Set()
        hydratedSessionRef.current = null
        setLeaving(false)
        onLiveChatLeftAndClosedRef.current?.()
      }
    },
    [leaving, ratingSessionId, sessionId],
  )

  const updateGuestContact = useCallback(
    async (input: { name?: string; email: string }): Promise<{ ok: boolean; error?: string }> => {
      const targetSessionId = ratingSessionId || sessionId
      const email = input.email.trim()
      const name = input.name?.trim() || ''
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Please enter a valid email address.' }
      }
      if (!targetSessionId) {
        return { ok: false, error: 'No active chat session.' }
      }
      try {
        const res = await fetch(`/api/live-chat/sessions/${targetSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'update_contact',
            name: name || undefined,
            email,
          }),
        })
        const json = (await res.json().catch(() => ({}))) as {
          error?: string
          guest?: { name?: string | null; email?: string | null }
        }
        if (!res.ok) {
          return {
            ok: false,
            error: json.error || 'Could not save contact details.',
          }
        }
        setActive((prev) => {
          if (!prev?.session) return prev
          const nextPayload: InlineLivePayload = {
            ...prev,
            session: {
              ...prev.session,
              guest: {
                name: json.guest?.name ?? (name || prev.session.guest?.name || null),
                email: json.guest?.email ?? email,
                phone: prev.session.guest?.phone ?? null,
              },
            },
          }
          activeRef.current = nextPayload
          return nextPayload
        })
        return { ok: true }
      } catch {
        return { ok: false, error: 'Connection hiccup. Please try again.' }
      }
    },
    [ratingSessionId, sessionId],
  )

  return {
    active,
    session,
    staff,
    status,
    messages,
    isLiveMode,
    unreadCount,
    connecting,
    sending,
    leaving,
    justConnected,
    staffTyping,
    staffTypingName,
    error,
    optionsOpen,
    setOptionsOpen,
    confirmLeaveOpen,
    setConfirmLeaveOpen,
    clearError: () => setError(null),
    guestFormOpen,
    guestSubmitting,
    guestError,
    showRating,
    ratingSessionId,
    ratingSupportCode,
    ratingError,
    serviceRating,
    staffRating,
    ratingComment,
    savingRating,
    ratingDone,
    setServiceRating: (n: number) => {
      setRatingError(null)
      setServiceRating(n)
    },
    setStaffRating: (n: number) => {
      setRatingError(null)
      setStaffRating(n)
    },
    setRatingComment,
    triggerHandoff,
    submitGuestHandoff,
    cancelGuestHandoff,
    sendLiveMessage,
    notifyCustomerTyping,
    endLiveChat,
    leaveAndClearChat,
    updateGuestContact,
    submitRating,
    skipRating,
    dismissClosedReviewIntoHistory,
    refreshActive: fetchActive,
  }
}

// ---------------------------------------------------------------------------
// InlineLiveHeaderControls — options toggle + safe Leave Chat trigger
// ---------------------------------------------------------------------------

export function InlineLiveHeaderControls({
  optionsOpen = false,
  onToggleOptions,
  confirmLeaveOpen = false,
  onRequestLeave,
  onCancelLeave,
  onEndLiveChat,
  onMinimize,
}: {
  optionsOpen?: boolean
  onToggleOptions?: () => void
  confirmLeaveOpen?: boolean
  onRequestLeave?: () => void
  onCancelLeave?: () => void
  onEndLiveChat: () => void
  onMinimize?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      {onToggleOptions && (
        <button
          type="button"
          onClick={onToggleOptions}
          aria-label="Live chat options"
          aria-expanded={optionsOpen}
          title="Live chat options"
          className={cn(
            'w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer',
            optionsOpen
              ? 'bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/25'
              : 'bg-gray-100 text-gray-800 hover:bg-[#FAF6FB] hover:text-[#7B2D8E]',
          )}
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      )}
      {onMinimize && (
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize chat"
          title="Minimize"
          className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-700 hover:bg-gray-100 hover:text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          confirmLeaveOpen
            ? onCancelLeave
              ? onCancelLeave()
              : onEndLiveChat()
            : onRequestLeave
              ? onRequestLeave()
              : onEndLiveChat()
        }
        aria-label="End live chat"
        title="End chat"
        className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-700 hover:bg-[#FAF6FB] hover:text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-[18px] h-[18px]" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// InlineLiveOptionsPopup — flat full-width drawer anchored flush below the
// live chat header (Provide contact details + Log in, Download chat
// transcript, Notifications toggle). Zero shadow, zero gradient, brand purple.
// ---------------------------------------------------------------------------

export function InlineLiveOptionsPopup({
  open,
  session,
  messages,
  isGuest = false,
  onSaveContact,
  onClose,
}: {
  open: boolean
  session: InlineLiveSession | null
  messages: InlineLiveMessage[]
  isGuest?: boolean
  onSaveContact?: (input: {
    name?: string
    email: string
  }) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
}) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [contactExpanded, setContactExpanded] = useState(true)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  const supportCode = session
    ? resolveSupportId(session.supportCode, session.id)
    : null
  const showContactAccordion = Boolean(isGuest || session?.isGuest)

  useEffect(() => {
    if (!open) return
    let activeMount = true
    void fetchLiveChatSoundPreference('customer').then((enabled) => {
      if (activeMount) setSoundEnabled(enabled)
    })
    setContactName(session?.guest?.name || '')
    setContactEmail(session?.guest?.email || '')
    setContactError(null)
    setContactSaved(false)
    return () => {
      activeMount = false
    }
  }, [open, session?.guest?.name, session?.guest?.email])

  const toggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    void saveLiveChatSoundPreference('customer', next)
    if (next) {
      unlockLiveChatAudio()
      window.setTimeout(() => playLiveChatChime('reply'), 30)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          void Notification.requestPermission().then((perm) => {
            if (perm === 'granted') void syncBrowserPushSubscription()
          })
        } else if (Notification.permission === 'granted') {
          void syncBrowserPushSubscription()
        }
      }
    }
  }, [soundEnabled])

  const handleDownloadTranscript = useCallback(() => {
    const shared = hasSupportIdBeenSharedInChat(supportCode, messages)
    triggerTranscriptTextDownload(shared && supportCode ? supportCode : null, messages)
    onClose()
  }, [supportCode, messages, onClose])

  const canSubmitContact =
    !savingContact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())

  const handleSubmitContact = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!onSaveContact || savingContact) return
      setSavingContact(true)
      setContactError(null)
      setContactSaved(false)
      const result = await onSaveContact({
        name: contactName,
        email: contactEmail,
      })
      setSavingContact(false)
      if (!result.ok) {
        setContactError(result.error || 'Please enter a valid email address.')
        return
      }
      setContactSaved(true)
      window.setTimeout(() => setContactSaved(false), 3000)
    },
    [onSaveContact, savingContact, contactName, contactEmail],
  )

  if (!open || !session) return null

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 z-30 bg-gray-900/20"
      />
      <div
        role="dialog"
        aria-label="Live chat options"
        data-testid="live-chat-options-panel"
        className="absolute inset-x-0 top-0 z-40 bg-white border-b border-gray-200 divide-y divide-gray-200 overflow-y-auto max-h-[85%]"
      >
        {showContactAccordion && (
          <div>
            <div
              className={cn(
                'flex items-center justify-between gap-2 px-4 py-3.5 transition-colors',
                contactExpanded ? 'bg-[#FAF6FB]' : 'bg-white',
              )}
            >
              <button
                type="button"
                onClick={() => setContactExpanded((v) => !v)}
                aria-expanded={contactExpanded}
                className="flex-1 flex items-center gap-3 text-left text-[14.5px] font-medium text-gray-900 cursor-pointer"
              >
                <User className="w-[18px] h-[18px] text-gray-800 shrink-0" />
                <span>Provide contact details</span>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/signin"
                  className="text-[14px] font-semibold text-[#7B2D8E] hover:opacity-80 transition-opacity"
                >
                  Log in
                </Link>
                <button
                  type="button"
                  onClick={() => setContactExpanded((v) => !v)}
                  aria-label={
                    contactExpanded
                      ? 'Collapse contact details'
                      : 'Expand contact details'
                  }
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center text-gray-800 hover:bg-white transition-colors cursor-pointer"
                >
                  {contactExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {contactExpanded && (
              <form
                onSubmit={handleSubmitContact}
                data-testid="live-chat-contact-form"
                className="px-4 py-4 space-y-3.5 bg-white"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="live-chat-contact-name"
                    className="flex items-baseline gap-1.5 text-[14px] font-medium text-gray-900"
                  >
                    <span>Name</span>
                    <span className="text-[12px] font-normal text-gray-500">
                      Optional
                    </span>
                  </label>
                  <input
                    id="live-chat-contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Enter your name here"
                    autoComplete="name"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base sm:text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="live-chat-contact-email"
                    className="block text-[14px] font-medium text-gray-900"
                  >
                    Email
                  </label>
                  <input
                    id="live-chat-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value)
                      if (contactError) setContactError(null)
                    }}
                    placeholder="Enter your email here"
                    autoComplete="email"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base sm:text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none"
                  />
                </div>

                {contactError && (
                  <p className="text-[12px] text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-lg px-3 py-1.5">
                    {contactError}
                  </p>
                )}

                {contactSaved && (
                  <p
                    data-testid="live-chat-contact-saved"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#7B2D8E]"
                  >
                    <Check className="w-4 h-4" />
                    Contact details saved
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmitContact}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 px-4 text-[14px] font-semibold transition-colors cursor-pointer',
                    canSubmitContact
                      ? 'bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white'
                      : 'bg-[#FAF6FB] text-[#7B2D8E]/40 cursor-not-allowed',
                  )}
                >
                  {savingContact && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit
                </button>
              </form>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleDownloadTranscript}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[14.5px] font-medium text-gray-900 hover:bg-[#FAF6FB] transition-colors cursor-pointer"
        >
          <FileText className="w-[18px] h-[18px] text-gray-800 shrink-0" />
          <span>Download chat transcript</span>
        </button>

        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <span className="inline-flex items-center gap-3 text-[14.5px] font-medium text-gray-900">
            {soundEnabled ? (
              <Volume2 className="w-[18px] h-[18px] text-gray-800 shrink-0" />
            ) : (
              <VolumeX className="w-[18px] h-[18px] text-gray-400 shrink-0" />
            )}
            <span>Notifications</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            data-testid="live-chat-sound-toggle"
            onClick={toggleSound}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors cursor-pointer',
              soundEnabled
                ? 'bg-[#7B2D8E] border-[#7B2D8E]'
                : 'bg-gray-200 border-gray-200',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-white transition-transform',
                soundEnabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// InlineLeaveFeedbackScreen — clean full-panel "Did we help you?" Leave Chat
// view covering the chat panel (zero shadows, zero gradients, brand purple).
// Leaving chat closes the session, records optional thumbs feedback, wipes
// the entire conversation from the user's end, and closes the chat panel.
// ---------------------------------------------------------------------------

export interface LeaveChatFeedbackSubmission {
  rating?: number | null
  staffRating?: number | null
  comment?: string | null
}

const STAR_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Needs work',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
}

export function InlineLeaveFeedbackScreen({
  open,
  canGoBack,
  leaving,
  session,
  messages,
  isGuest = false,
  onSaveContact,
  onGoBack,
  onLeaveChat,
}: {
  open: boolean
  canGoBack: boolean
  leaving: boolean
  session: InlineLiveSession | null
  messages: InlineLiveMessage[]
  isGuest?: boolean
  onSaveContact?: (input: {
    name?: string
    email: string
  }) => Promise<{ ok: boolean; error?: string }>
  onGoBack: () => void
  onLeaveChat: (feedback?: LeaveChatFeedbackSubmission | null) => void
}) {
  const [selectedThumb, setSelectedThumb] = useState<'up' | 'down' | null>(null)
  const [starRating, setStarRating] = useState<number>(0)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [feedbackNote, setFeedbackNote] = useState('')
  const [optionsOpen, setOptionsOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedThumb(null)
      setStarRating(0)
      setSelectedReasons([])
      setFeedbackNote('')
      setOptionsOpen(false)
    }
  }, [open])

  if (!open) return null

  const reasonOptions: ReadonlyArray<string> =
    selectedThumb === 'up'
      ? POSITIVE_FEEDBACK_REASONS
      : selectedThumb === 'down'
        ? NEGATIVE_FEEDBACK_REASONS
        : []

  const handleSelectThumb = (direction: 'up' | 'down') => {
    if (selectedThumb === direction) {
      setSelectedThumb(null)
      setStarRating(0)
      setSelectedReasons([])
      return
    }
    setSelectedThumb(direction)
    setStarRating(direction === 'up' ? 5 : 2)
    setSelectedReasons((prev) => {
      const allowed = new Set<string>(
        direction === 'up'
          ? POSITIVE_FEEDBACK_REASONS
          : NEGATIVE_FEEDBACK_REASONS,
      )
      return prev.filter((r) => allowed.has(r))
    })
  }

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((item) => item !== reason)
        : [...prev, reason],
    )
  }

  const handleConfirm = () => {
    if (!selectedThumb) {
      onLeaveChat(null)
      return
    }
    const effectiveStars =
      starRating >= 1 && starRating <= 5
        ? starRating
        : selectedThumb === 'up'
          ? 5
          : 2
    const combinedComment = buildLiveChatFeedbackComment({
      reasons: selectedReasons,
      comment: feedbackNote,
    })
    onLeaveChat({
      rating: effectiveStars,
      staffRating: effectiveStars,
      comment: combinedComment,
    })
  }

  const primaryLabel = canGoBack
    ? selectedThumb
      ? 'End & Submit'
      : 'End Chat'
    : selectedThumb
      ? 'Submit Feedback'
      : 'Done'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={canGoBack ? 'End live chat' : 'Rate support chat'}
      data-testid="live-chat-leave-screen"
      className="absolute inset-0 z-50 flex flex-col bg-white"
    >
      {/* Top header: clear back / session-ended context + options + close */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-gray-200 bg-white shrink-0">
        {canGoBack ? (
          <button
            type="button"
            onClick={onGoBack}
            aria-label="Back to chat"
            className="inline-flex items-center gap-1 rounded-full pr-2.5 pl-1.5 h-9 text-[13px] font-semibold text-gray-800 hover:bg-[#FAF6FB] hover:text-[#7B2D8E] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span>Back to chat</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 px-2.5 py-1 text-[11.5px] font-semibold text-[#7B2D8E]">
            Session ended
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-label="Live chat options"
            aria-expanded={optionsOpen}
            className={cn(
              'w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer',
              optionsOpen
                ? 'bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/25'
                : 'bg-gray-100 text-gray-800 hover:bg-[#FAF6FB] hover:text-[#7B2D8E]',
            )}
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
          {!canGoBack && (
            <button
              type="button"
              onClick={() => onLeaveChat(null)}
              disabled={leaving}
              aria-label="Close feedback screen"
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-700 hover:bg-[#FAF6FB] hover:text-[#7B2D8E] transition-colors cursor-pointer"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* Relative body so Settings gear drawer slides flush under the header */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <InlineLiveOptionsPopup
          open={optionsOpen}
          session={session}
          messages={messages}
          isGuest={isGuest}
          onSaveContact={onSaveContact}
          onClose={() => setOptionsOpen(false)}
        />

        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center justify-center text-center">
          <div className="w-full max-w-[340px] my-auto flex flex-col items-center">
            <h2 className="text-[19px] font-bold text-gray-900 tracking-tight">
              {canGoBack ? 'Did we help you?' : 'How was your support chat?'}
            </h2>
            <p className="text-[13px] text-gray-500 mt-1">
              Your feedback helps our team serve you better
            </p>

            {/* Circular Thumbs Up / Thumbs Down */}
            <div
              className="mt-5 flex items-center justify-center gap-4"
              role="group"
              aria-label="Rate your support experience"
            >
              <button
                type="button"
                onClick={() => handleSelectThumb('up')}
                aria-label="Yes, this helped"
                aria-pressed={selectedThumb === 'up'}
                data-testid="live-chat-thumb-up"
                className={cn(
                  'w-13 h-13 rounded-full border inline-flex items-center justify-center transition-colors cursor-pointer',
                  selectedThumb === 'up'
                    ? 'bg-[#7B2D8E] border-[#7B2D8E] text-white'
                    : 'bg-[#FAF6FB] border-[#7B2D8E]/20 text-gray-900 hover:border-[#7B2D8E] hover:text-[#7B2D8E]',
                )}
              >
                <ThumbsUp className="w-5 h-5" strokeWidth={1.9} />
              </button>

              <button
                type="button"
                onClick={() => handleSelectThumb('down')}
                aria-label="No, something went wrong"
                aria-pressed={selectedThumb === 'down'}
                data-testid="live-chat-thumb-down"
                className={cn(
                  'w-13 h-13 rounded-full border inline-flex items-center justify-center transition-colors cursor-pointer',
                  selectedThumb === 'down'
                    ? 'bg-[#7B2D8E] border-[#7B2D8E] text-white'
                    : 'bg-[#FAF6FB] border-[#7B2D8E]/20 text-gray-900 hover:border-[#7B2D8E] hover:text-[#7B2D8E]',
                )}
              >
                <ThumbsDown className="w-5 h-5" strokeWidth={1.9} />
              </button>
            </div>

            {/* Dynamic Follow-up Card: "What did we do well?" or "What went wrong?" + Stars + Note */}
            {selectedThumb && (
              <div
                data-testid="live-chat-feedback-details"
                className="mt-5 w-full rounded-2xl border border-[#7B2D8E]/20 bg-[#FAF6FB]/60 p-4 text-left space-y-3.5"
              >
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    {selectedThumb === 'up'
                      ? 'What did we do well?'
                      : 'What went wrong?'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reasonOptions.map((reason) => {
                      const active = selectedReasons.includes(reason)
                      return (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => toggleReason(reason)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer',
                            active
                              ? 'bg-[#7B2D8E] border-[#7B2D8E] text-white'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]',
                          )}
                        >
                          {reason}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 1-5 Star Staff & Support Rating */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-gray-700">
                      Rate representative
                    </span>
                    <span className="text-[11.5px] font-semibold text-[#7B2D8E] tabular-nums">
                      {starRating}/5 · {STAR_LABELS[starRating] || ''}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 flex items-center gap-1.5"
                    role="radiogroup"
                    aria-label="Star rating"
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const filled = star <= starRating
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setStarRating(star)}
                          aria-label={`Rate ${star} out of 5 stars`}
                          aria-checked={starRating === star}
                          role="radio"
                          data-testid={`live-chat-star-${star}`}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center bg-white border border-gray-200 hover:border-[#7B2D8E]/40 transition-colors cursor-pointer"
                        >
                          <Star
                            className={cn(
                              'w-4 h-4 transition-colors',
                              filled
                                ? 'fill-[#7B2D8E] text-[#7B2D8E]'
                                : 'text-gray-300',
                            )}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Optional comment */}
                <div>
                  <label
                    htmlFor="live-chat-feedback-note"
                    className="sr-only"
                  >
                    Additional feedback
                  </label>
                  <textarea
                    id="live-chat-feedback-note"
                    rows={2}
                    maxLength={350}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder={
                      selectedThumb === 'up'
                        ? 'Anything else we did well? (optional)'
                        : 'Tell us what went wrong (optional)'
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* Side-by-side Context-Accurate Buttons */}
            <div className="mt-6 w-full flex items-center justify-center gap-2.5">
              {canGoBack ? (
                <button
                  type="button"
                  onClick={onGoBack}
                  disabled={leaving}
                  className="flex-1 rounded-full py-2.5 px-4 text-[14px] font-semibold border border-gray-200 text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Go Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onLeaveChat(null)}
                  disabled={leaving}
                  className="flex-1 rounded-full py-2.5 px-4 text-[14px] font-semibold border border-gray-200 text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Skip
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={leaving}
                data-testid="live-chat-leave-confirm-btn"
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 px-4 text-[14px] font-semibold transition-colors disabled:opacity-60 cursor-pointer',
                  selectedThumb
                    ? 'bg-[#7B2D8E] text-white hover:bg-[#7B2D8E]/90'
                    : 'bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/20 hover:bg-[#7B2D8E] hover:text-white',
                )}
              >
                {leaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {primaryLabel}
              </button>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-gray-500">
              {canGoBack
                ? 'Leaving will end this session. Your chat record stays with our team.'
                : 'This session has already ended. Share a quick rating or tap Skip to return.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// InlineLiveFeed — renders live status, chat options drawer, leave-chat
// confirmation, live thread bubbles (preserved after ending), and the clean
// neutral post-chat review card strictly in Dermaspace's flat design system.
// ---------------------------------------------------------------------------

export function InlineLiveFeed({
  session,
  staff,
  messages,
  connecting,
  staffTyping = false,
  staffTypingName = null,
  error,
  onClearError,
  guestFormOpen,
  guestSubmitting,
  guestError,
  onSubmitGuest,
  onCancelGuest,
  showRating,
}: {
  session: InlineLiveSession | null
  staff: InlineLiveStaff | null
  messages: InlineLiveMessage[]
  connecting: boolean
  justConnected?: boolean
  staffTyping?: boolean
  staffTypingName?: string | null
  error: string | null
  onClearError: () => void
  guestFormOpen: boolean
  guestSubmitting: boolean
  guestError: string | null
  onSubmitGuest: (input: {
    name: string
    email: string
    phone?: string
  }) => Promise<boolean>
  onCancelGuest: () => void
  showRating: boolean
}) {
  const isWaiting = session?.status === 'waiting'
  const isActive = session?.status === 'active'
  const isClosed = session?.status === 'closed' || session?.status === 'abandoned'
  const isLive = isWaiting || isActive

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          !(
            m.sender_role === 'system' &&
            /will be with you shortly/i.test(m.body)
          ),
      ),
    [messages],
  )

  if (
    !connecting &&
    !isLive &&
    !isClosed &&
    !guestFormOpen &&
    !showRating &&
    !error
  ) {
    return null
  }

  const typingLabel =
    (staffTypingName || staff?.displayName || 'Customer Care').replace(/\.$/, '')

  return (
    <div className="space-y-3 pt-1" data-testid="inline-live-chat-feed">
      {/* Waiting queue card — crisp, zero-shadow card with Support ID copy */}
      {isWaiting && !isClosed && (
        <div
          data-testid="live-chat-waiting-card"
          className="rounded-2xl bg-white border border-[#7B2D8E]/20 p-3.5 flex items-start gap-3"
        >
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 flex items-center justify-center shrink-0 mt-0.5"
          >
            <Loader2 className="w-4 h-4 text-[#7B2D8E] animate-spin" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]">
              Live support queue
            </p>
            <p className="text-[13px] font-semibold text-gray-900 mt-0.5 leading-snug">
              Connecting you to a Dermaspace specialist
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
              You can write your message below while the next representative joins.
            </p>
          </div>
        </div>
      )}

      {/* Inline guest details form */}
      {guestFormOpen && (
        <GuestHandoffCard
          submitting={guestSubmitting}
          error={guestError}
          onSubmit={onSubmitGuest}
          onCancel={onCancelGuest}
        />
      )}

      {/* Live messages — grouped turns with day dividers & read receipts */}
      {(isLive || isClosed || showRating) && visibleMessages.length > 0 && (() => {
        const firstJoinIdx = visibleMessages.findIndex(
          (msg) => msg.sender_role === 'system' && isJoinMilestoneText(msg.body),
        )
        return (
          <div className="space-y-1" data-testid="live-chat-messages-list">
            {visibleMessages.map((m, idx) => {
              const prev = idx > 0 ? visibleMessages[idx - 1] : null
              const next =
                idx < visibleMessages.length - 1 ? visibleMessages[idx + 1] : null
              const showDayDivider =
                idx === 0 || isDifferentCalendarDay(prev?.created_at, m.created_at)
              const dayLabel = showDayDivider
                ? formatMessageDayLabel(m.created_at)
                : null

              const sameAsPrev = Boolean(
                prev &&
                  !showDayDivider &&
                  prev.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  prev.sender_role === m.sender_role &&
                  (prev.sender_id || prev.sender_name || null) ===
                    (m.sender_id || m.sender_name || null) &&
                  Math.abs(
                    new Date(m.created_at).getTime() -
                      new Date(prev.created_at).getTime(),
                  ) < 180_000,
              )
              const nextStartsNewDay = Boolean(
                next && isDifferentCalendarDay(m.created_at, next.created_at),
              )
              const sameAsNext = Boolean(
                next &&
                  !nextStartsNewDay &&
                  next.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  next.sender_role === m.sender_role &&
                  (next.sender_id || next.sender_name || null) ===
                    (m.sender_id || m.sender_name || null) &&
                  Math.abs(
                    new Date(next.created_at).getTime() -
                      new Date(m.created_at).getTime(),
                  ) < 180_000,
              )

              return (
                <div key={m.id}>
                  {dayLabel && (
                    <div
                      className="flex items-center gap-3 py-2.5"
                      data-testid="live-chat-day-divider"
                    >
                      <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        {dayLabel}
                      </span>
                      <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                    </div>
                  )}
                  <div className={cn(sameAsPrev ? 'pt-0.5' : idx === 0 || showDayDivider ? '' : 'pt-3')}>
                    <InlineLiveBubble
                      message={m}
                      staff={staff}
                      showAiLeftDivider={idx === firstJoinIdx}
                      isFirstInGroup={!sameAsPrev}
                      isLastInGroup={!sameAsNext}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Live typing indicator — classic 3-dot reply bubble */}
      {isActive && staffTyping && (
        <div
          className="flex items-end gap-2 pt-1"
          data-testid="live-chat-staff-typing"
          role="status"
          aria-live="polite"
          aria-label={`${typingLabel} is replying`}
        >
          <RepAvatar
            src={staff?.avatarUrl}
            name={typingLabel}
            size={28}
            brandCircles
          />
          <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-4 py-3.5 rounded-2xl rounded-bl-sm">
            <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/35 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/65 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce" />
            <span className="sr-only">{typingLabel} is replying</span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50/70 border border-[#C63D3D]/25 px-3 py-2 text-[12px] text-[#C63D3D]">
          <span>{error}</span>
          <button
            type="button"
            onClick={onClearError}
            aria-label="Dismiss notice"
            className="p-0.5 rounded-full hover:bg-[#C63D3D]/10 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function isJoinMilestoneText(body: string): boolean {
  return /\b(joined the chat|took over the chat)\b/i.test(body)
}

function InlineLiveBubble({
  message,
  staff,
  showAiLeftDivider = false,
  isFirstInGroup = true,
  isLastInGroup = true,
}: {
  message: InlineLiveMessage
  staff: InlineLiveStaff | null
  showAiLeftDivider?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const stamp = useMemo(
    () => formatChatTimestamp(message.created_at),
    [message.created_at],
  )

  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(message.body)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      })
      .catch(() => {})
  }, [message.body])

  if (message.sender_role === 'system') {
    if (isJoinMilestoneText(message.body)) {
      const actionMatch = message.body.match(/\b(joined the chat|took over the chat)\b/i)
      const milestoneAction = actionMatch ? actionMatch[1].toLowerCase() : 'joined the chat'
      const milestoneName =
        message.body.replace(/\s+(joined|took over)\b.*$/i, '').trim() ||
        staff?.displayName ||
        'Customer Care'

      return (
        <div className="space-y-3 py-2" data-testid="live-chat-join-milestone">
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 text-center">
            <div className="flex justify-center mb-2.5">
              <RepAvatar
                src={message.sender_avatar_url || staff?.avatarUrl}
                name={milestoneName}
                size={56}
                brandCircles
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D8E] mb-1">
              Live Representative
            </p>
            <p className="text-[15.5px] font-semibold text-gray-900 leading-snug">
              {milestoneName}
            </p>
            <p className="text-[13px] font-medium text-gray-600 mt-0.5">
              {milestoneAction}
            </p>
            {stamp && (
              <p className="text-[11px] text-gray-400 mt-1.5 tabular-nums">
                {stamp}
              </p>
            )}
          </div>

          {showAiLeftDivider && (
            <div className="pt-0.5" data-testid="live-chat-ai-left-divider">
              <div className="flex items-center gap-3 px-2">
                <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                <span className="text-[11.5px] font-medium text-gray-500 text-center">
                  Derma AI handed over to customer care
                </span>
                <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="py-2" data-testid="live-chat-system-divider">
        <div className="flex items-center gap-3 px-2">
          <span className="flex-1 h-px bg-gray-200" />
          <span className="text-[11.5px] font-medium text-gray-600 text-center px-1">
            {message.body}
          </span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>
        {stamp && (
          <p className="text-[10.5px] text-gray-400 text-center mt-1 tabular-nums">
            {stamp}
          </p>
        )}
      </div>
    )
  }

  if (message.sender_role === 'staff') {
    const senderName =
      message.sender_name || staff?.displayName || 'Customer Care'
    const senderAvatarUrl =
      message.sender_avatar_url || staff?.avatarUrl || null

    return (
      <div
        className="group/msg flex items-end gap-2"
        data-testid="live-chat-staff-bubble"
      >
        <div className="w-7 shrink-0">
          {isLastInGroup && (
            <RepAvatar src={senderAvatarUrl} name={senderName} size={28} />
          )}
        </div>
        <div className="max-w-[82%] min-w-0 flex flex-col items-start">
          {isFirstInGroup && (
            <span className="text-[11px] font-semibold text-[#7B2D8E] ml-1 mb-1">
              {senderName}
            </span>
          )}
          <div className="flex items-end gap-1.5 max-w-full">
            <div
              className={cn(
                'bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl transition-colors',
                !isFirstInGroup && 'rounded-tl-md',
                isLastInGroup && 'rounded-bl-sm',
              )}
            >
              <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                {message.body}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy message"
              title="Copy message"
              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-gray-400 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity shrink-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {isLastInGroup && stamp && (
            <p className="text-[10.5px] text-gray-500 mt-1 ml-1 tabular-nums">
              {stamp}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group/msg flex justify-end">
      <div className="max-w-[82%] min-w-0 flex flex-col items-end">
        <div className="flex items-end gap-1.5 max-w-full">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy message"
            title="Copy message"
            className="w-7 h-7 rounded-full inline-flex items-center justify-center text-gray-400 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity shrink-0 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <div
            className={cn(
              'bg-[#7B2D8E] text-white px-3.5 py-2.5 rounded-2xl',
              !isFirstInGroup && 'rounded-tr-md',
              isLastInGroup && 'rounded-br-sm',
            )}
          >
            <p className="text-[13.5px] whitespace-pre-wrap break-words leading-relaxed">
              {message.body}
            </p>
          </div>
        </div>
        {isLastInGroup && (
          <div className="flex items-center justify-end gap-1 mt-1 mr-1 text-[10px] text-gray-400 tabular-nums">
            {stamp && <span>{stamp}</span>}
            {message.read_at ? (
              <CheckCheck
                className="w-3.5 h-3.5 text-[#7B2D8E]"
                aria-label="Read"
              />
            ) : (
              <Check className="w-3 h-3 text-gray-400" aria-label="Sent" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GuestHandoffCard({
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  submitting: boolean
  error: string | null
  onSubmit: (input: {
    name: string
    email: string
    phone?: string
  }) => Promise<boolean>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ name, email, phone })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-[#7B2D8E]/25 p-3.5 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B2D8E]">
            Connect with a representative
          </p>
          <p className="text-[12px] text-gray-600 mt-0.5">
            Share your name and email so our team can join you right here.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel live handoff"
          className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          autoComplete="tel"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-[12px] text-[#C63D3D] bg-red-50/70 border border-[#C63D3D]/20 rounded-xl px-2.5 py-1.5">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white text-[12.5px] font-semibold px-4 py-2 transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? 'Connecting…' : 'Connect to an agent'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-200 px-3.5 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
    </form>
  )
}
