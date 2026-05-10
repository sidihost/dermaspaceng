'use client'

/**
 * Admin → Staff list.
 *
 * Three sections, top to bottom:
 *   1. Stats — Verified / Pending / Invited counts. Replaces the old
 *      "Admins / Staff / Pending invites" trio because the failure
 *      mode the user flagged was admins-vs-staff isn't the
 *      interesting axis (Itunu, Franca, Sidihost are all admins);
 *      what matters operationally is who's actually onboarded.
 *   2. Team members — every row in `users` with role staff/admin.
 *      Each row has a clear status pill:
 *        • Verified   = is_active && email_verified && !must_change_password
 *        • Pending    = is_active && (!email_verified || must_change_password)
 *                       (i.e. the row exists but the person hasn't
 *                       logged in / set their email yet — Itunu &
 *                       Franca live here until they finish setup)
 *        • Suspended  = !is_active
 *      Placeholder seed emails (`pending+username@dermaspaceng.invalid`)
 *      are hidden in favour of the username + an "Awaiting setup"
 *      hint, so the table doesn't show a confusing fake address.
 *   3. Pending invitations — rows in `staff_invitations` that haven't
 *      been used and haven't expired. Same canceller as before.
 *
 * The admin area is modal-free by design; the +Invite button links to
 * `/admin/staff/invite` instead of opening a sheet.
 */

import { useEffect, useState } from 'react'
// useEffect is already imported above; the resend/revoke flow uses it
// to auto-dismiss the inline feedback banner.
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  UserCog,
  Mail,
  Plus,
  MessageSquare,
  Calendar,
  Gift,
  Send,
  Clock,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Hourglass,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface Staff {
  id: string
  /**
   * Email is `null` when an admin row was seeded without a real
   * address yet (e.g. staff invited by username before they
   * verified an email). The UI hides these rows behind an
   * "awaiting email" hint, but the *type* must allow null —
   * otherwise we end up calling `.startsWith()` on null and the
   * whole staff page crashes with the runtime error from the
   * boundary screenshot.
   */
  email: string | null
  username: string | null
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  email_verified: boolean
  must_change_password: boolean
  is_super_admin: boolean
  /**
   * Service Editor permission. Admins always have this implicitly;
   * for `staff` rows, the value reflects the column. The toggle
   * column on this page writes to /api/admin/staff/[id]/permissions.
   */
  can_manage_services: boolean
  created_at: string
  replies_count: number
  complaints_assigned: number
  consultations_assigned: number
  gift_cards_assigned: number
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  invited_by_name: string | null
  invited_by_last: string | null
}

type MemberStatus = 'verified' | 'pending' | 'suspended'

function memberStatus(m: Staff): MemberStatus {
  if (m.is_active === false) return 'suspended'
  // "Pending" = the row exists but the team member hasn't completed
  // onboarding. Two things qualify:
  //   • email_verified=false (placeholder email, never confirmed)
  //   • must_change_password=true (we seeded a temp password)
  // Either is enough — verified means BOTH have been cleared.
  if (m.must_change_password || !m.email_verified) return 'pending'
  return 'verified'
}

