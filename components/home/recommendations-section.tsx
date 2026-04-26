'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import {
  TrendingUp,
  ArrowRight,
  Eye,
  Crown,
  Flame,
  Award,
} from 'lucide-react'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

// ---------------------------------------------------------------------------
// <RecommendationsSection />
//
// Spotify-inspired discovery rail for the homepage. Renders one
// horizontal carousel driven by a real platform signal:
//
//   "Most-visited services this month" — service categories ranked
//   by aggregate page-view volume in the last 30 days, sourced from
//   the `page_views` table that `<PageViewTracker />` writes to on
//   every navigation.
//
// Visible to everyone (logged-in OR logged-out) — recommendations
// are a discovery aid for first-time visitors too. Falls back to a
// curated mix from `SERVICES_CATALOG` when the API has no data yet
// (cold start, fresh deploy, ad blockers).
//
// Real-time-ish: the API caches at the edge for 60s, and the SWR
// client revalidates on focus + on tab visibility change so the
// counts update soon after a visitor browses to a service page and
// comes back to the homepage. The dedupe window is 30s so we don't
// hammer the endpoint, but it's short enough that browsing one
// service then jumping back to the homepage refreshes the rail.
//
// Auto-advance: once the visitor has seen the rail for ~5s, the
// carousel begins gently auto-scrolling one card at a time every
// few seconds. Any user interaction (touch, hover, focus, manual
// scroll) pauses auto-advance so we never fight the user. When the
// rail reaches the end it loops back to the start.
//
// A future "Most-loved by clients" rail (booking-driven) is wired
// in the API but intentionally hidden here until the booking flow
// ships and we have real `booking_services` rows to rank.
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
// RankBadge — celebratory rank marker, anchored top-left of each cover.
//
// Top three positions get a contextual icon (Crown / Flame / Award)
// alongside the number so the podium reads at a glance. Beyond #3
// we drop the icon for a clean numbered disc that survives long
// rails without losing meaning. Solid plum + white throughout —
// no opacity tints, no faded purple. -------------------------------
// ---------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const Icon = rank === 1 ? Crown : rank === 2 ? Flame : Award
    return (
      <div
        className="inline-flex items-center gap-1 h-7 pl-1.5 pr-2.5 rounded-full bg-[#7B2D8E] text-white shadow-md"
        aria-label={`Rank ${rank}`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        <span className="text-[12px] font-bold tabular-nums leading-none">
          {rank}
        </span>
      </div>
    )
  }
  return (
    <div
      className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-full bg-[#7B2D8E] text-white shadow-sm"
      aria-label={`Rank ${rank}`}
    >
      <span className="text-[12px] font-bold tabular-nums leading-none">
        {rank}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card primitive — square cover, title + subtitle BELOW the image.
//
// The "image + caption underneath" treatment the team confirmed via
// screenshot is the desired look — no white frame, no border, no
// shadow, no Explore affordance, just the rounded cover + a rank
// badge + caption sitting directly below.
//
// Width 160/184 with the wrapping element block-level. Two full
// cards plus the edge of a third fit on a typical 360 CSS-px mobile
// viewport — that "two-and-a-peek" rhythm matches the reference
// screenshot the team confirmed and keeps the rail visually in line
// with the other home sections (services grid, packages, etc.) so
// it doesn't read as oversized next to them. We use `min-w`
// alongside `w` so the value survives any parent layout that might
// try to shrink it.
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
      className="group block w-[160px] min-w-[160px] sm:w-[184px] sm:min-w-[184px] flex-shrink-0 snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2 rounded-2xl"
    >
      {/* Square cover. Placeholder uses a near-white neutral so the
          card never looks "purple-grey" while images load. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#FAF6FB]">
        <Image
          src={image}
          alt=""
          fill
          sizes="184px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04] group-active:scale-[0.99]"
        />

        {/* Rank badge — top-left. Top three carry a contextual icon. */}
        <div className="absolute top-2.5 left-2.5">
          <RankBadge rank={rank} />
        </div>

        {/* Solid white view-count chip — top-right. Only shown when
            we have real data (i.e. not the static fallback). */}
        {countLabel && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-white text-[#7B2D8E] shadow-sm">
            <Eye className="w-3 h-3" aria-hidden />
            <span className="text-[10px] font-bold tabular-nums leading-none">
              {countLabel}
            </span>
          </div>
        )}
      </div>

      {/* Caption — sits directly below the cover with no card frame
          around it. Title is the strongest weight; subtitle uses ink
          at 60% (a true neutral) instead of a faded purple so it
          doesn't read as "muddy lavender". `font-sans` is repeated
          here so the caption lands on Lexend Deca even if a parent
          surface forgets to set it. */}
      <div className="mt-2.5 px-0.5 font-sans">
        <h3 className="font-sans text-sm font-bold text-[#1a0d1f] leading-snug line-clamp-1 text-balance">
          {title}
        </h3>
        <p className="font-sans mt-0.5 text-xs text-[#1a0d1f]/60 leading-snug line-clamp-2 min-h-[2.6em]">
          {subtitle}
        </p>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Rail wrapper — eyebrow chip, title, subtitle, scroll-snap carousel.
// Now self-managed: holds a ref to its own scroll container and
// auto-advances the carousel one card at a time on a 4-second
// cadence. Auto-advance pauses on any user interaction.
// ---------------------------------------------------------------------------

interface RailProps {
  eyebrow: string
  title: string
  subtitle: string
  viewAllHref: string
  isLoading: boolean
  // We need to know when there's at least one card so we don't try
  // to auto-scroll an empty/loading rail.
  hasItems: boolean
  children: React.ReactNode
}

function Rail({
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  isLoading,
  hasItems,
  children,
}: RailProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  // `pausedRef` is intentionally a ref, not state — flipping it
  // doesn't need to trigger a re-render, and the interval reads
  // the latest value on every tick.
  const pausedRef = useRef(false)

  useEffect(() => {
    // Don't bother scheduling a tick until we actually have cards
    // mounted. (The skeleton placeholder isn't real content.)
    if (!hasItems) return

    // Respect the user's "reduce motion" preference. People who set
    // this OS-level flag explicitly don't want auto-moving content,
    // so we just don't schedule an interval for them.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const id = window.setInterval(() => {
      const el = scrollerRef.current
      if (!el || pausedRef.current) return

      // The card width changes between mobile (160px) and sm+
      // (184px). Read the first child width at runtime so we always
      // step exactly one card forward, matching the snap-mandatory
      // points the browser will land on.
      const firstCard = el.querySelector<HTMLElement>('[data-rec-card]')
      const gap = 16 // matches the `gap-3 sm:gap-4` (12/16px) — round to 16
      const step = firstCard ? firstCard.offsetWidth + gap : 200

      // If we're at (or past) the end, loop back to the start. We
      // give the comparison a small tolerance because browsers can
      // snap to a position 1-2px short of `scrollWidth`.
      const atEnd =
        el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' })
      }
    }, 4000)

    return () => window.clearInterval(id)
  }, [hasItems])

  // Pause on any interaction. We intentionally keep it paused for
  // the rest of the page-view — once a user has touched the rail
  // they're driving it themselves, and resuming auto-advance later
  // would feel like the page is fighting them.
  const pauseAutoplay = () => {
    pausedRef.current = true
  }

  return (
    // `font-sans` is set explicitly on the section root so every
    // descendant (eyebrow, title, subtitle, card title, card subtitle)
    // resolves to Lexend Deca — the brand body font configured in
    // app/globals.css. Without this, some headings were rendering in
    // the browser's default serif fallback because no ancestor in the
    // section's render path was forcing the family, and the rail
    // visibly clashed with the rest of the homepage.
    <section className="pt-6 sm:pt-8 font-sans">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div className="min-w-0">
            {/* Eyebrow chip — solid brand purple background, white
                text. The previous `bg-[#7B2D8E]/10` tint rendered
                as a washed-out lavender that the team flagged as
                "grey-purple". Solid brand color + white reads
                cleanly and matches the rest of the surface. */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E] mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
              <span className="font-sans text-[10px] font-bold tracking-[0.14em] uppercase text-white">
                {eyebrow}
              </span>
            </div>
            <h2 className="font-sans text-lg sm:text-xl font-bold text-[#1a0d1f] leading-tight tracking-tight text-balance">
              {title}
            </h2>
            {/* Subtitle uses ink at 60% (a true neutral) instead of
                a faded purple. */}
            <p className="font-sans mt-0.5 text-xs sm:text-[13px] text-[#1a0d1f]/60 leading-relaxed text-pretty">
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
          ref={scrollerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 px-4 max-w-6xl mx-auto recommendations-rail"
          role="list"
          // Pause autoplay on any sign of human attention. We listen
          // on the scroller (not the window) so unrelated taps
          // elsewhere on the page don't stop the rail.
          onMouseEnter={pauseAutoplay}
          onTouchStart={pauseAutoplay}
          onPointerDown={pauseAutoplay}
          onFocus={pauseAutoplay}
          onWheel={pauseAutoplay}
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
          className="block w-[160px] min-w-[160px] sm:w-[184px] sm:min-w-[184px] flex-shrink-0 snap-start"
        >
          {/* Skeleton uses a near-white neutral, NOT a low-opacity
              brand purple — the latter renders as muddy lavender
              while loading. */}
          <div className="aspect-square w-full rounded-2xl bg-[#F4ECF6] animate-pulse" />
          <div className="mt-3 h-3.5 rounded bg-[#F4ECF6] animate-pulse w-3/4" />
          <div className="mt-1.5 h-3 rounded bg-[#F4ECF6] animate-pulse w-1/2" />
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Public component.
// ---------------------------------------------------------------------------

export default function RecommendationsSection() {
  // Visible to everyone — recommendations are a discovery aid for
  // logged-out visitors too. We revalidate on focus / tab visibility
  // so the rail picks up new visits in near-real-time once the
  // visitor returns to the homepage.
  const { data, isLoading } = useSWR<ApiResponse>(
    '/api/recommendations',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      dedupingInterval: 30 * 1000,
    },
  )

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
        hasItems={visited.length > 0}
      >
        {visited.map((item, i) => (
          // `data-rec-card` is consumed by the auto-advance effect
          // in <Rail/> to read the live card width and step exactly
          // one card forward per tick.
          <div key={`v-${item.slug}-${i}`} data-rec-card>
            <CarouselCard
              href={item.href}
              image={item.image}
              title={item.title}
              subtitle={item.description}
              rank={i + 1}
              countLabel={
                visitedHasData ? formatCount(item.count, 'view') : null
              }
            />
          </div>
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
