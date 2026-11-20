'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  ArrowDownUp,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Gift,
  Headphones,
  Hourglass,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  UserCog,
  UserMinus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import {
  buildStaffCsv,
  computeStaffSummary,
  filterAndSortStaff,
  formatInvitationExpiry,
  formatInviterName,
  getMemberDisplayName,
  getMemberInitials,
  getMemberStatus,
  isPlaceholderEmail,
  type MemberStatus,
  type StaffInvitation,
  type StaffMember,
  type StaffRoleFilter,
  type StaffSortKey,
  type StaffStatusFilter,
} from '@/lib/admin-staff'
import { useNotify } from '@/components/shared/notify'
import { useAuth } from '@/hooks/use-auth'

type ActiveSection = 'team' | 'invitations'

type FeedbackState = {
  kind: 'success' | 'error'
  message: string
} | null

type ConfirmModalState =
  | {
      kind: 'suspend'
      member: StaffMember
    }
  | {
      kind: 'remove'
      member: StaffMember
    }
  | {
      kind: 'role'
      member: StaffMember
      nextRole: 'admin' | 'staff'
    }
  | {
      kind: 'revoke'
      invitation: StaffInvitation
    }
  | null

type PasswordResetModalState = {
  member: StaffMember
  mode: 'send_link' | 'set_temp'
  submitting: boolean
  error: string | null
  result: {
    message: string
    resetUrl?: string | null
    tempPassword?: string | null
  } | null
} | null

