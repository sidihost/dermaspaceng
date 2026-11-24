'use client'

/**
 * InternationalRegionPage
 *
 * Dedicated country storefront for Dermaspace's international URLs
 * (`/UK`, `/US`, `/AE`, `/GH`, `/ZA`). Matches the exact visual design
 * and section rhythm of the primary Dermaspace homepage — swapping in
 * country-specific photography, calibrated local currency pricing, and
 * regional waitlist access without touching the Nigeria site.
 *
 * Strict design system rules:
 *   - Brand purple #7B2D8E + deep purple #5A1D6A footer + crisp white/#F8F7FA surfaces
 *   - Zero pill/badge clutter, zero shadows, zero gradients, zero Sparkles/Zap, zero popups
 *   - Tabular numerals (`tabular-nums`) for all local prices
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Award,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Handshake,
  Heart,
  Mail,
  MapPin,
  Minus,
  Plus,
  Search,
  Shield,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import {
  INTERNATIONAL_REGION_LIST,
  REGIONAL_COLLECTION_CARDS,
  formatRegionAmount,
  type InternationalRegionConfig,
  type RegionalMenuCategory,
  type RegionalTreatmentItem,
} from '@/lib/international-regions'
import { RegionalWaitlistForm } from '@/components/shared/regional-waitlist-form'

const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

const QUALITIES = [
  {
    icon: Users,
    title: 'Therapists who listen',
    desc: 'We ask what you need before we recommend anything.',
  },
  {
    icon: Handshake,
    title: 'A calm room, always',
    desc: 'Clean linens, soft lighting, and unhurried private sessions.',
  },
  {
    icon: Shield,
    title: 'Safe for every skin tone',
    desc: 'Massages, facials, nails, peels, and laser care tailored to your skin.',
  },
  {
    icon: Award,
    title: 'Products that work',
    desc: 'Proven skincare formulas we trust and use ourselves.',
  },
] as const

interface InternationalRegionPageProps {
  region: InternationalRegionConfig
  menu: RegionalMenuCategory[]
}

function parseMinutes(duration: string): number {
  const match = duration.match(/(\d+)\s*min/i)
  if (match) return Number(match[1])
  const hrMatch = duration.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/i)
  if (hrMatch) return Math.round(Number(hrMatch[1]) * 60)
  return 60
}

function formatCurrencyLabel(region: InternationalRegionConfig): string {
  return region.currency === region.symbol
    ? region.currency
    : `${region.currency} (${region.symbol})`
}

function formatTaxInline(taxLabel: string): string {
  return taxLabel.startsWith('VAT') ? taxLabel : taxLabel.toLowerCase()
}

function SignatureDivider({ centered = true }: { centered?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-1 ${centered ? 'justify-center' : 'justify-start'}`}
    >
      <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
        <path
          d="M1 6C15 2 45 2 59 6"
          stroke="#7B2D8E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />
      </svg>
      <span className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
      <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
        <path
          d="M1 6C15 2 45 2 59 6"
          stroke="#7B2D8E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />
      </svg>
    </div>
  )
}

export function InternationalRegionPage({
  region,
  menu,
}: InternationalRegionPageProps) {
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>(
    menu[0]?.slug ?? 'facial-treatments',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [regionMenuOpen, setRegionMenuOpen] = useState(false)

  const currencyLabel = formatCurrencyLabel(region)

  const allTreatments = useMemo(
    () => menu.flatMap((cat) => cat.treatments),
    [menu],
  )

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, RegionalMenuCategory>()
    for (const cat of menu) map.set(cat.slug, cat)
    return map
  }, [menu])

  const treatmentMap = useMemo(() => {
    const map = new Map<string, RegionalTreatmentItem>()
    for (const item of allTreatments) map.set(item.id, item)
    return map
  }, [allTreatments])

  const activeCategory = useMemo(
    () => menu.find((c) => c.slug === activeCategorySlug) ?? menu[0],
    [menu, activeCategorySlug],
  )

  const visibleTreatments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      return allTreatments.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.categoryTitle.toLowerCase().includes(q),
      )
    }
    return activeCategory?.treatments ?? []
  }, [allTreatments, activeCategory, searchQuery])

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) => treatmentMap.get(id))
        .filter((item): item is RegionalTreatmentItem => Boolean(item)),
    [selectedIds, treatmentMap],
  )

  const totals = useMemo(() => {
    let local = 0
    let mins = 0
    for (const item of selectedItems) {
      local += item.priceLocal
      mins += parseMinutes(item.duration)
    }
    return {
      local,
      localFormatted: formatRegionAmount(local, region),
      mins,
    }
  }, [selectedItems, region])

  const toggleTreatment = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const jumpToCategory = (slug: string) => {
    setSearchQuery('')
    setActiveCategorySlug(slug)
    const menuEl = document.getElementById('menu')
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const stats = [
    { value: '1,000+', label: 'Clients on our books', icon: Users },
    { value: '5,000+', label: 'Treatments done', icon: Heart },
    { value: '4.9', label: 'Google rating', icon: Star },
    { value: `${allTreatments.length}`, label: `Services in ${region.currency}`, icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Header (Matches primary Dermaspace top bar) ─────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <Link
            href={`/${region.slug}`}
            className="flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DERMASPACE_LOGO}
              alt="Dermaspace"
              className="h-8 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </Link>

          <nav
            aria-label="Regional navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600"
          >
            <a
              href="#about"
              className="hover:text-[#7B2D8E] transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <a
              href="#services"
              className="hover:text-[#7B2D8E] transition-colors whitespace-nowrap shrink-0"
            >
              Services
            </a>
            <a
              href="#menu"
              className="hover:text-[#7B2D8E] transition-colors whitespace-nowrap shrink-0"
            >
              Pricing
            </a>
            <a
              href="#qualities"
              className="hover:text-[#7B2D8E] transition-colors whitespace-nowrap shrink-0"
            >
              Why Us
            </a>
            <a
              href="#waitlist"
              className="hover:text-[#7B2D8E] transition-colors whitespace-nowrap shrink-0"
            >
              Waitlist
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setRegionMenuOpen((prev) => !prev)}
                aria-expanded={regionMenuOpen}
                aria-haspopup="menu"
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white hover:border-[#7B2D8E]/40 text-xs font-medium text-gray-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden="true" />
                <span className="hidden sm:inline">{region.name}</span>
                <span className="sm:hidden">{region.slug}</span>
                <span className="text-gray-400">({region.currency})</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                    regionMenuOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {regionMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setRegionMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    aria-label="Switch region"
                    className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white z-50 py-1.5 overflow-hidden"
                  >
                    <p className="px-4 py-2 text-[11px] font-medium text-gray-500 border-b border-gray-100">
                      Select country
                    </p>
                    {INTERNATIONAL_REGION_LIST.map((item) => {
                      const active = item.slug === region.slug
                      return (
                        <Link
                          key={item.slug}
                          href={`/${item.slug}`}
                          role="menuitem"
                          onClick={() => setRegionMenuOpen(false)}
                          className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                            active
                              ? 'bg-[#7B2D8E]/[0.07] text-[#7B2D8E] font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className="font-mono tabular-nums text-gray-500">
                            {item.currency}
                          </span>
                        </Link>
                      )
                    })}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link
                        href="/?region=NG"
                        role="menuitem"
                        onClick={() => setRegionMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>Nigeria</span>
                        <span className="font-mono tabular-nums text-gray-500">
                          NGN
                        </span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <a
              href="#waitlist"
              className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors whitespace-nowrap shrink-0"
            >
              Join Waitlist
            </a>
          </div>
        </div>
      </header>

      {/* ── Section 1: Hero (Matches components/home/hero.tsx) ──────── */}
      <section className="relative bg-white overflow-hidden">
        <div className="relative min-h-[460px] sm:min-h-[480px] lg:min-h-[520px] bg-[#7B2D8E] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={region.heroImage}
              alt={region.heroAlt}
              fill
              priority
              loading="eager"
              quality={95}
              sizes="100vw"
              referrerPolicy="no-referrer"
              className="object-cover object-center"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[#240933]/48 pointer-events-none"
            />
          </div>

          {/* Left edge vertical wordmark (matches primary Hero) */}
          <div
            aria-hidden="true"
            className="hidden lg:flex absolute left-5 top-0 bottom-0 items-center pointer-events-none z-10"
          >
            <span
              className="text-[10px] font-medium uppercase tracking-[0.5em] text-white/55 whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Dermaspace · {region.name}
            </span>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <div className="mb-3 sm:mb-4 flex items-center gap-3">
                <span className="w-8 h-px bg-white/70 shrink-0" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.3em] text-white">
                  {region.name}
                </span>
                <span
                  className="hidden sm:block h-px bg-white/25 flex-1 max-w-[80px]"
                  aria-hidden="true"
                />
              </div>

              {/* Signature Dermaspace Two-Line Headline */}
              <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-white leading-[1.08] tracking-tight text-balance mb-4">
                {region.heroTitleLine1}
                <br />
                <span className="relative inline-block pb-3 sm:pb-4">
                  <span className="font-serif italic font-normal text-white">
                    {region.heroTitleItalic}
                    <span className="text-[#E9D5FF]">.</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    className="absolute left-0 bottom-0 w-full h-3 pointer-events-none"
                    viewBox="0 0 240 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 8 C 40 3, 95 10, 140 5 S 212 3, 238 7"
                      fill="none"
                      stroke="#E9D5FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base text-white/90 max-w-lg leading-relaxed mb-6">
                {region.editorialSubhead}
              </p>

              {/* Signature Pill CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <a
                  href="#menu"
                  className="group inline-flex items-center gap-2 pl-5 pr-2 py-2 bg-white hover:bg-[#F5ECF8] text-[#7B2D8E] text-sm font-semibold rounded-full transition-colors whitespace-nowrap"
                >
                  <span>View Treatment Menu</span>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#7B2D8E] text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-full border border-white/45 hover:bg-white/10 hover:border-white/75 transition-colors whitespace-nowrap"
                >
                  <span>Join {region.shortLabel} Waitlist</span>
                </a>
              </div>

              {/* Clean inline trust strip — zero badges */}
              <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/85">
                <span>5,000+ Happy Clients</span>
                <span aria-hidden="true" className="h-4 w-px bg-white/30" />
                <div className="inline-flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <Star
                        key={idx}
                        className="w-3.5 h-3.5 text-white fill-white"
                      />
                    ))}
                  </div>
                  <span>4.9 Rating</span>
                </div>
                <span aria-hidden="true" className="h-4 w-px bg-white/30" />
                <div className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-white/80" aria-hidden="true" />
                  <span>{region.cities}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* White Bottom Strip (Matches primary Hero bottom bar) */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">{region.name}</span>
              <span className="mx-2 text-gray-300" aria-hidden="true">
                ·
              </span>
              <span>{region.cities}</span>
            </p>
            <p className="font-medium text-[#7B2D8E] tabular-nums">
              Prices in {currencyLabel} · {region.taxLabel}
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2: About Preview (Matches components/home/about-preview.tsx) ── */}
      <section id="about" className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em] mb-3">
            About Us
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Built on <span className="text-[#7B2D8E]">honest care</span>
          </h2>
          <div className="mb-8">
            <SignatureDivider centered />
          </div>

          <div className="relative max-w-2xl mx-auto mb-8">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-gray-200 bg-[#F8F7FA]">
              <Image
                src={region.heroImage}
                alt={region.heroAlt}
                fill
                quality={90}
                sizes="(max-width: 768px) 100vw, 672px"
                referrerPolicy="no-referrer"
                className="object-cover object-center"
              />
            </div>
          </div>

          <p className="text-base text-gray-600 leading-relaxed mb-4 max-w-2xl mx-auto">
            {region.aboutNote}
          </p>
          <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            Thousands of clients later, that&apos;s still how we run every room
            — clear pricing in {region.currency}, attentive therapists, and care
            built around real skin health.
          </p>

          <a
            href="#menu"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
          >
            <span>Explore Treatment Menu</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── Section 3: What We Do (Matches components/home/services-section.tsx) ── */}
      <section id="services" className="py-12 md:py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em] mb-3">
              Services
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              What we <span className="text-[#7B2D8E]">do</span>
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-5">
              Facials, massages, laser care, and nails. Four things, done
              properly — with clear {region.currency} pricing.
            </p>
            <SignatureDivider centered />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {REGIONAL_COLLECTION_CARDS.map((card) => {
              const cat = categoryBySlug.get(card.slug)
              const count = cat?.treatments.length ?? 0
              const minLocal = cat?.treatments.length
                ? Math.min(...cat.treatments.map((t) => t.priceLocal))
                : 0
              const fromLabel = minLocal
                ? `From ${formatRegionAmount(minLocal, region)}`
                : ''

              return (
                <button
                  key={card.slug}
                  type="button"
                  onClick={() => jumpToCategory(card.slug)}
                  className="group text-left rounded-2xl border border-gray-200 hover:border-[#7B2D8E] bg-white overflow-hidden flex flex-col transition-colors"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F8F7FA]">
                    <Image
                      src={card.image}
                      alt={`${card.title} — Dermaspace ${region.name}`}
                      fill
                      quality={90}
                      sizes="(min-width: 1024px) 24vw, (min-width: 640px) 48vw, 100vw"
                      referrerPolicy="no-referrer"
                      className={`object-cover ${card.imagePosition} transition-transform duration-700 group-hover:scale-105`}
                    />
                  </div>

                  <div className="p-5 border-t border-gray-100 flex-1 flex flex-col justify-between gap-4 bg-white">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                          {card.title}
                        </h3>
                        {fromLabel && (
                          <span className="text-xs font-semibold text-[#7B2D8E] tabular-nums whitespace-nowrap">
                            {fromLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        {card.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-semibold text-[#7B2D8E]">
                      <span>
                        {count > 0 ? `View ${count} treatments` : 'View menu'}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Section 4: Stats Bar (Matches components/home/stats-section.tsx) ── */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#7B2D8E] rounded-2xl p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" aria-hidden="true" />
                      </div>
                      <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-white/80 font-medium">
                      {stat.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Treatment Menu & Live Estimator ──────────────── */}
      <section
        id="menu"
        className="py-12 md:py-16 bg-[#F8F7FA] border-y border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em] mb-3">
              Treatment Menu
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Clear pricing in{' '}
              <span className="text-[#7B2D8E]">{region.currency}</span>
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-5">
              Browse treatments and add any combination to estimate your total
              session time and cost ({formatTaxInline(region.taxLabel)}).
            </p>
            <SignatureDivider centered />
          </div>

          {/* Category Filter & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Treatment categories"
              className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0"
            >
              {menu.map((cat) => {
                const active = !searchQuery.trim() && activeCategorySlug === cat.slug
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSearchQuery('')
                      setActiveCategorySlug(cat.slug)
                    }}
                    className={`h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                      active
                        ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
                    }`}
                  >
                    {cat.title}
                  </button>
                )
              })}
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
              <Search
                className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search treatments (e.g. Facial, Laser)…"
                aria-label="Search treatments"
                className="w-full h-9 pl-10 pr-4 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2-Column Menu + Sticky Estimator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
              {!searchQuery.trim() && activeCategory && (
                <div className="mb-5 pb-5 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">
                    {activeCategory.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                    {activeCategory.description}
                  </p>
                </div>
              )}

              {visibleTreatments.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-[#F8F7FA] p-10 text-center">
                  <p className="text-sm font-medium text-gray-700">
                    No treatments match &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs font-semibold text-[#7B2D8E] hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleTreatments.map((treatment) => {
                    const isSelected = selectedIds.includes(treatment.id)
                    return (
                      <div
                        key={treatment.id}
                        className={`py-4 px-3 -mx-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isSelected ? 'bg-[#7B2D8E]/[0.04]' : 'hover:bg-[#F8F7FA]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-[15px] font-semibold text-gray-900">
                            {treatment.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {treatment.duration}
                            </span>
                            {searchQuery.trim() && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{treatment.categoryTitle}</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed max-w-xl">
                            {treatment.description}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                          <p className="text-base font-semibold text-gray-900 tabular-nums">
                            {treatment.priceLocalFormatted}
                          </p>

                          <button
                            type="button"
                            onClick={() => toggleTreatment(treatment.id)}
                            className={`h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                              isSelected
                                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E] hover:bg-[#5A1D6A]'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-[#7B2D8E] hover:text-[#7B2D8E]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sticky Treatment Estimator */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Treatment Estimator
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {currencyLabel} · {region.taxLabel}
                    </p>
                  </div>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Clear
                    </button>
                  )}
                </div>

                {selectedItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-[#F8F7FA] p-5 text-center space-y-1.5">
                    <p className="text-xs font-semibold text-gray-800">
                      No treatments selected yet
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Add treatments from the menu to calculate your estimated
                      session time and cost in {region.currency}.
                    </p>
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-gray-200 bg-[#F8F7FA] rounded-xl border border-gray-200 px-4">
                      {selectedItems.map((item) => (
                        <li
                          key={item.id}
                          className="py-3 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 leading-snug">
                              {item.name}
                            </p>
                            <p className="text-gray-500 mt-0.5">{item.duration}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-gray-900 tabular-nums">
                              {item.priceLocalFormatted}
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleTreatment(item.id)}
                              className="text-[11px] text-[#7B2D8E] hover:underline mt-0.5"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Estimated session time</span>
                        <span className="font-medium tabular-nums">
                          {totals.mins} mins
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Estimated total ({region.currency})</span>
                        <span className="text-[#7B2D8E] tabular-nums">
                          {totals.localFormatted}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 pt-0.5">
                        Prices are {formatTaxInline(region.taxLabel)} with no
                        hidden fees.
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2.5 pt-1">
                  <a
                    href="#waitlist"
                    className="w-full h-11 px-4 rounded-full bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <span>Join {region.shortLabel} Waitlist</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                  <Link
                    href="/consultation"
                    className="w-full h-11 px-4 rounded-full border border-gray-300 bg-white text-gray-900 text-xs font-semibold hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Book a Skin Consultation</span>
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Section 6: Our Qualities (Matches components/home/qualities-section.tsx) ── */}
      <section id="qualities" className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em] mb-3">
              Why Choose Us
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Our <span className="text-[#7B2D8E]">Qualities</span>
            </h2>
            <SignatureDivider centered />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {QUALITIES.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl p-6 border border-[#7B2D8E]/15 hover:border-[#7B2D8E]/40 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4 group-hover:bg-[#7B2D8E] transition-colors">
                  <item.icon
                    className="w-6 h-6 text-[#7B2D8E] group-hover:text-white transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Regional Waitlist ────────────────────────────── */}
      <section
        id="waitlist"
        className="py-14 md:py-16 bg-[#F8F7FA] border-t border-gray-200 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">
                {region.name} Waitlist
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight text-balance">
                Hear first when we open in{' '}
                <span className="text-[#7B2D8E]">{region.name}</span>
              </h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                {region.waitlistDescription}
              </p>

              <ul className="space-y-2.5 text-sm text-gray-700 pt-1">
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] inline-flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                  <span>Early booking access ahead of general openings</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] inline-flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                  <span>Transparent {region.currency} pricing with no hidden fees</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] inline-flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                  <span>Direct updates from our team for {region.cities}</span>
                </li>
              </ul>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                <a
                  href="mailto:info@dermaspaceng.com"
                  className="inline-flex items-center gap-1.5 font-medium text-[#7B2D8E] hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>info@dermaspaceng.com</span>
                </a>
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
                <Link
                  href="/consultation"
                  className="font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors"
                >
                  Book a Skin Consultation
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
                <RegionalWaitlistForm
                  region={region.slug}
                  source="regional-storefront"
                  title={region.waitlistTitle}
                  description={region.waitlistDescription}
                  cityPlaceholder={region.cityPlaceholder}
                  submitLabel={`Join ${region.shortLabel} Waitlist`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer (Matches components/layout/footer.tsx deep purple) ── */}
      <footer className="bg-[#5A1D6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="pb-8 border-b border-white/20 max-w-md space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DERMASPACE_LOGO}
              alt="Dermaspace"
              className="h-9 w-auto brightness-0 invert"
              referrerPolicy="no-referrer"
            />
            <p className="text-white/75 text-sm leading-relaxed">
              Dermaspace Esthetic &amp; Wellness Centre — {region.name}.
              Dedicated to thoughtful skincare treatments, relaxing massages,
              and wellness care that helps you look and feel your best.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-8">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Services</h3>
              <ul className="space-y-2 text-sm text-white/70">
                {REGIONAL_COLLECTION_CARDS.map((card) => (
                  <li key={card.slug}>
                    <button
                      type="button"
                      onClick={() => jumpToCategory(card.slug)}
                      className="hover:text-white transition-colors text-left"
                    >
                      {card.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Regions</h3>
              <ul className="space-y-2 text-sm text-white/70">
                {INTERNATIONAL_REGION_LIST.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/${item.slug}`}
                      className={`hover:text-white transition-colors ${
                        item.slug === region.slug
                          ? 'text-white font-semibold underline underline-offset-4'
                          : ''
                      }`}
                    >
                      {item.name} ({item.currency})
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/?region=NG"
                    className="hover:text-white transition-colors"
                  >
                    Nigeria (NGN)
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <h3 className="text-sm font-semibold text-white mb-3">Support</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <a
                    href="mailto:info@dermaspaceng.com"
                    className="inline-flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>info@dermaspaceng.com</span>
                  </a>
                </li>
                <li>
                  <Link
                    href="/consultation"
                    className="hover:text-white transition-colors"
                  >
                    Book a Skin Consultation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white/65">
            <p>
              &copy; {new Date().getFullYear()} Dermaspace Esthetic &amp; Wellness
              Centre. All rights reserved.
            </p>
            <p>
              {region.name} · {currencyLabel} ({region.taxLabel})
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
