'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { markSurfaceSeen } from '@/components/admin/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Search, Users, UserX, ChevronLeft, ChevronRight,
  Mail, Phone, ArrowUpRight, UserPlus, CircleDashed, CheckCircle2,
  BadgeCheck, RefreshCw, Loader2, MailCheck, MailWarning,
} from 'lucide-react'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  /** Portrait URL chosen by the customer from the avatar picker, or
   *  null if they haven't picked one. The table renders this when
   *  present and falls back to the initial pill otherwise. */
  avatar_url: string | null
  email_verified: boolean
  role: string
  is_active: boolean
  created_at: string
  // Onboarding progress — surfaced by /api/admin/users so the table can
  // show admins where each user is in the /complete-profile wizard
  // without having to click into the user-detail page.
  profile_complete?: boolean
  signup_step?: number
  is_new?: boolean
  last_seen_at?: string
  // Membership snapshot — present on every row whether or not the
  // customer has ever subscribed. A null `membership_tier` (or
  // `is_member_active === false`) renders as "—" in the table.
  membership_tier?: 'silver' | 'gold' | 'platinum' | null
  membership_status?: 'active' | 'expired' | 'cancelled' | null
  membership_expires_at?: string | null
  is_member_active?: boolean
}

// Tier → label + chip color. Brand-purple solid for the flagship
// (Platinum), brand-purple tint for the mid (Gold), gray-purple
// outline for the entry (Silver) — keeps the table strictly on
// palette while still making the tier obvious at a glance.
const TIER_META: Record<
  'silver' | 'gold' | 'platinum',
  { label: string; chip: string }
> = {
  silver: {
    label: 'Silver',
    chip: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  },
  gold: {
    label: 'Gold',
    chip: 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20',
  },
  platinum: {
    label: 'Platinum',
    chip: 'bg-[#7B2D8E] text-white ring-1 ring-[#7B2D8E]',
  },
}

