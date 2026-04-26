'use client'

import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { TrendingUp, ArrowRight, Eye } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

// ---------------------------------------------------------------------------
// <RecommendationsSection />
//
// Spotify-inspired discovery rails for the LOGGED-IN homepage. Renders
// two horizontal carousels driven by real platform signals:
//
//   1. "Most-visited services this month" — service categories ranked
//      by page-view volume in the last 30 days.
//   2. "Most-loved by clients"             — treatments ranked by
//      confirmed booking volume in the last 60 days.
//
// Falls back to a curated mix from the catalog when the API has no
// data yet (cold start, fresh deploy, ad blockers).
//
// Visibility rules:
//   • Hidden entirely for signed-out visitors. We don't even mount the
//     SWR fetcher — saves a request on every anonymous home view.
//   • Hidden during the auth-loading flicker so the section never
//     pops in/out as `/api/auth/me` resolves.
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

interface ApiResponse {
  mostVisited: VisitedItem[]
  // The booking-ranked list is still returned by the API but the
  // homepage doesn't render it yet — see the trailing comment in
  // the JSX below.
  mostBooked?: unknown
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

// Minimal pluraliser so the badge reads naturally.
function formatCount(count: number, label: 'view' | 'booking'): string {
  const n = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`
  return `${n} ${count === 1 ? label : label + 's'}`
}

// ---------------------------------------------------------------------------
// Card primitive — square cover, title + subtitle BELOW the image.
// No gradient overlays anywhere. The rank chip is a solid pill in the
// brand purple/rose; the count chip is a flat white pill.
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  href: string
  image: string
  title: string
  subtitle: string
  rank: number
  countLabel?: string | null
}

function CarouselCard({
  href,
  image,
  title,
  subtitle,
  rank,
  countLabel,
}: CarouselCardProps) {
  return (
    <Link
      href={href}
      className="group relative w-[160px] sm:w-[184px] flex-shrink-0 snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2 rounded-2xl"
    >
      {/* Square cover — image only, no overlays except the two solid chips */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#7B2D8E]/[0.06]">
        <Image
          src={image}
          alt=""
          fill
          sizes="184px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04] group-active:scale-[0.99]"
        />

        {/* Solid rank chip, top-left */}
        <div
          className="absolute top-2 left-2 inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shadow-sm bg-[#7B2D8E] text-white"
          aria-hidden="true"
        >
          {rank}
        </div>

        {/* Solid count chip, top-right — only when we have real data */}
        {countLabel && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white shadow-sm">
            <Eye className="w-3 h-3 text-[#7B2D8E]" />
            <span className="text-[10px] font-semibold text-gray-800 leading-none">
              {countLabel}
            </span>
          </div>
        )}
      </div>

      {/* Title + caption sit BELOW the cover so we don't need a
          gradient to keep them readable. */}
      <div className="mt-2 px-0.5">
        <h3 className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 text-balance">
          {title}
        </h3>
        <p className="mt-0.5 text-[11.5px] text-gray-500 leading-snug line-clamp-2">
          {subtitle}
        </p>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Rail wrapper — eyebrow chip, title, subtitle, scroll-snap carousel.
// ---------------------------------------------------------------------------

interface RailProps {
  eyebrow: string
  title: string
  subtitle: string
  viewAllHref: string
  isLoading: boolean
  children: React.ReactNode
}

function Rail({
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  isLoading,
  children,
}: RailProps) {
  return (
    <section className="pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/10 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#7B2D8E]" />
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

      <div className="relative">
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 px-4 max-w-6xl mx-auto recommendations-rail"
          role="list"
        >
          {isLoading ? <RailSkeleton /> : children}
        </div>
        <style jsx>{`
          .recommendations-rail {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .recommendations-rail::-webkit-scrollbar {
            display: none;
          }
        `}</style>
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
          className="w-[160px] sm:w-[184px] flex-shrink-0 snap-start"
        >
          <div className="aspect-square w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="mt-2 h-3 rounded bg-gray-100 animate-pulse w-3/4" />
          <div className="mt-1.5 h-2.5 rounded bg-gray-100 animate-pulse w-1/2" />
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Public component — auth-gated.
// ---------------------------------------------------------------------------

export default function RecommendationsSection() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Don't fetch — and don't render — for anonymous visitors. The
  // homepage already has plenty of social proof for them (testimonials,
  // gallery, stats), so we keep this section as a logged-in perk.
  const { data, isLoading } = useSWR<ApiResponse>(
    isAuthenticated ? '/api/recommendations' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    },
  )

  // Hide while auth resolves to avoid a pop-in on the first paint.
  if (authLoading || !isAuthenticated) {
    return null
  }

  const visited =
    data?.mostVisited && data.mostVisited.length > 0
      ? data.mostVisited.slice(0, 10)
      : buildFallbackVisited()

  const visitedHasData = !!data?.mostVisited?.length

  return (
    <div className="bg-white pb-2">
      <Rail
        eyebrow="Recommended for you"
        title="Most-visited services this month"
        subtitle="What other Dermaspace clients are browsing right now."
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
          />
        ))}
      </Rail>

      {/* The "Most-loved by clients" rail (booking-driven) is wired
          but intentionally hidden until the booking flow ships and we
          have real `booking_services` rows to rank. The API still
          returns `mostBooked` so flipping this back on later is a
          one-line change. */}
    </div>
  )
}
