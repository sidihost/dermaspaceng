'use client'

/**
 * Header notification bell.
 *
 * Compact bell button that surfaces the unread count from
 * /api/notifications (drives the badge), plus a dropdown of the
 * 8 most recent notifications. The bell is the user-side mirror of
 * the broadcast / reply system the admin can fire from
 * /admin/broadcast and /admin/reply.
 *
 * Behaviours that match what users expect from "real" notification
 * UIs (Stripe, Linear, GitHub):
 *   - The badge polls every 60s while the page is visible, so the
 *     count updates without a refresh when an admin sends a reply.
 *   - Opening the dropdown does NOT mark notifications as read —
 *     read happens on click (per item) or via a "Mark all read"
 *     button. This way the badge survives a peek.
 *   - Clicking a notification with a `link` navigates and marks read
 *     in the same gesture (optimistic UI: badge drops instantly).
 *   - "See all" links to /dashboard/notifications for the full list.
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Bell, Check, Loader2 } from 'lucide-react'

type Notif = {
  id: string
  title: string
  message: string
  type: string
  reference_type: string | null
  reference_id: string | null
  action_url: string | null
  is_read: boolean
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('failed')
  return r.json()
})

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Poll every 60s while visible. SWR's `refreshInterval` already
  // pauses when the tab is hidden, so we don't burn cycles on
  // background tabs.
  const { data, mutate, isLoading } = useSWR<{ notifications: Notif[]; unread: number }>(
    '/api/notifications?limit=8',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )

  const items = data?.notifications ?? []
  const unread = data?.unread ?? 0

  // Close on outside click — same pattern the existing profile
  // dropdown uses, kept locally so the bell is fully self-contained.
  React.useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markOne(id: string) {
    // Optimistic — flip the local copy first so the badge moves
    // immediately, then PATCH on the server. We swallow errors:
    // if the server fails, the next poll will reconcile.
    mutate(
      (cur) => {
        if (!cur) return cur
        return {
          ...cur,
          notifications: cur.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n,
          ),
          unread: Math.max(0, cur.unread - 1),
        }
      },
      { revalidate: false },
    )
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
    } catch { /* ignore */ }
  }

  async function markAll() {
    mutate(
      (cur) => cur && {
        ...cur,
        notifications: cur.notifications.map((n) => ({ ...n, is_read: true })),
        unread: 0,
      },
      { revalidate: false },
    )
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
    } catch { /* ignore */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative w-9 h-9 rounded-xl bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          // Responsive positioning. On phones the bell sits between the
          // logo and the avatar pill, so the previous `absolute right-0`
          // anchor pushed the panel off the LEFT edge of the viewport
          // (Screenshot_20260426-051528.jpg cropped "You're all caught up"
          // and "View all notifications"). We now switch to a `fixed`
          // viewport-anchored tray on mobile (left/right safety margins
          // of 8px keep us off the screen edges) and revert to the
          // standard absolute dropdown on tablets / desktop where the
          // bell has more breathing room.
          className="fixed left-2 right-2 top-[64px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#7B2D8E] hover:underline"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 px-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#7B2D8E]/5 flex items-center justify-center text-[#7B2D8E]">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900">You&apos;re all caught up</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  We&apos;ll let you know when something happens.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => {
                  const Body = (
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-[#7B2D8E]/[0.03] transition-colors">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          n.is_read ? 'bg-gray-300' : 'bg-[#7B2D8E]'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  )
                  if (n.action_url) {
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.action_url}
                          onClick={() => {
                            if (!n.is_read) void markOne(n.id)
                            setOpen(false)
                          }}
                          className="block"
                        >
                          {Body}
                        </Link>
                      </li>
                    )
                  }
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          if (!n.is_read) void markOne(n.id)
                        }}
                      >
                        {Body}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-[12.5px] font-semibold text-[#7B2D8E] hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
