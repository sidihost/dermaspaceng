'use client'

/**
 * /admin/broadcast
 *
 * Compose, schedule, draft, and send a push + in-app notification.
 * Inspired by Firebase Cloud Messaging's "Compose notification" flow:
 *
 *   1. Notification     — title, message, optional click URL
 *   2. Target           — all users / by role / single user
 *   3. Scheduling       — Send now or schedule for a future time
 *   4. Channels         — push + in-app, push only, in-app only
 *   5. Review           — final preview, then "Send" / "Schedule"
 *
 * Visual treatment matches the rest of the admin surface — flat white
 * cards, hairline borders, brand purple #7B2D8E for active state. No
 * shadows, no gradients, no sparkle iconography.
 */

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import {
  Send,
  Loader2,
  AlertTriangle,
  Bell,
  Users,
  User as UserIcon,
  Shield,
  Check,
  Clock,
  CalendarClock,
  Pencil,
  Trash2,
  History,
  X,
} from 'lucide-react'

type Audience = 'all' | 'role' | 'user'
type Role = 'user' | 'staff' | 'admin'
type Intent = 'send' | 'schedule' | 'draft'
type Step = 1 | 2 | 3 | 4 | 5

const fetcher = (u: string) => fetch(u).then((r) => r.json())

type Broadcast = {
  id: string
  name: string | null
  title: string
  message: string
  action_url: string | null
  priority: string
  audience: Audience
  role: string | null
  user_id: string | null
  push_enabled: boolean
  inapp_enabled: boolean
  status: string
  scheduled_at: string | null
  sent_at: string | null
  recipients: number
  push_sent: number
  push_removed: number
  error: string | null
  created_at: string
}

/** Format an ISO date string to "Mar 14, 2026 · 7:30 PM" in local time. */
function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

