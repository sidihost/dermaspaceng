'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Inbox, X } from 'lucide-react'
import { playLiveChatChime, unlockLiveChatAudio } from '@/lib/live-chat-sound'
import { resolveSupportId } from '@/lib/support-and-chat'
import { syncBrowserPushSubscription } from './permissions-panel'

interface WaitingSummaryItem {
  id: string
  support_code?: string | null
  initial_topic?: string | null
  user_first_name?: string | null
  user_last_name?: string | null
  escalated_at?: string | null
}

export function LiveChatRequestWatcher({ role }: { role: 'admin' | 'staff' }) {
  const pathname = usePathname()
  const isOnLiveChatPage =
    pathname === '/admin/live-chat' ||
    pathname?.startsWith('/admin/live-chat/') ||
    pathname === '/staff/live-chat' ||
    pathname?.startsWith('/staff/live-chat/')

  const basePath = role === 'admin' ? '/admin/live-chat' : '/staff/live-chat'

  const [waitingList, setWaitingList] = useState<WaitingSummaryItem[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const [pushPerm, setPushPerm] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const hydratedRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const prevCountRef = useRef<number>(-1)

  // Unlock shared AudioContext on first user interaction + keep Web Push subscription synced
  useEffect(() => {
    const unlock = () => unlockLiveChatAudio()
    window.addEventListener('pointerdown', unlock, { once: true, passive: true })
    window.addEventListener('keydown', unlock, { once: true })
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPerm(Notification.permission)
      if (Notification.permission === 'granted') {
        void syncBrowserPushSubscription()
      }
    }
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch('/api/staff/live-chat/queue?summary=1', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok || cancelled) return
        const data = (await res.json().catch(() => null)) as {
          waiting?: WaitingSummaryItem[]
        } | null
        const waiting = Array.isArray(data?.waiting) ? data.waiting : []
        if (cancelled) return

        setWaitingList(waiting)

        if (prevCountRef.current !== waiting.length) {
          prevCountRef.current = waiting.length
          window.dispatchEvent(
            new CustomEvent('live-chat:waiting-changed', {
              detail: { count: waiting.length },
            }),
          )
        }

        if (!hydratedRef.current) {
          hydratedRef.current = true
          seenIdsRef.current = new Set(waiting.map((w) => w.id))
          return
        }

        let newlyArrived: WaitingSummaryItem | null = null
        for (const w of waiting) {
          if (!seenIdsRef.current.has(w.id)) {
            seenIdsRef.current.add(w.id)
            newlyArrived = w
          }
        }

        if (newlyArrived) {
          window.dispatchEvent(new CustomEvent('notifications:refresh'))

          if (!isOnLiveChatPage) {
            playLiveChatChime('queue', 'staff')

            // Fire native browser notification if permission is already granted
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.hidden
            ) {
              const name =
                `${newlyArrived.user_first_name || 'Visitor'} ${newlyArrived.user_last_name || ''}`.trim()
              const code = resolveSupportId(newlyArrived.support_code, newlyArrived.id)
              try {
                const notif = new Notification(`New live chat request (${code})`, {
                  body: `${name}: ${newlyArrived.initial_topic || 'Requested live support'}`,
                  icon: '/icons/icon-192x192.png',
                  tag: `live-chat-${newlyArrived.id}`,
                })
                notif.onclick = () => {
                  try {
                    window.focus()
                    window.location.assign(
                      `${basePath}?session=${encodeURIComponent(newlyArrived.id)}`,
                    )
                    notif.close()
                  } catch {
                    /* ignore */
                  }
                }
              } catch {
                /* ignore Notification constructor issues in restricted browsers */
              }
            }
          }
        }
      } catch {
        /* retry next poll cycle */
      }
    }

    void poll()
    const interval = window.setInterval(poll, 6000)
    const onFocus = () => void poll()
    const onRefresh = () => void poll()
    const onVisibility = () => {
      if (!document.hidden) void poll()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('live-chat:waiting-changed', onRefresh)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('live-chat:waiting-changed', onRefresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isOnLiveChatPage, basePath])

  if (isOnLiveChatPage) return null

  const activeAlert = waitingList.find((item) => !dismissedIds.has(item.id))
  if (!activeAlert) return null

  const customerName =
    `${activeAlert.user_first_name || 'Guest'} ${activeAlert.user_last_name || ''}`.trim()
  const supportCode = resolveSupportId(activeAlert.support_code, activeAlert.id)
  const remainingCount = waitingList.length

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="live-chat-request-banner"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[376px] z-[60] rounded-2xl border border-[#7B2D8E]/30 bg-white p-3.5"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center shrink-0">
          <Inbox className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-semibold text-gray-900 truncate">
              {remainingCount > 1
                ? `${remainingCount} visitors waiting for live chat`
                : 'Live chat request'}
            </p>
            <button
              type="button"
              onClick={() =>
                setDismissedIds((prev) => {
                  const next = new Set(prev)
                  for (const w of waitingList) next.add(w.id)
                  return next
                })
              }
              aria-label="Dismiss live chat alert"
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[12px] text-gray-700 mt-0.5 truncate">
            <span className="font-semibold text-[#7B2D8E]">{customerName}</span>
            {' · '}
            <span className="font-mono text-[11px]">{supportCode}</span>
          </p>
          {activeAlert.initial_topic && (
            <p className="text-[11.5px] text-gray-500 mt-0.5 line-clamp-1">
              {activeAlert.initial_topic}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Link
              href={`${basePath}?session=${encodeURIComponent(activeAlert.id)}`}
              className="inline-flex items-center justify-center rounded-full bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 px-3.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors"
            >
              Accept chat
            </Link>
            {pushPerm === 'default' && (
              <button
                type="button"
                onClick={() => {
                  unlockLiveChatAudio()
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    void Notification.requestPermission().then((perm) => {
                      setPushPerm(perm)
                      if (perm === 'granted') void syncBrowserPushSubscription()
                    })
                  }
                }}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-[#7B2D8E]/25 bg-[#FAF6FB] hover:border-[#7B2D8E]/50 px-3 py-1.5 text-[11.5px] font-medium text-[#7B2D8E] transition-colors cursor-pointer"
              >
                <Bell className="w-3 h-3" />
                Enable alerts
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setDismissedIds((prev) => {
                  const next = new Set(prev)
                  for (const w of waitingList) next.add(w.id)
                  return next
                })
              }
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-[11.5px] font-medium text-gray-600 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
