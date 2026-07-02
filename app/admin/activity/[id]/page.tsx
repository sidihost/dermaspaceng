'use client'

/**
 * Admin login-activity detail page.
 *
 * A single authentication event from the tamper-evident ledger, opened
 * from a row on /admin/activity (Login activity tab). Design language
 * matches the ticket / consultation detail pages so the admin surface
 * reads as one product:
 *
 *   • Brand purple #7B2D8E hero band with a faint inner highlight line.
 *   • Cards are rounded-2xl with a single 1px hairline border, flat
 *     white fill — no gradients, no drop shadows.
 *   • lucide-react icons only; Zap / Sparkles deliberately excluded per
 *     brand rules.
 *
 * Read path: GET /api/admin/activity/logins/[id]
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Mail,
  Copy,
  Check,
  Clock,
  Fingerprint,
  Link2,
  CalendarDays,
  User as UserIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventDetail {
  id: number
  eventType: string
  userId: string | null
  userName: string
  userEmail: string | null
  userRole: string | null
  userAvatarUrl: string | null
  userCreatedAt: string | null
  ipAddress: string | null
  userAgent: string | null
  eventData: Record<string, unknown>
  createdAt: string
  prevHash: string | null
  thisHash: string | null
}

interface TimelineItem {
  id: number
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  eventData: Record<string, unknown>
}

interface DetailResponse {
  success: boolean
  event: EventDetail
  integrity: { chainLinkIntact: boolean; predecessorHash: string | null; isGenesis: boolean }
  timeline: TimelineItem[]
  ipInsight: { total: number; failed: number }
}

const EVENT_COLORS: Record<string, string> = {
  signin: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  signin_failed: 'bg-white text-[#5A1D6A] border-[#5A1D6A]/35',
  signup: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/25',
  logout: 'bg-gray-50 text-gray-500 border-gray-200',
  password_change: 'bg-[#7B2D8E]/[0.06] text-[#7B2D8E] border-[#7B2D8E]/20',
  password_reset_requested: 'bg-[#7B2D8E]/[0.06] text-[#7B2D8E] border-[#7B2D8E]/20',
  role_change: 'bg-[#7B2D8E]/[0.15] text-[#7B2D8E] border-[#7B2D8E]/30',
  '2fa_enabled': 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/25',
  '2fa_disabled': 'bg-white text-[#5A1D6A] border-[#5A1D6A]/35',
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  signin: <LogIn className="h-4 w-4" />,
  signin_failed: <ShieldAlert className="h-4 w-4" />,
  signup: <UserPlus className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  password_change: <KeyRound className="h-4 w-4" />,
  password_reset_requested: <KeyRound className="h-4 w-4" />,
  role_change: <ShieldCheck className="h-4 w-4" />,
  '2fa_enabled': <ShieldCheck className="h-4 w-4" />,
  '2fa_disabled': <ShieldAlert className="h-4 w-4" />,
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function deviceFromUA(ua: string | null): { label: string; Icon: typeof Monitor } {
  if (!ua) return { label: 'Unknown', Icon: Globe }
  const lower = ua.toLowerCase()
  if (/ipad|tablet/.test(lower)) return { label: 'Tablet', Icon: Tablet }
  if (/iphone|android|mobile/.test(lower)) return { label: 'Mobile', Icon: Smartphone }
  return { label: 'Desktop', Icon: Monitor }
}

function browserFromUA(ua: string | null): string {
  if (!ua) return 'Unknown browser'
  if (/edg\//i.test(ua)) return 'Microsoft Edge'
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari'
  return 'Browser'
}

function osFromUA(ua: string | null): string {
  if (!ua) return 'Unknown OS'
  if (/windows/i.test(ua)) return 'Windows'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/mac os x|macintosh/i.test(ua)) return 'macOS'
  if (/android/i.test(ua)) return 'Android'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Unknown OS'
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function LoginEventDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/activity/logins/${id}`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || !body.success) throw new Error(body?.error || `HTTP ${res.status}`)
        if (!cancelled) setData(body)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const copy = (key: string, value: string) => {
    if (!value) return
    try {
      navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
    } catch {
      /* clipboard blocked — silent */
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
        <h2 className="text-base font-semibold text-gray-900 mb-1">Unable to load event</h2>
        <p className="text-sm text-gray-500 mb-4">{error || 'Unknown error'}</p>
        <Link
          href="/admin/activity"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to activity
        </Link>
      </div>
    )
  }

  const { event, integrity, timeline, ipInsight } = data
  const device = deviceFromUA(event.userAgent)
  const created = new Date(event.createdAt)
  const createdDate = created.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const createdTime = created.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const initials = (event.userName.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase() || 'U'
  const newDevice = Boolean((event.eventData as any)?.newDevice)
  const method = (event.eventData as any)?.method as string | undefined
  const eventIcon = EVENT_ICONS[event.eventType] || <Activity className="h-4 w-4" />
  const eventTone = EVENT_COLORS[event.eventType] || 'bg-gray-100 text-gray-600 border-gray-200'

  // Extra event_data keys worth surfacing (skip ones we render explicitly).
  const extraData = Object.entries(event.eventData || {}).filter(
    ([k]) => !['newDevice', 'method', 'identifier'].includes(k),
  )

  return (
    <div className="space-y-4 pb-12">
      {/* Back link */}
      <Link
        href="/admin/activity"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to activity
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ─────────────── Main column ─────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Hero */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="relative bg-[#7B2D8E] px-5 sm:px-7 py-5 text-white">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-white/25"
              />
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center text-base sm:text-lg font-semibold flex-shrink-0 overflow-hidden">
                  {event.userAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.userAvatarUrl || '/placeholder.svg'}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    <span className="inline-flex items-center gap-1.5">
                      <LogIn className="w-3 h-3 flex-shrink-0" />
                      Auth event
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] normal-case tracking-normal text-white/90 whitespace-nowrap">
                      #{event.id}
                    </span>
                  </div>
                  <h1 className="mt-1.5 text-xl sm:text-2xl font-semibold text-white text-balance leading-tight break-words">
                    {event.userName}
                  </h1>
                  <p className="mt-2 text-xs text-white/75 flex items-start gap-1.5">
                    <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>
                      {createdDate} at {createdTime} · {formatRelative(event.createdAt)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Event + role chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white border-white/25',
                  )}
                >
                  {eventIcon}
                  {formatLabel(event.eventType)}
                </span>
                {event.userRole && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium capitalize text-white/90 border border-white/20">
                    <UserIcon className="w-3 h-3" />
                    {event.userRole}
                  </span>
                )}
                {newDevice && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/25">
                    <Fingerprint className="w-3 h-3" />
                    New device
                  </span>
                )}
              </div>
            </div>

            {/* Contact strip */}
            {event.userEmail && (
              <div className="p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => copy('email', event.userEmail || '')}
                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left transition-colors hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/[0.03]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Email
                    </span>
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {event.userEmail}
                    </span>
                  </span>
                  {copied === 'email' ? (
                    <Check className="h-4 w-4 text-[#7B2D8E]" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-300 group-hover:text-[#7B2D8E]" />
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Device & network */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <SectionHeader icon={<Monitor className="w-3.5 h-3.5" />} label="Device & network" />
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={<device.Icon className="h-4 w-4" />}
                label="Device"
                value={`${device.label} · ${osFromUA(event.userAgent)}`}
              />
              <InfoTile
                icon={<Globe className="h-4 w-4" />}
                label="Browser"
                value={browserFromUA(event.userAgent)}
              />
              <InfoTile
                icon={<Globe className="h-4 w-4" />}
                label="IP address"
                value={event.ipAddress || 'Unknown'}
                mono
                onCopy={event.ipAddress ? () => copy('ip', event.ipAddress || '') : undefined}
                copied={copied === 'ip'}
              />
              <InfoTile
                icon={<ShieldAlert className="h-4 w-4" />}
                label="From this IP"
                value={`${ipInsight.total} event${ipInsight.total === 1 ? '' : 's'}${
                  ipInsight.failed ? ` · ${ipInsight.failed} failed` : ''
                }`}
              />
            </div>
            {event.userAgent && (
              <p className="mt-3 break-all rounded-xl bg-gray-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-500">
                {event.userAgent}
              </p>
            )}
          </section>

          {/* Event context */}
          {(method || extraData.length > 0 || (event.eventData as any)?.identifier) && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} label="Event context" />
              <dl className="divide-y divide-gray-100">
                {method && <DataRow label="Method" value={String(method)} />}
                {(event.eventData as any)?.identifier && (
                  <DataRow
                    label="Identifier"
                    value={String((event.eventData as any).identifier)}
                  />
                )}
                {extraData.map(([k, v]) => (
                  <DataRow
                    key={k}
                    label={formatLabel(k)}
                    value={typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  />
                ))}
              </dl>
            </section>
          )}

          {/* Recent activity timeline */}
          {timeline.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Recent activity for this account"
                count={timeline.length}
              />
              <ul className="space-y-0">
                {timeline.map((t, idx) => {
                  const tTone = EVENT_COLORS[t.eventType] || 'bg-gray-100 text-gray-600 border-gray-200'
                  const tIcon = EVENT_ICONS[t.eventType] || <Activity className="h-3.5 w-3.5" />
                  const isCurrent = t.id === event.id
                  return (
                    <li key={t.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border flex-shrink-0',
                            tTone,
                          )}
                        >
                          {tIcon}
                        </span>
                        {idx < timeline.length - 1 && (
                          <span className="absolute top-8 h-full w-px bg-gray-200" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatLabel(t.eventType)}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                              This event
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {new Date(t.createdAt).toLocaleString()}
                          {t.ipAddress ? ` · ${t.ipAddress}` : ''}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>

        {/* ─────────────── Right rail ─────────────── */}
        <div className="space-y-4">
          {/* Ledger integrity — the tamper-evident showcase */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <SectionHeader icon={<Fingerprint className="w-3.5 h-3.5" />} label="Ledger integrity" />
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3',
                integrity.chainLinkIntact
                  ? 'border-[#7B2D8E]/25 bg-[#7B2D8E]/[0.04]'
                  : 'border-[#5A1D6A]/35 bg-[#5A1D6A]/[0.06]',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  integrity.chainLinkIntact
                    ? 'bg-[#7B2D8E] text-white'
                    : 'bg-[#5A1D6A]/12 text-[#5A1D6A]',
                )}
              >
                {integrity.chainLinkIntact ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {integrity.chainLinkIntact ? 'Chain intact' : 'Chain broken'}
                </p>
                <p className="text-xs text-gray-500">
                  {integrity.isGenesis
                    ? 'Genesis record — start of the ledger'
                    : integrity.chainLinkIntact
                      ? 'Hash link verified against prior record'
                      : 'Prior-hash mismatch detected'}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <HashBlock
                icon={<Fingerprint className="h-3.5 w-3.5" />}
                label="This hash"
                value={event.thisHash}
                onCopy={event.thisHash ? () => copy('this', event.thisHash || '') : undefined}
                copied={copied === 'this'}
              />
              <HashBlock
                icon={<Link2 className="h-3.5 w-3.5" />}
                label="Previous hash"
                value={event.prevHash}
                onCopy={event.prevHash ? () => copy('prev', event.prevHash || '') : undefined}
                copied={copied === 'prev'}
              />
            </div>
          </section>

          {/* Meta */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <SectionHeader icon={<CalendarDays className="w-3.5 h-3.5" />} label="Details" />
            <dl className="divide-y divide-gray-100">
              <DataRow label="Event ID" value={`#${event.id}`} />
              <DataRow label="Type" value={formatLabel(event.eventType)} />
              <DataRow label="Occurred" value={created.toLocaleString()} />
              {event.userCreatedAt && (
                <DataRow
                  label="Account created"
                  value={new Date(event.userCreatedAt).toLocaleDateString()}
                />
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E]">
        {icon}
      </span>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h2>
      {typeof count === 'number' && (
        <span className="rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-500">
          {count}
        </span>
      )}
    </div>
  )
}

function InfoTile({
  icon,
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  onCopy?: () => void
  copied?: boolean
}) {
  const body = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 flex-shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span
          className={cn(
            'block truncate text-sm font-medium text-gray-900',
            mono && 'font-mono text-[13px]',
          )}
        >
          {value}
        </span>
      </span>
      {onCopy &&
        (copied ? (
          <Check className="h-4 w-4 text-[#7B2D8E]" />
        ) : (
          <Copy className="h-4 w-4 text-gray-300 group-hover:text-[#7B2D8E]" />
        ))}
    </>
  )
  if (onCopy) {
    return (
      <button
        type="button"
        onClick={onCopy}
        className="group flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-left transition-colors hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/[0.03]"
      >
        {body}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
      {body}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right break-words min-w-0">{value}</dd>
    </div>
  )
}

function HashBlock({
  icon,
  label,
  value,
  onCopy,
  copied,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {icon}
          {label}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-gray-300 transition-colors hover:text-[#7B2D8E]"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#7B2D8E]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <p className="break-all font-mono text-[11px] leading-relaxed text-gray-600">
        {value || '— genesis (no prior hash) —'}
      </p>
    </div>
  )
}
