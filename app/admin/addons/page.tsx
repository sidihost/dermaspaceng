'use client'

/**
 * /admin/addons — Plugins & Add-ons Manager
 *
 * Unified admin surface where administrators can:
 *   1. Browse and install curated Dermaspace plugins (WhatsApp Quick
 *      Concierge, Google Analytics 4, GTM, Meta Pixel, TikTok Pixel,
 *      Microsoft Clarity, Tawk.to, Top Promo Strip, Slot Waitlist,
 *      Webhook Automations) with one click.
 *   2. Enable, pause, configure, and uninstall installed plugins.
 *   3. Install custom plugins via a manual form or by uploading/pasting
 *      a validated JSON manifest.
 *   4. Access every built-in core booking/operations module.
 *
 * Design system compliance:
 *   - Brand purple #7B2D8E, white surfaces, hairline gray-200 borders
 *   - Strictly flat: NO shadows, NO gradients
 *   - Strictly NO Sparkles or Zap icons
 */

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CalendarCheck2,
  CalendarClock,
  Check,
  Clock,
  Code2,
  CreditCard,
  Download,
  FileJson,
  Gift,
  Globe,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Plug,
  Plus,
  Power,
  Repeat,
  Search,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Star,
  Tag,
  Ticket,
  Trash2,
  Upload,
  UserCog,
  Users,
  Wallet,
  Webhook,
  X,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import {
  PLUGIN_CATALOG,
  type InstalledPlugin,
  type PluginCatalogEntry,
  type PluginCategory,
} from '@/lib/plugins'

type SurfaceTab = 'store' | 'installed' | 'modules'

type ModuleCategory =
  | 'booking'
  | 'customer'
  | 'revenue'
  | 'integrations'
  | 'operations'

type ModuleStatus = 'active' | 'inactive' | 'coming-soon'

type AddonModule = {
  key: string
  name: string
  description: string
  icon: typeof Boxes
  category: ModuleCategory
  status: ModuleStatus
  href?: string
  ctaLabel?: string
}

