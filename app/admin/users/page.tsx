'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Search, Users, UserCheck, UserX, ChevronLeft, ChevronRight,
  Mail, Phone, ArrowUpRight, UserPlus, CircleDashed, CheckCircle2,
} from 'lucide-react'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
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
        </div>
      </div>

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
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-[#7B2D8E]">
                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                          </span>
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
                          {/* Brand purple for "verified" replaces the stray
                              green-500 so the list stays strictly on-palette. */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {user.email_verified ? (
                              <UserCheck className="w-3 h-3 text-[#7B2D8E]" />
                            ) : (
                              <UserX className="w-3 h-3 text-gray-400" />
                            )}
                            <span>{user.email_verified ? 'Verified' : 'Unverified'}</span>
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
                      <span className="inline-flex items-center gap-1 text-sm text-[#7B2D8E]">
                        View
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
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
