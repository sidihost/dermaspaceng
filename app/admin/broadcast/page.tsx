'use client'

/**
 * /admin/broadcast
 *
 * Compose and send a push + in-app notification to a target audience
 * (everyone, a single user, or a role). Mirrors the Dermaspace push
 * payload design: brand purple solid header, neutral body, no
 * gradients, no sparkle iconography.
 */

import useSWR from 'swr'
import { useState } from 'react'
import {
  Send,
  Loader2,
  AlertTriangle,
  Bell,
  Users,
  User as UserIcon,
  Shield,
  Check,
} from 'lucide-react'

type Audience = 'all' | 'role' | 'user'
type Role = 'user' | 'staff' | 'admin'

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function BroadcastPage() {
  const { data: vapid } = useSWR<{ configured: boolean }>('/api/push/vapid-public-key', fetcher)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [role, setRole] = useState<Role>('user')
  const [userId, setUserId] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [pushOnly, setPushOnly] = useState(false)
  const [inappOnly, setInappOnly] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    recipients: number
    sent: number
    removed: number
  } | null>(null)
  const [error, setError] = useState('')

  const send = async () => {
    setError('')
    setResult(null)
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          role: audience === 'role' ? role : undefined,
          userId: audience === 'user' ? userId : undefined,
          actionUrl: actionUrl || undefined,
          priority,
          pushOnly: pushOnly && !inappOnly,
          inappOnly,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Broadcast failed')
        return
      }
      setResult({
        recipients: data.recipients ?? 0,
        sent: data.push?.sent ?? 0,
        removed: data.push?.removed ?? 0,
      })
      setTitle('')
      setMessage('')
      setActionUrl('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const audienceOptions: { id: Audience; label: string; icon: typeof Users; help: string }[] = [
    { id: 'all',  label: 'All users', icon: Users,    help: 'Everyone with an active account' },
    { id: 'role', label: 'By role',   icon: Shield,   help: 'Customers, staff, or admins' },
    { id: 'user', label: 'Single user', icon: UserIcon, help: 'Send to one specific user id' },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Broadcast
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Send a push + in-app notification to your customers.
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
        {/* Composer */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="A short, scannable headline"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400 text-right">{title.length}/80</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={400}
                placeholder="Tell users what's happening, what to do, and what's in it for them."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none"
              />
              <p className="mt-1 text-[11px] text-gray-400 text-right">{message.length}/400</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Open URL when tapped</label>
                <input
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/dashboard or https://…"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audience */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Audience</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {audienceOptions.map((opt) => {
                const Icon = opt.icon
                const active = audience === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAudience(opt.id)}
                    className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg border text-left ${
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                >
                  <option value="user">Customers</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            )}
            {audience === 'user' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">User ID</label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="UUID from /admin/users"
                  className="w-full h-10 px-3 font-mono text-xs rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={pushOnly}
                  onChange={(e) => setPushOnly(e.target.checked)}
                  className="accent-[#7B2D8E]"
                />
                Push only (skip in-app)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={inappOnly}
                  onChange={(e) => setInappOnly(e.target.checked)}
                  className="accent-[#7B2D8E]"
                />
                In-app only (skip push)
              </label>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {result && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800 inline-flex items-center gap-2">
                <Check className="w-4 h-4" /> Broadcast delivered
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {result.recipients} recipient(s) &middot; {result.sent} push delivered
                {result.removed ? ` · ${result.removed} expired subscriptions cleaned` : ''}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={sending || !title.trim() || !message.trim() || (audience === 'user' && !userId)}
              className="h-10 px-4 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send broadcast'}
            </button>
          </div>
        </section>

        {/* Live preview — looks like the Dermaspace install prompt */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <Bell className="w-3.5 h-3.5 text-[#7B2D8E]" />
              Push preview
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
        </aside>
      </div>
    </div>
  )
}