const MODULES: AddonModule[] = [
  // Booking
  {
    key: 'services',
    name: 'Services & Catalog',
    description:
      'Curate categories, treatments, prices, durations and visibility. Publishes to the public site instantly.',
    icon: Boxes,
    category: 'booking',
    status: 'active',
    href: '/admin/services',
  },
  {
    key: 'staff',
    name: 'Staff & Therapists',
    description:
      'Manage therapists, working hours, branches and per-staff service assignments.',
    icon: UserCog,
    category: 'booking',
    status: 'active',
    href: '/admin/staff',
  },
  {
    key: 'availability',
    name: 'Availability & Slots',
    description:
      'Define opening hours, blackout dates, slot intervals and per-branch capacity rules.',
    icon: Clock,
    category: 'booking',
    status: 'active',
    href: '/admin/availability',
  },
  {
    key: 'bookings',
    name: 'Booking Management',
    description:
      'Confirm, complete, cancel or reschedule any appointment across every branch from one queue.',
    icon: CalendarCheck2,
    category: 'booking',
    status: 'active',
    href: '/admin/bookings',
  },
  {
    key: 'recurring',
    name: 'Recurring Appointments',
    description:
      'Let clients book a series of weekly or monthly visits in a single flow with auto-rebill.',
    icon: Repeat,
    category: 'booking',
    status: 'coming-soon',
  },
  {
    key: 'waitlist',
    name: 'Waitlist',
    description:
      'When a slot is fully booked, allow clients to join a waitlist and auto-promote them on cancellation.',
    icon: Layers,
    category: 'booking',
    status: 'coming-soon',
  },

  // Customer
  {
    key: 'clients',
    name: 'Clients (CRM)',
    description:
      'Full client profile — lifetime spend, visit history, skin profile, notes and quick re-book.',
    icon: Users,
    category: 'customer',
    status: 'active',
    href: '/admin/users',
  },
  {
    key: 'loyalty',
    name: 'Loyalty Program',
    description:
      'Tier-based rewards — clients earn points on every appointment and redeem against future visits.',
    icon: BadgeCheck,
    category: 'customer',
    status: 'active',
    href: '/admin/settings',
    ctaLabel: 'Tune in Settings',
  },
  {
    key: 'wallet',
    name: 'Client Wallet',
    description:
      'Top-up balance clients can spend on any appointment. Powers refunds and partial payments.',
    icon: Wallet,
    category: 'customer',
    status: 'active',
    href: '/admin/transactions',
    ctaLabel: 'View ledger',
  },
  {
    key: 'reviews',
    name: 'Ratings & Reviews',
    description:
      'Capture post-appointment ratings and surface them on therapist and service pages.',
    icon: Star,
    category: 'customer',
    status: 'active',
    href: '/admin/feedback',
  },
  {
    key: 'consultations',
    name: 'Skin Consultations',
    description:
      'Free or paid consultation requests with a dedicated triage queue and notes thread.',
    icon: MessageSquare,
    category: 'customer',
    status: 'active',
    href: '/admin/consultations',
  },

  // Revenue
  {
    key: 'vouchers',
    name: 'Gift Vouchers',
    description:
      'Sell single-use vouchers as gifts or pre-paid packs. Redeemable in the booking checkout.',
    icon: Gift,
    category: 'revenue',
    status: 'active',
    href: '/admin/gift-cards',
  },
  {
    key: 'discounts',
    name: 'Discount Codes',
    description:
      'Issue promo codes, percentage or fixed-amount, with per-client and global usage caps.',
    icon: Tag,
    category: 'revenue',
    status: 'active',
    href: '/admin/vouchers',
  },
  {
    key: 'transactions',
    name: 'Transactions',
    description:
      'Search every payment, refund and payout. Reconcile against Paystack settlements in one screen.',
    icon: CreditCard,
    category: 'revenue',
    status: 'active',
    href: '/admin/transactions',
  },
  {
    key: 'tips',
    name: 'Therapist Tips',
    description:
      'Optional tip step at checkout. Tips flow directly into the therapist commission ledger.',
    icon: Ticket,
    category: 'revenue',
    status: 'coming-soon',
  },
  {
    key: 'tax',
    name: 'Tax & VAT',
    description:
      'Add inclusive or exclusive VAT per service. Itemised on every receipt and PDF.',
    icon: BadgeCheck,
    category: 'revenue',
    status: 'coming-soon',
  },

  // Integrations
  {
    key: 'add-to-calendar',
    name: 'Add to Calendar',
    description:
      'Clients can save any confirmed booking to Google, Apple or Outlook calendar in one tap.',
    icon: CalendarClock,
    category: 'integrations',
    status: 'active',
    href: '/admin/bookings',
    ctaLabel: 'Preview on a booking',
  },
  {
    key: 'gcal-2way',
    name: 'Google Calendar 2-way Sync',
    description:
      'Connect each therapist\u2019s Google Calendar so their personal events block availability automatically and every booking auto-creates an event with reminders.',
    icon: CalendarCheck2,
    category: 'integrations',
    status: 'active',
    href: '/admin/integrations/google-calendar',
    ctaLabel: 'Manage sync',
  },
  {
    key: 'broadcast',
    name: 'Push Broadcasts',
    description:
      'Send promotional or service announcements to every client (or a segment) as a push notification.',
    icon: Send,
    category: 'integrations',
    status: 'active',
    href: '/admin/broadcast',
  },
  {
    key: 'banners',
    name: 'Site Banners',
    description:
      'Schedule a sitewide announcement banner (promo, holiday hours, downtime) with start/end dates.',
    icon: Bell,
    category: 'integrations',
    status: 'active',
    href: '/admin/banners',
  },
  {
    key: 'blog',
    name: 'Editorial / Blog',
    description:
      'Long-form content with per-author permissions. Drives organic traffic to service pages.',
    icon: BookOpen,
    category: 'integrations',
    status: 'active',
    href: '/admin/blog',
  },
  {
    key: 'branches',
    name: 'Branches',
    description:
      'Configure each physical branch — address, hours, services offered and Google Maps link.',
    icon: MapPin,
    category: 'integrations',
    status: 'coming-soon',
  },

  // Operations
  {
    key: 'feature-flags',
    name: 'Feature Flags',
    description:
      'Turn site-wide capabilities on or off per environment. Useful for staged rollouts.',
    icon: Power,
    category: 'operations',
    status: 'active',
    href: '/admin/features',
  },
  {
    key: 'schedules',
    name: 'Background Jobs',
    description:
      'Inspect QStash schedules, force a re-sync from the manifest, or run any job on demand.',
    icon: Clock,
    category: 'operations',
    status: 'active',
    href: '/admin/schedules',
  },
  {
    key: 'permissions',
    name: 'Roles & Permissions',
    description:
      'Grant or revoke specific admin powers per staff member without giving full platform access.',
    icon: Shield,
    category: 'operations',
    status: 'active',
    href: '/admin/staff',
    ctaLabel: 'Open staff list',
  },
  {
    key: 'settings',
    name: 'Platform Settings',
    description:
      'Brand details, maintenance mode, default currency and global appointment policies.',
    icon: Settings,
    category: 'operations',
    status: 'active',
    href: '/admin/settings',
  },
]