/** "in 2 hours", "in 3 days", "12 minutes ago", etc. */
function relTime(iso: string | null) {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  const future = ms > 0
  const m = Math.round(abs / 60_000)
  if (m < 1) return future ? 'any moment' : 'just now'
  if (m < 60) return future ? `in ${m}m` : `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return future ? `in ${h}h` : `${h}h ago`
  const d = Math.round(h / 24)
  return future ? `in ${d}d` : `${d}d ago`
}

/** Default scheduledAt = now + 1 hour, rounded down to the minute. */
function defaultScheduleValue() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setSeconds(0, 0)
  // Format as YYYY-MM-DDTHH:mm in LOCAL time for <input type="datetime-local">.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function BroadcastPage() {
  const { data: vapid } = useSWR<{ configured: boolean }>('/api/push/vapid-public-key', fetcher)
  const { data: history, mutate: mutateHistory } = useSWR<{ broadcasts: Broadcast[] }>(
    '/api/admin/broadcast',
    fetcher,
    { refreshInterval: 30_000 },
  )

  // ───────── form state ─────────
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')

  const [audience, setAudience] = useState<Audience>('all')
  const [role, setRole] = useState<Role>('user')
  const [userId, setUserId] = useState('')

  const [intent, setIntent] = useState<Intent>('send')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue())

  const [pushOnly, setPushOnly] = useState(false)
  const [inappOnly, setInappOnly] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    intent: Intent
    recipients?: number
    sent?: number
    removed?: number
    scheduledAt?: string | null
  } | null>(null)
  const [error, setError] = useState('')

  const reset = () => {
    setStep(1); setName(''); setTitle(''); setMessage(''); setActionUrl('')
    setPriority('normal'); setAudience('all'); setRole('user'); setUserId('')
    setIntent('send'); setScheduledAt(defaultScheduleValue())
    setPushOnly(false); setInappOnly(false); setError(''); setResult(null)
  }

  const audienceLabel = useMemo(() => {
    if (audience === 'all') return 'All users'
    if (audience === 'role') return `${role}s`
    return `User ${userId.slice(0, 6) || '…'}`
  }, [audience, role, userId])

  const canAdvance = (s: Step): boolean => {
    if (s === 1) return Boolean(title.trim() && message.trim())
    if (s === 2) {
      if (audience === 'user') return Boolean(userId.trim())
      return true
    }
    if (s === 3) {
      if (intent !== 'schedule') return true
      const t = new Date(scheduledAt).getTime()
      return Number.isFinite(t) && t > Date.now() - 30_000
    }
    if (s === 4) return !(pushOnly && inappOnly) // can't disable both
    return true
  }

  const submit = async () => {
    setError(''); setResult(null); setSubmitting(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          title: title.trim(),
          message: message.trim(),
          actionUrl: actionUrl.trim() || undefined,
          priority,
          audience,
          role: audience === 'role' ? role : undefined,
          userId: audience === 'user' ? userId.trim() : undefined,
          intent,
          scheduledAt: intent === 'schedule'
            ? new Date(scheduledAt).toISOString()
            : undefined,
          pushOnly: pushOnly && !inappOnly,
          inappOnly: inappOnly && !pushOnly,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Broadcast failed')
        return
      }
      setResult({
        intent,
        recipients: data.recipients,
        sent: data.push?.sent,
        removed: data.push?.removed,
        scheduledAt: data.scheduledAt,
      })
      mutateHistory()
      // Clear the composer so the admin can send another.
      setTimeout(reset, 4000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Compose notification
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Send a push + in-app notification, or schedule it for later.
            </p>
          </div>
        </div>
      </header>

      {vapid && !vapid.configured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Push notifications are not configured.</p>
            <p className="text-amber-800 mt-0.5 text-xs">
              In-app notifications will still be delivered. To enable browser
              push, run <code className="font-mono bg-white/60 px-1 rounded">node scripts/generate-vapid.mjs</code> and
              add <code className="font-mono bg-white/60 px-1 rounded">VAPID_PUBLIC_KEY</code>,&nbsp;
              <code className="font-mono bg-white/60 px-1 rounded">VAPID_PRIVATE_KEY</code>,&nbsp;
              <code className="font-mono bg-white/60 px-1 rounded">VAPID_SUBJECT</code> to your project.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-6">
        {/* ─────── Stepper card ─────── */}
        <section className="rounded-2xl border border-gray-200 bg-white">
          <Step1
            stepNumber={1}
            current={step}
            done={step > 1}
            title="Notification"
            summary={title || 'Title and message'}
            onEdit={() => setStep(1)}
          >
            <div className="space-y-4">
              <Field label="Notification name (optional)" hint="Internal label so you can recognise this in history">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Spring sale teaser"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                />
              </Field>
              <Field label="Notification title" required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="A short, scannable headline"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                />
                <Counter count={title.length} max={80} />
              </Field>
              <Field label="Notification text" required>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={400}
                  placeholder="Tell users what's happening, what to do, and what's in it for them."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none"
                />
                <Counter count={message.length} max={400} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Open URL when tapped">
                  <input
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/dashboard or https://…"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                  />
                </Field>
                <Field label="Priority">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </Field>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canAdvance(1)}
                  className="h-9 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Step1>

          <Step1
            stepNumber={2}
            current={step}
            done={step > 2}
            title="Target"
            summary={audienceLabel}
            onEdit={() => setStep(2)}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'all',  label: 'All users',    icon: Users,   help: 'Everyone with an active account' },
                    { id: 'role', label: 'By role',      icon: Shield,  help: 'Customers, staff, or admins' },
                    { id: 'user', label: 'Single user',  icon: UserIcon, help: 'One specific user id' },
                  ] as { id: Audience; label: string; icon: typeof Users; help: string }[]
                ).map((opt) => {
                  const Icon = opt.icon
                  const active = audience === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAudience(opt.id)}
                      className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg border text-left transition-colors ${
                        active
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-[11px] text-gray-500">{opt.help}</span>
                    </button>
                  )
                })}
              </div>
              {audience === 'role' && (
                <Field label="Role">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none bg-white"
                  >
                    <option value="user">Customers</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admins</option>
                  </select>
                </Field>
              )}
              {audience === 'user' && (
                <Field label="User ID" required>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="UUID from /admin/users"
                    className="w-full h-10 px-3 font-mono text-xs rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                  />
                </Field>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canAdvance(2)}
                  className="h-9 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Step1>

          <Step1
            stepNumber={3}
            current={step}
            done={step > 3}
            title="Scheduling"
            summary={
              intent === 'send' ? 'Send now'
              : intent === 'schedule' ? `Scheduled · ${fmtDate(new Date(scheduledAt).toISOString())}`
              : 'Save as draft'
            }
            onEdit={() => setStep(3)}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'send',     label: 'Send now',         icon: Send,          help: 'Fan out immediately' },
                    { id: 'schedule', label: 'Schedule for later', icon: CalendarClock, help: 'Pick a date and time' },
                    { id: 'draft',    label: 'Save as draft',    icon: Pencil,        help: 'Hold off, send later manually' },
                  ] as { id: Intent; label: string; icon: typeof Send; help: string }[]
                ).map((opt) => {
                  const Icon = opt.icon
                  const active = intent === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIntent(opt.id)}
                      className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg border text-left transition-colors ${
                        active
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-[11px] text-gray-500">{opt.help}</span>
                    </button>
                  )
                })}
              </div>
              {intent === 'schedule' && (
                <Field label="Send at" hint="Your local timezone">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                  />
                  <p className="mt-1 text-[11px] text-gray-500 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {relTime(new Date(scheduledAt).toISOString())}
                  </p>
                </Field>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={!canAdvance(3)}
                  className="h-9 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Step1>

          <Step1
            stepNumber={4}
            current={step}
            done={step > 4}
            title="Channels (optional)"
            summary={
              pushOnly ? 'Push only' : inappOnly ? 'In-app only' : 'Push + in-app'
            }
            onEdit={() => setStep(4)}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${
                  pushOnly ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={pushOnly}
                    onChange={(e) => { setPushOnly(e.target.checked); if (e.target.checked) setInappOnly(false) }}
                    className="mt-0.5 accent-[#7B2D8E]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push only</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Skip the in-app notification list</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${
                  inappOnly ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={inappOnly}
                    onChange={(e) => { setInappOnly(e.target.checked); if (e.target.checked) setPushOnly(false) }}
                    className="mt-0.5 accent-[#7B2D8E]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">In-app only</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Skip the browser push</p>
                  </div>
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  disabled={!canAdvance(4)}
                  className="h-9 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium disabled:opacity-50"
                >
                  Review
                </button>
              </div>
            </div>
          </Step1>

          <Step1
            stepNumber={5}
            current={step}
            done={false}
            title="Review"
            summary={
              intent === 'send' ? 'Ready to send'
              : intent === 'schedule' ? 'Ready to schedule'
              : 'Ready to save'
            }
            onEdit={() => setStep(5)}
            isLast
          >
            <div className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Title" value={title} />
                <Row label="Audience" value={audienceLabel} />
                <Row label="Priority" value={priority} />
                <Row
                  label="Channel"
                  value={pushOnly ? 'Push only' : inappOnly ? 'In-app only' : 'Push + in-app'}
                />
                <Row
                  label="Delivery"
                  value={
                    intent === 'send' ? 'Immediate'
                    : intent === 'schedule' ? `${fmtDate(new Date(scheduledAt).toISOString())} (${relTime(new Date(scheduledAt).toISOString())})`
                    : 'Saved as draft'
                  }
                />
                {actionUrl && <Row label="Tap opens" value={actionUrl} mono />}
              </dl>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {result && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800 inline-flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {result.intent === 'send' && 'Broadcast delivered'}
                    {result.intent === 'schedule' && 'Broadcast scheduled'}
                    {result.intent === 'draft' && 'Saved as draft'}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    {result.intent === 'send' && (
                      <>
                        {result.recipients} recipient(s) · {result.sent} push delivered
                        {result.removed ? ` · ${result.removed} expired subs cleaned` : ''}
                      </>
                    )}
                    {result.intent === 'schedule' && (
                      <>Will fan out {fmtDate(result.scheduledAt || null)} ({relTime(result.scheduledAt || null)})</>
                    )}
                    {result.intent === 'draft' && (
                      <>Stored in history. Send manually from the list on the right.</>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="h-10 px-4 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !title.trim() || !message.trim() || (audience === 'user' && !userId)}
                  className="h-10 px-5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    intent === 'schedule' ? <CalendarClock className="w-4 h-4" /> :
                    intent === 'draft' ? <Pencil className="w-4 h-4" /> :
                    <Send className="w-4 h-4" />}
                  {submitting ? 'Working…' :
                    intent === 'schedule' ? 'Schedule' :
                    intent === 'draft' ? 'Save draft' :
                    'Send broadcast'}
                </button>
              </div>
            </div>
          </Step1>
        </section>

        {/* ─────── Right column: device preview + history ─────── */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <Bell className="w-3.5 h-3.5 text-[#7B2D8E]" />
              Device preview
            </div>
            <div className="p-4">
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-[#7B2D8E] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">
                    Dermaspace
                  </p>
                  <p className="text-sm font-semibold text-white mt-0.5 line-clamp-2">
                    {title || 'Your headline shows up here'}
                  </p>
                </div>
                <div className="px-4 py-3 bg-white">
                  <p className="text-sm text-gray-700 line-clamp-4">
                    {message || 'Your message body shows up here. Keep it clear and useful.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <HistoryCard data={history?.broadcasts ?? []} mutate={mutateHistory} />
        </aside>
      </div>
    </div>
  )
}

// ───────────────────── helpers ─────────────────────

function Step1({
  stepNumber,
  current,
  done,
  title,
  summary,
  onEdit,
  children,
  isLast,
}: {
  stepNumber: Step
  current: Step
  done: boolean
  title: string
  summary: string
  onEdit: () => void
  children: React.ReactNode
  isLast?: boolean
}) {
  const isOpen = current === stepNumber
  const isUpcoming = current < stepNumber
  // Only allow jumping BACK to a completed step. Forward jumps would
  // skip validation gates (canAdvance) so they're disabled.
  const canJump = !isUpcoming && !isOpen
  return (
    <div className={isLast ? '' : 'border-b border-gray-100'}>
      <button
        type="button"
        onClick={canJump ? onEdit : undefined}
        disabled={!canJump && !isOpen}
        className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:cursor-not-allowed"
      >
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
            done
              ? 'bg-[#7B2D8E] text-white'
              : isOpen
              ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-2 ring-[#7B2D8E]/30'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {done ? <Check className="w-3.5 h-3.5" /> : stepNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isUpcoming ? 'text-gray-400' : 'text-gray-900'}`}>
            {title}
          </p>
          {!isOpen && <p className="text-[11px] text-gray-500 truncate mt-0.5">{summary}</p>}
        </div>
        {!isOpen && !isUpcoming && (
          <span className="text-[11px] text-[#7B2D8E] font-semibold">Edit</span>
        )}
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

