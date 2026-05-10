'use client'

/**
 * Admin → Staff profile.
 *
 * The "everything-about-this-staff-member" view. The staff list links
 * here so an admin can:
 *   • see who they are at a glance (avatar, role, status pill)
 *   • understand their workload (assignments + replies counts)
 *   • see CSAT — the average ticket review rating customers have left
 *     on tickets this staff member handled, plus a recent ticket list
 *     with the star rating attached to each
 *   • take action — Suspend / Reactivate, promote/demote
 *
 * Data is owned by /api/admin/staff/[userId] (read) and the existing
 * /api/admin/users PUT handler (write — toggle_active, change_role).
 * Everything is brand-purple per the design rules; we never let
 * status colour leak into the chrome.
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  ShieldOff,
  ShieldCheck,
  UserCheck,
  UserX,
  Star,
  Send,
  MessageSquare,
  Calendar,
  Gift,
  Headphones,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react'

interface StaffUser {
  id: string
  email: string | null
  username: string | null
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  must_change_password: boolean
  is_super_admin: boolean
  can_manage_services: boolean
  avatar_url: string | null
}

interface Performance {
  replies: { tickets: number; requests: number; total: number }
  assignments: { complaints: number; consultations: number; giftCards: number }
  ticketReviews: {
    averageRating: number | null
    ratedCount: number
    positive: number
    negative: number
    helpfulYes: number
    helpfulNo: number
  }
  liveChat: {
    totalChats: number
    closedChats: number
    averageRating: number | null
    ratedChats: number
  }
}

interface TicketRow {
  id: number
  ticket_id: string
  subject: string
  status: string
  priority: string
  created_at: string
  updated_at: string | null
  review_rating: number | null
  review_was_helpful: boolean | null
  review_body: string | null
  review_created_at: string | null
  last_replied_at: string | null
  reply_count: number
}

interface ApiResponse {
  user: StaffUser
  performance: Performance
  tickets: TicketRow[]
}

const TICKET_STATUS_PILL: Record<string, string> = {
  open: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
  in_progress: 'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StarRating({
  rating,
  size = 'sm',
}: {
  rating: number
  size?: 'xs' | 'sm'
}) {
  // Reusable compact star renderer. Ratings on this page are display-
  // only — the input variant lives in components/support/ticket-review-prompt.
  const dim = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <span className="inline-flex items-center gap-0.5 text-[#7B2D8E]" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={dim}
          fill={n <= rating ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      ))}
    </span>
  )
}

export default function StaffProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/staff/${userId}`, { cache: 'no-store' })
      if (!res.ok) {
        const text = await res.json().catch(() => ({}))
        throw new Error(text.error || `Failed (${res.status})`)
      }
      const body = (await res.json()) as ApiResponse
      setData(body)
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Reuse the existing /api/admin/users PUT handler (toggle_active,
  // change_role) so we don't duplicate the suspension session-cleanup
  // logic that endpoint already runs.
  const handleAction = async (action: string, value: unknown) => {
    setActing(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      })
      if (res.ok) await fetchProfile()
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-4">
          {error ?? 'Could not load this staff profile.'}
        </p>
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to staff
        </Link>
      </div>
    )
  }

  const { user, performance, tickets } = data
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email || 'Staff member'

  return (
    <div className="space-y-5">
      {/* Back link + page header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/staff"
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Staff profile</h1>
          <p className="text-xs text-gray-500">
            Performance, ratings and account controls
          </p>
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="relative flex-shrink-0">
            {user.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatar_url}
                alt=""
                aria-hidden="true"
                className="w-16 h-16 rounded-2xl object-cover ring-1 ring-[#7B2D8E]/15"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center">
                <span className="text-lg font-semibold text-white">{initials || 'DS'}</span>
              </div>
            )}
            <span
              className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-white ${
                user.is_active ? 'bg-[#7B2D8E]' : 'bg-gray-400'
              }`}
              title={user.is_active ? 'Active' : 'Suspended'}
              aria-label={user.is_active ? 'Active' : 'Suspended'}
            >
              {user.is_active ? (
                <UserCheck className="h-3 w-3 text-white" />
              ) : (
                <UserX className="h-3 w-3 text-white" />
              )}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                {fullName}
              </h2>
              <span className="inline-flex items-center rounded-full bg-[#7B2D8E] text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                {user.role}
              </span>
              {user.is_super_admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                  <ShieldCheck className="w-3 h-3" />
                  Super
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  user.is_active
                    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20'
                    : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                }`}
              >
                {user.is_active ? 'Active' : 'Suspended'}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors max-w-[260px]"
                >
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </a>
              )}
              {user.phone && (
                <a
                  href={`tel:${user.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
                >
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  {user.phone}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                <CalendarDays className="w-3 h-3 flex-shrink-0" />
                Joined {formatDate(user.created_at)}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            {user.is_active ? (
              <button
                disabled={acting}
                onClick={() => {
                  if (confirm(`Suspend ${fullName}? They will be signed out and locked out until reactivated.`)) {
                    handleAction('toggle_active', false)
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Suspend
              </button>
            ) : (
              <button
                disabled={acting}
                onClick={() => handleAction('toggle_active', true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7B2D8E]/30 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50"
              >
                <Shield className="w-3.5 h-3.5" />
                Reactivate
              </button>
            )}
            {user.role === 'staff' ? (
              <button
                disabled={acting}
                onClick={() => handleAction('change_role', 'admin')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-medium hover:bg-[#5A1D6A] disabled:opacity-50"
              >
                Promote to admin
              </button>
            ) : (
              <button
                disabled={acting || user.is_super_admin}
                onClick={() => {
                  if (confirm(`Demote ${fullName} from admin to staff?`)) {
                    handleAction('change_role', 'staff')
                  }
                }}
                title={user.is_super_admin ? 'Super admins cannot be demoted from this screen' : undefined}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Demote to staff
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSAT + KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Average ticket rating */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 mb-2">
            Avg ticket rating
          </p>
          {performance.ticketReviews.averageRating != null ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {performance.ticketReviews.averageRating.toFixed(1)}
                </p>
                <span className="text-xs text-gray-400">/ 5.0</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <StarRating rating={Math.round(performance.ticketReviews.averageRating)} />
                <span className="text-[11px] text-gray-500">
                  {performance.ticketReviews.ratedCount} review
                  {performance.ticketReviews.ratedCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-[#7B2D8E]" />
                  {performance.ticketReviews.positive} positive
                </span>
                <span className="inline-flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3 text-gray-500" />
                  {performance.ticketReviews.negative} low
                </span>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              No ticket reviews yet. Customers can rate a ticket once it&apos;s
              resolved or closed.
            </p>
          )}
        </div>

        {/* Replies & assignments */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 mb-2">
            Activity
          </p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <Send className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="tabular-nums font-medium">{performance.replies.total}</span>
              <span className="text-gray-500">replies</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <MessageSquare className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="tabular-nums font-medium">{performance.assignments.complaints}</span>
              <span className="text-gray-500">complaints</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="tabular-nums font-medium">{performance.assignments.consultations}</span>
              <span className="text-gray-500">consultations</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <Gift className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="tabular-nums font-medium">{performance.assignments.giftCards}</span>
              <span className="text-gray-500">gift cards</span>
            </span>
          </div>
        </div>

        {/* Live chat */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 mb-2">
            Live chat
          </p>
          {performance.liveChat.totalChats > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {performance.liveChat.totalChats}
                </p>
                <span className="text-[11px] text-gray-500">
                  {performance.liveChat.closedChats} closed
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <Headphones className="w-3.5 h-3.5 text-[#7B2D8E]" />
                {performance.liveChat.averageRating != null ? (
                  <span className="text-gray-700">
                    <span className="font-medium tabular-nums">
                      {performance.liveChat.averageRating.toFixed(1)}
                    </span>
                    <span className="text-gray-500"> avg ({performance.liveChat.ratedChats})</span>
                  </span>
                ) : (
                  <span className="text-gray-500">No chat ratings yet</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              No live chat sessions assigned to this staff member yet.
            </p>
          )}
        </div>
      </div>

      {/* Recent tickets handled */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Recent tickets handled</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Customer ratings appear next to each ticket once they&apos;ve left
              one.
            </p>
          </div>
        </div>
        {tickets.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No tickets handled yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-mono text-[11px] text-[#7B2D8E] bg-[#7B2D8E]/10 px-1.5 py-0.5 rounded">
                      {t.ticket_id}
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                        TICKET_STATUS_PILL[t.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10.5px] text-gray-400">
                      {t.reply_count} repl{t.reply_count === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 truncate">{t.subject}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Last replied {formatDate(t.last_replied_at ?? t.updated_at ?? t.created_at)}
                  </p>
                  {t.review_body && (
                    <p className="text-[11px] text-gray-600 italic mt-1 line-clamp-2">
                      &ldquo;{t.review_body}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {t.review_rating != null ? (
                    <>
                      <StarRating rating={t.review_rating} />
                      {t.review_was_helpful != null && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            t.review_was_helpful
                              ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {t.review_was_helpful ? (
                            <ThumbsUp className="w-2.5 h-2.5" />
                          ) : (
                            <ThumbsDown className="w-2.5 h-2.5" />
                          )}
                          {t.review_was_helpful ? 'Helpful' : 'Not helpful'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                      No rating
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