function formatShortDate(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return '—'
  return new Date(ts).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function StaffPage() {
  const notify = useNotify()
  const { user: authUser } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [invitations, setInvitations] = useState<StaffInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const currentUserId = authUser?.id ? String(authUser.id) : null

  // View & filtering state
  const [activeSection, setActiveSection] = useState<ActiveSection>('team')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>('all')
  const [sortBy, setSortBy] = useState<StaffSortKey>('newest')

  // Inline feedback banner
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  // Per-row in-flight flags
  const [busyMember, setBusyMember] = useState<
    Record<string, 'suspend' | 'reinstate' | 'remove' | 'resend' | 'role' | 'perm' | undefined>
  >({})
  const [busyInvite, setBusyInvite] = useState<Record<string, 'resend' | 'revoke' | undefined>>({})

  // Action menu & copy state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Flat confirmation & password reset dialogs
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [passwordModal, setPasswordModal] = useState<PasswordResetModalState>(null)

  const fetchStaff = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg =
          typeof body?.error === 'string' && body.error.trim()
            ? body.error
            : `Could not load team directory (HTTP ${res.status}).`
        setFetchError(msg)
        return
      }
      const data = await res.json()
      setStaff(Array.isArray(data.staff) ? data.staff : [])
      setInvitations(Array.isArray(data.invitations) ? data.invitations : [])
    } catch {
      setFetchError('Unable to reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchStaff(false)
  }, [fetchStaff])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 6000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (!openMenuId) return
    const closeMenu = () => setOpenMenuId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [openMenuId])

  const summary = useMemo(() => computeStaffSummary(staff, invitations), [staff, invitations])

  const filteredStaff = useMemo(
    () =>
      filterAndSortStaff(staff, {
        query,
        status: statusFilter,
        role: roleFilter,
        sort: sortBy,
      }),
    [staff, query, statusFilter, roleFilter, sortBy]
  )

  const filteredInvitations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return invitations
    return invitations.filter((inv) => {
      const inviter = formatInviterName(inv.invited_by_name, inv.invited_by_last).toLowerCase()
      return (
        inv.email.toLowerCase().includes(q) ||
        inv.role.toLowerCase().includes(q) ||
        inviter.includes(q)
      )
    })
  }, [invitations, query])

  const hasActiveFilters = query.trim() !== '' || statusFilter !== 'all' || roleFilter !== 'all'

  const resetFilters = () => {
    setQuery('')
    setStatusFilter('all')
    setRoleFilter('all')
  }

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(key)
      notify.success('Copied to clipboard')
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === key ? null : curr))
      }, 2000)
    } catch {
      setFeedback({ kind: 'error', message: 'Could not copy to clipboard.' })
      notify.error('Could not copy', 'Please copy the text manually.')
    }
  }

  const handleExportCsv = () => {
    const targetList = filteredStaff.length > 0 ? filteredStaff : staff
    if (targetList.length === 0) return
    const csv = buildStaffCsv(targetList)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dermaspace-staff-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    const msg = `Exported ${targetList.length} team member${targetList.length === 1 ? '' : 's'} to CSV.`
    setFeedback({ kind: 'success', message: msg })
    notify.success('CSV exported', msg)
  }

  const handleToggleServicePerm = async (member: StaffMember, next: boolean) => {
    const prev = staff
    const name = getMemberDisplayName(member)
    setBusyMember((b) => ({ ...b, [member.id]: 'perm' }))
    setStaff((rows) =>
      rows.map((r) => (r.id === member.id ? { ...r, can_manage_services: next } : r))
    )
    try {
      const res = await fetch(`/api/admin/staff/${member.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageServices: next }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStaff(prev)
        const errMsg = body?.error || 'Could not update Service Editor permission.'
        setFeedback({ kind: 'error', message: errMsg })
        notify.error('Permission update failed', errMsg)
        return
      }
      const msg = next
        ? `Granted Service Editor access to ${name}.`
        : `Revoked Service Editor access from ${name}.`
      setFeedback({ kind: 'success', message: msg })
      if (next) {
        notify.success('Service Editor enabled', `${name} can now edit the service catalog.`)
      } else {
        notify.info('Service Editor disabled', `Revoked Service Editor access from ${name}.`)
      }
    } catch {
      setStaff(prev)
      setFeedback({ kind: 'error', message: 'Network error while updating permission.' })
      notify.error('Network error', 'Could not update Service Editor permission.')
    } finally {
      setBusyMember((b) => ({ ...b, [member.id]: undefined }))
    }
  }

  const handleToggleSuspend = async (
    member: StaffMember,
    nextActive: boolean,
    reason?: string
  ) => {
    const action: 'suspend' | 'reinstate' = nextActive ? 'reinstate' : 'suspend'
    const fullName = getMemberDisplayName(member)
    const prev = staff
    setBusyMember((b) => ({ ...b, [member.id]: action }))
    setStaff((rows) => rows.map((r) => (r.id === member.id ? { ...r, is_active: nextActive } : r)))
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'suspend' && reason?.trim() ? { reason: reason.trim() } : {}),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStaff(prev)
        const errMsg = body?.error || `Could not ${action} ${fullName}.`
        setFeedback({ kind: 'error', message: errMsg })
        notify.error(action === 'suspend' ? 'Suspension failed' : 'Reinstatement failed', errMsg)
        return
      }
      const msg =
        action === 'suspend'
          ? `${fullName} has been suspended and emailed a dedicated staff appeal link.`
          : `${fullName} has been reinstated and can sign back in.`
      setFeedback({ kind: 'success', message: msg })
      notify.success(
        action === 'suspend' ? 'Staff member suspended' : 'Staff member reinstated',
        msg,
      )
    } catch {
      setStaff(prev)
      setFeedback({ kind: 'error', message: 'Network error. Please try again.' })
      notify.error('Network error', 'Please try again in a moment.')
    } finally {
      setBusyMember((b) => ({ ...b, [member.id]: undefined }))
      setConfirmModal(null)
      setSuspendReason('')
    }
  }

  const handleChangeRole = async (member: StaffMember, nextRole: 'admin' | 'staff') => {
    const fullName = getMemberDisplayName(member)
    const prev = staff
    setBusyMember((b) => ({ ...b, [member.id]: 'role' }))
    setStaff((rows) => rows.map((r) => (r.id === member.id ? { ...r, role: nextRole } : r)))
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, action: 'change_role', value: nextRole }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStaff(prev)
        const errMsg = body?.error || `Could not update role for ${fullName}.`
        setFeedback({ kind: 'error', message: errMsg })
        notify.error('Role update failed', errMsg)
        return
      }
      const msg =
        nextRole === 'admin'
          ? `${fullName} has been promoted to Admin and notified by email.`
          : `${fullName} has been changed to Staff.`
      setFeedback({ kind: 'success', message: msg })
      if (nextRole === 'admin') {
        notify.success('Promoted to Admin', msg)
      } else {
        notify.info('Role updated to Staff', msg)
      }
    } catch {
      setStaff(prev)
      setFeedback({ kind: 'error', message: 'Network error while updating role.' })
      notify.error('Network error', 'Could not update team role.')
    } finally {
      setBusyMember((b) => ({ ...b, [member.id]: undefined }))
      setConfirmModal(null)
    }
  }

  const handleRemoveMember = async (member: StaffMember) => {
    const fullName = getMemberDisplayName(member)
    const prev = staff
    setBusyMember((b) => ({ ...b, [member.id]: 'remove' }))
    setStaff((rows) => rows.filter((r) => r.id !== member.id))
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'DELETE',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStaff(prev)
        const errMsg = body?.error || `Could not remove ${fullName}.`
        setFeedback({ kind: 'error', message: errMsg })
        notify.error('Could not remove member', errMsg)
        return
      }
      const msg = `${fullName} was removed from the team and moved to regular clients.`
      setFeedback({ kind: 'success', message: msg })
      notify.info('Removed from team', msg)
    } catch {
      setStaff(prev)
      setFeedback({ kind: 'error', message: 'Network error while removing member.' })
      notify.error('Network error', 'Could not remove team member.')
    } finally {
      setBusyMember((b) => ({ ...b, [member.id]: undefined }))
      setConfirmModal(null)
    }
  }

  const handleResendVerification = async (member: StaffMember) => {
    const fullName = getMemberDisplayName(member)
    setBusyMember((b) => ({ ...b, [member.id]: 'resend' }))
    try {
      const res = await fetch(`/api/admin/users/${member.id}/resend-verification`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = body?.error || `Could not send verification code to ${fullName}.`
        setFeedback({ kind: 'error', message: errMsg })
        notify.error('Could not send verification', errMsg)
        return
      }
      const msg = body?.message || `Verification code sent to ${member.email ?? fullName}.`
      setFeedback({ kind: 'success', message: msg })
      notify.success('Verification sent', msg)
    } catch {
      setFeedback({ kind: 'error', message: 'Network error. Please try again.' })
      notify.error('Network error', 'Could not send verification code.')
    } finally {
      setBusyMember((b) => ({ ...b, [member.id]: undefined }))
    }
  }

  const handleSubmitPasswordReset = async () => {
    if (!passwordModal) return
    const { member, mode } = passwordModal
    setPasswordModal((curr) => (curr ? { ...curr, submitting: true, error: null } : null))
    try {
      const res = await fetch(`/api/admin/users/${member.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = body?.error || 'Could not reset password.'
        setPasswordModal((curr) =>
          curr ? { ...curr, submitting: false, error: errMsg } : null
        )
        notify.error('Password reset failed', errMsg)
        return
      }
      const successMessage =
        body?.message ||
        (mode === 'send_link'
          ? 'Password reset link generated.'
          : 'Temporary password generated.')
      setPasswordModal((curr) =>
        curr
          ? {
              ...curr,
              submitting: false,
              result: {
                message: successMessage,
                resetUrl: body?.resetUrl ?? null,
                tempPassword: body?.tempPassword ?? null,
              },
            }
          : null
      )
      notify.success(
        mode === 'send_link' ? 'Password reset link sent' : 'Temporary password ready',
        successMessage,
      )
      if (mode === 'set_temp') {
        setStaff((rows) =>
          rows.map((r) => (r.id === member.id ? { ...r, must_change_password: true } : r))
        )
      }
    } catch {
      setPasswordModal((curr) =>
        curr ? { ...curr, submitting: false, error: 'Network error. Please try again.' } : null
      )
      notify.error('Network error', 'Could not reset password.')
    }
  }

  const handleResendInvitation = async (invite: StaffInvitation) => {
    setBusyInvite((b) => ({ ...b, [invite.id]: 'resend' }))
    try {
      const res = await fetch(`/api/admin/staff/invitations/${invite.id}/resend`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = body?.error || `Could not resend invitation for ${invite.email}.`
        setFeedback({ kind: 'error', message: errMsg })
        notify.error('Could not resend invitation', errMsg)
        return
      }
      setInvitations((rows) =>
        rows.map((r) =>
          r.id === invite.id
            ? {
                ...r,
                expires_at: body?.expiresAt ?? r.expires_at,
                invite_url: body?.inviteUrl ?? r.invite_url,
              }
            : r
        )
      )
      const msg =
        body?.message ||
        `Invitation refreshed and sent to ${invite.email}. Previous link is now invalid.`
      setFeedback({ kind: 'success', message: msg })
      notify.success('Invitation resent', msg)
    } catch {
      setFeedback({ kind: 'error', message: 'Network error while resending invitation.' })
      notify.error('Network error', 'Could not resend invitation.')
    } finally {
      setBusyInvite((b) => ({ ...b, [invite.id]: undefined }))
    }
  }

  const handleRevokeInvitation = async (invite: StaffInvitation) => {
    setBusyInvite((b) => ({ ...b, [invite.id]: 'revoke' }))
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invite.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = body?.error || 'Could not revoke this invitation.'
        setFeedback({ kind: 'error', message: errMsg })
        notify.error('Could not revoke invitation', errMsg)
        return
      }
      setInvitations((rows) => rows.filter((r) => r.id !== invite.id))
      const msg = `Invitation for ${invite.email} revoked. The link no longer works.`
      setFeedback({ kind: 'success', message: msg })
      notify.info('Invitation revoked', msg)
    } catch {
      setFeedback({ kind: 'error', message: 'Network error while revoking invitation.' })
      notify.error('Network error', 'Could not revoke invitation.')
    } finally {
      setBusyInvite((b) => ({ ...b, [invite.id]: undefined }))
      setConfirmModal(null)
    }
  }

  if (loading) {
    return <StaffPageSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center shrink-0 mt-0.5">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Staff &amp; Access</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage team accounts, service permissions, and onboarding invitations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchStaff(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh team directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={staff.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <Link
            href="/admin/blog/permissions"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Blog access
          </Link>

          <Link
            href="/admin/staff/invite"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite staff
          </Link>
        </div>
      </div>

      {/* Interactive KPI Filter Tiles — strictly Dermaspace purple & neutral palette */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Users}
          label="Team roster"
          value={summary.total}
          hint={`${summary.admins} admin${summary.admins === 1 ? '' : 's'} · ${summary.staffCount} staff`}
          active={activeSection === 'team' && statusFilter === 'all' && roleFilter === 'all'}
          onClick={() => {
            setActiveSection('team')
            setStatusFilter('all')
            setRoleFilter('all')
          }}
        />
        <StatTile
          icon={CheckCircle2}
          label="Verified"
          value={summary.verified}
          hint={`${summary.serviceEditors} service editor${summary.serviceEditors === 1 ? '' : 's'}`}
          active={activeSection === 'team' && statusFilter === 'verified'}
          onClick={() => {
            setActiveSection('team')
            setStatusFilter((prev) => (prev === 'verified' ? 'all' : 'verified'))
          }}
        />
        <StatTile
          icon={Hourglass}
          label="Awaiting setup"
          value={summary.pending}
          hint={
            summary.suspended > 0
              ? `${summary.suspended} suspended`
              : 'Needs email or password'
          }
          active={activeSection === 'team' && statusFilter === 'pending'}
          onClick={() => {
            setActiveSection('team')
            setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))
          }}
        />
        <StatTile
          icon={Mail}
          label="Pending invites"
          value={summary.invitationsCount}
          hint="Sent, awaiting acceptance"
          active={activeSection === 'invitations'}
          onClick={() => setActiveSection('invitations')}
        />
      </div>

      {/* Fetch error state with retry */}
      {fetchError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#3E104B]/30 bg-[#FAF6FB] p-4 text-sm text-[#3E104B]"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#5A1D6A]" />
            <div>
              <p className="font-semibold">Unable to load staff directory</p>
              <p className="text-xs text-gray-600 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchStaff(true)}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-medium hover:bg-[#5A1D6A] transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Action feedback banner */}
      {feedback && (
        <div
          role="status"
          className={
            feedback.kind === 'success'
              ? 'flex items-start gap-3 rounded-xl border border-[#7B2D8E]/25 bg-[#7B2D8E]/5 px-4 py-3 text-sm text-[#5A1D6A]'
              : 'flex items-start gap-3 rounded-xl border border-[#3E104B]/30 bg-[#FAF6FB] px-4 py-3 text-sm text-[#3E104B]'
          }
        >
          {feedback.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#7B2D8E]" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#5A1D6A]" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Directory Container (flat surface, zero shadow) */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Top bar: Segmented view switcher + Search + Filters */}
        <div className="p-4 sm:p-5 border-b border-gray-200 space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Section tabs */}
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-[#FAF6FB] p-1 w-fit">
              <button
                type="button"
                onClick={() => setActiveSection('team')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'team'
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team members
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                    activeSection === 'team'
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {staff.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('invitations')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'invitations'
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending invitations
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                    activeSection === 'invitations'
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {invitations.length}
                </span>
              </button>
            </div>

            {/* Search input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  activeSection === 'team'
                    ? 'Search name, @username, email…'
                    : 'Search invite email or inviter…'
                }
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#7B2D8E]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter & sort toolbar (Team view) */}
          {activeSection === 'team' && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: 'All', count: summary.total },
                    { key: 'verified', label: 'Verified', count: summary.verified },
                    { key: 'pending', label: 'Pending', count: summary.pending },
                    { key: 'suspended', label: 'Suspended', count: summary.suspended },
                  ] as const
                ).map((item) => {
                  const isActive = statusFilter === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/10 text-[#5A1D6A]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[11px] tabular-nums opacity-75">{item.count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as StaffRoleFilter)}
                  className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-[#7B2D8E]"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admins ({summary.admins})</option>
                  <option value="staff">Staff ({summary.staffCount})</option>
                </select>

                <div className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-700">
                  <ArrowDownUp className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    aria-label="Sort team members"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as StaffSortKey)}
                    className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="active">Most active</option>
                    <option value="role">Role hierarchy</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-medium text-[#7B2D8E] hover:underline px-1 cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: TEAM MEMBERS */}
        {activeSection === 'team' ? (
          staff.length === 0 && !fetchError ? (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
                <UserCog className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-900">No staff members yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Invite your clinic coordinators, estheticians, or administrators to collaborate in
                the dashboard.
              </p>
              <Link
                href="/admin/staff/invite"
                className="inline-flex items-center gap-2 mt-4 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Invite your first staff
              </Link>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">No matching team members</p>
              <p className="text-xs text-gray-500 mt-1">
                Try adjusting your search or clearing active filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex items-center h-8 px-3 rounded-lg border border-[#7B2D8E]/30 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop high-density table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FAF6FB]/70 hover:bg-[#FAF6FB]/70 border-b border-gray-200">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Member
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Role
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Workload
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Service editor
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Joined
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member) => {
                      const status = getMemberStatus(member)
                      const placeholder = isPlaceholderEmail(member.email)
                      const fullName = getMemberDisplayName(member)
                      const initials = getMemberInitials(
                        member.first_name,
                        member.last_name,
                        member.email
                      )
                      const isSelf = currentUserId === member.id
                      const isSuper = member.is_super_admin
                      const protect = isSelf || isSuper
                      const busy = busyMember[member.id]
                      const menuOpen = openMenuId === member.id

                      return (
                        <TableRow
                          key={member.id}
                          className="border-b border-gray-100 hover:bg-[#FAF6FB]/50 transition-colors"
                        >
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/15 flex items-center justify-center shrink-0 overflow-hidden">
                                {member.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={member.avatar_url}
                                    alt={fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-[#7B2D8E]">
                                    {initials}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/admin/staff/${member.id}`}
                                    className="text-sm font-semibold text-gray-900 hover:text-[#7B2D8E] truncate transition-colors"
                                  >
                                    {fullName}
                                  </Link>
                                  {isSuper && (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 px-1.5 py-0.5 rounded"
                                      title="Super admin"
                                    >
                                      <ShieldCheck className="w-3 h-3" />
                                      Super
                                    </span>
                                  )}
                                  {isSelf && (
                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                {placeholder ? (
                                  <p className="text-xs text-gray-400 truncate mt-0.5">
                                    {member.username ? `@${member.username}` : 'No username'} ·
                                    awaiting email
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {member.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <span
                              className={
                                member.role === 'admin'
                                  ? 'inline-flex items-center rounded-md bg-[#7B2D8E] text-white px-2 py-0.5 text-[11px] font-semibold capitalize'
                                  : 'inline-flex items-center rounded-md bg-[#7B2D8E]/10 text-[#5A1D6A] border border-[#7B2D8E]/20 px-2 py-0.5 text-[11px] font-semibold capitalize'
                              }
                            >
                              {member.role}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-3 text-xs text-gray-600 tabular-nums">
                              <span
                                className="inline-flex items-center gap-1"
                                title="Replies sent"
                              >
                                <Send className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                {member.replies_count}
                              </span>
                              <span
                                className="inline-flex items-center gap-1"
                                title="Complaints assigned"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                                {member.complaints_assigned}
                              </span>
                              <span
                                className="inline-flex items-center gap-1"
                                title="Consultations assigned"
                              >
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {member.consultations_assigned}
                              </span>
                              <span
                                className="inline-flex items-center gap-1"
                                title="Gift cards assigned"
                              >
                                <Gift className="w-3.5 h-3.5 text-gray-400" />
                                {member.gift_cards_assigned}
                              </span>
                              {(member.live_chats_assigned ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-1"
                                  title="Live chats handled"
                                >
                                  <Headphones className="w-3.5 h-3.5 text-gray-400" />
                                  {member.live_chats_assigned}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            {member.role === 'admin' ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-md border border-[#7B2D8E]/20 bg-[#7B2D8E]/10 px-2 py-1 text-xs font-medium text-[#5A1D6A]"
                                title="Admins always have service catalog access"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                Included
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={busy === 'perm'}
                                onClick={() =>
                                  void handleToggleServicePerm(member, !member.can_manage_services)
                                }
                                role="switch"
                                aria-checked={member.can_manage_services}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                                  member.can_manage_services
                                    ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#5A1D6A] hover:bg-[#7B2D8E]/15'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    member.can_manage_services ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                                  }`}
                                />
                                {member.can_manage_services ? 'Granted' : 'Grant access'}
                              </button>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5">
                            <StatusBadge status={status} />
                          </TableCell>

                          <TableCell className="py-3.5">
                            <span className="text-xs text-gray-500 tabular-nums">
                              {formatShortDate(member.created_at)}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 relative">
                              <Link
                                href={`/admin/staff/${member.id}`}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#7B2D8E]/25 bg-[#7B2D8E]/5 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                              >
                                Profile
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>

                              {status === 'pending' && !placeholder && (
                                <button
                                  type="button"
                                  disabled={!!busy}
                                  onClick={() => void handleResendVerification(member)}
                                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] disabled:opacity-50 transition-colors cursor-pointer"
                                  title="Email a fresh verification code"
                                >
                                  {busy === 'resend' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  Resend code
                                </button>
                              )}

                              {!protect && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    disabled={!!busy}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuId((curr) =>
                                        curr === member.id ? null : member.id
                                      )
                                    }}
                                    aria-label={`Manage ${fullName}`}
                                    aria-expanded={menuOpen}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] disabled:opacity-50 transition-colors cursor-pointer"
                                  >
                                    {busy && busy !== 'resend' && busy !== 'perm' ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="w-4 h-4" />
                                    )}
                                  </button>

                                  {menuOpen && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 mt-1.5 w-52 rounded-xl border border-gray-200 bg-white py-1.5 z-30 text-left"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null)
                                          setConfirmModal({
                                            kind: 'role',
                                            member,
                                            nextRole: member.role === 'admin' ? 'staff' : 'admin',
                                          })
                                        }}
                                        className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#FAF6FB] hover:text-[#7B2D8E] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Shield className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                        {member.role === 'admin'
                                          ? 'Demote to staff'
                                          : 'Promote to admin'}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null)
                                          setPasswordModal({
                                            member,
                                            mode: placeholder ? 'set_temp' : 'send_link',
                                            submitting: false,
                                            error: null,
                                            result: null,
                                          })
                                        }}
                                        className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#FAF6FB] hover:text-[#7B2D8E] flex items-center gap-2 cursor-pointer"
                                      >
                                        <KeyRound className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                        Reset password
                                      </button>

                                      <div className="my-1 border-t border-gray-100" />

                                      {member.is_active ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null)
                                            setSuspendReason('')
                                            setConfirmModal({ kind: 'suspend', member })
                                          }}
                                          className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                        >
                                          <UserX className="w-3.5 h-3.5 text-gray-600" />
                                          Suspend access
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null)
                                            void handleToggleSuspend(member, true)
                                          }}
                                          className="w-full px-3 py-2 text-xs font-medium text-[#7B2D8E] hover:bg-[#FAF6FB] flex items-center gap-2 cursor-pointer"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          Reinstate access
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null)
                                          setConfirmModal({ kind: 'remove', member })
                                        }}
                                        className="w-full px-3 py-2 text-xs font-medium text-[#3E104B] hover:bg-[#FAF6FB] flex items-center gap-2 cursor-pointer"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                        Remove from team
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile & Tablet Card Roster */}
              <div className="lg:hidden divide-y divide-gray-100">
                {filteredStaff.map((member) => {
                  const status = getMemberStatus(member)
                  const placeholder = isPlaceholderEmail(member.email)
                  const fullName = getMemberDisplayName(member)
                  const initials = getMemberInitials(
                    member.first_name,
                    member.last_name,
                    member.email
                  )
                  const isSelf = currentUserId === member.id
                  const isSuper = member.is_super_admin
                  const protect = isSelf || isSuper
                  const busy = busyMember[member.id]

                  return (
                    <div key={member.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/15 flex items-center justify-center shrink-0 overflow-hidden">
                            {member.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatar_url}
                                alt={fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-[#7B2D8E]">
                                {initials}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/admin/staff/${member.id}`}
                                className="text-sm font-semibold text-gray-900 hover:text-[#7B2D8E] truncate"
                              >
                                {fullName}
                              </Link>
                              <span
                                className={
                                  member.role === 'admin'
                                    ? 'rounded bg-[#7B2D8E] text-white px-1.5 py-0.5 text-[10px] font-semibold capitalize'
                                    : 'rounded bg-[#7B2D8E]/10 text-[#5A1D6A] px-1.5 py-0.5 text-[10px] font-semibold capitalize'
                                }
                              >
                                {member.role}
                              </span>
                              {isSuper && (
                                <ShieldCheck
                                  className="w-3.5 h-3.5 text-[#7B2D8E]"
                                  aria-label="Super admin"
                                />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {placeholder
                                ? `${member.username ? `@${member.username}` : 'No username'} · awaiting email`
                                : member.email}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 pt-1">
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="inline-flex items-center gap-1" title="Replies">
                            <Send className="w-3.5 h-3.5 text-[#7B2D8E]" />
                            {member.replies_count}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Complaints">
                            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                            {member.complaints_assigned}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Consultations">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {member.consultations_assigned}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Gift cards">
                            <Gift className="w-3.5 h-3.5 text-gray-400" />
                            {member.gift_cards_assigned}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          Joined {formatShortDate(member.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Link
                          href={`/admin/staff/${member.id}`}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-[#7B2D8E]/25 bg-[#7B2D8E]/5 text-xs font-medium text-[#7B2D8E]"
                        >
                          Profile
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        {member.role !== 'admin' && (
                          <button
                            type="button"
                            disabled={busy === 'perm'}
                            onClick={() =>
                              void handleToggleServicePerm(member, !member.can_manage_services)
                            }
                            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium cursor-pointer ${
                              member.can_manage_services
                                ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#5A1D6A]'
                                : 'border-gray-200 bg-white text-gray-600'
                            }`}
                          >
                            Service editor: {member.can_manage_services ? 'On' : 'Off'}
                          </button>
                        )}

                        {status === 'pending' && !placeholder && (
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => void handleResendVerification(member)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Resend code
                          </button>
                        )}

                        {!protect && (
                          <>
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() =>
                                setConfirmModal({
                                  kind: 'role',
                                  member,
                                  nextRole: member.role === 'admin' ? 'staff' : 'admin',
                                })
                              }
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-pointer"
                            >
                              <Shield className="w-3.5 h-3.5 text-[#7B2D8E]" />
                              {member.role === 'admin' ? 'Demote' : 'Make admin'}
                            </button>

                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() =>
                                setPasswordModal({
                                  member,
                                  mode: placeholder ? 'set_temp' : 'send_link',
                                  submitting: false,
                                  error: null,
                                  result: null,
                                })
                              }
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-[#7B2D8E]" />
                              Reset password
                            </button>

                            {member.is_active ? (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => {
                                  setSuspendReason('')
                                  setConfirmModal({ kind: 'suspend', member })
                                }}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => void handleToggleSuspend(member, true)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-xs font-medium text-[#7B2D8E] cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reinstate
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => setConfirmModal({ kind: 'remove', member })}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-[#3E104B] cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        ) : /* SECTION 2: PENDING INVITATIONS */
        invitations.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-900">No pending invitations</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              All sent invitations have either been accepted or expired.
            </p>
            <Link
              href="/admin/staff/invite"
              className="inline-flex items-center gap-2 mt-4 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Send an invitation
            </Link>
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">No matching invitations</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 inline-flex items-center h-8 px-3 rounded-lg border border-[#7B2D8E]/30 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5 cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAF6FB]/70 hover:bg-[#FAF6FB]/70 border-b border-gray-200">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Recipient
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Role
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Invited by
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Expiry
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invite) => {
                  const expiry = formatInvitationExpiry(invite.expires_at)
                  const busy = busyInvite[invite.id]
                  const isCopied = copiedId === `inv-${invite.id}`

                  return (
                    <TableRow
                      key={invite.id}
                      className="border-b border-gray-100 hover:bg-[#FAF6FB]/50"
                    >
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {invite.email}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Sent {formatShortDate(invite.created_at)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span
                          className={
                            invite.role === 'admin'
                              ? 'inline-flex items-center rounded-md bg-[#7B2D8E] text-white px-2 py-0.5 text-[11px] font-semibold capitalize'
                              : 'inline-flex items-center rounded-md bg-[#7B2D8E]/10 text-[#5A1D6A] border border-[#7B2D8E]/20 px-2 py-0.5 text-[11px] font-semibold capitalize'
                          }
                        >
                          {invite.role}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span className="text-xs text-gray-600">
                          {formatInviterName(invite.invited_by_name, invite.invited_by_last)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock
                            className={`w-3.5 h-3.5 ${
                              expiry.isUrgent ? 'text-[#7B2D8E]' : 'text-gray-400'
                            }`}
                          />
                          <span
                            className={
                              expiry.isUrgent
                                ? 'font-semibold text-[#5A1D6A]'
                                : 'text-gray-600'
                            }
                          >
                            {expiry.label}
                          </span>
                          <span className="text-gray-400">
                            ({formatShortDate(invite.expires_at)})
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {invite.invite_url && (
                            <button
                              type="button"
                              onClick={() =>
                                void copyText(invite.invite_url!, `inv-${invite.id}`)
                              }
                              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors cursor-pointer"
                              title="Copy invitation link"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy link
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => void handleResendInvitation(invite)}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#7B2D8E]/25 bg-[#7B2D8E]/5 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/10 disabled:opacity-50 transition-colors cursor-pointer"
                            title="Rotate link and resend email"
                          >
                            {busy === 'resend' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Resend
                          </button>

                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => setConfirmModal({ kind: 'revoke', invitation: invite })}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#3E104B]/40 hover:text-[#3E104B] disabled:opacity-50 transition-colors cursor-pointer"
                            title="Revoke invitation"
                          >
                            {busy === 'revoke' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            Revoke
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Flat In-Page Confirmation Dialog (Suspend / Role Change / Remove / Revoke) */}
      <Dialog
        open={confirmModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmModal(null)
            setSuspendReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white shadow-none p-6">
          {confirmModal?.kind === 'suspend' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Suspend {getMemberDisplayName(confirmModal.member)}?
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Their active sessions will end immediately and they will be locked out of the
                  dashboard until reinstated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  Reason (optional — included in notification email)
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Temporary leave or rotation change"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#7B2D8E]"
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal(null)
                    setSuspendReason('')
                  }}
                  className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busyMember[confirmModal.member.id]}
                  onClick={() =>
                    void handleToggleSuspend(confirmModal.member, false, suspendReason)
                  }
                  className="h-9 px-4 rounded-lg bg-[#3E104B] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {busyMember[confirmModal.member.id] === 'suspend' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Suspend account
                </button>
              </DialogFooter>
            </>
          )}

          {confirmModal?.kind === 'role' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  {confirmModal.nextRole === 'admin'
                    ? `Promote ${getMemberDisplayName(confirmModal.member)} to Admin?`
                    : `Change ${getMemberDisplayName(confirmModal.member)} to Staff?`}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  {confirmModal.nextRole === 'admin'
                    ? 'Admins receive full dashboard access including staff, services, and system settings.'
                    : 'Admin privileges will be removed while keeping standard staff workspace tools.'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busyMember[confirmModal.member.id]}
                  onClick={() =>
                    void handleChangeRole(confirmModal.member, confirmModal.nextRole)
                  }
                  className="h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {busyMember[confirmModal.member.id] === 'role' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {confirmModal.nextRole === 'admin' ? 'Promote to Admin' : 'Change to Staff'}
                </button>
              </DialogFooter>
            </>
          )}

          {confirmModal?.kind === 'remove' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Remove {getMemberDisplayName(confirmModal.member)} from team?
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  They will be demoted to a regular client, signed out of every device, and moved
                  to your Clients list. Their replies and assignment audit history remain intact.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busyMember[confirmModal.member.id]}
                  onClick={() => void handleRemoveMember(confirmModal.member)}
                  className="h-9 px-4 rounded-lg bg-[#3E104B] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {busyMember[confirmModal.member.id] === 'remove' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Remove from team
                </button>
              </DialogFooter>
            </>
          )}

          {confirmModal?.kind === 'revoke' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Revoke invitation for {confirmModal.invitation.email}?
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  The invitation link will stop working immediately. You can always send a new
                  invitation later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busyInvite[confirmModal.invitation.id]}
                  onClick={() => void handleRevokeInvitation(confirmModal.invitation)}
                  className="h-9 px-4 rounded-lg bg-[#3E104B] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {busyInvite[confirmModal.invitation.id] === 'revoke' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Revoke invitation
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Flat Password Reset Dialog */}
      <Dialog
        open={passwordModal !== null}
        onOpenChange={(open) => {
          if (!open && !passwordModal?.submitting) {
            setPasswordModal(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white shadow-none p-6">
          {passwordModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Reset password for {getMemberDisplayName(passwordModal.member)}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Choose whether to email a reset link or generate a one-time temporary password.
                </DialogDescription>
              </DialogHeader>

              {!passwordModal.result ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={isPlaceholderEmail(passwordModal.member.email)}
                      onClick={() =>
                        setPasswordModal((curr) => (curr ? { ...curr, mode: 'send_link' } : null))
                      }
                      className={`text-left p-3 rounded-xl border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        passwordModal.mode === 'send_link'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-900">
                        Email password reset link
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isPlaceholderEmail(passwordModal.member.email)
                          ? 'Unavailable — this account has no verified email address yet.'
                          : `Sends a secure reset link to ${passwordModal.member.email}.`}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPasswordModal((curr) => (curr ? { ...curr, mode: 'set_temp' } : null))
                      }
                      className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        passwordModal.mode === 'set_temp'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-900">
                        Generate temporary password
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Ends active sessions and requires a password change on next sign-in.
                      </p>
                    </button>
                  </div>

                  {passwordModal.error && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#3E104B]/30 bg-[#FAF6FB] p-3 text-xs text-[#3E104B]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{passwordModal.error}</span>
                    </div>
                  )}

                  <DialogFooter className="gap-2 pt-1">
                    <button
                      type="button"
                      disabled={passwordModal.submitting}
                      onClick={() => setPasswordModal(null)}
                      className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={passwordModal.submitting}
                      onClick={() => void handleSubmitPasswordReset()}
                      className="h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {passwordModal.submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {passwordModal.mode === 'send_link'
                        ? 'Send reset link'
                        : 'Generate password'}
                    </button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#7B2D8E]/25 bg-[#7B2D8E]/5 p-3 text-xs text-[#5A1D6A]">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#7B2D8E]" />
                    <span>{passwordModal.result.message}</span>
                  </div>

                  {passwordModal.result.resetUrl && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-500">
                        Reset link (copy fallback)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#FAF6FB] px-3 py-2">
                        <input
                          type="text"
                          readOnly
                          value={passwordModal.result.resetUrl}
                          className="flex-1 bg-transparent text-xs text-gray-700 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(passwordModal.result!.resetUrl!, 'reset-url')
                          }
                          className="text-xs font-medium text-[#7B2D8E] hover:underline shrink-0 cursor-pointer"
                        >
                          {copiedId === 'reset-url' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  {passwordModal.result.tempPassword && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-500">
                        Temporary password (shown once)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#FAF6FB] px-3 py-2">
                        <code className="flex-1 text-sm font-semibold text-gray-900 font-mono tracking-wide">
                          {passwordModal.result.tempPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(passwordModal.result!.tempPassword!, 'temp-pw')
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:underline shrink-0 cursor-pointer"
                        >
                          {copiedId === 'temp-pw' ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="pt-1">
                    <button
                      type="button"
                      onClick={() => setPasswordModal(null)}
                      className="h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] cursor-pointer"
                    >
                      Done
                    </button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  active,
  onClick,
}: {
  icon: typeof Users
  label: string
  value: number
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
        active
          ? 'border-[#7B2D8E] bg-[#FAF6FB]'
          : 'border-gray-200 bg-white hover:border-[#7B2D8E]/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            active
              ? 'bg-[#7B2D8E] text-white'
              : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="mt-2.5 text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-gray-500 truncate">{hint}</p>
    </button>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-[#7B2D8E]/20 bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-medium text-[#5A1D6A]">
        <CheckCircle2 className="w-3 h-3 text-[#7B2D8E]" />
        Verified
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#7B2D8E]/35 bg-white px-2 py-0.5 text-[11px] font-medium text-[#7B2D8E]">
        <Hourglass className="w-3 h-3" />
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-gray-900 bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white">
      <UserX className="w-3 h-3" />
      Suspended
    </span>
  )
}

function StaffPageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-lg bg-gray-200" />
          <div className="h-4 w-72 rounded-lg bg-gray-100" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-28 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="mt-4 h-7 w-12 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-32 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="h-9 w-full rounded-lg bg-gray-100" />
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-14 w-full rounded-xl bg-gray-50" />
        ))}
      </div>
    </div>
  )
}
