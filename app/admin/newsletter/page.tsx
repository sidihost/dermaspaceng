'use client'

/**
 * Admin → Newsletter console.
 *
 * Two-tab single-page app for managing the marketing list and
 * sending broadcasts. Every interaction goes through the dedicated
 * APIs under /api/admin/newsletter/* — no client-side state mutates
 * Postgres directly. Visual language mirrors the rest of the admin
 * surface: solid brand purple (#7B2D8E), neutral chrome, soft
 * cards with rounded-2xl borders, no gradients, no sparkle/zap
 * decorations.
 *
 *   1. SUBSCRIBERS — searchable list with per-row actions
 *      (toggle status, hard-delete) and headline counts.
 *   2. CAMPAIGNS  — list of past + draft campaigns with a slide-over
 *      composer that mirrors the brand email template (subject,
 *      preheader, eyebrow, headline, body, optional CTA).
 *      Composer offers Save Draft / Send Test / Send to All.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  Loader2,
  Plus,
  Search,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Send,
  Save,
  X,
  ChevronRight,
  Inbox,
  Tag,
  Pencil,
  ExternalLink,
  Copy,
  LayoutTemplate,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/shared/notify'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscriber {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  source: string
  status: 'active' | 'unsubscribed' | 'bounced'
  lastSentAt: string | null
  unsubscribedAt: string | null
  createdAt: string | null
}

interface SubscriberCounts {
  total: number
  active: number
  unsubscribed: number
  bounced: number
}

interface CampaignSummary {
  id: string
  subject: string
  preheader: string | null
  eyebrow: string | null
  headline: string | null
  status: 'draft' | 'sending' | 'sent' | 'failed'
  audience: 'subscribers' | 'customers'
  recipientCount: number
  sentCount: number
  failedCount: number
  lastError: string | null
  createdAt: string | null
  sentAt: string | null
  lastTestEmail: string | null
  lastTestAt: string | null
}

interface CampaignDetail extends CampaignSummary {
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || 'Request failed')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = 'subscribers' | 'campaigns'

export default function AdminNewsletterPage() {
  const notify = useNotify()
  const [tab, setTab] = useState<Tab>('subscribers')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 md:px-5 py-4 md:py-6">
        {/* Header */}
        <header className="mb-4 md:mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 leading-tight">
              Newsletter
            </h1>
            <p className="text-[12.5px] md:text-[13.5px] text-gray-500 leading-snug mt-0.5">
              Manage subscribers and send brand-styled email campaigns.
            </p>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-1 inline-flex gap-1 mb-4">
          <button
            type="button"
            onClick={() => setTab('subscribers')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-colors',
              tab === 'subscribers'
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Subscribers
          </button>
          <button
            type="button"
            onClick={() => setTab('campaigns')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-colors',
              tab === 'campaigns'
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            Campaigns
          </button>
        </div>

        {tab === 'subscribers' ? (
          <SubscribersTab notify={notify} />
        ) : (
          <CampaignsTab notify={notify} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subscribers tab
// ---------------------------------------------------------------------------

function SubscribersTab({ notify }: { notify: ReturnType<typeof useNotify> }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'unsubscribed' | 'bounced'>('all')
  const [debouncedQ, setDebouncedQ] = useState('')

  // 250ms debounce on search so we don't hammer the API on every
  // keystroke. Status changes are propagated immediately.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const key = `/api/admin/newsletter/subscribers?status=${status}&q=${encodeURIComponent(debouncedQ)}`
  const { data, error, isLoading, mutate } = useSWR<{
    subscribers: Subscriber[]
    counts: SubscriberCounts
  }>(key, fetcher, { revalidateOnFocus: false })

  const counts = data?.counts
  const subscribers = data?.subscribers ?? []

  const updateStatus = useCallback(
    async (id: number, next: Subscriber['status']) => {
      try {
        const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'Update failed')
        }
        notify.success('Subscriber updated')
        mutate()
      } catch (err) {
        notify.error(err instanceof Error ? err.message : 'Update failed')
      }
    },
    [notify, mutate],
  )

  const deleteSubscriber = useCallback(
    async (id: number, email: string) => {
      if (!window.confirm(`Permanently remove ${email} from the list?`)) return
      try {
        const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'Delete failed')
        }
        notify.success('Subscriber removed')
        mutate()
      } catch (err) {
        notify.error(err instanceof Error ? err.message : 'Delete failed')
      }
    },
    [notify, mutate],
  )

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <StatTile
          icon={<Users className="w-4 h-4 text-[#7B2D8E]" />}
          label="Total"
          value={counts?.total ?? 0}
        />
        <StatTile
          icon={<CheckCircle2 className="w-4 h-4 text-[#7B2D8E]" />}
          label="Active"
          value={counts?.active ?? 0}
          accent
        />
        <StatTile
          icon={<XCircle className="w-4 h-4 text-gray-500" />}
          label="Unsubscribed"
          value={counts?.unsubscribed ?? 0}
        />
        <StatTile
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          label="Bounced"
          value={counts?.bounced ?? 0}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2.5 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search email or name…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {(['all', 'active', 'unsubscribed', 'bounced'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-2 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-colors capitalize',
                status === s
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="p-10 flex items-center justify-center text-gray-500 text-[13px]">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading subscribers…
          </div>
        )}
        {error && !isLoading && (
          <div className="p-10 text-center text-[13px] text-red-600">
            Failed to load subscribers. {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && subscribers.length === 0 && (
          <div className="p-10 text-center text-[13px] text-gray-500">
            <Inbox className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            No subscribers match your filters yet.
          </div>
        )}
        {!isLoading && !error && subscribers.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {subscribers.map(sub => (
              <li
                key={sub.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13.5px] font-medium text-gray-900 truncate">
                      {sub.email}
                    </p>
                    <StatusPill status={sub.status} />
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-gray-500 uppercase tracking-wider">
                      <Tag className="w-3 h-3" />
                      {sub.source}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">
                    {[sub.firstName, sub.lastName].filter(Boolean).join(' ') || '—'}
                    <span className="mx-1.5">·</span>
                    Joined {formatShortDate(sub.createdAt)}
                    {sub.lastSentAt && (
                      <>
                        <span className="mx-1.5">·</span>
                        Last sent {formatShortDate(sub.lastSentAt)}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {sub.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => updateStatus(sub.id, 'unsubscribed')}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Unsubscribe
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateStatus(sub.id, 'active')}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/10"
                    >
                      Re-activate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteSubscriber(sub.id, sub.email)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${sub.email}`}
                  >
                    <Trash2 className="w-4 h-4" />
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
// Campaigns tab
// ---------------------------------------------------------------------------

function CampaignsTab({ notify }: { notify: ReturnType<typeof useNotify> }) {
  const { data, error, isLoading, mutate } = useSWR<{ campaigns: CampaignSummary[] }>(
    '/api/admin/newsletter/campaigns',
    fetcher,
    { revalidateOnFocus: false },
  )

  const [composerOpen, setComposerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const campaigns = data?.campaigns ?? []

  const openNew = useCallback(() => {
    setEditingId(null)
    setComposerOpen(true)
  }, [])

  const openEdit = useCallback((id: string) => {
    setEditingId(id)
    setComposerOpen(true)
  }, [])

  const handleClosed = useCallback(
    (didChange: boolean) => {
      setComposerOpen(false)
      setEditingId(null)
      if (didChange) mutate()
    },
    [mutate],
  )

  const deleteCampaign = useCallback(
    async (id: string, subject: string) => {
      if (!window.confirm(`Delete the draft "${subject}"?`)) return
      try {
        const res = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'Delete failed')
        }
        notify.success('Campaign deleted')
        mutate()
      } catch (err) {
        notify.error(err instanceof Error ? err.message : 'Delete failed')
      }
    },
    [notify, mutate],
  )

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-gray-500">
          {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
        </p>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7B2D8E] text-white text-[13px] font-medium hover:bg-[#6B2278]"
        >
          <Plus className="w-4 h-4" />
          New campaign
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="p-10 flex items-center justify-center text-gray-500 text-[13px]">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading campaigns…
          </div>
        )}
        {error && !isLoading && (
          <div className="p-10 text-center text-[13px] text-red-600">
            Failed to load campaigns. {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && campaigns.length === 0 && (
          <div className="p-10 text-center text-[13px] text-gray-500">
            <Mail className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            No campaigns yet. Click <strong>New campaign</strong> to compose your first
            broadcast.
          </div>
        )}
        {!isLoading && !error && campaigns.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {campaigns.map(c => (
              <li key={c.id} className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(c.id)}
                  className="text-left min-w-0 flex-1 group"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13.5px] font-semibold text-gray-900 truncate group-hover:text-[#7B2D8E]">
                      {c.subject}
                    </p>
                    <CampaignStatusPill status={c.status} />
                  </div>
                  {c.headline && (
                    <p className="text-[12px] text-gray-600 mt-0.5 truncate">{c.headline}</p>
                  )}
                  <p className="text-[11.5px] text-gray-500 mt-0.5">
                    {c.status === 'sent' || c.status === 'failed' ? (
                      <>
                        Sent {formatShortDate(c.sentAt)}
                        <span className="mx-1.5">·</span>
                        {c.sentCount}/{c.recipientCount} delivered
                        {c.failedCount > 0 && (
                          <span className="ml-1.5 text-amber-600 font-medium">
                            · {c.failedCount} failed
                          </span>
                        )}
                      </>
                    ) : c.status === 'sending' ? (
                      <>Sending… {c.sentCount}/{c.recipientCount}</>
                    ) : (
                      <>
                        Draft · created {formatShortDate(c.createdAt)}
                        {c.lastTestAt && (
                          <>
                            <span className="mx-1.5">·</span>
                            Test sent {formatShortDate(c.lastTestAt)}
                          </>
                        )}
                      </>
                    )}
                  </p>
                </button>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => openEdit(c.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10"
                    aria-label={c.status === 'draft' ? 'Edit campaign' : 'View campaign'}
                  >
                    {c.status === 'draft' ? (
                      <Pencil className="w-4 h-4" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                  </button>
                  {c.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => deleteCampaign(c.id, c.subject)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label="Delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {composerOpen && (
        <CampaignComposer
          campaignId={editingId}
          onClose={handleClosed}
          notify={notify}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign composer (slide-over)
// ---------------------------------------------------------------------------

interface ComposerProps {
  campaignId: string | null
  onClose: (didChange: boolean) => void
  notify: ReturnType<typeof useNotify>
}

const EMPTY_FORM = {
  subject: '',
  preheader: '',
  eyebrow: '',
  headline: '',
  bodyHtml: '',
  ctaLabel: '',
  ctaUrl: '',
  audience: 'subscribers' as 'subscribers' | 'customers',
}

// ---------------------------------------------------------------------------
// Premade monthly templates
//
// Each template is a one-tap starting point that fills the whole composer
// (subject → CTA) with polished, on-brand copy plus a branded illustration
// embedded at the top of the body. The illustration is referenced by an
// ABSOLUTE URL on the production origin so email clients — which fetch
// images over the public internet, not from the preview — can load it.
//
// The body illustration markup is intentionally email-safe: table-free,
// inline styles only, width capped, block display. It renders verbatim
// inside the shared Dermaspace email shell (see sendNewsletterCampaign).
// ---------------------------------------------------------------------------

const SITE_ORIGIN = 'https://www.dermaspaceng.com'

/** Build the email-safe hero <img> that leads a template body. */
function heroImg(file: string, alt: string): string {
  return `<img src="${SITE_ORIGIN}/newsletter/${file}" alt="${alt}" width="536" style="width:100%;max-width:536px;height:auto;border-radius:14px;display:block;margin:0 0 22px;" />`
}

type NewsletterTemplate = {
  id: string
  /** Card label in the picker. */
  name: string
  /** One-line description under the label. */
  blurb: string
  /** Local illustration path — used for the picker thumbnail only. */
  thumb: string
  /** The composer fields this template fills. */
  fill: {
    subject: string
    preheader: string
    eyebrow: string
    headline: string
    bodyHtml: string
    ctaLabel: string
    ctaUrl: string
  }
}

const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'monthly',
    name: 'Monthly update',
    blurb: 'A warm “what’s new this month” broadcast.',
    thumb: '/newsletter/monthly-update.png',
    fill: {
      subject: 'Your Dermaspace update is here',
      preheader: 'A little glow-up news from the team this month.',
      eyebrow: 'Monthly update',
      headline: 'This month at Dermaspace',
      bodyHtml:
        `${heroImg('monthly-update.png', 'Dermaspace monthly update')}` +
        `<p>Hi there,</p>` +
        `<p>We’ve been busy creating calmer, more radiant moments for you. Here’s a quick look at what’s new this month at Dermaspace.</p>` +
        `<ul>` +
        `<li><strong>Fresh treatments</strong> — new additions to our esthetic and wellness menu.</li>` +
        `<li><strong>Extended hours</strong> — more evening slots so self-care fits your week.</li>` +
        `<li><strong>Member perks</strong> — little thank-yous for our returning clients.</li>` +
        `</ul>` +
        `<p>We’d love to see you again soon.</p>`,
      ctaLabel: 'Book your next visit',
      ctaUrl: `${SITE_ORIGIN}/booking`,
    },
  },
  {
    id: 'promo',
    name: 'Special offer',
    blurb: 'A members-only discount or seasonal treat.',
    thumb: '/newsletter/special-offer.png',
    fill: {
      subject: 'A members-only offer, just for you',
      preheader: 'An exclusive treat to make your next visit even sweeter.',
      eyebrow: 'Member offer',
      headline: 'An exclusive offer, just for you',
      bodyHtml:
        `${heroImg('special-offer.png', 'Dermaspace special offer')}` +
        `<p>Hi there,</p>` +
        `<p>As a thank-you for being part of the Dermaspace family, we’ve set aside a little something special for your next visit.</p>` +
        `<p><strong>Enjoy a members-only treat</strong> when you book before the month is out. Simply mention this email at checkout — our team will take care of the rest.</p>` +
        `<p>Treat yourself. You’ve earned it.</p>`,
      ctaLabel: 'Claim your offer',
      ctaUrl: `${SITE_ORIGIN}/booking`,
    },
  },
  {
    id: 'new-service',
    name: 'New service',
    blurb: 'Announce a new treatment or service.',
    thumb: '/newsletter/new-service.png',
    fill: {
      subject: 'Introducing our newest treatment',
      preheader: 'Something new has just arrived at Dermaspace.',
      eyebrow: 'New service',
      headline: 'Something new has arrived',
      bodyHtml:
        `${heroImg('new-service.png', 'A new Dermaspace treatment')}` +
        `<p>Hi there,</p>` +
        `<p>We’re thrilled to introduce the newest addition to our esthetic and wellness menu — thoughtfully designed to help you look and feel your very best.</p>` +
        `<p>Our specialists will walk you through everything on the day, so all you have to do is relax and enjoy the experience.</p>` +
        `<p>Curious? We’d be delighted to welcome you in.</p>`,
      ctaLabel: 'Explore the treatment',
      ctaUrl: `${SITE_ORIGIN}/services`,
    },
  },
  {
    id: 'seasonal',
    name: 'Seasonal greeting',
    blurb: 'A festive, warm holiday card.',
    thumb: '/newsletter/seasonal-greeting.png',
    fill: {
      subject: 'Season’s greetings from Dermaspace',
      preheader: 'Wishing you a calm, radiant season ahead.',
      eyebrow: 'Seasonal greeting',
      headline: 'Wishing you a radiant season',
      bodyHtml:
        `${heroImg('seasonal-greeting.png', 'Seasonal greetings from Dermaspace')}` +
        `<p>Hi there,</p>` +
        `<p>From all of us at Dermaspace, thank you for letting us be part of your self-care journey this year. It has been a joy to care for you.</p>` +
        `<p>As the season slows down, we hope you find a moment to rest, glow, and treat yourself kindly — you deserve it.</p>` +
        `<p>Warm wishes for a beautiful season ahead.</p>`,
      ctaLabel: 'Book a festive treatment',
      ctaUrl: `${SITE_ORIGIN}/booking`,
    },
  },
  {
    id: 'reengage',
    name: 'We miss you',
    blurb: 'Win back clients you haven’t seen in a while.',
    thumb: '/newsletter/we-miss-you.png',
    fill: {
      subject: 'We’ve missed you at Dermaspace',
      preheader: 'It’s been a while — your next glow-up is waiting.',
      eyebrow: 'We miss you',
      headline: 'It’s been a while',
      bodyHtml:
        `${heroImg('we-miss-you.png', 'We miss you at Dermaspace')}` +
        `<p>Hi there,</p>` +
        `<p>It’s been a little while since your last visit, and we wanted you to know — the door is always open, and your favourite treatments are ready whenever you are.</p>` +
        `<p>Whether it’s time for a refresh or a full reset, our team would love to welcome you back and help you feel your best again.</p>` +
        `<p>We can’t wait to see you.</p>`,
      ctaLabel: 'Rebook your ritual',
      ctaUrl: `${SITE_ORIGIN}/booking`,
    },
  },
]

function CampaignComposer({ campaignId, onClose, notify }: ComposerProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState<boolean>(Boolean(campaignId))
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  // Which premade template the admin last applied — drives the "applied"
  // check-mark on the picker card so the choice reads back clearly.
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null)

  // Live audience sizes so the admin sees exactly how many people a
  // send reaches before committing. Cached briefly — the numbers
  // don't need to be real-time to the second.
  const { data: audienceCounts } = useSWR<{
    subscribers: number
    customers: number
  }>('/api/admin/newsletter/audience-counts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  const isReadOnly = campaign && campaign.status !== 'draft'

  const selectedAudienceCount =
    form.audience === 'customers'
      ? audienceCounts?.customers
      : audienceCounts?.subscribers

  // Hydrate the editing target when we have an id; brand-new
  // campaigns start with the empty form.
  useEffect(() => {
    if (!campaignId) {
      setForm(EMPTY_FORM)
      setCampaign(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/newsletter/campaigns/${campaignId}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body?.error || 'Failed to load campaign')
        }
        return r.json()
      })
      .then(({ campaign: c }: { campaign: CampaignDetail }) => {
        if (cancelled) return
        setCampaign(c)
        setForm({
          subject: c.subject || '',
          preheader: c.preheader || '',
          eyebrow: c.eyebrow || '',
          headline: c.headline || '',
          bodyHtml: c.bodyHtml || '',
          ctaLabel: c.ctaLabel || '',
          ctaUrl: c.ctaUrl || '',
          audience: c.audience === 'customers' ? 'customers' : 'subscribers',
        })
      })
      .catch(err => {
        if (cancelled) return
        notify.error(err instanceof Error ? err.message : 'Failed to load campaign')
        onClose(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, notify, onClose])

  const update = useCallback(
    <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
      setForm(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  // Apply a premade template — fills every content field in one tap while
  // preserving the currently-selected audience (subscribers vs customers)
  // so the admin doesn't lose that choice.
  const applyTemplate = useCallback((tpl: NewsletterTemplate) => {
    setForm(prev => ({ ...prev, ...tpl.fill, audience: prev.audience }))
    setAppliedTemplate(tpl.id)
  }, [])

  // Save creates a new draft on the first call (no id yet) and
  // PATCHes thereafter. Returns the resulting id so the caller can
  // chain follow-up actions like "save then send test".
  const save = useCallback(async (): Promise<string | null> => {
    if (!form.subject.trim()) {
      notify.error('Subject is required')
      return null
    }
    if (!form.bodyHtml.trim()) {
      notify.error('Body content is required')
      return null
    }
    setSaving(true)
    try {
      let id = campaign?.id ?? null
      if (!id) {
        const res = await fetch('/api/admin/newsletter/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'Save failed')
        }
        const data = await res.json()
        id = data.campaign.id as string
        // Hydrate the local "campaign" reference so subsequent saves
        // PATCH instead of duplicating drafts.
        setCampaign(prev =>
          prev ?? {
            ...form,
            id: id as string,
            status: 'draft',
            audience: form.audience,
            recipientCount: 0,
            sentCount: 0,
            failedCount: 0,
            lastError: null,
            createdAt: new Date().toISOString(),
            sentAt: null,
            lastTestEmail: null,
            lastTestAt: null,
          },
        )
      } else {
        const res = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'Save failed')
        }
      }
      notify.success('Draft saved')
      return id
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Save failed')
      return null
    } finally {
      setSaving(false)
    }
  }, [form, campaign, notify])

  const sendTest = useCallback(async () => {
    if (!testEmail.trim()) {
      notify.error('Enter a test email address')
      return
    }
    setTesting(true)
    try {
      const id = await save()
      if (!id) return
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Test send failed')
      }
      notify.success(`Test sent to ${testEmail.trim()}`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Test send failed')
    } finally {
      setTesting(false)
    }
  }, [testEmail, save, notify])

  const sendBlast = useCallback(async () => {
    const audienceNoun =
      form.audience === 'customers'
        ? 'every active customer'
        : 'every active subscriber'
    if (
      !window.confirm(
        `Send this campaign to ${audienceNoun}? This cannot be undone.`,
      )
    ) {
      return
    }
    setSending(true)
    try {
      const id = await save()
      if (!id) return
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Send failed')
      }
      const result = await res.json()
      const recipientNoun =
        form.audience === 'customers' ? 'customers' : 'subscribers'
      notify.success(
        `Sent to ${result.sentCount}/${result.recipientCount} ${recipientNoun}` +
          (result.failedCount > 0 ? ` (${result.failedCount} failed)` : ''),
      )
      onClose(true)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }, [save, notify, onClose, form.audience])

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close composer"
        onClick={() => onClose(false)}
        className="absolute inset-0 bg-black/40"
      />
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-5 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 truncate">
              {campaign
                ? isReadOnly
                  ? `Campaign · ${campaign.status}`
                  : 'Edit draft'
                : 'New campaign'}
            </h2>
            <p className="text-[11.5px] text-gray-500">
              Sends through the Dermaspace brand template.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-[13px] py-20">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading campaign…
          </div>
        ) : (
          <div className="flex-1 px-4 sm:px-5 py-4 space-y-4">
            {isReadOnly && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  This campaign has already been{' '}
                  <strong>{campaign?.status}</strong> and is locked. You can
                  still review the content and copy it into a new draft.
                </p>
              </div>
            )}

            {!isReadOnly && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutTemplate className="w-4 h-4 text-[#7B2D8E]" />
                  <h3 className="text-[13.5px] font-semibold text-gray-900">
                    Start from a template
                  </h3>
                </div>
                <p className="text-[11.5px] text-gray-500 mb-3">
                  Pick a monthly message and we&apos;ll fill in polished copy and a
                  branded illustration. Edit anything before you send.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {NEWSLETTER_TEMPLATES.map(tpl => {
                    const active = appliedTemplate === tpl.id
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={cn(
                          'group relative text-left rounded-xl border overflow-hidden transition-colors',
                          active
                            ? 'border-[#7B2D8E] ring-1 ring-[#7B2D8E]'
                            : 'border-gray-200 hover:border-[#7B2D8E]/50',
                        )}
                      >
                        <div className="relative aspect-[12/5] bg-gray-50 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={tpl.thumb || '/placeholder.svg'}
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-cover"
                          />
                          {active && (
                            <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#7B2D8E] text-white">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="px-2.5 py-2">
                          <p className="text-[12px] font-semibold text-gray-900 leading-tight">
                            {tpl.name}
                          </p>
                          <p className="text-[10.5px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
                            {tpl.blurb}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <FormField label="Subject" required hint="Inbox subject line · max 200 chars">
              <input
                type="text"
                maxLength={200}
                value={form.subject}
                disabled={isReadOnly || undefined}
                onChange={e => update('subject', e.target.value)}
                placeholder="A new chapter at Dermaspace"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </FormField>

            <FormField
              label="Preheader"
              hint="Hidden inbox preview line · shown next to the subject in Gmail / Apple Mail"
            >
              <input
                type="text"
                maxLength={200}
                value={form.preheader}
                disabled={isReadOnly || undefined}
                onChange={e => update('preheader', e.target.value)}
                placeholder="Members-only spring offers, just for you."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Eyebrow chip" hint="Uppercase pill above the body · optional">
                <input
                  type="text"
                  maxLength={60}
                  value={form.eyebrow}
                  disabled={isReadOnly || undefined}
                  onChange={e => update('eyebrow', e.target.value)}
                  placeholder="Member offer"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </FormField>
              <FormField label="Headline" hint="<h2> at the top of the body · optional">
                <input
                  type="text"
                  maxLength={200}
                  value={form.headline}
                  disabled={isReadOnly || undefined}
                  onChange={e => update('headline', e.target.value)}
                  placeholder="Welcome to a calmer skincare ritual"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </FormField>
            </div>

            <FormField
              label="Body"
              required
              hint="HTML allowed · <p>, <ul>, <li>, <strong>, <em>, <a href> are recommended"
            >
              <textarea
                rows={10}
                value={form.bodyHtml}
                disabled={isReadOnly || undefined}
                onChange={e => update('bodyHtml', e.target.value)}
                placeholder={`<p>Hi friends,</p>\n<p>This month we're …</p>`}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="CTA button label" hint="Optional · leave both empty to skip">
                <input
                  type="text"
                  maxLength={60}
                  value={form.ctaLabel}
                  disabled={isReadOnly || undefined}
                  onChange={e => update('ctaLabel', e.target.value)}
                  placeholder="Book your treatment"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </FormField>
              <FormField label="CTA button URL">
                <input
                  type="url"
                  value={form.ctaUrl}
                  disabled={isReadOnly || undefined}
                  onChange={e => update('ctaUrl', e.target.value)}
                  placeholder="https://www.dermaspaceng.com/booking"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </FormField>
            </div>

            {/* Live preview */}
            <FormField label="Preview" hint="Approximate rendering inside the brand template">
              <CampaignPreview
                eyebrow={form.eyebrow}
                headline={form.headline}
                bodyHtml={form.bodyHtml}
                ctaLabel={form.ctaLabel}
                ctaUrl={form.ctaUrl}
              />
            </FormField>

            {/* Sending stats for already-sent campaigns */}
            {isReadOnly && campaign && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12.5px] text-gray-700 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-gray-500">
                    Recipients
                  </p>
                  <p className="font-semibold tabular-nums">{campaign.recipientCount}</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-gray-500">Sent</p>
                  <p className="font-semibold tabular-nums">{campaign.sentCount}</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-gray-500">Failed</p>
                  <p className="font-semibold tabular-nums">{campaign.failedCount}</p>
                </div>
                {campaign.lastError && (
                  <p className="col-span-3 text-[11.5px] text-amber-700">
                    Last error: {campaign.lastError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        {!loading && !isReadOnly && (
          <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-5 py-3 flex flex-col sm:flex-row gap-2">
            <div className="flex flex-1 gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Test email address"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent"
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || saving || sending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Send test
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || sending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
              <button
                type="button"
                onClick={sendBlast}
                disabled={saving || sending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7B2D8E] text-white text-[12.5px] font-semibold hover:bg-[#6B2278] disabled:opacity-60"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to all
              </button>
            </div>
          </footer>
        )}
        {!loading && isReadOnly && (
          <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-5 py-3 flex justify-end">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-[12.5px] font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline preview (mini brand-template approximation)
// ---------------------------------------------------------------------------

function CampaignPreview({
  eyebrow,
  headline,
  bodyHtml,
  ctaLabel,
  ctaUrl,
}: {
  eyebrow: string
  headline: string
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
}) {
  // In the composer preview (and on the deployed site) the branded
  // illustrations live at /newsletter/*. In the actual email they must be
  // absolute, so templates embed the production origin. Rewrite that origin
  // to a same-origin path here so the illustration renders in-preview no
  // matter which environment the composer is running in.
  const previewHtml = bodyHtml.replace(
    /https:\/\/www\.dermaspaceng\.com\/newsletter\//g,
    '/newsletter/',
  )
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      {/* Brand strip */}
      <div className="h-1 bg-[#7B2D8E]" />
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center text-white font-bold text-[11px]">
          D
        </div>
        <p className="text-[13px] font-semibold text-[#7B2D8E]">Dermaspace</p>
        <p className="ml-auto text-[10px] uppercase tracking-widest text-gray-500">
          Esthetic &amp; Wellness
        </p>
      </div>
      <div className="px-4 py-4">
        {eyebrow && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] mb-3">
            {eyebrow}
          </span>
        )}
        {headline && (
          <h3 className="text-[18px] font-semibold text-gray-900 leading-tight mb-2.5">
            {headline}
          </h3>
        )}
        <div
          className="text-[13.5px] text-gray-700 leading-relaxed prose prose-sm max-w-none"
          // Admin-authored HTML — sanitised on save in the API.
          // We render directly here for the preview to mirror what
          // the recipient will see.
          dangerouslySetInnerHTML={{
            __html:
              previewHtml ||
              '<p style="color:#9ca3af">Body content will appear here.</p>',
          }}
        />
        {ctaLabel && ctaUrl && (
          <div className="mt-4">
            <span className="inline-block px-4 py-2 bg-[#7B2D8E] text-white text-[13px] font-semibold rounded-lg">
              {ctaLabel}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[10.5px] text-gray-500 leading-relaxed">
        <p>
          Victoria Island · 237b Muri Okunola St, Lagos
          <br />
          Ikoyi · 9 Agbeke Rotinwa Cl, Dolphin Ext. Estate, Lagos
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

function StatTile({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        accent ? 'bg-[#7B2D8E]/5 border-[#7B2D8E]/20' : 'bg-white border-gray-200',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-[10.5px] uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight">
        {value.toLocaleString('en-NG')}
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: Subscriber['status'] }) {
  const styles =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'unsubscribed'
        ? 'bg-gray-100 text-gray-600 border-gray-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium border capitalize',
        styles,
      )}
    >
      {status}
    </span>
  )
}

function CampaignStatusPill({ status }: { status: CampaignSummary['status'] }) {
  const map = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    sending: 'bg-amber-50 text-amber-700 border-amber-200',
    sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium border capitalize',
        map[status],
      )}
    >
      {status}
    </span>
  )
}

function FormField({
  label,
  hint,
  required = false,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block">
        <span className="text-[12px] font-medium text-gray-800 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
        {hint && <span className="block text-[11px] text-gray-500 mt-0.5">{hint}</span>}
        <div className="mt-1.5">{children}</div>
      </label>
    </div>
  )
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}