function Counter({ count, max }: { count: number; max: number }) {
  return <p className="mt-1 text-[11px] text-gray-400 text-right">{count}/{max}</p>
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</dt>
      <dd className={`text-sm text-gray-900 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

function HistoryCard({
  data,
  mutate,
}: {
  data: Broadcast[]
  mutate: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const scheduled = data.filter((b) => b.status === 'scheduled' || b.status === 'draft')
  const recent = data.filter((b) => b.status !== 'scheduled' && b.status !== 'draft').slice(0, 8)

  const act = async (id: string, action: 'cancel' | 'send_now' | 'delete') => {
    setBusy(id)
    try {
      if (action === 'delete') {
        await fetch(`/api/admin/broadcast/${id}`, { method: 'DELETE' })
      } else {
        await fetch(`/api/admin/broadcast/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      }
      mutate()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500">
        <History className="w-3.5 h-3.5 text-[#7B2D8E]" />
        History
      </div>

      {data.length === 0 ? (
        <p className="p-6 text-center text-xs text-gray-500">No broadcasts yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {scheduled.map((b) => (
            <li key={b.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#7B2D8E]/10 text-[#7B2D8E]">
                      {b.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {b.status === 'scheduled' ? `${fmtDate(b.scheduled_at)} · ${relTime(b.scheduled_at)}` : 'Not scheduled'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-1 line-clamp-1">{b.title}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-1">{b.message}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => act(b.id, 'send_now')}
                    disabled={busy === b.id}
                    title="Send now"
                    className="w-7 h-7 rounded-md text-[#7B2D8E] hover:bg-[#7B2D8E]/10 inline-flex items-center justify-center disabled:opacity-50"
                  >
                    {busy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => act(b.id, 'cancel')}
                    disabled={busy === b.id}
                    title="Cancel"
                    className="w-7 h-7 rounded-md text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {scheduled.length > 0 && recent.length > 0 && (
            <li className="px-4 py-2 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Recent
            </li>
          )}
          {recent.map((b) => (
            <li key={b.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      b.status === 'sent' ? 'bg-emerald-50 text-emerald-700'
                      : b.status === 'failed' ? 'bg-rose-50 text-rose-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {b.status}
                    </span>
                    <p className="text-xs text-gray-500">{relTime(b.sent_at || b.created_at)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-1 line-clamp-1">{b.title}</p>
                  <p className="text-[11px] text-gray-500">
                    {b.recipients} recipient(s) · {b.push_sent} push delivered
                  </p>
                </div>
                {(b.status === 'failed' || b.status === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => act(b.id, 'delete')}
                    disabled={busy === b.id}
                    title="Delete"
                    className="w-7 h-7 rounded-md text-gray-400 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                  >
                    {busy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
