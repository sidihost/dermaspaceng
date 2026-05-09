'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Shield, ShieldOff,
  Calendar, UserCheck, UserX,
  MessageSquare, Ticket, BellRing, Monitor,
  ChevronRight, Loader2, AlertCircle,
  Bot, Activity, KeyRound, Smartphone,
  LogIn, Eye, RotateCcw, Copy, Check,
  Wallet as WalletIcon, CalendarCheck, Gift, Heart,
  Sparkles, BadgeCheck,
} from 'lucide-react'

interface UserDetail {
  id: string
  email: string
  username: string | null
  first_name: string
  last_name: string
  phone: string | null
  email_verified: boolean
  role: string
  is_active: boolean
  created_at: string
  // `last_login_at` and `bio` are not on the real users table in any
  // migration, so we don't fetch or render them anymore.
  avatar_url: string | null
  // Onboarding progress — populated by the admin user-detail API. The
  // wizard records 0..4 (see /api/auth/signup-progress) and we mirror
  // those values 1:1 here so the detail page can render an "Onboarding"
  // card without needing a second derived state.
  profile_complete?: boolean
  signup_step?: number
  // Signup method — derived server-side from password_hash + OAuth ids.
  // `signup_method` is the *primary* method shown on the account chip;
  // `signup_methods` lists every linked credential the user has so the
  // admin can see a Google account that later set a password as
  // ["google", "email"].
  signup_method?: 'email' | 'google' | 'x' | string
  signup_methods?: string[]
}

interface TicketRow { id: number; ticket_id: string; subject: string; status: string; priority: string; category: string; created_at: string }
interface ConsultationRow { id: number; location: string; status: string; created_at: string }
interface ComplaintRow { id: number; subject: string | null; status: string; priority: string; created_at: string }
interface NotificationRow { id: number; title: string; type: string; is_read: boolean; created_at: string }
interface SessionRow { id: string; device_info: string; ip_address: string; created_at: string; expires_at: string }
interface PageViewRow { id: number; path: string; title: string | null; referrer: string | null; created_at: string }
interface AiChatRow { id: string; prompt_preview: string | null; message_count: number; created_at: string }

interface SecurityInfo {
  totpEnabled: boolean
  passkeyEnabled: boolean
  passkeyCount: number
  backupCodesGeneratedAt: string | null
  twoFactorEnabled: boolean
}

interface BookingRow {
  id: string
  booking_reference: string
  location_name: string | null
  appointment_date: string | null
  appointment_time: string | null
  total_price_kobo: number | null
  status: string
  payment_status: string
  created_at: string
}

interface WalletInfo {
  balance: number
  currency: string
  monthlyBudget: number | null
  alertThreshold: number
  isActive: boolean
  updatedAt: string | null
}

interface PreferencesInfo {
  skinType: string | null
  concerns: string[]
  allergies: string[]
}

interface ApiResponse {
  user: UserDetail
  stats: { tickets: number; consultations: number; complaints: number }
  tickets: TicketRow[]
  consultations: ConsultationRow[]
  complaints: ComplaintRow[]
  notifications: NotificationRow[]
  sessions: SessionRow[]
  pageViews: PageViewRow[]
  aiChats: AiChatRow[]
  security: SecurityInfo
  activity: {
    aiChats: { total: number; this_week: number }
    pageViews: { total: number; unique_paths: number; last_visit: string | null }
  }
  wallet: WalletInfo | null
  bookings: BookingRow[]
  bookingTotals: {
    total: number
    completed: number
    cancelled: number
    spentKobo: number
  }
  transactionTotals: {
    successful: number
    toppedUp: number
    spent: number
  }
  counts: {
    vouchersUsed: number
    giftCardsSent: number
    favorites: number
  }
  preferences: PreferencesInfo | null
}

const statusTone: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  resolved: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  completed: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

