'use client'

// ---------------------------------------------------------------------------
// Inline Live Representative Handoff (runs seamlessly INSIDE Derma AI)
// ---------------------------------------------------------------------------
// Strict Dermaspace palette (#7B2D8E, #5A1D6A, #FAF6FB, white, neutral
// grays, #C63D3D error states) — zero shadows, zero gradients, zero
// Sparkles/Zap icons, and zero representative names inside the post-chat
// review card. Preserves full live-chat transcript inside Derma AI's stream
// after the session ends so both the customer and Derma AI retain full
// context of everything discussed in between.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Check,
  Download,
  FileText,
  Loader2,
  LogOut,
  Mail,
  Minus,
  Settings,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import {
  buildLiveChatTranscriptDownloadText,
  resolveSupportId,
} from '@/lib/support-and-chat'
import { formatChatTimestamp } from '@/lib/visitor-telemetry'
import {
  fetchLiveChatSoundPreference,
  playLiveChatChime,
  saveLiveChatSoundPreference,
  unlockLiveChatAudio,
} from '@/lib/live-chat-sound'

export type InlineLiveStatus = 'waiting' | 'active' | 'closed' | 'abandoned'

export interface InlineLiveSession {
  id: string
  supportCode?: string | null
  status: InlineLiveStatus
  escalatedAt: string
  acceptedAt: string | null
  closedAt: string | null
  ratedAt: string | null
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
  created_at: string
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
}