// Map the 0..4 step contract from the API to a short, admin-friendly
// label. Kept in lock-step with `STEPS` in app/complete-profile/page.tsx
// — if a step is renamed there, mirror it here so the admin UI doesn't
// drift out of sync with the actual wizard copy.
const ONBOARDING_LABELS: Record<number, string> = {
  0: 'Just signed up',
  1: 'On Photo',
  2: 'On About',
  3: 'On Username',
  4: 'Completed',
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // The admin specifically asked that this page only show clients —
  // staff and admins live on /admin/staff. We force role=user on every
  // request so even if the API allowed other roles, we'd never render
  // them here. The role filter dropdown was removed.
  const roleFilter = 'user'
  // Per-row in-flight flag for the "Resend verification" button so a slow
  // request only greys out the row it was fired from.
  const [resendingId, setResendingId] = useState<string | null>(null)
  // Small inline banner for resend success/failure — the admin area has no
  // global toast system, so we mirror the inline-banner pattern used on the
  // staff page. Auto-dismisses after 5s.
  const [resendFeedback, setResendFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null)

  useEffect(() => {
    if (!resendFeedback) return
    const t = setTimeout(() => setResendFeedback(null), 5000)
    return () => clearTimeout(t)
  }, [resendFeedback])

  const handleResendVerification = useCallback(async (user: User) => {
    const fullName =
      `${user.first_name} ${user.last_name}`.trim() || user.email || 'this user'
    setResendingId(user.id)
    try {
      const res = await fetch(
        `/api/admin/users/${user.id}/resend-verification`,
        { method: 'POST' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResendFeedback({
          kind: 'error',
          message: body?.error || `Could not send a code to ${fullName}.`,
        })
        return
      }
      setResendFeedback({
        kind: 'success',
        message: body?.message || `Verification code sent to ${user.email}.`,
      })
    } catch (error) {
      console.error('[v0] Resend verification failed:', error)
      setResendFeedback({
        kind: 'error',
        message: 'Network error. Please try again in a moment.',
      })
    } finally {
      setResendingId(null)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        role: roleFilter,
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Clear the sidebar "new users today" badge as soon as the admin opens
  // the clients list. The users list API doesn't return the daily-new
  // count, so we read it once from the admin stats endpoint (shared,
  // 60s-cached — deduped with the sidebar's own poll) and stamp the
  // `users` baseline with it. The baseline is date-stamped server-side
  // logic in the sidebar, so it resets cleanly at midnight and only
  // re-surfaces the badge when someone new signs up after this visit.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' })
        if (!res.ok) return
        const body = await res.json()
        const todayNew = Number(body?.stats?.users?.todayNew) || 0
        if (!cancelled) markSurfaceSeen('users', todayNew)
      } catch {
        /* non-critical — badge simply clears on next poll */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Keep role badges on-brand: admin uses filled purple, staff uses a soft
  // brand tint, user stays neutral. This avoids the off-brand blues/purples
  // we had before that drifted away from the Dermaspace palette.
  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
      staff: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
      user: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return styles[role] || styles.user
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Page titles use 20px/semibold — Google-admin scale, calmer
              than the heavier 24px/bold we had across the console.
              The label is "Clients" because this page now lists ONLY
              role=user — staff and admins have their own page at
              /admin/staff. */}
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customers with a Dermaspace account. Staff and admins live on the{' '}
            <a href="/admin/staff" className="text-[#7B2D8E] hover:underline">
              Staff
            </a>{' '}
            page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{pagination.total} total clients</span>
          </div>
          {/* New-this-week counter — derived from the page we currently
              have in memory so we don't burn an extra round-trip. Only
              shows when we actually have new users in view, otherwise
              the header stays calm. */}
          {users.some((u) => u.is_new) ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-xs font-semibold text-[#7B2D8E]">
              {/* UserPlus replaces the Sparkles glyph — Sparkles
                  reads as "AI / generated" everywhere else in the
                  app, so it was the wrong signal for "newly
                  registered users". UserPlus says exactly that. */}
              <UserPlus className="h-3 w-3" aria-hidden="true" />
              {users.filter((u) => u.is_new).length} new this week
            </div>
          ) : null}
          {/* Active-members counter — same visual treatment as the
              "new this week" pill, but with the BadgeCheck glyph
              (the same icon we use everywhere a customer holds a
              membership) so the header instantly tells the admin
              how many people on this page are paid members. Only
              renders when at least one row in view is an active
              member — keeps the header calm for unpopulated lists. */}
          {users.some((u) => u.is_member_active) ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-2.5 py-1 text-xs font-semibold text-white">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              {users.filter((u) => u.is_member_active).length} active members
            </div>
          ) : null}
        </div>
      </div>

      {/* Resend feedback banner — inline status for the per-row "Resend"
          action. Brand purple for success, rose for failure. */}
      {resendFeedback && (
        <div
          role="status"
          className={
            resendFeedback.kind === 'success'
              ? 'flex items-start gap-3 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 p-3.5 text-sm text-[#5A1D6A]'
              : 'flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700'
          }
        >
          {resendFeedback.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <UserX className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{resendFeedback.message}</span>
          <button
            type="button"
            onClick={() => setResendFeedback(null)}
            className="text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters — search only. The role dropdown was removed because
          this page is hard-locked to clients (role=user). */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(p => ({ ...p, page: 1 }))
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Clients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No clients found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {/* Membership column — surfaces the customer's
                      Silver/Gold/Platinum tier and the date their
                      subscription expires, so the admin doesn't
                      have to click into the user detail page just
                      to see who's a paying member. Pulls from the
                      `membership_tier` + `is_member_active` fields
                      we now project from the API. */}
                  <TableHead>Membership</TableHead>
                  {/* Onboarding column — answers the team's question
                      "they signed up, what step are they on?" without
                      needing to click into each user. */}
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px] text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-[#7B2D8E]/5 transition-colors"
                    // Navigate to the admin user-detail view on row click. The
                    // actions menu in the last cell stops propagation so it
                    // doesn't double-fire this handler.
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar_url}
                              alt={`${user.first_name} ${user.last_name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-[#7B2D8E]">
                              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            {/* NEW pill — sits inline with the user's
                                name so it's the first thing the eye
                                catches when scanning the list. The
                                7-day window comes from the API, so
                                this is purely presentational. */}
                            {user.is_new ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white">
                                {/* Live-status pulsing dot replaces
                                    the Sparkles glyph. Reads as a
                                    "just arrived" indicator and
                                    matches the visual language of
                                    the unread/notification chips
                                    everywhere else in the admin. */}
                                <span
                                  aria-hidden="true"
                                  className="relative inline-flex h-1.5 w-1.5"
                                >
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                                </span>
                                New
                              </span>
                            ) : null}
                          </div>
                          {/* Email-verification status — labelled "Email …"
                              so it can't be mistaken for the account
                              status (Active/Suspended) shown in its own
                              column. Mail icons (not User icons) reinforce
                              that this is specifically about the email. */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {user.email_verified ? (
                              <MailCheck className="w-3 h-3 text-[#7B2D8E]" />
                            ) : (
                              <MailWarning className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{user.email_verified ? 'Email verified' : 'Email unverified'}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Brand purple tint for Active, neutral gray for
                          Suspended. No emerald — the admin wanted the whole
                          list to read as Dermaspace, not a generic CRM. */}
                      <Badge
                        variant="outline"
                        className={user.is_active !== false
                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                        }
                      >
                        {user.is_active !== false ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    {/* Membership cell — tier chip + expiry date.
                        Three states render here:
                          1. Active member  → tier chip + "Renews
                             <date>" line.
                          2. Lapsed member  → muted tier chip +
                             "Expired <date>" line, so the admin
                             can see who to win back.
                          3. Never subscribed → an em-dash, keeps
                             the column compact for the long tail
                             of free customers. */}
                    <TableCell>
                      {user.membership_tier ? (
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              user.is_member_active
                                ? TIER_META[user.membership_tier].chip
                                : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                            }`}
                          >
                            <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                            {TIER_META[user.membership_tier].label}
                          </span>
                          {user.membership_expires_at ? (
                            <span className="text-[11px] text-gray-500">
                              {user.is_member_active ? 'Renews' : 'Expired'}{' '}
                              {new Date(
                                user.membership_expires_at,
                              ).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </TableCell>
                    {/* Onboarding cell — green-checked for completed,
                        otherwise a dashed circle + step label so the
                        admin instantly sees where partial signups got
                        stuck. We deliberately use a 4-segment progress
                        readout (e.g. "On Username · 3/4") so the cell
                        is informative even at a glance. */}
                    <TableCell>
                      {user.profile_complete || user.signup_step === 4 ? (
                        <div className="flex items-center gap-1.5 text-sm text-[#7B2D8E]">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="font-medium">Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <CircleDashed className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-gray-700">
                              {ONBOARDING_LABELS[user.signup_step ?? 0] ??
                                'Just signed up'}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              Step {user.signup_step ?? 0}/4
                            </span>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    {/* Non-modal "View" affordance. The three-dots popover
                        previously hid the path to user details behind an
                        action menu — now every row has a clear, obvious
                        link to the full details page where all user
                        actions (suspend, promote, etc.) already live. */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Resend verification — only for accounts that
                            haven't verified their email yet. stopPropagation
                            keeps the row-click navigation from firing. */}
                        {!user.email_verified && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleResendVerification(user)
                            }}
                            disabled={resendingId === user.id}
                            className="inline-flex items-center gap-1 rounded-full border border-[#7B2D8E]/20 bg-white px-2 py-1 text-[11px] font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            title="Email a fresh verification code"
                          >
                            {resendingId === user.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Resend
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1 text-sm text-[#7B2D8E]">
                          View
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