const MODULE_CATEGORY_META: Record<
  ModuleCategory | 'all',
  { label: string; help: string }
> = {
  all: { label: 'All', help: 'Every core capability the platform ships with.' },
  booking: { label: 'Booking', help: 'Services, staff, availability and the appointment queue.' },
  customer: { label: 'Customer', help: 'CRM, loyalty, wallet, reviews — the relationship layer.' },
  revenue: { label: 'Revenue', help: 'Vouchers, discounts, payments and tax.' },
  integrations: { label: 'Integrations', help: 'Calendar sync, push, banners and editorial.' },
  operations: { label: 'Operations', help: 'Feature flags, jobs, roles and platform settings.' },
}

const PLUGIN_CATEGORY_LABELS: Record<PluginCategory | 'all', string> = {
  all: 'All',
  analytics: 'Analytics',
  marketing: 'Marketing',
  customer: 'Customer',
  booking: 'Booking',
  integrations: 'Integrations',
}

const SAMPLE_MANIFEST_JSON = JSON.stringify(
  {
    slug: 'instagram-concierge',
    name: 'Instagram Direct Button',
    version: '1.0.0',
    author: 'Dermaspace Studio',
    description:
      'Adds a floating button on public pages that directs visitors straight to our Instagram profile.',
    category: 'marketing',
    kind: 'widget',
    widgetLabel: 'Follow on Instagram',
    widgetUrl: 'https://instagram.com/dermaspaceng',
  },
  null,
  2,
)

function getPluginIcon(iconKey: PluginCatalogEntry['iconKey']) {
  switch (iconKey) {
    case 'message-circle':
      return MessageCircle
    case 'bar-chart':
      return BarChart3
    case 'megaphone':
      return Megaphone
    case 'globe':
      return Globe
    case 'activity':
      return Activity
    case 'bell':
      return Bell
    case 'code':
      return Code2
    case 'layers':
      return Layers
    case 'webhook':
      return Webhook
    case 'plug':
    default:
      return Plug
  }
}

type PluginsApiResponse = {
  catalog: PluginCatalogEntry[]
  installed: InstalledPlugin[]
}

const pluginsFetcher = async (url: string): Promise<PluginsApiResponse> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error('Failed to load plugins')
  }
  return res.json() as Promise<PluginsApiResponse>
}

function pluginNeedsConfiguration(
  installed: InstalledPlugin,
  catalogEntry?: PluginCatalogEntry,
): boolean {
  if (installed.isCustom) return false
  if (!catalogEntry) return false
  return catalogEntry.fields.some(
    (f) => f.required && !(installed.config?.[f.key] ?? '').trim(),
  )
}

