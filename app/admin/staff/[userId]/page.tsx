'use client'

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
  Activity,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNotify } from '@/components/shared/notify'

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

interface ActivityRow {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  description: string | null
  created_at: string
  user_id: string | null
  user_first_name: string | null
  user_last_name: string | null
}

interface ApiResponse {
  user: StaffUser
  performance: Performance
  tickets: TicketRow[]
  activities?: ActivityRow[]
}

const TICKET_STATUS_PILL: Record<string, string> = {
  open: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
  in_progress: 'bg-[#FAF6FB] text-[#5A1D6A] ring-1 ring-[#7B2D8E]/25',
  resolved: 'bg-[#7B2D8E] text-white',
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

function formatRelativeTime(d: string): string {
  const diffMs = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return formatDate(d)
}

function formatActionLabel(s: string | null | undefined): string {
  if (!s) return 'Action'
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function StarRating({
  rating,
  size = 'sm',
}: {
  rating: number
  size?: 'xs' | 'sm'
}) {
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
  const userId = params.userId as string
  const notify = useNotify()

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    action: 'toggle_active' | 'change_role' | 'service_perm'
    value: unknown
    title: string
    description: string
    confirmLabel: string
  } | null>(null)
  const [suspendReason, setSuspendReason] = useState('')

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

  const handleAction = async (action: string, value: unknown, reason?: string) => {
    setActing(true)
    const targetName = data
      ? `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.email || 'Staff member'
      : 'Staff member'
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          value,
          ...(action === 'toggle_active' && value === false && reason?.trim()
            ? { reason: reason.trim() }
            : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error('Action failed', json.error || 'Failed to update staff account')
        return
      }
      if (action === 'toggle_active' && value === false) {
        notify.success(
          'Staff member suspended',
          `${targetName} was signed out and emailed a dedicated staff appeal link.`,
        )
      } else if (action === 'toggle_active' && value === true) {
        notify.success(
          'Staff member reactivated',
          `${targetName} can sign back in and was notified by email.`,
        )
      } else if (action === 'change_role' && value === 'admin') {
        notify.success(
          'Promoted to Admin',
          `${targetName} now has Admin access and was notified by email.`,
        )
      } else if (action === 'change_role' && value === 'staff') {
        notify.info(
          'Role changed to Staff',
          `${targetName}'s admin privileges were removed while keeping staff tools.`,
        )
      } else {
        notify.success('Staff account updated')
      }
      await fetchProfile()
    } catch {
      notify.error('Network error', 'Could not reach server')
    } finally {
      setActing(false)
      setConfirmAction(null)
      setSuspendReason('')
    }
  }

  const handleToggleServicePermission = async (next: boolean) => {
    setActing(true)
    const targetName = data
      ? `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.email || 'Staff member'
      : 'Staff member'
    try {
      const res = await fetch(`/api/admin/staff/${userId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageServices: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error('Permission update failed', json.error || 'Failed to update service permission')
        return
      }
      if (next) {
        notify.success('Service Editor enabled', `${targetName} can now manage the service catalog.`)
      } else {
        notify.info('Service Editor disabled', `Service catalog editing revoked for ${targetName}.`)
      }
      await fetchProfile()
    } catch {
      notify.error('Network error', 'Could not reach server')
    } finally {
      setActing(false)
      setConfirmAction(null)
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

  const { user, performance, tickets, activities = [] } = data
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
            Performance, activity log, ratings and account controls
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
              <div className="w-16 h-16 rounded-2xl bg-[#7B2D8E] flex items-center justify-center">
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
                onClick={() =>
                  setConfirmAction({
                    action: 'toggle_active',
                    value: false,
                    title: `Suspend ${fullName}?`,
                    description: 'They will be signed out immediately and locked out until reactivated.',
                    confirmLabel: 'Suspend account',
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Suspend
              </button>
            ) : (
              <button
                disabled={acting}
                onClick={() =>
                  setConfirmAction({
                    action: 'toggle_active',
                    value: true,
                    title: `Reactivate ${fullName}?`,
                    description: 'Their account access will be restored immediately and they will receive a confirmation email.',
                    confirmLabel: 'Reactivate account',
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7B2D8E]/30 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                Reactivate
              </button>
            )}
            {user.role === 'staff' ? (
              <button
                disabled={acting}
                onClick={() =>
                  setConfirmAction({
                    action: 'change_role',
                    value: 'admin',
                    title: `Promote ${fullName} to admin?`,
                    description: 'Admins receive elevated permissions across the console.',
                    confirmLabel: 'Promote to admin',
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-medium hover:bg-[#5A1D6A] disabled:opacity-50 cursor-pointer"
              >
                Promote to admin
              </button>
            ) : (
              <button
                disabled={acting || user.is_super_admin}
                onClick={() =>
                  setConfirmAction({
                    action: 'change_role',
                    value: 'staff',
                    title: `Demote ${fullName} to staff?`,
                    description: 'Their admin access will be revoked while retaining staff tools.',
                    confirmLabel: 'Demote to staff',
                  })
                }
                title={user.is_super_admin ? 'Super admins cannot be demoted from this screen' : undefined}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Demote to staff
              </button>
            )}
            {user.role === 'staff' && (
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  setConfirmAction({
                    action: 'service_perm',
                    value: !user.can_manage_services,
                    title: user.can_manage_services
                      ? `Revoke Service Editor access from ${fullName}?`
                      : `Grant Service Editor access to ${fullName}?`,
                    description: user.can_manage_services
                      ? 'They will no longer be able to create or update service catalog entries.'
                      : 'They will be able to create, edit, and manage services and pricing inside their staff workspace.',
                    confirmLabel: user.can_manage_services ? 'Revoke access' : 'Grant access',
                  })
                }
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                  user.can_manage_services
                    ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#5A1D6A] hover:bg-[#7B2D8E]/15'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
                }`}
              >
                Service editor: {user.can_manage_services ? 'Granted' : 'Off'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSAT + KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

      {/* Recent staff activity log */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Recent activity log</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Latest actions recorded by {user.first_name || 'this staff member'} across clients, live chats, emails, and payments.
            </p>
          </div>
          <Link
            href="/admin/activity"
            className="text-xs font-medium text-[#7B2D8E] hover:underline whitespace-nowrap"
          >
            View full log
          </Link>
        </div>
        {activities.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No recorded actions yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activities.map((act) => {
              const clientName = [act.user_first_name, act.user_last_name]
                .filter(Boolean)
                .join(' ')
                .trim()
              return (
                <li
                  key={act.id}
                  className="px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded-full">
                        {formatActionLabel(act.action)}
                      </span>
                      {act.entity_type && (
                        <span className="text-[11px] text-gray-500 capitalize">
                          {act.entity_type.replace('_', ' ')}
                        </span>
                      )}
                      {clientName && act.user_id && (
                        <Link
                          href={`/admin/users/${act.user_id}`}
                          className="text-[11px] font-medium text-gray-700 hover:text-[#7B2D8E] hover:underline"
                        >
                          · {clientName}
                        </Link>
                      )}
                    </div>
                    {act.description && (
                      <p className="text-xs text-gray-600 mt-1">{act.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap tabular-nums">
                    {formatRelativeTime(act.created_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
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

      {/* In-page confirmation modal (replaces browser confirm()) */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o && !acting) {
            setConfirmAction(null)
            setSuspendReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md border border-gray-200 bg-white shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          {confirmAction?.action === 'toggle_active' && confirmAction.value === false && (
            <div className="space-y-1.5">
              <label
                htmlFor="staff-suspend-reason"
                className="block text-xs font-medium text-gray-700"
              >
                Administrative note <span className="text-gray-400 font-normal">(optional, shown in staff suspension email)</span>
              </label>
              <textarea
                id="staff-suspend-reason"
                rows={3}
                maxLength={300}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Share a brief reason so the staff member knows why access was paused..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#7B2D8E] resize-none"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              onClick={() => {
                setConfirmAction(null)
                setSuspendReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={acting}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white"
              onClick={() => {
                if (!confirmAction) return
                if (confirmAction.action === 'service_perm') {
                  void handleToggleServicePermission(Boolean(confirmAction.value))
                } else {
                  void handleAction(confirmAction.action, confirmAction.value, suspendReason)
                }
              }}
            >
              {acting ? 'Working…' : confirmAction?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
