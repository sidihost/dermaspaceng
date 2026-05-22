'use client'

/**
 * /admin/notifications
 *
 * Operator-only inbox view. Mirrors the customer
 * /dashboard/notifications page but reads from the admin audience
 * scope so it surfaces system events fanned out by `notifyAdmins`
 * (new ticket, new consultation, etc.) instead of the operator's
 * own customer notifications.
 *
 * Kept intentionally thin — uses the same `/api/notifications`
 * endpoint with `?audience=admin` so any future enrichment of the
 * notifications model lights this surface up automatically.
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, Bell, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react'

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

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: 'same-origin' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
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

export default function AdminNotificationsPage() {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const { data, mutate, isLoading, error } = useSWR<{
    notifications: Notif[]
    unread: number
  }>('/api/notifications?limit=50&audience=admin', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
  })

  const all = data?.notifications ?? []
  const unread = data?.unread ?? 0
  const visible = filter === 'unread' ? all.filter((n) => !n.is_read) : all

  async function markOne(id: string, isRead: boolean) {
    mutate(
      (cur) =>
        cur && {
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
    } catch {
      /* SWR reconcile */
    }
  }

  async function removeOne(id: string) {
    const wasUnread = all.find((n) => n.id === id && !n.is_read)
    mutate(
      (cur) =>
        cur && {
          ...cur,
          notifications: cur.notifications.filter((n) => n.id !== id),
          unread: Math.max(0, cur.unread - (wasUnread ? 1 : 0)),
        },
      { revalidate: false },
    )
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    mutate(
      (cur) =>
        cur && {
          ...cur,
          notifications: cur.notifications.map((n) => ({ ...n, is_read: true })),
          unread: 0,
        },
      { revalidate: false },
    )
    try {
      await fetch('/api/notifications/read-all?audience=admin', { method: 'POST' })
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <div className="mb-5 sm:mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to admin
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              Admin notifications
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {unread > 0
                ? `${unread} unread system notification${unread === 1 ? '' : 's'}`
                : 'You\u2019re all caught up'}
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

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center text-center px-6 py-8">
            <p className="text-sm font-semibold text-gray-900">Couldn&apos;t load notifications</p>
            <button
              type="button"
              onClick={() => mutate()}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 hover:bg-[#7B2D8E]/15 rounded-full transition-colors"
            >
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
              When a customer submits a consultation, opens a ticket, or triggers another system
              event, it will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((n) => (
              <li key={n.id} className="group relative">
                {n.action_url ? (
                  <Link
                    href={n.action_url}
                    onClick={() => {
                      if (!n.is_read) markOne(n.id, true)
                    }}
                    className="block"
                  >
                    <Row n={n} />
                  </Link>
                ) : (
                  <div className="block">
                    <Row n={n} />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      markOne(n.id, !n.is_read)
                    }}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                    aria-label={n.is_read ? 'Mark as unread' : 'Mark as read'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeOne(n.id)
                    }}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-gray-600"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Row({ n }: { n: Notif }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 sm:px-5 py-4 transition-colors ${
        n.is_read ? 'bg-white' : 'bg-[#7B2D8E]/[0.025]'
      } hover:bg-[#7B2D8E]/[0.05]`}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
          n.is_read ? 'bg-gray-300' : 'bg-[#7B2D8E]'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
          {n.title}
        </p>
        <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">{n.message}</p>
        <p className="mt-1.5 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  )
}