function triggerTranscriptTextDownload(
  supportCode: string,
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
  link.download = `dermaspace-chat-${supportCode.toLowerCase()}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// RepAvatar — resilient staff portrait with graceful fallback
// ---------------------------------------------------------------------------

export function RepAvatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
}) {
  const cleanSrc = (src ?? '').trim()
  const [stage, setStage] = useState<'primary' | 'fallback' | 'monogram'>(
    cleanSrc ? 'primary' : 'fallback',
  )

  useEffect(() => {
    setStage(cleanSrc ? 'primary' : 'fallback')
  }, [cleanSrc])

  const label = (name ?? '').trim() || 'Representative'
  const initial = label.charAt(0).toUpperCase() || 'D'

  if (stage === 'monogram') {
    return (
      <div
        aria-label={label}
        style={{ width: size, height: size }}
        className={cn(
          'rounded-full bg-[#7B2D8E] text-white font-semibold flex items-center justify-center shrink-0 select-none',
          size <= 28 ? 'text-[11px]' : 'text-[13px]',
          className,
        )}
      >
        {initial}
      </div>
    )
  }

  const activeSrc = stage === 'primary' ? cleanSrc : '/avatars/f1.jpg'
  return (
    <Image
      src={activeSrc}
      alt={label}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => {
        setStage((prev) =>
          prev === 'primary' && activeSrc !== '/avatars/f1.jpg'
            ? 'fallback'
            : 'monogram',
        )
      }}
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full object-cover shrink-0 border border-[#7B2D8E]/20 bg-[#FAF6FB]',
        className,
      )}
    />
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
}: UseInlineLiveChatOptions) {
  const [active, setActive] = useState<InlineLivePayload | null>(null)
  const [messages, setMessages] = useState<InlineLiveMessage[]>([])
  const [connecting, setConnecting] = useState(false)
  const [sending, setSending] = useState(false)
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
  useEffect(() => {
    activeRef.current = active
  }, [active])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  useEffect(() => {
    onSessionFinalizedRef.current = onSessionFinalized
  }, [onSessionFinalized])

  const lastFetchedRef = useRef<string | null>(null)
  const hydratedSessionRef = useRef<string | null>(null)
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const prevStatusRef = useRef<InlineLiveStatus | null>(null)
  const prevStaffKeyRef = useRef<string | null>(null)
  const ratingDoneTimeoutRef = useRef<number | null>(null)
  const [justConnected, setJustConnected] = useState(false)

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
          const map = new Map<string, InlineLiveMessage>()
          for (const m of prev) map.set(m.id, m)
          for (const m of full) map.set(m.id, m)
          const merged = Array.from(map.values()).sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          )
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

  // Poll messages while live session is open & panel is visible
  useEffect(() => {
    if (!enabled || !sessionId || !isLiveMode || !isOpen) return
    let cancelled = false
    const pollMessages = async () => {
      try {
        const since = lastFetchedRef.current
          ? `?since=${encodeURIComponent(lastFetchedRef.current)}`
          : ''
        const res = await fetch(
          `/api/live-chat/sessions/${sessionId}/messages${since}`,
          { credentials: 'include', cache: 'no-store' },
        )
        if (!res.ok) return
        const json = (await res.json()) as {
          messages?: InlineLiveMessage[]
          staffTyping?: boolean
          staffTypingName?: string | null
        }
        const incoming = json.messages ?? []
        if (cancelled) return

        setStaffTyping(Boolean(json.staffTyping))
        setStaffTypingName(json.staffTypingName ?? null)

        const wasHydrated = hydratedSessionRef.current === sessionId
        hydratedSessionRef.current = sessionId

        if (incoming.length === 0) return

        let hasNewStaffReply = false
        for (const m of incoming) {
          if (!seenMessageIdsRef.current.has(m.id)) {
            seenMessageIdsRef.current.add(m.id)
            if (wasHydrated && m.sender_role === 'staff') {
              hasNewStaffReply = true
            }
          }
        }

        if (hasNewStaffReply) {
          playLiveChatChime('reply', 'customer')
        }

        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const m of incoming) {
            if (!seen.has(m.id)) merged.push(m)
          }
          merged.sort((a, b) => a.created_at.localeCompare(b.created_at))
          messagesRef.current = merged
          return merged
        })
        lastFetchedRef.current = incoming[incoming.length - 1].created_at
        onSessionChange?.()
      } catch {
        /* transient */
      }
    }
    pollMessages()
    const id = window.setInterval(pollMessages, 1800)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, sessionId, isLiveMode, isOpen, onSessionChange])

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
      try {
        const res = await fetch(`/api/live-chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body }),
        })
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
          const next = prev.some((m) => m.id === message.id)
            ? prev
            : [...prev, message]
          messagesRef.current = next
          return next
        })
        lastFetchedRef.current = message.created_at
        onSessionChange?.()
        return true
      } catch {
        setError('Connection hiccup — please try sending again.')
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

  return {
    active,
    session,
    staff,
    status,
    messages,
    isLiveMode,
    connecting,
    sending,
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
// InlineLiveOptionsPopup — flat floating popup anchored directly below the
// live chat header (Support ID, Download transcript, Email transcript, Sound)
// ---------------------------------------------------------------------------

export function InlineLiveOptionsPopup({
  open,
  session,
  messages,
  onClose,
}: {
  open: boolean
  session: InlineLiveSession | null
  messages: InlineLiveMessage[]
  onClose: () => void
}) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [emailedTranscript, setEmailedTranscript] = useState(false)
  const [emailingTranscript, setEmailingTranscript] = useState(false)

  const supportCode = session
    ? resolveSupportId(session.supportCode, session.id)
    : null

  useEffect(() => {
    if (!open) return
    let activeMount = true
    void fetchLiveChatSoundPreference('customer').then((enabled) => {
      if (activeMount) setSoundEnabled(enabled)
    })
    return () => {
      activeMount = false
    }
  }, [open])

  const toggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    void saveLiveChatSoundPreference('customer', next)
    if (next) {
      unlockLiveChatAudio()
      window.setTimeout(() => playLiveChatChime('reply'), 30)
    }
  }, [soundEnabled])

  const handleDownloadTranscript = useCallback(() => {
    triggerTranscriptTextDownload(supportCode || 'DS-LC', messages)
    onClose()
  }, [supportCode, messages, onClose])

  const handleEmailTranscript = useCallback(async () => {
    if (!session?.id || emailingTranscript) return
    setEmailingTranscript(true)
    try {
      const res = await fetch(`/api/live-chat/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'email_transcript' }),
      })
      if (res.ok) {
        setEmailedTranscript(true)
        window.setTimeout(() => setEmailedTranscript(false), 3000)
      }
    } catch {
      /* ignore transient */
    } finally {
      setEmailingTranscript(false)
    }
  }, [session?.id, emailingTranscript])

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
        className="absolute inset-x-3 top-2 z-40 rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden animate-[derma-msg-in_0.16s_ease-out]"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#FAF6FB]">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-gray-900">
              Live chat options
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live chat options"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-[#7B2D8E] hover:bg-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownloadTranscript}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-medium text-gray-800 hover:bg-[#FAF6FB] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#7B2D8E]" />
            Download chat transcript
          </span>
          <Download className="w-3.5 h-3.5 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={handleEmailTranscript}
          disabled={emailingTranscript}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-medium text-gray-800 hover:bg-[#FAF6FB] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <span className="inline-flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-[#7B2D8E]" />
            {emailedTranscript
              ? 'Transcript sent to your email'
              : emailingTranscript
                ? 'Sending transcript…'
                : 'Email chat transcript'}
          </span>
          {emailedTranscript && <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />}
        </button>

        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="inline-flex items-center gap-2.5 text-[13px] font-medium text-gray-800">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#7B2D8E]" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
            Notifications
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            data-testid="live-chat-sound-toggle"
            onClick={toggleSound}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors cursor-pointer',
              soundEnabled
                ? 'bg-[#7B2D8E] border-[#7B2D8E]'
                : 'bg-gray-200 border-gray-200',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                soundEnabled ? 'translate-x-5' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>
    </>
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
  confirmLeaveOpen = false,
  onCancelLeave,
  onConfirmLeave,
  guestFormOpen,
  guestSubmitting,
  guestError,
  onSubmitGuest,
  onCancelGuest,
  showRating,
  ratingSessionId,
  ratingSupportCode,
  ratingError,
  serviceRating,
  staffRating,
  ratingComment,
  savingRating,
  ratingDone,
  onServiceRatingChange,
  onStaffRatingChange,
  onRatingCommentChange,
  onSubmitRating,
  onSkipRating,
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
  optionsOpen?: boolean
  onCloseOptions?: () => void
  confirmLeaveOpen?: boolean
  onCancelLeave?: () => void
  onConfirmLeave?: () => void
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
  ratingSessionId?: string | null
  ratingSupportCode?: string | null
  ratingError?: string | null
  serviceRating: number
  staffRating: number
  ratingComment: string
  savingRating: boolean
  ratingDone: boolean
  onServiceRatingChange: (n: number) => void
  onStaffRatingChange: (n: number) => void
  onRatingCommentChange: (v: string) => void
  onSubmitRating: () => void
  onSkipRating: () => void
}) {
  const isWaiting = session?.status === 'waiting'
  const isActive = session?.status === 'active'
  const isClosed = session?.status === 'closed' || session?.status === 'abandoned'
  const isLive = isWaiting || isActive
  const supportCode = session
    ? resolveSupportId(session.supportCode, session.id)
    : ratingSupportCode || null

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
      {/* Quiet waiting status — NO duplicate second header card or exposed ticket ID */}
      {(connecting || isWaiting) && (
        <div className="py-2 text-center" data-testid="live-chat-waiting-notice">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 px-3.5 py-1.5 text-[11.5px] font-medium text-[#5A1D6A]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B2D8E]" />
            <span>Waiting for a representative…</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Feel free to share details below while we connect you.
          </p>
        </div>
      )}

      {/* Compact brand-purple action prompt for leaving live chat */}
      <ConfirmDialog
        open={Boolean(isLive && confirmLeaveOpen)}
        title="Leave this live chat?"
        description="This ends your live support session. You can keep chatting with Derma AI right here."
        confirmLabel="Leave chat"
        cancelLabel="Go back"
        variant="brand"
        icon={<LogOut className="w-[18px] h-[18px]" />}
        onConfirm={() => onConfirmLeave?.()}
        onCancel={() => onCancelLeave?.()}
      />

      {/* Inline guest details form */}
      {guestFormOpen && (
        <GuestHandoffCard
          submitting={guestSubmitting}
          error={guestError}
          onSubmit={onSubmitGuest}
          onCancel={onCancelGuest}
        />
      )}

      {/* Live messages — stay mounted even after status transitions to closed */}
      {(isLive || isClosed || showRating) && visibleMessages.length > 0 && (() => {
        const firstJoinIdx = visibleMessages.findIndex(
          (msg) => msg.sender_role === 'system' && isJoinMilestoneText(msg.body),
        )
        return (
          <div className="space-y-3" data-testid="live-chat-messages-list">
            {visibleMessages.map((m, idx) => (
              <InlineLiveBubble
                key={m.id}
                message={m}
                staff={staff}
                showAiLeftDivider={idx === firstJoinIdx}
              />
            ))}
          </div>
        )
      })()}

      {/* Live typing indicator — classic 3-dot reply bubble, no "typing" text */}
      {isActive && staffTyping && (
        <div
          className="flex items-end gap-2 pt-0.5"
          data-testid="live-chat-staff-typing"
          role="status"
          aria-live="polite"
          aria-label={`${typingLabel} is replying`}
        >
          <RepAvatar
            src={staff?.avatarUrl}
            name={typingLabel}
            size={28}
          />
          <div className="inline-flex items-center gap-1.5 bg-[#FAF6FB] border border-[#7B2D8E]/15 px-4 py-3.5 rounded-2xl rounded-bl-sm">
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

      {/* Post-chat feedback card right inside the chat — ZERO rep names */}
      {showRating && (
        <InlineRatingCard
          supportCode={ratingSupportCode ?? supportCode}
          done={ratingDone}
          saving={savingRating}
          error={ratingError ?? null}
          serviceRating={serviceRating}
          comment={ratingComment}
          onServiceRatingChange={onServiceRatingChange}
          onStaffRatingChange={onStaffRatingChange}
          onCommentChange={onRatingCommentChange}
          onSubmit={onSubmitRating}
          onSkip={onSkipRating}
        />
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
}: {
  message: InlineLiveMessage
  staff: InlineLiveStaff | null
  showAiLeftDivider?: boolean
}) {
  const stamp = useMemo(
    () => formatChatTimestamp(message.created_at),
    [message.created_at],
  )

  if (message.sender_role === 'system') {
    if (isJoinMilestoneText(message.body)) {
      const actionMatch = message.body.match(/\b(joined the chat|took over the chat)\b/i)
      const milestoneAction = actionMatch ? actionMatch[1].toLowerCase() : 'joined the chat'
      const milestoneName =
        message.body.replace(/\s+(joined|took over)\b.*$/i, '').trim() ||
        staff?.displayName ||
        'Customer Care'

      return (
        <div className="space-y-4 py-3" data-testid="live-chat-join-milestone">
          <div className="text-center">
            <div className="flex justify-center mb-2.5">
              <RepAvatar
                src={message.sender_avatar_url || staff?.avatarUrl}
                name={milestoneName}
                size={68}
                className="border border-gray-200"
              />
            </div>
            <p className="text-[15.5px] font-semibold text-gray-800 leading-snug">
              {milestoneName}
            </p>
            <p className="text-[15.5px] font-semibold text-gray-800 leading-snug">
              {milestoneAction}
            </p>
            {stamp && (
              <p className="text-[11.5px] text-gray-500 mt-1 tabular-nums">
                {stamp}
              </p>
            )}
          </div>

          {showAiLeftDivider && (
            <div className="pt-0.5" data-testid="live-chat-ai-left-divider">
              <div className="flex items-center gap-3 px-2">
                <span className="w-8 h-px bg-gray-300 shrink-0" />
                <span className="flex-1 text-[13px] font-normal text-gray-600 text-center">
                  Derma AI left the chat
                </span>
                <span className="w-8 h-px bg-gray-300 shrink-0" />
              </div>
              {stamp && (
                <p className="text-[11.5px] text-gray-500 text-center mt-1 tabular-nums">
                  {stamp}
                </p>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="py-2" data-testid="live-chat-system-divider">
        <div className="flex items-center gap-3 px-2">
          <span className="flex-1 h-px bg-gray-200" />
          <span className="text-[12px] font-medium text-gray-600 text-center px-1">
            {message.body}
          </span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>
        {stamp && (
          <p className="text-[11px] text-gray-400 text-center mt-1 tabular-nums">
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
        className="flex items-end gap-2"
        data-testid="live-chat-staff-bubble"
      >
        <RepAvatar src={senderAvatarUrl} name={senderName} size={28} />
        <div className="max-w-[82%] min-w-0">
          <div className="bg-[#FAF6FB] border border-[#7B2D8E]/15 px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
            <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
              {message.body}
            </p>
          </div>
          {stamp && (
            <p className="text-[11px] text-gray-500 mt-1 ml-1 tabular-nums">
              {stamp}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] min-w-0">
        <div className="bg-[#7B2D8E] text-white px-3.5 py-2 rounded-2xl rounded-br-sm">
          <p className="text-[13.5px] whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </p>
        </div>
        {stamp && (
          <p className="text-[10px] text-gray-400 mt-1 mr-2 text-right tabular-nums">
            {stamp}
          </p>
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
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-[12.5px] font-semibold px-4 py-2 transition-colors disabled:opacity-50"
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

function InlineRatingCard({
  supportCode,
  done,
  saving,
  error,
  serviceRating,
  comment,
  onServiceRatingChange,
  onStaffRatingChange,
  onCommentChange,
  onSubmit,
  onSkip,
}: {
  supportCode: string | null
  done: boolean
  saving: boolean
  error: string | null
  serviceRating: number
  comment: string
  onServiceRatingChange: (n: number) => void
  onStaffRatingChange: (n: number) => void
  onCommentChange: (v: string) => void
  onSubmit: () => void
  onSkip: () => void
}) {
  const canSubmit = !saving && serviceRating >= 1

  if (done) {
    return (
      <div
        data-testid="live-chat-rating-done"
        className="mx-auto max-w-[300px] rounded-2xl bg-[#FAF6FB] border border-[#7B2D8E]/20 px-3.5 py-2.5 text-center"
      >
        <p className="text-[12.5px] font-semibold text-[#5A1D6A]">
          Thank you for your feedback
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Derma AI is ready whenever you need help.
        </p>
      </div>
    )
  }

  const handleStarSelect = (n: number) => {
    onServiceRatingChange(n)
    onStaffRatingChange(n)
  }

  return (
    <div
      className="mx-auto max-w-[300px] rounded-2xl bg-white border border-gray-200 px-3.5 py-3 space-y-2.5"
      data-testid="live-chat-rating-card"
    >
      <div className="text-center">
        <p className="text-[13px] font-semibold text-gray-900 leading-tight">
          Leave feedback
        </p>
      </div>

      {/* Compact single 5-star row */}
      <div
        className="flex items-center justify-center gap-1.5 py-0.5"
        role="group"
        aria-label="Leave feedback rating"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleStarSelect(n)}
            aria-label={`Rate ${n} out of 5`}
            className="p-1 rounded-full transition-transform active:scale-90 hover:bg-[#FAF6FB] cursor-pointer"
          >
            <Star
              className={cn(
                'w-5 h-5 transition-colors',
                n <= serviceRating
                  ? 'fill-[#7B2D8E] text-[#7B2D8E]'
                  : 'text-gray-300 hover:text-[#7B2D8E]/60',
              )}
            />
          </button>
        ))}
      </div>

      {/* Compact 1-line optional note */}
      <input
        type="text"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Add a short note (optional)…"
        maxLength={300}
        className="w-full rounded-xl border border-gray-200 bg-[#FBF9FC] px-3 py-1.5 text-base sm:text-[12px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
      />

      {error && (
        <p className="text-[11px] text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-lg px-2.5 py-1">
          {error}
        </p>
      )}

      {/* Compact actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-[12px] font-semibold px-3 py-1.5 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Submit
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-[#FAF6FB] hover:text-[#5A1D6A] hover:border-[#7B2D8E]/30 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>
    </div>
  )
}


