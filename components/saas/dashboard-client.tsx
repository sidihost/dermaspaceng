'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Palette,
  BookOpen,
  Code2,
  LogOut,
  Check,
  Copy,
  Trash2,
  Plus,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

// ---------------------------------------------------------------------------
// Types mirroring /api/saas/me
// ---------------------------------------------------------------------------
interface TenantProfile {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  publicKey: string
  status: 'pending' | 'active' | 'suspended'
  active: boolean
  subscriptionExpiresAt: string | null
  brandName: string
  assistantName: string
  brandColor: string
  welcomeMessage: string
  logoUrl: string | null
  businessContext: string | null
  launcherLabel: string
  allowedDomains: string | null
  createdAt: string
}

interface KnowledgeEntry {
  id: string
  question: string
  answer: string
  created_at: string
}

type TabId = 'overview' | 'branding' | 'training' | 'embed'

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'training', label: 'Training', icon: BookOpen },
  { id: 'embed', label: 'Embed', icon: Code2 },
]

export function DashboardClient() {
  const router = useRouter()
  const notify = useNotify()
  const [tab, setTab] = useState<TabId>('overview')
  const [profile, setProfile] = useState<TenantProfile | null>(null)
  const [stats, setStats] = useState({ knowledgeCount: 0, conversationCount: 0 })
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/saas/me')
      if (res.status === 401) {
        router.push('/derma-ai-saas/login')
        return
      }
      const data = await res.json()
      setProfile(data.tenant)
      setStats(data.stats ?? { knowledgeCount: 0, conversationCount: 0 })
    } catch {
      notify.error('Could not load your workspace.')
    } finally {
      setLoading(false)
    }
  }, [router, notify])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  async function logout() {
    await fetch('/api/saas/logout', { method: 'POST' })
    router.push('/derma-ai-saas/login')
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#7B2D8E]/[0.03]">
        <div className="flex items-center gap-3 text-gray-500">
          <ButterflyLogo className="h-6 w-6 animate-pulse text-[#7B2D8E]" />
          <span className="text-sm font-medium">Loading your workspace…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#7B2D8E]/[0.03]">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7B2D8E] text-white">
              <ButterflyLogo className="h-5 w-5 text-white" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-gray-900">{profile.companyName}</span>
              <span className="block text-[11px] text-gray-500">Derma AI workspace</span>
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <SubscriptionBanner profile={profile} />

        {/* Tabs */}
        <nav className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#7B2D8E] text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]'
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-6">
          {tab === 'overview' && <OverviewTab profile={profile} stats={stats} onGoto={setTab} />}
          {tab === 'branding' && (
            <BrandingTab profile={profile} onSaved={loadProfile} />
          )}
          {tab === 'training' && <TrainingTab onCountChange={loadProfile} />}
          {tab === 'embed' && <EmbedTab profile={profile} />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subscription banner
// ---------------------------------------------------------------------------
function SubscriptionBanner({ profile }: { profile: TenantProfile }) {
  if (profile.active) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Your assistant is live</p>
          <p className="text-sm text-gray-600">
            Subscription active
            {profile.subscriptionExpiresAt
              ? ` until ${new Date(profile.subscriptionExpiresAt).toLocaleDateString()}`
              : ''}
            . The widget works on your website right now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
          <Clock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Set everything up — activation pending
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            You can fully brand and train your assistant now. It goes live on your website once your
            ₦35,000/year subscription is activated. To activate, send proof of payment to{' '}
            <a href="mailto:business@dermaspaceng.com" className="font-semibold text-[#7B2D8E] hover:underline">
              business@dermaspaceng.com
            </a>
            {' '}with your company name.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function OverviewTab({
  profile,
  stats,
  onGoto,
}: {
  profile: TenantProfile
  stats: { knowledgeCount: number; conversationCount: number }
  onGoto: (t: TabId) => void
}) {
  const cards = [
    { label: 'Training entries', value: stats.knowledgeCount, icon: BookOpen },
    { label: 'Conversations', value: stats.conversationCount, icon: MessageSquare },
  ]
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
              <c.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-3xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-600">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Get set up</h3>
        <p className="mt-1 text-sm text-gray-600">Three quick things to launch your assistant.</p>
        <div className="mt-5 grid gap-3">
          <SetupRow
            n="1"
            title="Rebrand your assistant"
            desc="Name, colour, logo and welcome message."
            action={() => onGoto('branding')}
            cta="Open branding"
          />
          <SetupRow
            n="2"
            title="Train it on your business"
            desc="Add the questions and answers your customers ask."
            action={() => onGoto('training')}
            cta="Add knowledge"
          />
          <SetupRow
            n="3"
            title="Embed on your website"
            desc="Copy one line of code onto your site."
            action={() => onGoto('embed')}
            cta="Get the code"
          />
        </div>
      </div>
    </div>
  )
}

function SetupRow({
  n,
  title,
  desc,
  action,
  cta,
}: {
  n: string
  title: string
  desc: string
  action: () => void
  cta: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E] text-sm font-bold text-white">
          {n}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={action}
        className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#7B2D8E] transition-colors hover:border-[#7B2D8E]/30"
      >
        {cta}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------
function BrandingTab({ profile, onSaved }: { profile: TenantProfile; onSaved: () => void }) {
  const notify = useNotify()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    brandName: profile.brandName || '',
    assistantName: profile.assistantName || '',
    brandColor: profile.brandColor || '#7B2D8E',
    welcomeMessage: profile.welcomeMessage || '',
    launcherLabel: profile.launcherLabel || 'Chat with us',
    logoUrl: profile.logoUrl || '',
    businessContext: profile.businessContext || '',
    allowedDomains: profile.allowedDomains || '',
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/saas/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        notify.error(d?.error || 'Could not save changes.')
        return
      }
      notify.success('Branding saved.')
      onSaved()
    } catch {
      notify.error('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#7B2D8E]'
  const labelClass = 'text-sm font-medium text-gray-900'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Rebrand your assistant</h3>
        <p className="mt-1 text-sm text-gray-600">
          Your customers only ever see your brand — never Dermaspace.
        </p>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Brand name</span>
              <input
                className={fieldClass}
                value={form.brandName}
                onChange={(e) => set('brandName', e.target.value)}
                placeholder="Acme Skincare"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Assistant name</span>
              <input
                className={fieldClass}
                value={form.assistantName}
                onChange={(e) => set('assistantName', e.target.value)}
                placeholder="Ada"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Brand colour</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Brand colour picker"
                  className="h-11 w-14 flex-shrink-0 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                  value={form.brandColor}
                  onChange={(e) => set('brandColor', e.target.value)}
                />
                <input
                  className={fieldClass}
                  value={form.brandColor}
                  onChange={(e) => set('brandColor', e.target.value)}
                  placeholder="#7B2D8E"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Launcher label</span>
              <input
                className={fieldClass}
                value={form.launcherLabel}
                onChange={(e) => set('launcherLabel', e.target.value)}
                placeholder="Chat with us"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Logo URL (optional)</span>
            <input
              className={fieldClass}
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://yoursite.com/logo.png"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Welcome message</span>
            <textarea
              className={`${fieldClass} min-h-[80px] resize-y`}
              value={form.welcomeMessage}
              onChange={(e) => set('welcomeMessage', e.target.value)}
              placeholder="Hi! How can we help you today?"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Business context</span>
            <textarea
              className={`${fieldClass} min-h-[100px] resize-y`}
              value={form.businessContext}
              onChange={(e) => set('businessContext', e.target.value)}
              placeholder="Tell the assistant about your business — what you do, your tone, hours, policies, anything it should always know."
            />
            <span className="text-xs text-gray-500">
              This is always given to the assistant as background, alongside your trained Q&amp;A.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Allowed domains (optional)</span>
            <input
              className={fieldClass}
              value={form.allowedDomains}
              onChange={(e) => set('allowedDomains', e.target.value)}
              placeholder="acme.com, www.acme.com"
            />
            <span className="text-xs text-gray-500">
              Comma-separated. Leave blank to allow the widget on any site.
            </span>
          </label>

          <div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6B2278] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save branding'}
            </button>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <BrandPreview form={form} />
      </div>
    </div>
  )
}

function BrandPreview({
  form,
}: {
  form: {
    brandName: string
    assistantName: string
    brandColor: string
    welcomeMessage: string
    launcherLabel: string
    logoUrl: string
  }
}) {
  const color = /^#([0-9a-fA-F]{6})$/.test(form.brandColor) ? form.brandColor : '#7B2D8E'
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-semibold text-gray-900">Live preview</p>
      <p className="mt-1 text-xs text-gray-500">How the widget looks to your customers.</p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
        {/* Widget header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: color }}>
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
            ) : (
              <ButterflyLogo className="h-5 w-5 text-white" />
            )}
          </span>
          <div className="min-w-0 leading-tight text-white">
            <p className="truncate text-sm font-bold">{form.assistantName || 'Assistant'}</p>
            <p className="truncate text-[11px] opacity-85">{form.brandName || 'Your brand'}</p>
          </div>
        </div>
        {/* Body */}
        <div className="bg-gray-50 px-4 py-5">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-gray-800 ring-1 ring-gray-200">
            {form.welcomeMessage || 'Hi! How can we help you today?'}
          </div>
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
          <span className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-400">
            Type your message…
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Launcher pill */}
      <div className="mt-4 flex justify-end">
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {form.launcherLabel || 'Chat with us'}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------
function TrainingTab({ onCountChange }: { onCountChange: () => void }) {
  const notify = useNotify()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/saas/knowledge')
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch {
      notify.error('Could not load your knowledge base.')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    if (!question.trim() || !answer.trim()) {
      notify.error('Add both a question and an answer.')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/saas/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      })
      const data = await res.json()
      if (!res.ok) {
        notify.error(data?.error || 'Could not save.')
        return
      }
      setEntries((e) => [data.entry, ...e])
      setQuestion('')
      setAnswer('')
      notify.success('Added to your assistant.')
      onCountChange()
    } catch {
      notify.error('Something went wrong.')
    } finally {
      setAdding(false)
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/saas/knowledge/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        notify.error('Could not delete this entry.')
        return
      }
      setEntries((e) => e.filter((x) => x.id !== id))
      notify.success('Removed.')
      onCountChange()
    } catch {
      notify.error('Something went wrong.')
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#7B2D8E]'

  return (
    <div className="grid gap-6">
      {/* Add form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Teach your assistant</h3>
        <p className="mt-1 text-sm text-gray-600">
          Add a question your customers ask and the answer you want given. The assistant learns it
          instantly.
        </p>
        <div className="mt-5 grid gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-900">Question</span>
            <input
              className={fieldClass}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What are your opening hours?"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-900">Answer</span>
            <textarea
              className={`${fieldClass} min-h-[90px] resize-y`}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="We're open Monday to Saturday, 9am–7pm, and closed on Sundays."
            />
          </label>
          <div>
            <button
              type="button"
              onClick={add}
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6B2278] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {adding ? 'Adding…' : 'Add to knowledge base'}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Knowledge base</h3>
          <span className="rounded-full bg-[#7B2D8E]/10 px-3 py-1 text-xs font-semibold text-[#7B2D8E]">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-900">No knowledge yet</p>
            <p className="text-sm text-gray-600">Add your first Q&amp;A above to train your assistant.</p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{entry.question}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{entry.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    aria-label={`Delete: ${entry.question}`}
                    className="flex-shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Embed
// ---------------------------------------------------------------------------
function EmbedTab({ profile }: { profile: TenantProfile }) {
  const notify = useNotify()
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const snippet = useMemo(() => {
    const base = origin || 'https://dermaspaceng.com'
    return `<script
  src="${base}/derma-widget.js"
  data-derma-key="${profile.publicKey}"
  async
></script>`
  }, [origin, profile.publicKey])

  function copy() {
    navigator.clipboard.writeText(snippet).then(
      () => notify.success('Embed code copied.'),
      () => notify.error('Could not copy. Select and copy manually.'),
    )
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Add to your website</h3>
        <p className="mt-1 text-sm text-gray-600">
          Paste this single line just before the closing{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
            &lt;/body&gt;
          </code>{' '}
          tag on every page. The chat launcher appears automatically.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
            <span className="font-mono text-xs text-gray-500">Embed snippet</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#6B2278]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto bg-white px-4 py-4 font-mono text-xs leading-relaxed text-gray-800">
            {snippet}
          </pre>
        </div>

        {!profile.active && (
          <p className="mt-4 rounded-xl border border-gray-200 bg-[#7B2D8E]/[0.04] px-4 py-3 text-sm text-gray-600">
            You can add this now, but the assistant will only respond once your subscription is
            activated.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Your public key</h3>
        <p className="mt-1 text-sm text-gray-600">
          This identifies your workspace. It is safe to include in your website HTML.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-800">
            {profile.publicKey}
          </code>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText(profile.publicKey)
                .then(() => notify.success('Key copied.'))
            }
            className="flex-shrink-0 rounded-full border border-gray-200 bg-white p-3 text-gray-600 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
            aria-label="Copy public key"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