export default function AdminAddonsPage() {
  const notify = useNotify()

  const [tab, setTab] = useState<SurfaceTab>('store')
  const [pluginCategory, setPluginCategory] = useState<PluginCategory | 'all'>('all')
  const [moduleFilter, setModuleFilter] = useState<ModuleCategory | 'all'>('all')
  const [query, setQuery] = useState('')

  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [configuringPlugin, setConfiguringPlugin] = useState<InstalledPlugin | null>(null)
  const [uninstallingPlugin, setUninstallingPlugin] = useState<InstalledPlugin | null>(null)
  const [customModalOpen, setCustomModalOpen] = useState(false)

  const { data, isLoading, error, mutate } = useSWR<PluginsApiResponse>(
    '/api/admin/plugins',
    pluginsFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )

  const catalog = data?.catalog ?? (PLUGIN_CATALOG as unknown as PluginCatalogEntry[])
  const installed = data?.installed ?? []

  const installedBySlug = useMemo(() => {
    const map = new Map<string, InstalledPlugin>()
    for (const p of installed) map.set(p.slug, p)
    return map
  }, [installed])

  const catalogBySlug = useMemo(() => {
    const map = new Map<string, PluginCatalogEntry>()
    for (const entry of catalog) map.set(entry.slug, entry)
    return map
  }, [catalog])

  const activePluginsCount = useMemo(
    () => installed.filter((p) => p.enabled).length,
    [installed],
  )

  const storeItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const customInstalled = installed.filter((p) => p.isCustom)

    const catalogMatched = catalog.filter((entry) => {
      if (pluginCategory !== 'all' && entry.category !== pluginCategory) return false
      if (!q) return true
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.slug.toLowerCase().includes(q) ||
        entry.author.toLowerCase().includes(q)
      )
    })

    const customMatched = customInstalled.filter((p) => {
      if (pluginCategory !== 'all' && p.category !== pluginCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      )
    })

    return { catalogMatched, customMatched }
  }, [catalog, installed, pluginCategory, query])

  const installedFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return installed.filter((p) => {
      if (pluginCategory !== 'all' && p.category !== pluginCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      )
    })
  }, [installed, pluginCategory, query])

  const visibleModules = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MODULES.filter((m) => {
      if (moduleFilter !== 'all' && m.category !== moduleFilter) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q)
      )
    })
  }, [moduleFilter, query])

  // ── API Actions ──────────────────────────────────────────────────────────

  const handleInstallCatalogPlugin = async (entry: PluginCatalogEntry) => {
    setBusySlug(entry.slug)
    try {
      const res = await fetch('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: entry.slug }),
      })
      const payload = (await res.json()) as {
        plugin?: InstalledPlugin
        installed?: InstalledPlugin[]
        error?: string
      }
      if (!res.ok) {
        notify.error('Could not install plugin', payload.error || 'Please try again.')
        return
      }
      if (payload.installed) {
        await mutate({ catalog, installed: payload.installed }, false)
      } else {
        await mutate()
      }
      notify.success(`${entry.name} installed`, 'Configure settings or toggle it anytime.')

      if (payload.plugin && pluginNeedsConfiguration(payload.plugin, entry)) {
        setConfiguringPlugin(payload.plugin)
      }
    } catch {
      notify.error('Network error', 'Failed to reach the server while installing plugin.')
    } finally {
      setBusySlug(null)
    }
  }

  const handleToggleEnabled = async (plugin: InstalledPlugin) => {
    setBusySlug(plugin.slug)
    const nextEnabled = !plugin.enabled
    try {
      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(plugin.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      const payload = (await res.json()) as {
        installed?: InstalledPlugin[]
        error?: string
      }
      if (!res.ok) {
        notify.error('Update failed', payload.error || 'Could not update plugin status.')
        return
      }
      if (payload.installed) {
        await mutate({ catalog, installed: payload.installed }, false)
      } else {
        await mutate()
      }
      notify.success(
        nextEnabled ? `${plugin.name} enabled` : `${plugin.name} paused`,
        nextEnabled
          ? 'The plugin is now active on public pages.'
          : 'The plugin is paused and will not run until re-enabled.',
      )
    } catch {
      notify.error('Network error', 'Failed to update plugin state.')
    } finally {
      setBusySlug(null)
    }
  }

  const handleConfirmUninstall = async () => {
    if (!uninstallingPlugin) return
    const target = uninstallingPlugin
    setBusySlug(target.slug)
    try {
      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(target.slug)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = (await res.json()) as {
        installed?: InstalledPlugin[]
        error?: string
      }
      if (!res.ok) {
        notify.error('Uninstall failed', payload.error || 'Could not uninstall plugin.')
        return
      }
      if (payload.installed) {
        await mutate({ catalog, installed: payload.installed }, false)
      } else {
        await mutate()
      }
      setUninstallingPlugin(null)
      notify.info(`${target.name} uninstalled`, 'Removed from active site plugins.')
    } catch {
      notify.error('Network error', 'Failed to uninstall plugin.')
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/15 flex items-center justify-center flex-shrink-0">
            <Plug className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Plugins &amp; Add-ons
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xl leading-relaxed">
              Install analytics, chat, marketing, and custom integrations, or manage
              built-in Dermaspace platform modules from one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <Stat label="Installed" value={installed.length} />
            <Divider />
            <Stat label="Active" value={activePluginsCount} accent />
            <Divider />
            <Stat label="Catalogue" value={catalog.length} muted />
          </div>
          <button
            type="button"
            onClick={() => setCustomModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Install Custom Plugin
          </button>
        </div>
      </header>

      {/* ── Top-level Surface Switcher ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <TabButton active={tab === 'store'} onClick={() => setTab('store')}>
            Plugin Store ({catalog.length})
          </TabButton>
          <TabButton active={tab === 'installed'} onClick={() => setTab('installed')}>
            Installed ({installed.length})
          </TabButton>
          <TabButton active={tab === 'modules'} onClick={() => setTab('modules')}>
            Core Modules ({MODULES.length})
          </TabButton>
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'modules' ? 'Search core modules…' : 'Search plugins…'}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── Category Filters ───────────────────────────────────────── */}
      {tab !== 'modules' ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            ['all', 'analytics', 'marketing', 'customer', 'booking', 'integrations'] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setPluginCategory(cat)}
              className={`text-xs font-medium px-3 h-8 rounded-lg border transition-colors ${
                pluginCategory === cat
                  ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#7B2D8E]/40 hover:text-gray-900'
              }`}
            >
              {PLUGIN_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              ['all', 'booking', 'customer', 'revenue', 'integrations', 'operations'] as const
            ).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setModuleFilter(c)}
                className={`text-xs font-medium px-3 h-8 rounded-lg border transition-colors ${
                  moduleFilter === c
                    ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#7B2D8E]/40 hover:text-gray-900'
                }`}
              >
                {MODULE_CATEGORY_META[c].label}
              </button>
            ))}
          </div>
          {moduleFilter !== 'all' && (
            <p className="text-xs text-gray-500">{MODULE_CATEGORY_META[moduleFilter].help}</p>
          )}
        </div>
      )}

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && tab !== 'modules' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Unable to sync installed plugins right now. Refresh or try again shortly.</span>
        </div>
      )}

      {/* ── Tab 1: Plugin Store ────────────────────────────────────── */}
      {tab === 'store' && (
        isLoading && !data ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 flex items-center justify-center gap-2.5 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E]" />
            Loading plugin catalogue…
          </div>
        ) : storeItems.catalogMatched.length === 0 && storeItems.customMatched.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">No plugins match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Custom installed plugins appear first so admins always see them */}
            {storeItems.customMatched.map((plugin) => (
              <PluginCard
                key={plugin.slug}
                slug={plugin.slug}
                name={plugin.name}
                version={plugin.version}
                author={plugin.author}
                description={plugin.description}
                category={plugin.category}
                iconKey={plugin.iconKey}
                installed={plugin}
                needsConfig={false}
                busy={busySlug === plugin.slug}
                onToggle={() => handleToggleEnabled(plugin)}
                onConfigure={() => setConfiguringPlugin(plugin)}
                onUninstall={() => setUninstallingPlugin(plugin)}
              />
            ))}

            {/* Built-in curated catalogue */}
            {storeItems.catalogMatched.map((entry) => {
              const installedRec = installedBySlug.get(entry.slug)
              return (
                <PluginCard
                  key={entry.slug}
                  slug={entry.slug}
                  name={entry.name}
                  version={entry.version}
                  author={entry.author}
                  description={entry.description}
                  category={entry.category}
                  iconKey={entry.iconKey}
                  installed={installedRec}
                  needsConfig={
                    installedRec ? pluginNeedsConfiguration(installedRec, entry) : false
                  }
                  busy={busySlug === entry.slug}
                  onInstall={() => handleInstallCatalogPlugin(entry)}
                  onToggle={installedRec ? () => handleToggleEnabled(installedRec) : undefined}
                  onConfigure={installedRec ? () => setConfiguringPlugin(installedRec) : undefined}
                  onUninstall={installedRec ? () => setUninstallingPlugin(installedRec) : undefined}
                />
              )
            })}

            {/* Custom Plugin CTA Card */}
            {pluginCategory === 'all' && !query.trim() && (
              <div className="rounded-2xl border-2 border-dashed border-[#7B2D8E]/30 bg-[#7B2D8E]/[0.03] p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-[#7B2D8E]/20 text-[#7B2D8E]">
                    <Upload className="w-[18px] h-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                      Install a Custom Plugin
                    </h3>
                    <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5">
                      Add a verified HTTPS script integration, floating widget button, or
                      import a JSON plugin manifest.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#7B2D8E]/10 mt-auto">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#7B2D8E]">
                    Custom / JSON
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors"
                  >
                    Add plugin
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Tab 2: Installed Plugins ───────────────────────────────── */}
      {tab === 'installed' && (
        installedFiltered.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {installed.length === 0 ? 'No plugins installed yet' : 'No installed plugins match your search'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {installed.length === 0
                  ? 'Browse the Plugin Store or install a custom JSON manifest to extend Dermaspace.'
                  : 'Try clearing your search or switching category.'}
              </p>
            </div>
            {installed.length === 0 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTab('store')}
                  className="h-9 px-3.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors"
                >
                  Browse Plugin Store
                </button>
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(true)}
                  className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:border-[#7B2D8E]/40 transition-colors"
                >
                  Install Custom Plugin
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedFiltered.map((plugin) => (
              <PluginCard
                key={plugin.slug}
                slug={plugin.slug}
                name={plugin.name}
                version={plugin.version}
                author={plugin.author}
                description={plugin.description}
                category={plugin.category}
                iconKey={plugin.iconKey}
                installed={plugin}
                needsConfig={pluginNeedsConfiguration(plugin, catalogBySlug.get(plugin.slug))}
                busy={busySlug === plugin.slug}
                onToggle={() => handleToggleEnabled(plugin)}
                onConfigure={() => setConfiguringPlugin(plugin)}
                onUninstall={() => setUninstallingPlugin(plugin)}
              />
            ))}
          </div>
        )
      )}

      {/* ── Tab 3: Core Platform Modules ───────────────────────────── */}
      {tab === 'modules' && (
        visibleModules.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">No core modules match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleModules.map((m) => (
              <ModuleCard key={m.key} module={m} />
            ))}
            {moduleFilter === 'all' && !query.trim() && <BuildYourOwnCard />}
          </div>
        )
      )}

      {/* ── Configure Plugin Modal ─────────────────────────────────── */}
      {configuringPlugin && (
        <ConfigurePluginModal
          plugin={configuringPlugin}
          catalogEntry={catalogBySlug.get(configuringPlugin.slug)}
          onClose={() => setConfiguringPlugin(null)}
          onSaved={async (updatedList) => {
            await mutate({ catalog, installed: updatedList }, false)
            setConfiguringPlugin(null)
            notify.success('Plugin settings saved', `${configuringPlugin.name} updated.`)
          }}
        />
      )}

      {/* ── Install Custom Plugin Modal ────────────────────────────── */}
      {customModalOpen && (
        <InstallCustomPluginModal
          onClose={() => setCustomModalOpen(false)}
          onInstalled={async (plugin, updatedList) => {
            await mutate({ catalog, installed: updatedList }, false)
            setCustomModalOpen(false)
            notify.success(`${plugin.name} installed`, 'Your custom plugin is now active.')
          }}
        />
      )}

      {/* ── Uninstall Confirmation Modal ───────────────────────────── */}
      {uninstallingPlugin && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="uninstall-plugin-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 id="uninstall-plugin-title" className="text-sm font-semibold text-gray-900">
                    Uninstall {uninstallingPlugin.name}?
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    This stops the plugin immediately and clears its saved configuration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUninstallingPlugin(null)}
                aria-label="Close dialog"
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setUninstallingPlugin(null)}
                disabled={busySlug === uninstallingPlugin.slug}
                className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                disabled={busySlug === uninstallingPlugin.slug}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {busySlug === uninstallingPlugin.slug && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Uninstall Plugin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-semibold px-3 h-8 rounded-md transition-colors whitespace-nowrap border ${
        active
          ? 'bg-white text-[#7B2D8E] border-gray-200'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: number
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="leading-tight">
      <div
        className={`text-base font-semibold tabular-nums ${
          accent ? 'text-[#7B2D8E]' : muted ? 'text-gray-500' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  )
}

function Divider() {
  return <span className="h-6 w-px bg-gray-200" aria-hidden />
}

function PluginCard({
  name,
  version,
  author,
  description,
  category,
  iconKey,
  installed,
  needsConfig,
  busy,
  onInstall,
  onToggle,
  onConfigure,
  onUninstall,
}: {
  slug: string
  name: string
  version: string
  author: string
  description: string
  category: PluginCategory
  iconKey: PluginCatalogEntry['iconKey']
  installed?: InstalledPlugin
  needsConfig: boolean
  busy: boolean
  onInstall?: () => void
  onToggle?: () => void
  onConfigure?: () => void
  onUninstall?: () => void
}) {
  const Icon = getPluginIcon(iconKey)
  const isInstalled = Boolean(installed)
  const isActive = Boolean(installed?.enabled)

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4 transition-colors hover:border-[#7B2D8E]/40 overflow-hidden">
      <div className="flex items-start gap-3">
        <span
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActive
              ? 'bg-[#7B2D8E] text-white'
              : isInstalled
                ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Icon className="w-[18px] h-[18px]" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">
              {name}
            </h3>
            {isInstalled ? (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${
                  isActive
                    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isActive ? 'Active' : 'Paused'}
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                {PLUGIN_CATEGORY_LABELS[category]}
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-400 mt-1">
            v{version} · by {author}
            {installed?.isCustom && (
              <span className="ml-1.5 text-[#7B2D8E] font-semibold">· Custom</span>
            )}
          </p>

          <p className="text-[12.5px] text-gray-500 leading-relaxed mt-2">
            {description}
          </p>

          {needsConfig && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Needs configuration to activate
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 mt-auto">
        {!isInstalled ? (
          <>
            <span className="text-[11px] font-medium text-gray-400">
              Ready to install
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={onInstall}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden />
              )}
              Install Plugin
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onToggle}
              aria-pressed={isActive}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-[#7B2D8E] disabled:opacity-50 transition-colors"
            >
              <span
                className={`relative inline-flex w-8 h-4.5 rounded-full transition-colors ${
                  isActive ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform mt-0.5 ${
                    isActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span>{isActive ? 'Enabled' : 'Disabled'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={onConfigure}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] disabled:opacity-50 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                Configure
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onUninstall}
                aria-label={`Uninstall ${name}`}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ConfigurePluginModal({
  plugin,
  catalogEntry,
  onClose,
  onSaved,
}: {
  plugin: InstalledPlugin
  catalogEntry?: PluginCatalogEntry
  onClose: () => void
  onSaved: (installed: InstalledPlugin[]) => Promise<void>
}) {
  const [config, setConfig] = useState<Record<string, string>>(() => ({
    ...(catalogEntry?.defaultConfig ?? {}),
    ...(plugin.config ?? {}),
  }))
  const [name, setName] = useState(plugin.name)
  const [description, setDescription] = useState(plugin.description)
  const [scriptUrl, setScriptUrl] = useState(plugin.scriptUrl ?? '')
  const [widgetLabel, setWidgetLabel] = useState(plugin.widgetLabel ?? '')
  const [widgetUrl, setWidgetUrl] = useState(plugin.widgetUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const body = plugin.isCustom
        ? {
            name,
            description,
            ...(plugin.kind === 'script'
              ? { scriptUrl }
              : { widgetLabel, widgetUrl }),
          }
        : { config }

      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(plugin.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        installed?: InstalledPlugin[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error || 'Could not save settings.')
        return
      }
      if (data.installed) {
        await onSaved(data.installed)
      }
    } catch {
      setError('Network error while saving configuration.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="configure-plugin-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h2 id="configure-plugin-title" className="text-sm font-semibold text-gray-900">
              Configure {plugin.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Changes take effect immediately across the site.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {plugin.isCustom ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plugin Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none resize-none"
                />
              </div>
              {plugin.kind === 'script' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Verified HTTPS Script URL
                  </label>
                  <input
                    type="url"
                    required
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://cdn.example.com/widget.js"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Floating Button Label
                    </label>
                    <input
                      type="text"
                      required
                      value={widgetLabel}
                      onChange={(e) => setWidgetLabel(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Destination Link (/path or https://...)
                    </label>
                    <input
                      type="text"
                      required
                      value={widgetUrl}
                      onChange={(e) => setWidgetUrl(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            (catalogEntry?.fields ?? []).map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.secret && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      Server-only
                    </span>
                  )}
                </div>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    required={field.required}
                    value={config[field.key] ?? ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none resize-none"
                  />
                ) : (
                  <input
                    type={field.type}
                    required={field.required}
                    value={config[field.key] ?? ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                )}
                {field.help && (
                  <p className="text-[11px] text-gray-500 mt-1">{field.help}</p>
                )}
              </div>
            ))
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InstallCustomPluginModal({
  onClose,
  onInstalled,
}: {
  onClose: () => void
  onInstalled: (plugin: InstalledPlugin, installed: InstalledPlugin[]) => Promise<void>
}) {
  const [mode, setMode] = useState<'custom' | 'manifest'>('custom')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [author, setAuthor] = useState('Dermaspace')
  const [category, setCategory] = useState<PluginCategory>('integrations')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'script' | 'widget'>('script')
  const [scriptUrl, setScriptUrl] = useState('')
  const [widgetLabel, setWidgetLabel] = useState('')
  const [widgetUrl, setWidgetUrl] = useState('')
  const [manifestJson, setManifestJson] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 16_000) {
      setError('Manifest file must be 16 KB or smaller.')
      return
    }
    try {
      const text = await file.text()
      setManifestJson(text)
      setError(null)
    } catch {
      setError('Could not read the selected JSON file.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload =
        mode === 'manifest'
          ? { mode: 'manifest', manifest: manifestJson }
          : {
              mode: 'custom',
              plugin: {
                name,
                slug: slug.trim() || undefined,
                version,
                author,
                category,
                description,
                kind,
                scriptUrl: kind === 'script' ? scriptUrl : undefined,
                widgetLabel: kind === 'widget' ? widgetLabel : undefined,
                widgetUrl: kind === 'widget' ? widgetUrl : undefined,
              },
            }

      const res = await fetch('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as {
        plugin?: InstalledPlugin
        installed?: InstalledPlugin[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error || 'Could not install custom plugin.')
        return
      }
      if (data.plugin && data.installed) {
        await onInstalled(data.plugin, data.installed)
      }
    } catch {
      setError('Network error while installing plugin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-custom-plugin-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white overflow-hidden my-8">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h2 id="install-custom-plugin-title" className="text-sm font-semibold text-gray-900">
              Install Custom Plugin
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Connect a verified HTTPS script, add a floating widget, or import a JSON manifest.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setMode('custom')
                setError(null)
              }}
              className={`h-8 rounded-md text-xs font-semibold border transition-colors ${
                mode === 'custom'
                  ? 'bg-white text-[#7B2D8E] border-gray-200'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Manual Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manifest')
                setError(null)
              }}
              className={`h-8 rounded-md text-xs font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 ${
                mode === 'manifest'
                  ? 'bg-white text-[#7B2D8E] border-gray-200'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Import JSON Manifest
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'custom' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Plugin Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hotjar Heatmaps"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Slug (optional)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated from name"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PluginCategory)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  >
                    <option value="integrations">Integrations</option>
                    <option value="analytics">Analytics</option>
                    <option value="marketing">Marketing</option>
                    <option value="customer">Customer</option>
                    <option value="booking">Booking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Vendor name"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain what this plugin adds to Dermaspace."
                  className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Plugin Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKind('script')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      kind === 'script'
                        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900">
                      HTTPS Script Embed
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Loads an external public https:// script async.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind('widget')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      kind === 'widget'
                        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900">
                      Floating Action Widget
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Shows a floating quick-link button on public pages.
                    </div>
                  </button>
                </div>
              </div>

              {kind === 'script' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Public HTTPS Script URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://cdn.vendor.com/plugin.min.js"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Only verified public https:// URLs are permitted.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Button Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={widgetLabel}
                      onChange={(e) => setWidgetLabel(e.target.value)}
                      placeholder="e.g. Follow on Instagram"
                      className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Destination Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={widgetUrl}
                      onChange={(e) => setWidgetUrl(e.target.value)}
                      placeholder="/consultation or https://..."
                      className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Choose .json file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManifestJson(SAMPLE_MANIFEST_JSON)
                      setError(null)
                    }}
                    className="text-xs font-semibold text-[#7B2D8E] hover:underline"
                  >
                    Load sample template
                  </button>
                </div>
                <span className="text-[11px] text-gray-400">Max 16 KB</span>
              </div>

              <textarea
                rows={10}
                required
                value={manifestJson}
                onChange={(e) => setManifestJson(e.target.value)}
                placeholder={SAMPLE_MANIFEST_JSON}
                className="w-full p-3 text-xs font-mono rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#7B2D8E] outline-none resize-y"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Install Plugin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModuleCard({ module: m }: { module: AddonModule }) {
  const Icon = m.icon
  const isActive = m.status === 'active'
  const isComing = m.status === 'coming-soon'

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4 transition-colors hover:border-[#7B2D8E]/35 overflow-hidden">
      {(isActive || isComing) && <StatusRibbon status={m.status} />}

      <div className="flex items-start gap-3">
        <span
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActive
              ? 'bg-[#7B2D8E] text-white'
              : isComing
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Icon className="w-[18px] h-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pr-12">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">
            {m.name}
          </h3>
          <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5">
            {m.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 mt-auto">
        <span
          className={`text-[10.5px] font-semibold uppercase tracking-wide ${
            isActive
              ? 'text-[#7B2D8E]'
              : isComing
                ? 'text-slate-500'
                : 'text-gray-400'
          }`}
        >
          {isActive ? 'Active' : isComing ? 'Coming soon' : 'Inactive'}
        </span>
        {m.href ? (
          <Link
            href={m.href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors"
          >
            {m.ctaLabel ?? 'Configure'}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span className="text-xs font-medium text-gray-400">On roadmap</span>
        )}
      </div>
    </div>
  )
}

function StatusRibbon({ status }: { status: 'active' | 'coming-soon' }) {
  const isActive = status === 'active'
  return (
    <div
      aria-hidden
      className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden pointer-events-none"
    >
      <span
        className={`absolute top-[14px] right-[-26px] rotate-45 text-[10px] font-bold uppercase tracking-[0.08em] py-1 w-[110px] text-center ${
          isActive
            ? 'bg-[#7B2D8E] text-white'
            : 'bg-slate-200 text-slate-700'
        }`}
      >
        {isActive ? 'Active' : 'Soon'}
      </span>
    </div>
  )
}

function BuildYourOwnCard() {
  return (
    <div className="relative rounded-2xl border-2 border-dashed border-[#7B2D8E]/25 bg-[#7B2D8E]/[0.03] p-5 flex flex-col gap-4 transition-colors hover:bg-[#7B2D8E]/[0.06]">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-[#7B2D8E]/20 text-[#7B2D8E]">
          <Plus className="w-[18px] h-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">
            Need something else?
          </h3>
          <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5">
            Tell the team what would make running Dermaspace easier.
            We&apos;ll scope it as a new module.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#7B2D8E]/10 mt-auto">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#7B2D8E]">
          Open request
        </span>
        <Link
          href="/admin/feature-requests"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors"
        >
          Submit idea
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
