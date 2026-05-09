'use client'

/**
 * /admin/addons
 *
 * The Dermaspace "module catalogue". One unified page that surfaces
 * every capability the booking platform can do — Loyalty, Wallet,
 * Vouchers, Recurring Bookings, Waitlist, Reviews, Tax, Tips,
 * Coupons, Service Extras, Google Calendar sync, Branch routing,
 * Auto-reminders, etc. — with a clear status pill and a one-tap
 * "Configure" button that deep-links to the existing admin surface
 * for each module.
 *
 * Visual treatment is deliberately editorial, not BookingPress-clone:
 *   - Brand purple #7B2D8E avatars (no neon green)
 *   - Diagonal "Active" ribbon corner — same gesture as the reference
 *     screenshots but in our palette
 *   - Hairline borders, flat white cards, gentle hover lift
 *   - Category filter row (All / Booking / Customer / Revenue /
 *     Integrations / Operations) so the page scales when we add
 *     more modules later
 *   - No Sparkles or Zap icons anywhere — strictly a curated set
 *     from the rest of the admin surface (Boxes, Gift, Wallet,
 *     CalendarClock, etc.)
 *
 * No new database tables — module status is derived from existing
 * surfaces (e.g. "Loyalty" is Active because the loyalty engine is
 * shipped; "Google Calendar 2-way sync" is Coming soon because the
 * OAuth flow isn't wired yet). When a future module ships, flip its
 * `status` value here and ship the corresponding settings page.
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Boxes,
  CalendarClock,
  CalendarCheck2,
  Clock,
  CreditCard,
  Gift,
  Layers,
  MapPin,
  MessageSquare,
  Power,
  Repeat,
  Search,
  Send,
  Settings,
  Shield,
  Star,
  Tag,
  Ticket,
  Users,
  UserCog,
  Wallet,
  Plus,
} from 'lucide-react'

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
  /** Where the "Configure" CTA points. Omit for coming-soon modules. */
  href?: string
  /** Optional override for the CTA label (defaults to "Configure"). */
  ctaLabel?: string
}

// ---------------------------------------------------------------------------
// Module catalogue.
//
// Treat this as the canonical list of "what this booking platform
// does". Each entry is a self-contained capability. When a new
// surface lands in the admin (or the customer app), add it here so
// the team has a single dashboard that answers "is X live?".
//
// Order within each category matters — the most-used / most-revenue
// modules come first so they're above the fold for admins.
// ---------------------------------------------------------------------------
const MODULES: AddonModule[] = [
  // ── Booking ──────────────────────────────────────────────────────
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

  // ── Customer ─────────────────────────────────────────────────────
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

  // ── Revenue ──────────────────────────────────────────────────────
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

  // ── Integrations ─────────────────────────────────────────────────
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
      'Connect each therapist\u2019s Google Calendar so their personal events block availability automatically.',
    icon: CalendarCheck2,
    category: 'integrations',
    status: 'coming-soon',
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
      'Configure each physical branch \u2014 address, hours, services offered and Google Maps link.',
    icon: MapPin,
    category: 'integrations',
    status: 'coming-soon',
  },

  // ── Operations ───────────────────────────────────────────────────
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

const CATEGORY_META: Record<
  ModuleCategory | 'all',
  { label: string; help: string }
> = {
  all: {
    label: 'All',
    help: 'Every capability the platform ships with.',
  },
  booking: {
    label: 'Booking',
    help: 'Services, staff, availability and the appointment queue.',
  },
  customer: {
    label: 'Customer',
    help: 'CRM, loyalty, wallet, reviews \u2014 the relationship layer.',
  },
  revenue: {
    label: 'Revenue',
    help: 'Vouchers, discounts, payments and tax.',
  },
  integrations: {
    label: 'Integrations',
    help: 'Calendar sync, push, banners and editorial.',
  },
  operations: {
    label: 'Operations',
    help: 'Feature flags, jobs, roles and platform settings.',
  },
}

export default function AdminAddonsPage() {
  const [filter, setFilter] = useState<ModuleCategory | 'all'>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    return MODULES.filter((m) => {
      if (filter !== 'all' && m.category !== filter) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        return (
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.key.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [filter, query])

  const totals = useMemo(() => {
    return {
      total: MODULES.length,
      active: MODULES.filter((m) => m.status === 'active').length,
      coming: MODULES.filter((m) => m.status === 'coming-soon').length,
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4 text-[#7B2D8E]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Add-ons & Modules
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xl leading-relaxed">
              Every capability your booking platform ships with. Configure what&apos;s
              live, see what&apos;s on the roadmap.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Stat label="Modules" value={totals.total} />
          <Divider />
          <Stat label="Active" value={totals.active} accent />
          <Divider />
          <Stat label="On roadmap" value={totals.coming} muted />
        </div>
      </header>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full">
          {(
            ['all', 'booking', 'customer', 'revenue', 'integrations', 'operations'] as const
          ).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`text-xs font-medium px-3 h-8 rounded-md transition-colors capitalize whitespace-nowrap ${
                filter === c
                  ? 'bg-white text-[#7B2D8E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category subhead ───────────────────────────────────────── */}
      {filter !== 'all' && (
        <p className="text-xs text-gray-500 -mt-2">{CATEGORY_META[filter].help}</p>
      )}

      {/* ── Grid ───────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No modules match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((m) => (
            <ModuleCard key={m.key} module={m} />
          ))}
          {/* "Build your own" footer card — invites the team to scope a
              new module. Doesn't link anywhere yet, just signals that
              the catalogue is extensible. */}
          {filter === 'all' && !query.trim() && <BuildYourOwnCard />}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function ModuleCard({ module: m }: { module: AddonModule }) {
  const Icon = m.icon
  const isActive = m.status === 'active'
  const isComing = m.status === 'coming-soon'

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4 transition-all duration-200 hover:border-[#7B2D8E]/30 hover:shadow-[0_18px_40px_-25px_rgba(123,45,142,0.35)] overflow-hidden">
      {/* Diagonal status ribbon — same gesture as BookingPress but in
          our brand purple for Active, slate for Coming soon. Hidden
          for plain "inactive" so the card stays clean. */}
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
          <span className="text-xs font-medium text-gray-400">Notify me</span>
        )}
      </div>
    </div>
  )
}

/**
 * Diagonal corner ribbon. Pure CSS (no SVG) so it inherits the brand
 * purple from a single token and stays crisp at any DPI. Sits in the
 * top-right corner of the card.
 */
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
          href="/admin/feedback"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors"
        >
          Submit idea
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