function StatusPill({ status }: { status: string }) {
  const tone = statusTone[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to load user')
      }
      const body = (await res.json()) as ApiResponse
      setData(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleAction = async (action: string, value: unknown) => {
    setActing(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      })
      if (res.ok) await fetchUser()
    } finally {
      setActing(false)
    }
  }

  // Admin-side 2FA reset. We confirm in-page (not via window.confirm)
  // so the destructive prompt feels native to the dashboard. The
  // confirmation text changes per action so admins know exactly what
  // they're about to do.
  const [resetPrompt, setResetPrompt] = useState<null | 'remove_totp' | 'remove_passkeys' | 'remove_all'>(null)

  // Impersonation prompt — same in-page confirmation pattern as the
  // 2FA reset above. We collect an optional "reason" so the audit log
  // captures *why* a staffer signed in as a customer (e.g. "Cannot
  // see booking they paid for"). The prompt also doubles as a
  // friction step so the admin can't impersonate by accident.
  const [impersonatePrompt, setImpersonatePrompt] = useState(false)
  const [impersonateReason, setImpersonateReason] = useState('')
  const [impersonateError, setImpersonateError] = useState('')

  // Password reset prompt + result. Two paths:
  //   • send_link  → emails the user a /reset-password link (default,
  //                  recommended).
  //   • set_temp   → mints a one-shot temp password we surface to the
  //                  admin so they can read it to the customer over
  //                  the phone.
  // After a successful call we keep the result around (resetResult)
  // so the cleartext temp password can be displayed exactly once.
  const [resetPwdPrompt, setResetPwdPrompt] = useState(false)
  const [resetPwdMode, setResetPwdMode] = useState<'send_link' | 'set_temp'>('send_link')
  const [resetPwdError, setResetPwdError] = useState('')
  const [resetResult, setResetResult] = useState<
    | { mode: 'send_link'; resetUrl: string }
    | { mode: 'set_temp'; tempPassword: string }
    | null
  >(null)
  const [resetCopied, setResetCopied] = useState(false)

  const handleResetPassword = async () => {
    setActing(true)
    setResetPwdError('')
    setResetResult(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: resetPwdMode }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResetPwdError(body?.error || 'Could not reset password.')
        return
      }
      if (body.mode === 'set_temp' && body.tempPassword) {
        setResetResult({ mode: 'set_temp', tempPassword: body.tempPassword })
      } else if (body.resetUrl) {
        setResetResult({ mode: 'send_link', resetUrl: body.resetUrl })
      }
    } catch (err) {
      setResetPwdError(
        err instanceof Error ? err.message : 'Could not reset password.',
      )
    } finally {
      setActing(false)
    }
  }

  const copyResetSecret = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setResetCopied(true)
      setTimeout(() => setResetCopied(false), 1800)
    } catch {
      // Best effort — older browsers without clipboard API will just
      // not flash the "Copied" state. The cleartext is still visible
      // so the admin can copy by hand.
    }
  }

  const handleImpersonate = async () => {
    setActing(true)
    setImpersonateError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: impersonateReason || undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setImpersonateError(body?.error || 'Could not start impersonation.')
        return
      }
      // Hard navigation so every cookie/auth read picks up the new
      // session — including the global ImpersonationBanner which
      // mounts via ClientShell.
      window.location.href = '/dashboard'
    } catch (err) {
      setImpersonateError(
        err instanceof Error ? err.message : 'Could not start impersonation.',
      )
    } finally {
      setActing(false)
    }
  }

  const handleSecurityAction = async (
    action: 'remove_totp' | 'remove_passkeys' | 'remove_all',
  ) => {
    setActing(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        await fetchUser()
      }
    } finally {
      setActing(false)
      setResetPrompt(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Unable to load user</h2>
        <p className="text-sm text-gray-500 mb-4">{error || 'Unknown error'}</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to users
        </button>
      </div>
    )
  }

  const {
    user, stats, tickets, consultations, complaints, notifications,
    sessions, pageViews, aiChats, security, activity,
    wallet, bookings, bookingTotals, transactionTotals, counts, preferences,
  } = data
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()

  // Lifetime spend in kobo across paid bookings — formatted as
  // ₦x,xxx for the hero stat tiles. Falls back to "—" if zero.
  const totalSpendKobo = bookingTotals.spentKobo || 0
  const formatNgn = (kobo: number) =>
    `₦${Math.round(kobo / 100).toLocaleString()}`
  const formatNaira = (naira: number) =>
    `₦${Math.round(naira).toLocaleString()}`

  return (
    <div className="space-y-6">
      {/* Top breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All users
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">
          {user.first_name} {user.last_name}
        </span>
      </div>

      {/* Profile card */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-[#7B2D8E]">{initials || 'U'}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Matches the 20px/semibold scale used across the admin. */}
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                  {user.first_name} {user.last_name}
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[11px] font-semibold capitalize">
                  {user.role}
                </span>
                {/* Brand-only status chip — no emerald. */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    user.is_active !== false
                      ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {user.is_active !== false ? (
                    <><UserCheck className="w-3 h-3" /> Active</>
                  ) : (
                    <><UserX className="w-3 h-3" /> Suspended</>
                  )}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {user.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              {/* Signup method chip(s).
                  We display every linked credential — a Google account
                  that later set a password shows BOTH chips so the
                  admin can see "this person can sign in either way".
                  Plain email accounts get a single "Email · Password"
                  chip. */}
              {(user.signup_methods?.length ?? 0) > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {user.signup_methods!.map((method) => (
                    <span
                      key={method}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                    >
                      {method === 'google' && (
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                          </svg>
                        </span>
                      )}
                      {method === 'x' && (
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-gray-900" aria-hidden="true">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </span>
                      )}
                      {method === 'email' && (
                        <KeyRound className="h-3 w-3 text-gray-500" />
                      )}
                      Signed up with {method === 'google' ? 'Google' : method === 'x' ? 'X' : 'email & password'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {/* Login-as / impersonate — only shown for non-admin
                accounts. Admins cannot impersonate other admins (the
                API enforces this too). Disabled for suspended users
                because the auth stack rejects suspended sessions. */}
            {user.role !== 'admin' && user.is_active !== false && (
              <button
                disabled={acting}
                onClick={() => {
                  setImpersonateError('')
                  setImpersonateReason('')
                  setImpersonatePrompt(true)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Login as user
              </button>
            )}
            {user.is_active !== false ? (
              <button
                disabled={acting}
                onClick={() => handleAction('toggle_active', false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ShieldOff className="w-4 h-4" />
                Suspend
              </button>
            ) : (
              <button
                disabled={acting}
                onClick={() => handleAction('toggle_active', true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#7B2D8E]/30 text-sm text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                Reactivate
              </button>
            )}

            {user.role === 'user' && (
              <button
                disabled={acting}
                onClick={() => handleAction('change_role', 'staff')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm hover:bg-[#5A1D6A] disabled:opacity-50"
              >
                Promote to staff
              </button>
            )}
            {user.role === 'staff' && (
              <>
                <button
                  disabled={acting}
                  onClick={() => handleAction('change_role', 'admin')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm hover:bg-[#5A1D6A] disabled:opacity-50"
                >
                  Promote to admin
                </button>
                <button
                  disabled={acting}
                  onClick={() => handleAction('change_role', 'user')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Revoke staff
                </button>
              </>
            )}
          </div>
        </div>

        {/*
          Cross-product stat strip — the equivalent of the "Across
          Google" overview card. The first row is the headline
          financial picture (wallet balance, lifetime spend,
          bookings, completed vs total), the second row covers
          engagement (vouchers used, gift cards sent, favourites,
          AI chats), and the third compresses the operational
          counters (tickets / consultations / complaints / pages).
          We intentionally keep three short rows instead of one
          dense one so the eye can scan a category at a time.
        */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCell
            label="Wallet"
            value={wallet ? formatNaira(wallet.balance) : 'Not set up'}
            accent={Boolean(wallet && wallet.balance > 0)}
          />
          <StatCell
            label="Lifetime spend"
            value={totalSpendKobo > 0 ? formatNgn(totalSpendKobo) : '—'}
            accent={totalSpendKobo > 0}
          />
          <StatCell
            label="Bookings"
            value={`${bookingTotals.total}`}
            accent={bookingTotals.total > 0}
          />
          <StatCell
            label="Completed visits"
            value={bookingTotals.completed.toString()}
            accent={bookingTotals.completed > 0}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCell
            label="Vouchers used"
            value={counts.vouchersUsed.toString()}
            accent={counts.vouchersUsed > 0}
          />
          <StatCell
            label="Gift cards sent"
            value={counts.giftCardsSent.toString()}
            accent={counts.giftCardsSent > 0}
          />
          <StatCell
            label="Favorites"
            value={counts.favorites.toString()}
            accent={counts.favorites > 0}
          />
          <StatCell
            label="Derma AI chats"
            value={activity.aiChats.total.toLocaleString()}
            accent={activity.aiChats.total > 0}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCell
            label="2-step login"
            value={security.twoFactorEnabled ? 'Enabled' : 'Off'}
            accent={security.twoFactorEnabled}
          />
          <StatCell
            label="Email"
            value={user.email_verified ? 'Verified' : 'Unverified'}
            accent={user.email_verified}
          />
          <StatCell label="Tickets" value={stats.tickets.toString()} />
          <StatCell
            label="Pages visited"
            value={activity.pageViews.total.toLocaleString()}
          />
        </div>

        {/* Impersonation confirmation footer — same in-page pattern as the
            2FA reset section. Capturing an optional reason makes the
            audit log dramatically more useful when investigating later.
            The button stays high-contrast (brand purple) so admins know
            exactly which CTA performs the action. */}
        {impersonatePrompt && (
          <div className="mt-4 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.04] p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Sign in as {user.first_name} {user.last_name}?
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You&apos;ll see exactly what this customer sees. Your admin
                  session is preserved — tap &quot;Stop&quot; on the rose
                  banner at the top to switch back. This action is recorded in
                  the audit log.
                </p>
                <label className="block mt-3">
                  <span className="text-[11px] font-medium text-gray-600">
                    Reason (optional)
                  </span>
                  <input
                    type="text"
                    value={impersonateReason}
                    onChange={(e) => setImpersonateReason(e.target.value)}
                    maxLength={500}
                    placeholder="e.g. Investigating a missing booking"
                    className="mt-1 w-full h-8 px-2.5 text-sm rounded-md border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                  />
                </label>
                {impersonateError && (
                  <p className="mt-2 text-xs text-rose-600">{impersonateError}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={handleImpersonate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                    Yes, sign in as user
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => setImpersonatePrompt(false)}
                    className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Security & 2FA breakdown — now front and centre so admins can
          confirm at a glance whether the user is protected, and can
          reset 2FA / passkeys / password if the customer is locked out. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">Account security</h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Reset password — always available to the admin so we
                can recover any account, regardless of whether the
                user has 2FA enabled. Sits before the destructive
                "Reset all 2FA" so the safer option is the easier
                one to reach. */}
            <button
              type="button"
              disabled={acting}
              onClick={() => {
                setResetPwdMode('send_link')
                setResetPwdError('')
                setResetResult(null)
                setResetPwdPrompt(true)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#7B2D8E]/30 text-xs text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset password
            </button>
          </div>
          {/* Disabled until something is actually enabled — there's no
              point pressing "Reset all" on an account that has nothing
              to reset. */}
          {(security.totpEnabled || security.passkeyCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 w-full">
              {security.totpEnabled && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setResetPrompt('remove_totp')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Remove TOTP
                </button>
              )}
              {security.passkeyCount > 0 && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setResetPrompt('remove_passkeys')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Remove passkeys
                </button>
              )}
              <button
                type="button"
                disabled={acting}
                onClick={() => setResetPrompt('remove_all')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Reset all 2FA
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <SecurityChip
            label="Authenticator (TOTP)"
            on={security.totpEnabled}
            icon={<Smartphone className="w-3.5 h-3.5" />}
            sub={security.totpEnabled ? 'Enabled' : 'Not set up'}
          />
          <SecurityChip
            label="Passkey"
            on={security.passkeyCount > 0}
            icon={<KeyRound className="w-3.5 h-3.5" />}
            sub={
              security.passkeyCount > 0
                ? `${security.passkeyCount} registered`
                : 'None registered'
            }
          />
          <SecurityChip
            label="Backup codes"
            on={Boolean(security.backupCodesGeneratedAt)}
            icon={<Shield className="w-3.5 h-3.5" />}
            sub={
              security.backupCodesGeneratedAt
                ? `Generated ${new Date(security.backupCodesGeneratedAt).toLocaleDateString()}`
                : 'Not generated'
            }
          />
        </div>

        {/* Inline confirmation footer — preferred over window.confirm
            so it matches the dashboard's visual language. */}
        {resetPrompt && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-900">
                  {resetPrompt === 'remove_totp' && 'Remove the user’s authenticator app?'}
                  {resetPrompt === 'remove_passkeys' && 'Remove every registered passkey?'}
                  {resetPrompt === 'remove_all' && 'Reset all 2-step protection?'}
                </p>
                <p className="text-xs text-rose-700 mt-1">
                  {resetPrompt === 'remove_all'
                    ? 'TOTP, passkeys, and backup codes will all be wiped. The user will sign in with email + password until they re-enrol. This action is logged.'
                    : 'The user will need to set this up again on their next sign-in. This action is logged.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleSecurityAction(resetPrompt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldOff className="w-3.5 h-3.5" />
                    )}
                    Yes, reset
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => setResetPrompt(null)}
                    className="inline-flex items-center px-3 py-1.5 rounded-md border border-rose-200 bg-white text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password reset prompt + result.
            Two-step UX:
              1. Pick the mode (email a link, or set a temp password
                 the admin reads to the customer).
              2. Confirm — we POST, and if mode = set_temp we surface
                 the cleartext exactly once with a "Copy" button. */}
        {resetPwdPrompt && (
          <div className="mt-4 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.04] p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Reset password for {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Pick how the user should regain access. Both options
                  are recorded in the audit log.
                </p>

                {!resetResult && (
                  <div className="mt-3 flex flex-col gap-2">
                    <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5 cursor-pointer hover:border-[#7B2D8E]/40 transition-colors">
                      <input
                        type="radio"
                        name="reset-mode"
                        value="send_link"
                        checked={resetPwdMode === 'send_link'}
                        onChange={() => setResetPwdMode('send_link')}
                        className="mt-0.5 accent-[#7B2D8E]"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-gray-900">
                          Email a reset link (recommended)
                        </span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          Sends the customer a secure link. The admin
                          never sees the new password.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5 cursor-pointer hover:border-[#7B2D8E]/40 transition-colors">
                      <input
                        type="radio"
                        name="reset-mode"
                        value="set_temp"
                        checked={resetPwdMode === 'set_temp'}
                        onChange={() => setResetPwdMode('set_temp')}
                        className="mt-0.5 accent-[#7B2D8E]"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-gray-900">
                          Set a temporary password
                        </span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          Generates a one-shot password we&apos;ll show
                          you once. Read it to the customer over the
                          phone — they&apos;ll be forced to change it
                          on next sign-in.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {resetResult?.mode === 'set_temp' && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                      Temporary password — shown only once
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 min-w-0 rounded-md bg-white border border-amber-200 px-2.5 py-1.5 font-mono text-sm text-gray-900 break-all">
                        {resetResult.tempPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyResetSecret(resetResult.tempPassword)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#7B2D8E] text-white text-xs font-medium hover:bg-[#5A1D6A]"
                      >
                        {resetCopied ? (
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
                    <p className="mt-2 text-[11px] text-amber-800">
                      Read this to the customer. They&apos;ll be
                      prompted to change it on first sign-in.
                    </p>
                  </div>
                )}

                {resetResult?.mode === 'send_link' && (
                  <div className="mt-3 rounded-lg border border-[#7B2D8E]/20 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7B2D8E]">
                      Reset email sent
                    </p>
                    <p className="mt-1 text-xs text-gray-700">
                      We&apos;ve emailed a one-hour reset link to{' '}
                      <span className="font-semibold">{user.email}</span>.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 min-w-0 rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1.5 font-mono text-[11px] text-gray-700 break-all">
                        {resetResult.resetUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyResetSecret(resetResult.resetUrl)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium hover:bg-gray-50"
                      >
                        {resetCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      If the email doesn&apos;t arrive, share this link
                      with the customer directly.
                    </p>
                  </div>
                )}

                {resetPwdError && (
                  <p className="mt-2 text-xs text-rose-600">{resetPwdError}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!resetResult ? (
                    <>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={handleResetPassword}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50"
                      >
                        {acting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        {resetPwdMode === 'send_link' ? 'Send reset email' : 'Generate temp password'}
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => setResetPwdPrompt(false)}
                        className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResetPwdPrompt(false)
                        setResetResult(null)
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#7B2D8E] text-white text-xs font-medium hover:bg-[#5A1D6A]"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/*
        Money & loyalty row — wallet card on the left, lifetime
        spend / top-ups on the right. The wallet is the single most
        important "Google-style" addition the team asked for, so we
        promote it to its own row above the support-related grid.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <section
          className={`lg:col-span-2 rounded-2xl border p-5 sm:p-6 ${
            wallet
              ? 'border-[#7B2D8E]/15 bg-gradient-to-br from-[#7B2D8E]/[0.04] to-white'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                wallet
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <WalletIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Wallet</h2>
              <p className="text-xs text-gray-500 truncate">
                {wallet
                  ? wallet.isActive
                    ? 'Active and ready to spend'
                    : 'Suspended — top-ups and spend are paused'
                  : 'No wallet has been opened yet'}
              </p>
            </div>
            {wallet && wallet.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[11px] font-medium">
                <BadgeCheck className="w-3 h-3" />
                {wallet.currency}
              </span>
            )}
          </div>

          {wallet ? (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-[#7B2D8E]/15 bg-white px-3 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Balance
                </p>
                <p className="mt-1 text-lg font-semibold text-[#7B2D8E]">
                  {formatNaira(wallet.balance)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-3 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Topped up
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {transactionTotals.toppedUp > 0
                    ? formatNaira(transactionTotals.toppedUp)
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-3 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Wallet spend
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {transactionTotals.spent > 0
                    ? formatNaira(transactionTotals.spent)
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-3 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Monthly budget
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {wallet.monthlyBudget != null && wallet.monthlyBudget > 0
                    ? formatNaira(wallet.monthlyBudget)
                    : 'Unset'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-xs text-gray-500">
                The customer hasn&apos;t topped up yet. Their first top-up
                or refund will create a wallet automatically.
              </p>
            </div>
          )}
        </section>

        {/*
          Skin profile card. Shows what the customer reported during
          onboarding so the admin or therapist can prep for a visit
          without bouncing between screens.
        */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">Skin profile</h2>
          </div>

          {preferences && (preferences.skinType || preferences.concerns.length > 0 || preferences.allergies.length > 0) ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Skin type
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {preferences.skinType
                    ? preferences.skinType.charAt(0).toUpperCase() + preferences.skinType.slice(1)
                    : 'Not specified'}
                </p>
              </div>
              {preferences.concerns.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    Concerns
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {preferences.concerns.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[11px] font-medium capitalize"
                      >
                        {c.replace(/[-_]/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {preferences.allergies.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    Allergies / sensitivities
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {preferences.allergies.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-800 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-xs text-gray-500">
                Customer hasn&apos;t shared a skin profile yet.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/*
          Bookings panel — full lifecycle list, hovers link to the
          existing /admin/bookings detail page so the admin can
          drill in without losing this overview.
        */}
        <Panel
          title={`Bookings · ${bookingTotals.total}`}
          icon={<CalendarCheck className="w-4 h-4 text-[#7B2D8E]" />}
          empty={bookings.length === 0 ? 'No bookings yet' : null}
          className="lg:col-span-2"
        >
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-[#7B2D8E]">
                    {b.booking_reference}
                  </span>
                  <StatusPill status={b.status} />
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                      b.payment_status === 'paid'
                        ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {b.payment_status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-900 truncate">
                  {b.location_name || 'Unknown location'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {b.appointment_date
                    ? `${new Date(b.appointment_date).toLocaleDateString()}${b.appointment_time ? ` · ${b.appointment_time}` : ''}`
                    : new Date(b.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {b.total_price_kobo
                    ? formatNgn(b.total_price_kobo)
                    : '—'}
                </p>
                <ChevronRight className="ml-auto w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E]" />
              </div>
            </Link>
          ))}
        </Panel>

        {/*
          Loyalty / gifting panel. Counts already live on the hero
          stat strip — this card spells out what each number links
          to so admins can jump straight to the right inventory.
        */}
        <Panel
          title="Loyalty & gifting"
          icon={<Gift className="w-4 h-4 text-[#7B2D8E]" />}
          empty={null}
        >
          <Link
            href={`/admin/vouchers`}
            className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors px-3 py-2.5"
          >
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Vouchers used
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                {counts.vouchersUsed} redeemed
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E]" />
          </Link>
          <Link
            href={`/admin/gift-cards`}
            className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors px-3 py-2.5"
          >
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Gift cards sent
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                {counts.giftCardsSent} purchased
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E]" />
          </Link>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#7B2D8E]" />
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Favorites
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {counts.favorites} saved
                </p>
              </div>
            </div>
          </div>
        </Panel>
        {/* Tickets */}
        <Panel
          title="Support tickets"
          icon={<Ticket className="w-4 h-4 text-[#7B2D8E]" />}
          empty={tickets.length === 0 ? 'No tickets yet' : null}
        >
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/admin/complaints?ticket=${t.ticket_id}`}
              className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#7B2D8E]">{t.ticket_id}</span>
                  <StatusPill status={t.status} />
                </div>
                <p className="mt-1 text-sm text-gray-900 truncate">{t.subject}</p>
                <p className="text-[11px] text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E]" />
            </Link>
          ))}
        </Panel>

        {/* Consultations */}
        <Panel
          title="Consultations"
          icon={<Calendar className="w-4 h-4 text-[#7B2D8E]" />}
          empty={consultations.length === 0 ? 'No consultations yet' : null}
        >
          {consultations.map((c) => (
            <Link
              key={c.id}
              href={`/admin/consultations`}
              className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusPill status={c.status} />
                </div>
                <p className="mt-1 text-sm text-gray-900 truncate">{c.location}</p>
                <p className="text-[11px] text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E]" />
            </Link>
          ))}
        </Panel>

        {/* Complaints / contact messages */}
        <Panel
          title="Support inbox"
          icon={<MessageSquare className="w-4 h-4 text-[#7B2D8E]" />}
          empty={complaints.length === 0 ? 'No complaints yet' : null}
        >
          {complaints.map((c) => (
            <Link
              key={c.id}
              href={`/admin/complaints`}
              className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusPill status={c.status} />
                </div>
                <p className="mt-1 text-sm text-gray-900 truncate">
                  {c.subject || 'No subject'}
                </p>
                <p className="text-[11px] text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E]" />
            </Link>
          ))}
        </Panel>

        {/* Recent notifications */}
        <Panel
          title="Recent notifications"
          icon={<BellRing className="w-4 h-4 text-[#7B2D8E]" />}
          empty={notifications.length === 0 ? 'No notifications yet' : null}
        >
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{n.title}</p>
                <p className="text-[11px] text-gray-500">
                  {new Date(n.created_at).toLocaleString()} • {n.type}
                </p>
              </div>
              {!n.is_read && (
                <span className="mt-1 w-2 h-2 rounded-full bg-[#7B2D8E]" aria-label="Unread" />
              )}
            </div>
          ))}
        </Panel>

        {/* Active sessions */}
        <Panel
          title="Active sessions"
          icon={<Monitor className="w-4 h-4 text-[#7B2D8E]" />}
          empty={sessions.length === 0 ? 'No active sessions' : null}
        >
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{s.device_info || 'Unknown device'}</p>
                <p className="text-[11px] text-gray-500">
                  {s.ip_address} • Signed in {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[11px] text-gray-500">
                Expires {new Date(s.expires_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </Panel>

        {/* Derma AI chat history — the prompts the user kicked off
            with the assistant. Counts feed the snapshot card above. */}
        <Panel
          title={`Derma AI chats · ${activity.aiChats.this_week} this week`}
                // Bot replaces the previous Sparkles glyph here —
                // the team is dropping Sparkles everywhere because
                // it had been overloaded as a generic "AI / magic"
                // decoration. Bot says "automated assistant" much
                // more directly for the Derma AI chats panel.
                icon={<Bot className="w-4 h-4 text-[#7B2D8E]" />}
          empty={aiChats.length === 0 ? 'No AI chats yet' : null}
        >
          {aiChats.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {c.prompt_preview || 'No prompt captured'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {c.message_count} msg
              </span>
            </div>
          ))}
        </Panel>

        {/* Page activity — recent routes the user landed on.
            `unique_paths` and `last_visit` come from the count query. */}
        <Panel
          title={`Pages visited · ${activity.pageViews.unique_paths} unique`}
          icon={<Activity className="w-4 h-4 text-[#7B2D8E]" />}
          empty={pageViews.length === 0 ? 'No tracked page views yet' : null}
          className="lg:col-span-2"
        >
          {pageViews.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {p.title || p.path}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {p.path}
                  {p.referrer ? ` • from ${shortenReferrer(p.referrer)}` : ''}
                </p>
              </div>
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                {new Date(p.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}

// Trim long URLs in the page-activity panel to just the host so the
// row stays readable on narrow screens.
function shortenReferrer(ref: string): string {
  try {
    return new URL(ref).host
  } catch {
    return ref.length > 40 ? ref.slice(0, 40) + '…' : ref
  }
}

// Compact chip used inside the Account Security card.
function SecurityChip({
  label,
  sub,
  on,
  icon,
}: {
  label: string
  sub: string
  on: boolean
  icon: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        on
          ? 'border-[#7B2D8E]/25 bg-[#7B2D8E]/5'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          on ? 'bg-[#7B2D8E] text-white' : 'bg-gray-200 text-gray-500'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">{label}</p>
        <p className={`text-[11px] truncate ${on ? 'text-[#7B2D8E]' : 'text-gray-500'}`}>
          {sub}
        </p>
      </div>
    </div>
  )
}

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${accent ? 'text-[#7B2D8E]' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

function Panel({
  title,
  icon,
  empty,
  children,
  className,
}: {
  title: string
  icon: React.ReactNode
  empty: string | null
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white overflow-hidden ${className || ''}`}
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </header>
      <div className="p-3 space-y-2">
        {empty ? (
          <p className="text-xs text-gray-400 px-1 py-4 text-center">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