function isPlaceholderEmail(email: string | null | undefined): boolean {
  // The seed script writes `pending+<username>@dermaspaceng.invalid`
  // for admin rows whose owner hasn't picked their real email yet.
  // We hide these in the UI so the table doesn't display a fake
  // address as if it were the person's actual contact.
  //
  // Email can also be plain `null` for rows that were inserted
  // before the email column became required, or for staff invited
  // by username without an address. Treat null/empty as "still a
  // placeholder" so the row falls through to the "awaiting email"
  // hint instead of crashing the whole page.
  if (!email) return true
  return email.startsWith('pending+') && email.endsWith('@dermaspaceng.invalid')
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  // Inline banner used by resend / revoke flows below. Keeps a small
  // dismissable status message at the top of the invitations card so
  // admins get a clear "Reminder sent to X" / "Could not revoke"
  // confirmation rather than an alert() popup.
  const [inviteFeedback, setInviteFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null)
  // Per-invitation in-flight flag. We key by invitation id so the
  // disabled state on the row's resend / revoke buttons doesn't bleed
  // across other rows when an admin fires several requests in a row.
  const [busyInvite, setBusyInvite] = useState<
    Record<string, 'resend' | 'revoke' | undefined>
  >({})

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' })
      if (!res.ok) {
        // The API failed. Surface the response body in the console
        // so the underlying issue (missing column, RLS denial, env
        // problem) is visible during development. The user reported
        // "the staff list on the staff page is empty even though
        // they are staff" — the most common cause is that the API
        // 500'd silently and we just swallowed it. Now we still set
        // staff to [] so the empty-state renders, but we ALSO log
        // the actual error.
        const text = await res.text().catch(() => '')
        console.error('[v0] /api/admin/staff failed', res.status, text)
        setStaff([])
        setInvitations([])
        return
      }
      const data = await res.json()
      setStaff(data.staff ?? [])
      setInvitations(data.invitations ?? [])
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoading(false)
    }
  }

  // Optimistically flip the perm pill, then PATCH the API. We
  // rollback if the request fails so the UI never silently lies
  // about the granted state. We don't show a toast here — the
  // pill itself moving is the feedback.
  const handleToggleServicePerm = async (
    userId: string,
    next: boolean,
  ) => {
    const prev = staff
    setStaff((rows) =>
      rows.map((r) =>
        r.id === userId ? { ...r, can_manage_services: next } : r,
      ),
    )
    try {
      const res = await fetch(
        `/api/admin/staff/${userId}/permissions`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canManageServices: next }),
        },
      )
      if (!res.ok) throw new Error(await res.text())
    } catch (error) {
      console.error('Toggle perm failed:', error)
      setStaff(prev)
      alert('Could not update permission. Please try again.')
    }
  }

  // Auto-clear the inline feedback banner so the admin doesn't end up
  // staring at stale "Reminder sent to ..." copy long after the action
  // completed. Five seconds matches the pattern used elsewhere in the
  // admin (toasts in /admin/users feedback).
  useEffect(() => {
    if (!inviteFeedback) return
    const t = setTimeout(() => setInviteFeedback(null), 5000)
    return () => clearTimeout(t)
  }, [inviteFeedback])

  const handleResendInvitation = async (
    invitationId: string,
    email: string,
  ) => {
    setBusyInvite((b) => ({ ...b, [invitationId]: 'resend' }))
    try {
      const res = await fetch(
        `/api/admin/staff/invitations/${invitationId}/resend`,
        { method: 'POST' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInviteFeedback({
          kind: 'error',
          message: body?.error || `Could not resend the invite for ${email}.`,
        })
        return
      }
      setInviteFeedback({
        kind: 'success',
        message:
          body?.message ||
          `Reminder sent to ${email}. The previous link is no longer valid.`,
      })
      fetchStaff()
    } catch (error) {
      console.error('[v0] Resend invitation error:', error)
      setInviteFeedback({
        kind: 'error',
        message: 'Network error. Please try again in a moment.',
      })
    } finally {
      setBusyInvite((b) => ({ ...b, [invitationId]: undefined }))
    }
  }

  const handleDeleteInvitation = async (
    invitationId: string,
    email: string,
  ) => {
    if (
      !confirm(
        `Revoke the invitation for ${email}? The link will stop working immediately.`,
      )
    ) {
      return
    }
    setBusyInvite((b) => ({ ...b, [invitationId]: 'revoke' }))
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      if (res.ok) {
        setInviteFeedback({
          kind: 'success',
          message: `Invitation for ${email} revoked. The link no longer works.`,
        })
        fetchStaff()
      } else {
        const body = await res.json().catch(() => ({}))
        setInviteFeedback({
          kind: 'error',
          message: body?.error || 'Could not revoke this invitation.',
        })
      }
    } catch (error) {
      console.error('[v0] Delete invitation error:', error)
      setInviteFeedback({
        kind: 'error',
        message: 'Network error. Please try again in a moment.',
      })
    } finally {
      setBusyInvite((b) => ({ ...b, [invitationId]: undefined }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    )
  }

  // Counts driven by the canonical status function so the stat tiles
  // and the table can never disagree.
  const totalCount = staff.length
  const adminCount = staff.filter((s) => s.role === 'admin').length
  const staffOnlyCount = staff.filter((s) => s.role === 'staff').length
  const verifiedCount = staff.filter((s) => memberStatus(s) === 'verified').length
  const pendingCount = staff.filter((s) => memberStatus(s) === 'pending').length
  const suspendedCount = staff.filter((s) => memberStatus(s) === 'suspended').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">
            Team members with admin or staff dashboard access
          </p>
        </div>
        <Link
          href="/admin/staff/invite"
          className="inline-flex items-center gap-2 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Invite staff
        </Link>
      </div>

      {/* Metric strip — six tiles, all on-brand. The headline "Total
          team" tile takes a brand-purple fill so the row anchors at
          the start, and the rest stay calm white-cards with brand
          purple icon dots. The strip now answers four questions in
          one row instead of three: how many people total, how the
          team splits between admins and staff, who's actually
          onboarded, who's pending, who's suspended, and how many
          unaccepted invitations are still floating around. We retired
          the off-brand emerald/amber tones because they made the row
          read as a generic CRM dashboard. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StaffMetricTile
          label="Total team"
          value={totalCount}
          icon={UserCog}
          tone="brand"
        />
        <StaffMetricTile
          label="Admins"
          value={adminCount}
          icon={ShieldCheck}
        />
        <StaffMetricTile
          label="Staff"
          value={staffOnlyCount}
          icon={UserCog}
        />
        <StaffMetricTile
          label="Verified"
          value={verifiedCount}
          icon={CheckCircle2}
          accent={verifiedCount > 0}
        />
        <StaffMetricTile
          label="Awaiting setup"
          value={pendingCount}
          icon={Hourglass}
          muted={pendingCount === 0}
        />
        <StaffMetricTile
          label="Open invites"
          value={invitations.length}
          icon={Mail}
          muted={invitations.length === 0}
        />
      </div>
      {suspendedCount > 0 && (
        <p className="text-xs text-gray-500 -mt-2">
          {suspendedCount} suspended team member{suspendedCount === 1 ? '' : 's'} not shown
          in the strip — see the &ldquo;Suspended&rdquo; pill in the table below.
        </p>
      )}

      {/* Staff Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            Anyone with an admin or staff role. Pending rows still need to log in
            and set their email.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No staff members yet</p>
              <Link
                href="/admin/staff/invite"
                className="inline-flex items-center gap-2 mt-4 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Invite your first staff
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Service editor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[80px] text-right">Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => {
                    const status = memberStatus(member)
                    const placeholder = isPlaceholderEmail(member.email)
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-[#7B2D8E]">
                                {member.first_name.charAt(0)}
                                {member.last_name.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                                {member.first_name} {member.last_name}
                                {member.is_super_admin && (
                                  <ShieldCheck
                                    className="w-3 h-3 text-[#7B2D8E]"
                                    aria-label="Super admin"
                                  />
                                )}
                              </p>
                              {/* Hide the seed placeholder email
                                  in favour of the username + a
                                  "no email yet" hint. Real emails
                                  display normally. */}
                              {placeholder ? (
                                <p className="text-xs text-gray-400 truncate">
                                  {member.username
                                    ? `@${member.username}`
                                    : '—'}
                                  <span className="text-gray-400">
                                    {' · '}awaiting email
                                  </span>
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500 truncate">
                                  {member.email ?? '—'}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              member.role === 'admin'
                                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                                : 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                            }
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500">
                            <span className="inline-flex items-center gap-1" title="Replies sent">
                              <Send className="w-3 h-3" />
                              {member.replies_count}
                            </span>
                            <span className="inline-flex items-center gap-1" title="Complaints assigned">
                              <MessageSquare className="w-3 h-3" />
                              {member.complaints_assigned}
                            </span>
                            <span className="inline-flex items-center gap-1" title="Consultations assigned">
                              <Calendar className="w-3 h-3" />
                              {member.consultations_assigned}
                            </span>
                            <span className="inline-flex items-center gap-1" title="Gift cards assigned">
                              <Gift className="w-3 h-3" />
                              {member.gift_cards_assigned}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/*
                            Service Editor permission toggle.
                            Admins implicitly have it (locked label),
                            staff get a clickable switch-pill that
                            writes to /api/admin/staff/[id]/permissions.
                          */}
                          {member.role === 'admin' ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                              title="Admins can always manage services"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Granted
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleServicePerm(
                                  member.id,
                                  !member.can_manage_services,
                                )
                              }
                              role="switch"
                              aria-checked={member.can_manage_services}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40 ${
                                member.can_manage_services
                                  ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E]/15'
                                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  member.can_manage_services
                                    ? 'bg-[#7B2D8E]'
                                    : 'bg-gray-300'
                                }`}
                              />
                              {member.can_manage_services
                                ? 'Granted'
                                : 'Grant access'}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] text-gray-500">
                            {new Date(member.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Per-staff profile entry-point. Drills
                              into /admin/staff/[id] where the admin
                              can see ticket replies, ratings, and
                              suspend the account if needed. */}
                          <Link
                            href={`/admin/staff/${member.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 px-2 py-1 text-[11px] font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                            aria-label={`Open profile for ${member.first_name} ${member.last_name}`}
                          >
                            View
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline feedback banner — sits just above the invitations
          table so the success/error message appears next to the row
          the admin acted on. Auto-dismisses after 5s, but can be
          closed manually too. Brand purple for success, rose for
          failure — keeps the page in our palette without leaning on
          a global toast system. */}
      {inviteFeedback && (
        <div
          role="status"
          className={
            inviteFeedback.kind === 'success'
              ? 'flex items-start gap-3 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 p-3.5 text-sm text-[#5A1D6A]'
              : 'flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700'
          }
        >
          {inviteFeedback.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <Trash2 className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{inviteFeedback.message}</span>
          <button
            type="button"
            onClick={() => setInviteFeedback(null)}
            className="text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <CardDescription>
              Email sent &mdash; the recipient hasn&apos;t accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[180px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 text-sm">{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            invite.role === 'admin'
                              ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                              : 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                          }
                        >
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {invite.invited_by_name
                            ? `${invite.invited_by_name} ${invite.invited_by_last ?? ''}`.trim()
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Two-button action cell.
                            "Resend" rotates the token, extends expiry,
                            and emails the recipient again. "Revoke"
                            invalidates the link immediately. We
                            disable BOTH while either is in flight to
                            avoid double-clicks crossing each other. */}
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleResendInvitation(invite.id, invite.email)
                            }
                            disabled={!!busyInvite[invite.id]}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-[#7B2D8E] border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            title="Resend invitation email"
                          >
                            {busyInvite[invite.id] === 'resend' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteInvitation(invite.id, invite.email)
                            }
                            disabled={!!busyInvite[invite.id]}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-rose-600 border border-rose-200 bg-white hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            title="Revoke invitation"
                          >
                            {busyInvite[invite.id] === 'revoke' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Revoke
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Helpers ----------------------------------------------------------------

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: 'emerald' | 'amber' | 'purple'
  label: string
  value: number
  hint: string
}) {
  // Three-value tone map: keep tile chrome neutral so the page reads
  // as a single admin surface, but tint the icon dot to match the
  // status it represents (emerald=verified, amber=pending,
  // purple=brand for invitations).
  const dotClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-md ${dotClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 leading-tight tabular-nums">
              {value}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{label}</p>
            <p className="text-[10px] text-gray-400 truncate">{hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusPill({ status }: { status: MemberStatus }) {
  // Three-state pill so admins can see at a glance who's actually
  // logged in (Verified) vs who exists in the table but hasn't
  // finished setup (Pending) vs who's been deactivated (Suspended).
  const map: Record<MemberStatus, { label: string; className: string }> = {
    verified: {
      label: 'Verified',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    suspended: {
      label: 'Suspended',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  }
  const m = map[status]
  return (
    <Badge variant="outline" className={m.className}>
      {m.label}
    </Badge>
  )
}
