'use client'

import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { TrendingUp, Sparkles, Heart, ArrowRight, Eye, Calendar } from 'lucide-react'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

// ---------------------------------------------------------------------------
// <TrendingRecommendations />
//
// Spotify-inspired discovery rail for the public services page. Renders
// two horizontal carousels driven by real platform signals:
//
//   1. "Trending right now"   — service categories ranked by page-view
//                                volume in the last 30 days.
//   2. "Most-loved by clients" — treatments ranked by confirmed
//                                booking volume in the last 60 days.
//
// Falls back to a curated mix from the catalog when the API has no
// data yet (cold start, fresh deploy, ad blockers killing telemetry).
// ---------------------------------------------------------------------------

interface VisitedItem {
  kind: 'category'
  slug: string
  title: string
  description: string
  image: string
  href: string
  count: number
}

interface BookedItem {
  kind: 'treatment' | 'category'
  slug: string
  treatmentId: string | null
  title: string
  subtitle: string
  image: string
  href: string
  count: number
}

interface ApiResponse {
  mostVisited: VisitedItem[]
  mostBooked: BookedItem[]
  generatedAt: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error('Failed to load recommendations')
  return (await res.json()) as ApiResponse
}

// ---------------------------------------------------------------------------
// Static fallbacks so the rails are never empty (cold start / no data).
// ---------------------------------------------------------------------------

function buildFallbackVisited(): VisitedItem[] {
  return SERVICES_CATALOG.map((category) => ({
    kind: 'category' as const,
    slug: category.slug,
    title: category.title,
    description: category.tagline,
    image: category.image,
    href: `/services/${category.slug}`,
    count: 0,
  }))
}

function buildFallbackBooked(): BookedItem[] {
  // Pick every category's flagged "popular" treatments, then trim.
  const out: BookedItem[] = []
  for (const category of SERVICES_CATALOG) {
    for (const treatment of category.treatments) {
      if (!treatment.popular) continue
      out.push({
        kind: 'treatment',
        slug: category.slug,
        treatmentId: treatment.id,
        title: treatment.name,
        subtitle: `${category.title} · ${treatment.duration}`,
        image: category.image,
        href: `/services/${category.slug}#${treatment.id}`,
        count: 0,
      })
    }
  }
  return out
}

