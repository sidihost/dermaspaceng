'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { TrendingUp, ArrowRight, Eye, Crown, Flame, Award } from 'lucide-react'
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
// Rank badge — a small "trophy"-style ribbon that anchors each card.
//
// The previous treatments swung between extremes: a flat plum disc
// with a single digit ("1", "2") which read as a marker rather than
// a celebration, and a frosted-glass crown pill that used the same
// glyph for every rank (so it lost meaning past #1). This version
// gives each of the top three positions its own contextual icon
// (crown / flame / award) so the rail visually signals podium order
// at a glance, then falls through to a clean `#04`-style label for
// everything below it. The badge sits inside an opaque white pill
// with a soft drop-shadow so it reads cleanly against any photo
// — no opacity tints, no faded purple. -----------------------------
// ---------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  // Top-three rendering: solid brand pill + white icon + white "#1".
  // The icon is the meaningful part — a crown for the leader, a
  // flame for the runner-up's momentum, and an award for the bronze
  // position. Beyond #3 we drop the icon and show a clean white
  // pill with a tabular `#04` so a long rail of services can be
  // skimmed by number alone.
  if (rank <= 3) {
    const Icon = rank === 1 ? Crown : rank === 2 ? Flame : Award
    return (
      <div
        className="inline-flex items-center gap-1 h-7 pl-1.5 pr-2.5 rounded-full bg-[#7B2D8E] text-white shadow-md ring-2 ring-white/90"
        aria-label={`Rank ${rank}`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        <span className="text-[11px] font-bold tabular-nums leading-none">
          #{rank}
        </span>
      </div>
    )
  }

  return (
    <div
      className="inline-flex items-center justify-center h-7 px-2.5 rounded-full bg-white text-[#7B2D8E] shadow-md ring-2 ring-white/90"
      aria-label={`Rank ${rank}`}
    >
      <span className="text-[11px] font-bold tabular-nums leading-none">
        #{rank.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card primitive — framed white card with a square cover + caption.
//
// Inspired by the Derma AI capabilities sheet: each card sits inside
// a real white frame (rounded-3xl, hairline brand-purple border,
// soft shadow) so it reads as a deliberate object rather than a
// floating thumbnail. The cover keeps its 1:1 ratio so the rail
// still feels image-led, then the caption block underneath gets
// proper padding and a small "Explore" affordance so the card has
// somewhere to *go*. Card width nudged up from 160/184 → 170/196 so
// the framing has a chance to breathe — the team flagged the
// previous compact size as feeling too thumbnail-y.
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
      className="group relative w-[170px] sm:w-[196px] flex-shrink-0 snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2 bg-white border border-[#7B2D8E]/15 rounded-3xl shadow-[0_2px_8px_-2px_rgba(123,45,142,0.08)] hover:shadow-[0_8px_20px_-6px_rgba(123,45,142,0.18)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      {/* Cover region — square crop. We round only the top corners so
          the cover sits flush against the caption and the whole
          card reads as a single framed object. */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#FAF6FB]">
        <Image
          src={image}
          alt=""
          fill
          sizes="196px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05] group-active:scale-[0.99]"
        />

        {/* Rank ribbon — sits at the top-left, half-overlapping the
            edge. The ring-2 ring-white border gives it a "stamped"
            look that survives any photo behind it. */}
        <div className="absolute top-2.5 left-2.5">
          <RankBadge rank={rank} />
        </div>

        {/* View-count chip — top-right. Same elevated white pill
            language as the rank badge so the two reads as a pair. */}
        {countLabel && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-white text-[#7B2D8E] shadow-md ring-2 ring-white/90">
            <Eye className="w-3 h-3" aria-hidden />
            <span className="text-[10px] font-bold tabular-nums leading-none">
              {countLabel}
            </span>
          </div>
        )}
      </div>

      {/* Caption block — proper padding inside the frame so the
          title and subtitle feel like card content, not loose
          captions floating below a thumbnail. The "Explore" row at
          the bottom gives the card an obvious destination. */}
      <div className="px-3 pt-2.5 pb-3">
        <h3 className="text-[13.5px] font-bold text-[#1a0d1f] leading-snug line-clamp-1 text-balance">
          {title}
        </h3>
        <p className="mt-0.5 text-[11.5px] text-[#1a0d1f]/60 leading-snug line-clamp-2 min-h-[2.4em]">
          {subtitle}
        </p>
        <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7B2D8E]">
          <span>Explore</span>
          <ArrowRight className="w-2.5 h-2.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
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
    <section className="pt-6 sm:pt-8">
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
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-white">
                {eyebrow}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1a0d1f] leading-tight tracking-tight text-balance">
              {title}
            </h2>
            {/* Subtitle uses ink at 60% (a true neutral) instead of
                a faded purple. */}
            <p className="mt-0.5 text-xs sm:text-[13px] text-[#1a0d1f]/60 leading-relaxed text-pretty">
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
          className="w-[170px] sm:w-[196px] flex-shrink-0 snap-start bg-white border border-[#7B2D8E]/10 rounded-3xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(123,45,142,0.06)]"
        >
          {/* Skeleton uses a near-white neutral, NOT a low-opacity
              brand purple — the latter renders as muddy lavender
              while loading. */}
          <div className="aspect-square w-full bg-[#F4ECF6] animate-pulse" />
          <div className="px-3 pt-2.5 pb-3">
            <div className="h-3 rounded bg-[#F4ECF6] animate-pulse w-3/4" />
            <div className="mt-1.5 h-2.5 rounded bg-[#F4ECF6] animate-pulse w-1/2" />
            <div className="mt-2 h-2.5 rounded bg-[#F4ECF6] animate-pulse w-1/4" />
          </div>
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
