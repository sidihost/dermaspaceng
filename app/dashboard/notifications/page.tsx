'use client'

/**
 * /dashboard/notifications
 *
 * Full inbox view of the user's in-app notifications. Companion to
 * the header NotificationBell — same data source (`/api/notifications`)
 * but with filtering (all / unread), per-row actions (mark
 * read/unread, delete) and a "Mark all read" button.
 *
 * Design language matches the rest of the dashboard:
 *   - Brand purple (#7B2D8E) primary
 *   - Soft gray surfaces with rounded-2xl cards
 *   - No gradients; flat surfaces
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

type Notif = {
  id: string
  title: string
  message: string
  type: string
  reference_type: string | null
  reference_id: string | null
  action_url: string | null
  priority: string
  is_read: boolean
  created_at: string
}

// Custom error type so the page can distinguish a *real* 401
// (cookie missing / session expired — show "Please sign in") from
// any other failure (cold start, 5xx, dropped connection — show a
// neutral empty state and let SWR retry). Previously every error
// rendered the sign-in card, which is what produced the bug where
// the dashboard header (clearly logged in as "Mill") and the
// notifications card disagreed.
class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const fetcher = async (url: string) => {
  const r = await fetch(url, {
    // Explicit, even though same-origin requests include cookies by
    // default — guards against any future deployment quirk where the
    // dev tunnel / preview proxy strips the cookie unless asked.
    credentials: 'same-origin',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (r.status === 401) throw new FetchError('unauthorized', 401)
  if (!r.ok) throw new FetchError(`HTTP ${r.status}`, r.status)
  return r.json()
}

const TYPE_LABELS: Record<string, string> = {
  reply: 'Reply',
  status_update: 'Update',
  announcement: 'Announcement',
  reminder: 'Reminder',
  promo: 'Offer',
  system: 'System',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationsPage() {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const { data, mutate, isLoading, error } = useSWR<{
    notifications: Notif[]
    unread: number
  }>('/api/notifications?limit=50', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  })

  const all = data?.notifications ?? []
  const unread = data?.unread ?? 0
  const visible = filter === 'unread' ? all.filter((n) => !n.is_read) : all

  async function markOne(id: string, isRead: boolean) {
    mutate(
      (cur) => cur && {
        ...cur,
        notifications: cur.notifications.map((n) =>
          n.id === id ? { ...n, is_read: isRead } : n,
        ),
        unread: Math.max(0, cur.unread + (isRead ? -1 : 1)),
      },
      { revalidate: false },
    )
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead }),
      })
    } catch { /* let SWR reconcile */ }
  }

  async function removeOne(id: string) {
    const wasUnread = all.find((n) => n.id === id && !n.is_read)
    mutate(
      (cur) => cur && {
        ...cur,
        notifications: cur.notifications.filter((n) => n.id !== id),
        unread: Math.max(0, cur.unread - (wasUnread ? 1 : 0)),
      },
      { revalidate: false },
    )
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
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
    <>
      <Header />
      {/* Layout
          The card was previously stretched (`flex-1` + `min-h-[20rem]`)
          to fill the viewport, but the empty state ended up looking
          like a tall billboard for "no notifications" with too much
          white space inside it. We now keep a stable page background
          (gray-50) and let the card sit at content height, so the
          empty / error / loading states feel like a proper compact
          callout instead of a fenced-off void.
          The `pb-24 md:pb-0` keeps the card clear of the floating
          mobile bottom nav. */}
      <main className="bg-gray-50 min-h-[100dvh] pb-24 md:pb-0">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          {/* Heading
              Responsive layout — on phones the title and the
              "Mark all read" pill stack vertically so the action
              button gets a full-width tap target and the title
              never has to ellipsis-truncate. From `sm:` upward we
              switch back to a side-by-side row, matching the
              inbox-style design. */}
          <div className="mb-5 sm:mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  Notifications
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {unread > 0
                    ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}`
                    : "You're all caught up"}
                </p>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 hover:bg-[#7B2D8E]/15 rounded-full transition-colors w-full sm:w-auto flex-shrink-0"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-4">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-[#7B2D8E] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#7B2D8E]/40'
                }`}
              >
                {f === 'all' ? 'All' : `Unread${unread ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>

          {/* List
              Card sits at content height — empty / error / loading
              states center inside a compact ~12rem callout, while
              real notification rows let the <ul> drive the height
              naturally. No more "infinite white slab" feeling. */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Only treat a real HTTP 401 as "needs sign-in". Every
                other failure (cold start, transient 5xx, network
                blip) gets a neutral empty state with a Retry button
                so we don't lie to a logged-in user about being
                signed out. */}
            {error && (error as FetchError).status === 401 ? (
              <div className="flex flex-col items-center text-center px-6 py-8">
                <p className="text-sm text-gray-700 font-medium">
                  Please sign in to view notifications.
                </p>
                <Link
                  href="/signin?next=/dashboard/notifications"
                  className="mt-3 inline-block text-sm font-semibold text-[#7B2D8E] hover:underline"
                >
                  Sign in
                </Link>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center text-center px-6 py-8">
                <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/5 flex items-center justify-center text-[#7B2D8E]">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  Couldn&apos;t load notifications
                </p>
                <p className="mt-1 text-xs text-gray-500 max-w-sm">
                  Something went wrong on our end. Try again in a moment.
                </p>
                <button
                  type="button"
                  onClick={() => mutate()}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 hover:bg-[#7B2D8E]/15 rounded-full transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-8 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notifications…
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center text-center px-6 py-8">
                <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/5 flex items-center justify-center text-[#7B2D8E]">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="mt-1 text-xs text-gray-500 max-w-sm">
                  When we have something for you — a booking update, a reply from support, or a
                  promo — it&apos;ll show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visible.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onToggleRead={(isRead) => markOne(n.id, isRead)}
                    onDelete={() => removeOne(n.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function NotificationRow({
  n,
  onToggleRead,
  onDelete,
}: {
  n: Notif
  onToggleRead: (isRead: boolean) => void
  onDelete: () => void
}) {
  const Body = (
    <div
      className={`flex items-start gap-3 px-4 sm:px-5 py-4 transition-colors ${
        n.is_read ? 'bg-white' : 'bg-[#7B2D8E]/[0.025]'
      } hover:bg-[#7B2D8E]/[0.05]`}
    >
      {/* Unread dot / type avatar */}
      <span
        aria-hidden="true"
        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
          n.is_read ? 'bg-gray-300' : 'bg-[#7B2D8E]'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
            {n.title}
          </p>
          <span className="text-[10px] uppercase tracking-wide text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded-full font-semibold">
            {TYPE_LABELS[n.type] ?? n.type}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">{n.message}</p>
        <p className="mt-1.5 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  )

  return (
    <li className="group relative">
      {n.action_url ? (
        <Link
          href={n.action_url}
          onClick={() => {
            if (!n.is_read) onToggleRead(true)
          }}
          className="block"
        >
          {Body}
        </Link>
      ) : (
        <div className="block">{Body}</div>
      )}
      {/* Row actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleRead(!n.is_read)
          }}
          className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
          aria-label={n.is_read ? 'Mark as unread' : 'Mark as read'}
          title={n.is_read ? 'Mark as unread' : 'Mark as read'}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-gray-600"
          aria-label="Delete notification"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  )
}