// Minimal pluraliser so the badge reads naturally.
function formatCount(count: number, label: 'view' | 'booking'): string {
  const n = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`
  return `${n} ${count === 1 ? label : label + 's'}`
}

// ---------------------------------------------------------------------------
// Card primitives
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  href: string
  image: string
  title: string
  subtitle: string
  rank: number
  countLabel?: string | null
  /** Icon shown next to the count chip — Eye for visits, Calendar for
   *  bookings. */
  countIcon?: 'eye' | 'calendar'
  /** Tailwind background tint for the rank badge — keeps the two rails
   *  visually distinguishable without leaving the brand palette. */
  accent: 'plum' | 'rose'
}

function CarouselCard({
  href,
  image,
  title,
  subtitle,
  rank,
  countLabel,
  countIcon,
  accent,
}: CarouselCardProps) {
  const accentBg =
    accent === 'plum'
      ? 'bg-[#7B2D8E] text-white'
      : 'bg-[#E8B4BC] text-[#5E1F70]'

  const CountIcon = countIcon === 'calendar' ? Calendar : Eye

  return (
    <Link
      href={href}
      className="group relative w-[180px] sm:w-[200px] flex-shrink-0 snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2 rounded-2xl"
    >
      {/* Square cover */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#7B2D8E]/[0.06]">
        <Image
          src={image}
          alt=""
          fill
          sizes="200px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04] group-active:scale-[0.99]"
        />

        {/* Bottom gradient so the title reads cleanly even on bright photos */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* Top-left rank chip */}
        <div
          className={`absolute top-2.5 left-2.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shadow-md ${accentBg}`}
          aria-hidden="true"
        >
          {rank}
        </div>

        {/* Top-right count chip — only shown when we have real data */}
        {countLabel && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/95 backdrop-blur-sm shadow-sm">
            <CountIcon className="w-3 h-3 text-[#7B2D8E]" />
            <span className="text-[10px] font-semibold text-gray-800 leading-none">
              {countLabel}
            </span>
          </div>
        )}

        {/* Title block on the image */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 text-balance">
            {title}
          </h3>
        </div>
      </div>

      {/* Caption under the card — Spotify-style supporting text */}
      <p className="mt-2 text-[11.5px] text-gray-500 leading-snug line-clamp-2 px-0.5">
        {subtitle}
      </p>
    </Link>
  )
}

interface RailProps {
  eyebrow: string
  title: string
  subtitle: string
  icon: 'trending' | 'heart' | 'sparkles'
  viewAllHref: string
  isLoading: boolean
  children: React.ReactNode
}

function Rail({
  eyebrow,
  title,
  subtitle,
  icon,
  viewAllHref,
  isLoading,
  children,
}: RailProps) {
  const Icon =
    icon === 'trending' ? TrendingUp : icon === 'heart' ? Heart : Sparkles

  return (
    <section className="pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-3.5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/10 mb-2">
              <Icon className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#7B2D8E]">
                {eyebrow}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight tracking-tight text-balance">
              {title}
            </h2>
            <p className="mt-0.5 text-xs sm:text-[13px] text-gray-500 leading-relaxed text-pretty">
              {subtitle}
            </p>
          </div>

          <Link
            href={viewAllHref}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:gap-1.5 transition-all whitespace-nowrap"
          >
            See all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Carousel — horizontal scroll on every viewport, snap-aligned. */}
      <div className="relative">
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 px-4 max-w-6xl mx-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          role="list"
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {isLoading ? <RailSkeleton /> : children}
        </div>
      </div>
    </section>
  )
}

function RailSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="w-[180px] sm:w-[200px] flex-shrink-0 snap-start"
        >
          <div className="aspect-square w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="mt-2 h-3 rounded bg-gray-100 animate-pulse w-3/4" />
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export default function TrendingRecommendations() {
  const { data, isLoading } = useSWR<ApiResponse>(
    '/api/recommendations',
    fetcher,
    {
      // Trending lists barely change shot-to-shot — cache for the whole
      // session.
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    },
  )

  // Real signals fall back to curated picks when the platform is fresh
  // (no data yet) so the section never appears empty for new visitors.
  const visited =
    data?.mostVisited && data.mostVisited.length > 0
      ? data.mostVisited.slice(0, 10)
      : buildFallbackVisited()

  const booked =
    data?.mostBooked && data.mostBooked.length > 0
      ? data.mostBooked.slice(0, 10)
      : buildFallbackBooked()

  // The fallback flag drives whether we show count chips — we don't
  // want to print "0 views" on a card.
  const visitedHasData = !!data?.mostVisited?.length
  const bookedHasData = !!data?.mostBooked?.length

  return (
    <div className="bg-white">
      <Rail
        eyebrow="Trending now"
        title="Most-visited services this month"
        subtitle="What other Dermaspace clients are browsing right now."
        icon="trending"
        viewAllHref="/services"
        isLoading={isLoading}
      >
        {visited.map((item, i) => (
          <CarouselCard
            key={`v-${item.slug}-${i}`}
            href={item.href}
            image={item.image}
            title={item.title}
            subtitle={item.description}
            rank={i + 1}
            countLabel={
              visitedHasData ? formatCount(item.count, 'view') : null
            }
            countIcon="eye"
            accent="plum"
          />
        ))}
      </Rail>

      <Rail
        eyebrow="Booked the most"
        title="Most-loved by clients"
        subtitle="The treatments people keep coming back for — based on real bookings."
        icon="heart"
        viewAllHref="/booking"
        isLoading={isLoading}
      >
        {booked.map((item, i) => (
          <CarouselCard
            key={`b-${item.slug}-${item.treatmentId ?? 'cat'}-${i}`}
            href={item.href}
            image={item.image}
            title={item.title}
            subtitle={
              bookedHasData
                ? `${item.subtitle}`
                : item.subtitle
            }
            rank={i + 1}
            countLabel={
              bookedHasData ? formatCount(item.count, 'booking') : null
            }
            countIcon="calendar"
            accent="rose"
          />
        ))}
      </Rail>
    </div>
  )
}
