'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  MessagesSquare,
  CreditCard,
  Pencil,
  X,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

// ---------------------------------------------------------------------------
// Derma AI SaaS tenant console. Flat editorial design: hairline borders,
// serif display headings, no gradients or shadows. All data comes from
// the /api/saas/* routes backed by the DEDICATED SaaS database.
// ---------------------------------------------------------------------------

interface TenantProfile {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  publicKey: string
  status: 'pending' | 'trial' | 'active' | 'suspended'
  active: boolean
  onTrial: boolean
  trialEndsAt: string | null
  trialDaysLeft: number
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

interface Conversation {
  id: string
  visitor_id: string | null
  user_message: string
  ai_reply: string
  created_at: string
}

type SectionId = 'overview' | 'assistant' | 'knowledge' | 'conversations' | 'install' | 'billing'

const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'assistant', label: 'Assistant', icon: Palette },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'conversations', label: 'Conversations', icon: MessagesSquare },
  { id: 'install', label: 'Install', icon: Code2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary'
const labelClass = 'text-sm font-medium text-foreground'
const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60'
const outlineBtn =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary'

export function DashboardClient() {
  const router = useRouter()
  const notify = useNotify()
  const [section, setSection] = useState<SectionId>('overview')
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <ButterflyLogo className="h-6 w-6 animate-pulse text-primary" />
          <span className="text-sm font-medium">Loading your workspace&hellip;</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* ------------------------------------------------ Sidebar (desktop) */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border lg:flex lg:min-h-screen">
        <Link href="/derma-ai-saas" className="flex items-center gap-2.5 border-b border-border px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ButterflyLogo className="h-4.5 w-4.5 text-primary-foreground" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-serif text-base text-foreground">
              {profile.companyName}
            </span>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
              Derma AI console
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Dashboard sections">
          {SECTIONS.map((s) => {
            const active = section === s.id
            return (
              <button
                key={s.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <s.icon className="h-4 w-4" aria-hidden="true" />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <StatusPill profile={profile} />
          <button type="button" onClick={logout} className={`${outlineBtn} mt-3 w-full`}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------ Main column */}
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="border-b border-border lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/derma-ai-saas" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ButterflyLogo className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-serif text-sm text-foreground">
                  {profile.companyName}
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                  Derma AI console
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2"
            aria-label="Dashboard sections"
          >
            {SECTIONS.map((s) => {
              const active = section === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setSection(s.id)}
                  className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                  {s.label}
                </button>
              )
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 lg:px-10 lg:py-10">
          {section === 'overview' && (
            <OverviewSection profile={profile} stats={stats} onGoto={setSection} />
          )}
          {section === 'assistant' && <AssistantSection profile={profile} onSaved={loadProfile} />}
          {section === 'knowledge' && <KnowledgeSection onCountChange={loadProfile} />}
          {section === 'conversations' && <ConversationsSection />}
          {section === 'install' && <InstallSection profile={profile} />}
          {section === 'billing' && <BillingSection profile={profile} />}
        </main>
      </div>
    </div>
  )
}

function StatusPill({ profile }: { profile: TenantProfile }) {
  if (profile.onTrial) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Trial — {profile.trialDaysLeft}d left
      </span>
    )
  }
  return profile.active ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      Assistant live
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {profile.status === 'trial' ? 'Trial ended' : 'Activation pending'}
    </span>
  )
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-balance font-serif text-3xl text-foreground md:text-4xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function OverviewSection({
  profile,
  stats,
  onGoto,
}: {
  profile: TenantProfile
  stats: { knowledgeCount: number; conversationCount: number }
  onGoto: (s: SectionId) => void
}) {
  const firstName = profile.contactName.split(' ')[0] || profile.contactName

  return (
    <div className="grid gap-8">
      <SectionHeading
        eyebrow="Overview"
        title={`Good to see you, ${firstName}.`}
        sub={
          profile.onTrial
            ? `Your assistant is live on your free trial — ${profile.trialDaysLeft} day${profile.trialDaysLeft === 1 ? '' : 's'} remaining.`
            : profile.active
              ? 'Your assistant is live and answering visitors on your website.'
              : 'Your workspace is ready to configure. Your assistant goes live once your subscription is activated.'
        }
      />

      {!profile.active && (
        <div className="flex flex-col gap-4 rounded-xl border border-border p-6 sm:flex-row sm:items-start">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary text-primary">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Set everything up &mdash; activation pending</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              You can fully brand and train your assistant now. It goes live once your
              &#8358;35,000/year subscription is activated. Send proof of payment to{' '}
              <a
                href="mailto:business@dermaspaceng.com"
                className="font-semibold text-primary hover:underline"
              >
                business@dermaspaceng.com
              </a>{' '}
              with your company name.
            </p>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
        <div className="bg-card p-6">
          <p className="text-sm text-muted-foreground">Training entries</p>
          <p className="mt-2 font-serif text-5xl text-foreground">{stats.knowledgeCount}</p>
          <button
            type="button"
            onClick={() => onGoto('knowledge')}
            className="mt-4 text-sm font-semibold text-primary hover:underline"
          >
            Manage knowledge
          </button>
        </div>
        <div className="bg-card p-6">
          <p className="text-sm text-muted-foreground">Conversations</p>
          <p className="mt-2 font-serif text-5xl text-foreground">{stats.conversationCount}</p>
          <button
            type="button"
            onClick={() => onGoto('conversations')}
            className="mt-4 text-sm font-semibold text-primary hover:underline"
          >
            Read transcripts
          </button>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="rounded-xl border border-border">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Launch checklist</h2>
        </div>
        <div className="divide-y divide-border">
          <SetupRow
            n="01"
            title="Brand your assistant"
            desc="Name, colour, logo, welcome message and voice."
            cta="Open assistant"
            action={() => onGoto('assistant')}
          />
          <SetupRow
            n="02"
            title="Train it on your business"
            desc="Add the questions and answers your customers actually ask."
            cta="Add knowledge"
            action={() => onGoto('knowledge')}
          />
          <SetupRow
            n="03"
            title="Install on your website"
            desc="Copy one line of code onto your site and go live."
            cta="Get the code"
            action={() => onGoto('install')}
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
  cta,
  action,
}: {
  n: string
  title: string
  desc: string
  cta: string
  action: () => void
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="font-serif text-2xl text-primary">{n}</span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button type="button" onClick={action} className={outlineBtn}>
        {cta}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Assistant (branding + live preview)
// ---------------------------------------------------------------------------
function AssistantSection({ profile, onSaved }: { profile: TenantProfile; onSaved: () => void }) {
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
      notify.success('Assistant updated.')
      onSaved()
    } catch {
      notify.error('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-8">
      <SectionHeading
        eyebrow="Assistant"
        title="Make it unmistakably yours."
        sub="Everything here updates the widget your customers see. Changes apply the moment you save."
      />

      <div className="grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5 rounded-xl border border-border p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Brand name</span>
              <input
                className={inputClass}
                value={form.brandName}
                onChange={(e) => set('brandName', e.target.value)}
                placeholder="Amara Beauty Studio"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Assistant name</span>
              <input
                className={inputClass}
                value={form.assistantName}
                onChange={(e) => set('assistantName', e.target.value)}
                placeholder="Ada"
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Brand colour</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Brand colour picker"
                  className="h-11 w-14 flex-shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
                  value={/^#([0-9a-fA-F]{6})$/.test(form.brandColor) ? form.brandColor : '#7B2D8E'}
                  onChange={(e) => set('brandColor', e.target.value)}
                />
                <input
                  className={inputClass}
                  value={form.brandColor}
                  onChange={(e) => set('brandColor', e.target.value)}
                  placeholder="#7B2D8E"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Launcher label</span>
              <input
                className={inputClass}
                value={form.launcherLabel}
                onChange={(e) => set('launcherLabel', e.target.value)}
                placeholder="Chat with us"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Logo URL (optional)</span>
            <input
              className={inputClass}
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://yoursite.com/logo.png"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Welcome message</span>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={form.welcomeMessage}
              onChange={(e) => set('welcomeMessage', e.target.value)}
              placeholder="Hi! How can we help you today?"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Business context</span>
            <textarea
              className={`${inputClass} min-h-[110px] resize-y`}
              value={form.businessContext}
              onChange={(e) => set('businessContext', e.target.value)}
              placeholder="Tell the assistant about your business — what you do, your tone, hours, policies, anything it should always know."
            />
            <span className="text-xs text-muted-foreground">
              Always given to the assistant as background, alongside your trained Q&amp;A.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>Allowed domains (optional)</span>
            <input
              className={inputClass}
              value={form.allowedDomains}
              onChange={(e) => set('allowedDomains', e.target.value)}
              placeholder="yoursite.com, www.yoursite.com"
            />
            <span className="text-xs text-muted-foreground">
              Comma-separated. Leave blank to allow the widget on any site.
            </span>
          </label>

          <div>
            <button type="button" onClick={save} disabled={saving} className={primaryBtn}>
              {saving ? 'Saving\u2026' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="xl:sticky xl:top-8">
          <BrandPreview form={form} />
        </div>
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
    <div className="rounded-xl border border-border p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Live preview
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: color }}>
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/40">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
            ) : (
              <ButterflyLogo className="h-5 w-5 text-white" />
            )}
          </span>
          <div className="min-w-0 leading-tight text-white">
            <p className="truncate text-sm font-semibold">{form.assistantName || 'Assistant'}</p>
            <p className="truncate text-[11px] opacity-85">{form.brandName || 'Your brand'}</p>
          </div>
        </div>
        <div className="bg-secondary px-4 py-5">
          <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
            {form.welcomeMessage || 'Hi! How can we help you today?'}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2.5">
          <span className="flex-1 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground">
            Type your message&hellip;
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          >
            <MessageSquare className="h-4 w-4" />
          </span>
        </div>
      </div>

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
// Knowledge
// ---------------------------------------------------------------------------
function KnowledgeSection({ onCountChange }: { onCountChange: () => void }) {
  const notify = useNotify()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

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

  function startEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id)
    setEditQ(entry.question)
    setEditA(entry.answer)
  }

  async function saveEdit() {
    if (!editingId || !editQ.trim() || !editA.trim()) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/saas/knowledge/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: editQ, answer: editA }),
      })
      const data = await res.json()
      if (!res.ok) {
        notify.error(data?.error || 'Could not update.')
        return
      }
      setEntries((list) => list.map((x) => (x.id === editingId ? data.entry : x)))
      setEditingId(null)
      notify.success('Entry updated.')
    } catch {
      notify.error('Something went wrong.')
    } finally {
      setSavingEdit(false)
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

  return (
    <div className="grid gap-8">
      <SectionHeading
        eyebrow="Knowledge"
        title="Teach it what you know."
        sub="Add the questions your customers ask and the answers you want given. The assistant learns them the moment you save."
      />

      <div className="grid gap-5 rounded-xl border border-border p-6">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Question</span>
          <input
            className={inputClass}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What are your opening hours?"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Answer</span>
          <textarea
            className={`${inputClass} min-h-[90px] resize-y`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="We're open Monday to Saturday, 9am–7pm, and closed on Sundays."
          />
        </label>
        <div>
          <button type="button" onClick={add} disabled={adding} className={primaryBtn}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {adding ? 'Adding\u2026' : 'Add to knowledge base'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Knowledge base</h2>
          <span className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading&hellip;</p>
        ) : entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-semibold text-foreground">No knowledge yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first Q&amp;A above to train your assistant.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="px-6 py-5">
                {editingId === entry.id ? (
                  <div className="grid gap-3">
                    <input
                      className={inputClass}
                      value={editQ}
                      onChange={(e) => setEditQ(e.target.value)}
                      aria-label="Edit question"
                    />
                    <textarea
                      className={`${inputClass} min-h-[80px] resize-y`}
                      value={editA}
                      onChange={(e) => setEditA(e.target.value)}
                      aria-label="Edit answer"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={savingEdit}
                        className={primaryBtn}
                      >
                        {savingEdit ? 'Saving\u2026' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={outlineBtn}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{entry.question}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {entry.answer}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        aria-label={`Edit: ${entry.question}`}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        aria-label={`Delete: ${entry.question}`}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
function ConversationsSection() {
  const notify = useNotify()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const PAGE = 30

  const load = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const res = await fetch(`/api/saas/conversations?limit=${PAGE}&offset=${offset}`)
        const data = await res.json()
        if (!res.ok) {
          notify.error(data?.error || 'Could not load conversations.')
          return
        }
        setTotal(data.total ?? 0)
        setConversations((prev) => (append ? [...prev, ...data.conversations] : data.conversations))
      } catch {
        notify.error('Could not load conversations.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [notify],
  )

  useEffect(() => {
    load(0, false)
  }, [load])

  function loadMore() {
    setLoadingMore(true)
    load(conversations.length, true)
  }

  return (
    <div className="grid gap-8">
      <SectionHeading
        eyebrow="Conversations"
        title="Every question, on record."
        sub="Read exactly what your visitors asked and how your assistant replied — newest first."
      />

      <div className="rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Transcripts</h2>
          <span className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">
            {total} total
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading&hellip;</p>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <MessagesSquare className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-semibold text-foreground">No conversations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Once the widget is live on your website, transcripts appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {conversations.map((c) => (
                <li key={c.id} className="grid gap-3 px-6 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                    {c.visitor_id && c.visitor_id !== 'anon' && (
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {c.visitor_id.slice(0, 12)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
                      {c.user_message}
                    </p>
                  </div>
                  <div className="flex justify-start">
                    <p className="max-w-[85%] rounded-xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-secondary-foreground">
                      {c.ai_reply}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {conversations.length < total && (
              <div className="border-t border-border px-6 py-4 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className={outlineBtn}
                >
                  {loadingMore ? 'Loading\u2026' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------
function InstallSection({ profile }: { profile: TenantProfile }) {
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

  function copySnippet() {
    navigator.clipboard.writeText(snippet).then(
      () => notify.success('Embed code copied.'),
      () => notify.error('Could not copy. Select and copy manually.'),
    )
  }

  return (
    <div className="grid gap-8">
      <SectionHeading
        eyebrow="Install"
        title="One line. Any website."
        sub="Paste this snippet just before the closing </body> tag on every page. The chat launcher appears automatically."
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-3">
          <span className="font-mono text-xs text-muted-foreground">Embed snippet</span>
          <button
            type="button"
            onClick={copySnippet}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </button>
        </div>
        <pre className="overflow-x-auto bg-card px-5 py-5 font-mono text-xs leading-relaxed text-foreground">
          {snippet}
        </pre>
      </div>

      {!profile.active && (
        <p className="rounded-xl border border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          You can add this now, but the assistant only responds once your subscription is
          activated.
        </p>
      )}

      <div className="rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground">Your public key</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This identifies your workspace. It is safe to include in your website HTML.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-secondary px-4 py-3 font-mono text-sm text-foreground">
            {profile.publicKey}
          </code>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText(profile.publicKey)
                .then(() => notify.success('Key copied.'))
            }
            className="flex-shrink-0 rounded-full border border-border p-3 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Copy public key"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground">Restrict to your domains</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          By default the widget works anywhere. For tighter control, add your domains in the{' '}
          <span className="font-semibold text-foreground">Assistant</span> section under
          &ldquo;Allowed domains&rdquo; — the assistant will then refuse to answer from any other
          site.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
function BillingSection({ profile }: { profile: TenantProfile }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Plan', value: 'Derma AI for Business — all features included' },
    { label: 'Price', value: '\u20a635,000 / year' },
    {
      label: 'Status',
      value:
        profile.status === 'active'
          ? 'Active'
          : profile.onTrial
            ? `Free trial — ${profile.trialDaysLeft} day${profile.trialDaysLeft === 1 ? '' : 's'} left`
            : profile.status === 'suspended'
              ? 'Suspended'
              : profile.status === 'trial'
                ? 'Trial ended'
                : 'Pending activation',
    },
    {
      label: profile.onTrial ? 'Trial ends' : profile.active ? 'Renews / expires' : 'Activates',
      value: profile.onTrial && profile.trialEndsAt
        ? new Date(profile.trialEndsAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : profile.subscriptionExpiresAt
          ? new Date(profile.subscriptionExpiresAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : profile.active
            ? 'No expiry set'
            : 'After payment confirmation',
    },
    {
      label: 'Member since',
      value: new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    { label: 'Billing contact', value: profile.contactEmail },
  ]

  return (
    <div className="grid gap-8">
      <SectionHeading
        eyebrow="Billing"
        title="One flat price. Nothing metered."
        sub="Your subscription covers unlimited conversations on our AI credits — no usage fees, ever."
      />

      <div className="rounded-xl border border-border">
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="text-sm font-semibold text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {profile.onTrial && (
        <div className="rounded-xl border border-primary p-6">
          <h2 className="font-serif text-xl text-foreground">
            Your free trial is live — {profile.trialDaysLeft} day
            {profile.trialDaysLeft === 1 ? '' : 's'} remaining
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Your assistant is fully switched on during the trial. To keep it running after the
            trial ends, pay &#8358;35,000 for the year and send proof of payment with your company
            name to{' '}
            <a
              href="mailto:business@dermaspaceng.com"
              className="font-semibold text-primary hover:underline"
            >
              business@dermaspaceng.com
            </a>
            . Everything you set up stays exactly as you left it.
          </p>
        </div>
      )}

      {!profile.active && (
        <div className="rounded-xl border border-primary p-6">
          <h2 className="font-serif text-xl text-foreground">
            {profile.status === 'trial' ? 'Your trial has ended' : 'Activate your assistant'}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            To {profile.status === 'trial' ? 'switch your assistant back on' : 'go live'}, pay
            &#8358;35,000 for the year and send proof of payment with your company name to{' '}
            <a
              href="mailto:business@dermaspaceng.com"
              className="font-semibold text-primary hover:underline"
            >
              business@dermaspaceng.com
            </a>
            . Your assistant is switched on as soon as payment is confirmed — everything you set up
            here stays exactly as you left it.
          </p>
        </div>
      )}
    </div>
  )
}
