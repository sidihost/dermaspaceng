'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Shield, ShieldOff,
  Calendar, Clock, UserCheck, UserX,
  MessageSquare, Ticket, BellRing, Monitor,
  ChevronRight, Loader2, AlertCircle,
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
  last_login_at: string | null
  avatar_url: string | null
  bio: string | null
}

interface TicketRow { id: number; ticket_id: string; subject: string; status: string; priority: string; category: string; created_at: string }
interface ConsultationRow { id: number; location: string; status: string; created_at: string }
interface ComplaintRow { id: number; subject: string | null; status: string; priority: string; created_at: string }
interface NotificationRow { id: number; title: string; type: string; is_read: boolean; created_at: string }
interface SessionRow { id: string; device_info: string; ip_address: string; created_at: string; expires_at: string }

interface ApiResponse {
  user: UserDetail
  stats: { tickets: number; consultations: number; complaints: number }
  tickets: TicketRow[]
  consultations: ConsultationRow[]
  complaints: ComplaintRow[]
  notifications: NotificationRow[]
  sessions: SessionRow[]
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

  const { user, stats, tickets, consultations, complaints, notifications, sessions } = data
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()

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
                {user.last_login_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Last login {new Date(user.last_login_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
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

        {/* Status stripes */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCell label="Email" value={user.email_verified ? 'Verified' : 'Unverified'} accent={user.email_verified} />
          <StatCell label="Tickets" value={stats.tickets.toString()} />
          <StatCell label="Consultations" value={stats.consultations.toString()} />
          <StatCell label="Complaints" value={stats.complaints.toString()} />
        </div>
      </section>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
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
          className="lg:col-span-2"
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
