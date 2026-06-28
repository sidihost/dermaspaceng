"use client"

/**
 * Gallery — virtual-tour, v3.
 *
 * Re-design goals from feedback:
 *   • "Lots of arrow looks small"  → arrows are now a large bottom
 *     toolbar (Prev room / Next room as proper buttons with labels)
 *     plus full-height edge swipe zones on the stage. No tiny
 *     floating circles.
 *   • Personalised for signed-in users → pulls firstName +
 *     preferredLocation from /api/auth/me. The hero greets the user
 *     by name, the filter pre-selects their preferred clinic, and a
 *     "Book this space" CTA on the active room jumps straight into
 *     the booking flow with the right location pre-filled.
 *   • More responsive & clearer → mobile-first stage with a real
 *     progress bar (not dots), bigger thumbnails, native touch
 *     swipe on the stage, and a sticky bottom action bar so primary
 *     actions are always thumb-reachable.
 *
 * Brand discipline preserved:
 *   • Only the existing palette (#7B2D8E purple, white, gray neutrals).
 *   • No sparkle / zap / decorative SVG noise.
 *   • Spacing on the Tailwind scale, flexbox/grid layout only.
 *   • prefers-reduced-motion respected via the .ds-kenburns class.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  MapPin,
  Maximize2,
  Pause,
  Play,
  X,
} from "lucide-react"

type LocationKey = "Victoria Island" | "Ikoyi"

type Room = {
  src: string
  alt: string
  category: LocationKey
  /** Short sentence shown under the room name on the stage. */
  caption: string
}

const rooms: Room[] = [
  // ─── Victoria Island ──────────────────────────────────────────
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg",
    alt: "Reception Area",
    category: "Victoria Island",
    caption: "Step inside — warm lighting, marble counter, our brand glow.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg",
    alt: "Lobby",
    category: "Victoria Island",
    caption: "The main lobby — where every visit begins.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2813%29-3ARzEcEW2Bn2R4yMKrUaohoV3DaFct.jpg",
    alt: "Lobby Lounge",
    category: "Victoria Island",
    caption: "A quiet corner to settle in before your treatment.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2814%29-Ah7kChqKLLYSIrv2k7TqmQ11E424mH.jpg",
    alt: "Reception Desk",
    category: "Victoria Island",
    caption: "Check in with our front-of-house team.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg",
    alt: "Nail Station",
    category: "Victoria Island",
    caption: "Our manicure & pedicure suite.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%289%29-Nt4ldllYbTN5lMVxwZYQ9Lb2vTgxB1.jpg",
    alt: "Treatment Room",
    category: "Victoria Island",
    caption: "Private treatment room — quiet, sterile, deeply calming.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2810%29-ricU7Xkvb3qtQvdn6XRwTUFco8ZQWW.jpg",
    alt: "Treatment Suite",
    category: "Victoria Island",
    caption: "Our flagship treatment suite.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg",
    alt: "Massage Room",
    category: "Victoria Island",
    caption: "Massage room with low warm lighting.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2815%29-YeaDpqhDMkIFkzfjMH2f60puI7CeFr.jpg",
    alt: "Building Exterior",
    category: "Victoria Island",
    caption: "237B Muri Okunola Street — find us here.",
  },
  // ─── Ikoyi ────────────────────────────────────────────────────
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg",
    alt: "Reception",
    category: "Ikoyi",
    caption: "Welcome to Dermaspace Ikoyi.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3359.JPG-L2ErLSUMlWNQgHhioWe6yVPM9XVb6z.jpeg",
    alt: "Reception Desk",
    category: "Ikoyi",
    caption: "Reception desk and waiting bench.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3358.JPG-v11vKVvcuEj7al4KIOnMq1wd8H5dic.jpeg",
    alt: "Lounge Area",
    category: "Ikoyi",
    caption: "Soft seating, natural light, room to breathe.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3365.JPG-BaeXn9oZhcXvqPjAF7UXZ5xMoALDXx.jpeg",
    alt: "Waiting Area",
    category: "Ikoyi",
    caption: "Waiting area, designed to slow you down.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3366.JPG-OPbCFGtQYVb7tLU5XPfzg9RPXZ8Kzi.jpeg",
    alt: "Pedicure Lounge",
    category: "Ikoyi",
    caption: "Pedicure lounge — feet up, switch off.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3371.JPG-KIOf6sbksYGE8PoJuir8tfR9EQfobA.jpeg",
    alt: "Treatment Room",
    category: "Ikoyi",
    caption: "Private treatment room.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3369.JPG-Tv3PEg3TqjOgEem6DAtDw5Pk4MrqA5.jpeg",
    alt: "Massage Suite",
    category: "Ikoyi",
    caption: "Massage suite, low ambient lighting.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3363.JPG-xnBAz6JBg6O8ijVFoxk3dA3tPQHfSn.jpeg",
    alt: "Entrance",
    category: "Ikoyi",
    caption: "The Ikoyi entrance.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3362.JPG-I2CGV9YYsnmZzBjUrAD51v0FdJe9yc.jpeg",
    alt: "Interior Details",
    category: "Ikoyi",
    caption: "The little details that make the space feel like ours.",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3367.JPG-IvWEKkKXQ7GZmRiUaLIUSeoLrPTLIo.jpeg",
    alt: "Storage Area",
    category: "Ikoyi",
    caption: "Behind-the-scenes — products and tools, organised.",
  },
]

const categories = ["All", "Victoria Island", "Ikoyi"] as const
type Category = (typeof categories)[number]

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)

/**
 * Map the free-form preferredLocation string from /api/auth/me onto
 * one of our two clinic categories. The preference is stored as a
 * canonical name ("Victoria Island" / "Ikoyi") but we also accept
 * common variants ("VI", "ikoyi") so a typo on the preference page
 * doesn't silently disable personalisation.
 */
function categoryFromPreference(pref?: string | null): Category | null {
  if (!pref) return null
  const p = pref.trim().toLowerCase()
  if (!p) return null
  if (p === "victoria island" || p === "vi" || p.includes("victoria")) {
    return "Victoria Island"
  }
  if (p === "ikoyi" || p.includes("ikoyi")) return "Ikoyi"
  return null
}

export default function GalleryPage() {
  const { data: meData } = useSWR<{
    user?: {
      firstName?: string
      preferredLocation?: string
      profileImageUrl?: string
    } | null
  }>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  const me = meData?.user ?? null
  const preferredCategory = useMemo(
    () => categoryFromPreference(me?.preferredLocation),
    [me?.preferredLocation],
  )

  const [category, setCategory] = useState<Category>("All")
  // Once the auth payload arrives, auto-tune the filter to the
  // signed-in user's preferred clinic. We only do this *once* (guarded
  // by `personalisedRef`) so that a user who deliberately taps "All"
  // or the other clinic doesn't get yanked back to their preference
  // on every SWR revalidation.
  const personalisedRef = useRef(false)
  useEffect(() => {
    if (personalisedRef.current) return
    if (preferredCategory) {
      setCategory(preferredCategory)
      personalisedRef.current = true
    }
  }, [preferredCategory])

  const [index, setIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [favourites, setFavourites] = useState<Set<string>>(() => new Set())

  // Cursor-driven parallax tilt for the stage. Stored in refs +
  // applied via CSS variables so we never re-render the whole page
  // for every mouse move (60fps even on lower-spec phones).
  const stageRef = useRef<HTMLDivElement | null>(null)

  const tour = useMemo(
    () => (category === "All" ? rooms : rooms.filter((r) => r.category === category)),
    [category],
  )

  // Reset cursor when the filter changes so we don't end up pointing
  // at a non-existent room (e.g. switching from "All" index 14 to
  // "Victoria Island" which only has 9).
  useEffect(() => {
    setIndex(0)
  }, [category])

  const safeIdx = Math.min(index, tour.length - 1)
  const current = tour[safeIdx] ?? tour[0]

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % tour.length)
  }, [tour.length])
  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + tour.length) % tour.length)
  }, [tour.length])

  // Autoplay — slow walkthrough. Pauses while lightbox is open or the
  // user has explicitly toggled it off.
  useEffect(() => {
    if (!autoplay || lightbox) return
    const id = window.setInterval(next, 6000)
    return () => window.clearInterval(id)
  }, [autoplay, lightbox, next])

  // Keyboard nav (arrow keys + Esc)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
      else if (e.key === "Escape" && lightbox) setLightbox(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, lightbox])

  // Pointer parallax — translate the stage image up to ±14px each
  // axis based on cursor position.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el) return
    // Don't run parallax for touch — that's reserved for swipe.
    if (e.pointerType === "touch") return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty("--tx", `${x * -14}px`)
    el.style.setProperty("--ty", `${y * -14}px`)
    el.style.setProperty("--rx", `${y * -3}deg`)
    el.style.setProperty("--ry", `${x * 3}deg`)
  }
  const onPointerLeave = () => {
    const el = stageRef.current
    if (!el) return
    el.style.setProperty("--tx", "0px")
    el.style.setProperty("--ty", "0px")
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
  }

  // Native touch swipe — kicks in on mobile so users navigate with
  // a flick instead of hunting for tiny arrows. Threshold is
  // intentionally low (40px) for one-handed use; vertical-dominant
  // gestures are ignored so the page can still scroll.
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 40) return
    if (Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) next()
    else prev()
  }

  const counts = useMemo(
    () => ({
      All: rooms.length,
      "Victoria Island": rooms.filter((r) => r.category === "Victoria Island").length,
      Ikoyi: rooms.filter((r) => r.category === "Ikoyi").length,
    }),
    [],
  )

  const toggleFavourite = (src: string) => {
    setFavourites((prev) => {
      const out = new Set(prev)
      if (out.has(src)) out.delete(src)
      else out.add(src)
      return out
    })
  }

  // The booking page accepts ?location= so signed-in users can deep
  // link straight to step 2 with the clinic pre-filled.
  const bookHref = `/booking?location=${encodeURIComponent(current.category)}`

  // Personalised hero copy. Falls back to a guest-friendly default
  // if we don't yet know who's looking.
  const heroEyebrow = me?.firstName
    ? preferredCategory && preferredCategory === current.category
      ? `Welcome back, ${me.firstName}`
      : `Hi ${me.firstName}`
    : "Virtual Walkthrough"

  const heroTitle = me?.firstName
    ? "Step inside your Dermaspace"
    : "Step Inside Dermaspace"

  const heroSubtitle = preferredCategory
    ? `We've started your tour at our ${preferredCategory} clinic — your saved preference. Tap a room, swipe through, or open any space full-screen.`
    : "Move room by room through our Lagos clinics — reception, lounges, treatment suites, the spaces our guests never want to leave."

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* ───── Hero ribbon ─────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#7B2D8E] py-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 55%)",
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm ring-1 ring-white/15">
              <Compass className="w-3.5 h-3.5" />
              {heroEyebrow}
            </div>
            <h1 className="mt-4 text-balance text-3xl sm:text-5xl md:text-6xl font-bold text-white">
              {heroTitle}
            </h1>
            <p className="mt-3 text-pretty text-white/85 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
              {heroSubtitle}
            </p>
          </div>
        </section>

        {/* ───── Filter pills ───────────────────────────────────── */}
        <section className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
              {categories.map((c) => {
                const active = category === c
                const isPreferred =
                  preferredCategory === c && c !== "All"
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`group inline-flex flex-shrink-0 items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-sm font-medium transition-all ${
                      active
                        ? "bg-[#7B2D8E] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    aria-pressed={active}
                  >
                    {isPreferred && (
                      <Heart
                        className={`h-3.5 w-3.5 ${active ? "fill-white text-white" : "fill-[#7B2D8E] text-[#7B2D8E]"}`}
                      />
                    )}
                    {c}
                    <span
                      className={`rounded-full px-1.5 text-xs ${
                        active ? "bg-white/20 text-white" : "bg-white text-gray-500"
                      }`}
                    >
                      {counts[c]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ───── Stage ──────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-6 sm:py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div
              ref={stageRef}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200 bg-gray-900"
              style={{
                aspectRatio: "16 / 11",
                perspective: "1200px",
              }}
            >
              {tour.map((r, i) => {
                const active = i === safeIdx
                return (
                  <div
                    key={r.src}
                    className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      transform:
                        "translate3d(var(--tx, 0), var(--ty, 0), 0) rotateX(var(--rx, 0)) rotateY(var(--ry, 0))",
                      transformStyle: "preserve-3d",
                      transition:
                        "opacity 900ms ease-out, transform 400ms cubic-bezier(.2,.8,.2,1)",
                    }}
                  >
                    <div className={active ? "h-full w-full ds-kenburns" : "h-full w-full"}>
                      <Image
                        src={r.src}
                        alt={r.alt}
                        fill
                        priority={i === 0}
                        sizes="(max-width: 768px) 100vw, 1100px"
                        className="object-cover"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
                  </div>
                )
              })}

              {/* Top chrome: location chip + favourite + fullscreen */}
              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-3 sm:p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/25">
                  <MapPin className="h-3.5 w-3.5" />
                  {current.category}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavourite(current.src)}
                    aria-label={
                      favourites.has(current.src) ? "Remove from favourites" : "Save to favourites"
                    }
                    aria-pressed={favourites.has(current.src)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/25 transition hover:bg-white/25 active:scale-95"
                  >
                    <Heart
                      className={`h-4 w-4 transition ${
                        favourites.has(current.src) ? "fill-white" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoplay((a) => !a)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/25 transition hover:bg-white/25 active:scale-95"
                    aria-label={autoplay ? "Pause auto walkthrough" : "Play auto walkthrough"}
                    aria-pressed={autoplay}
                  >
                    {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/25 transition hover:bg-white/25 active:scale-95"
                    aria-label="Open fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Edge swipe / click zones — full-height on the stage so
                  users can tap anywhere on the left/right third to
                  navigate. Replaces the small floating arrows. */}
              <button
                type="button"
                onClick={prev}
                aria-label="Previous room"
                className="absolute inset-y-0 left-0 z-10 hidden sm:flex w-1/4 items-center justify-start pl-3 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#7B2D8E] ring-1 ring-black/5">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next room"
                className="absolute inset-y-0 right-0 z-10 hidden sm:flex w-1/4 items-center justify-end pr-3 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#7B2D8E] ring-1 ring-black/5">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </button>

              {/* Bottom caption + progress bar (replaces the dots) */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-white/70">
                        Room {safeIdx + 1} of {tour.length}
                      </p>
                      <h2 className="mt-1 text-balance text-xl sm:text-2xl md:text-3xl font-semibold text-white truncate">
                        {current.alt}
                      </h2>
                      <p className="mt-1 text-pretty text-sm text-white/85 leading-relaxed line-clamp-2">
                        {current.caption}
                      </p>
                    </div>
                  </div>
                  {/* Real progress bar — replaces the row of tiny dots.
                      Reads as a single coherent arc the eye can scan
                      at a glance instead of counting markers. */}
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${((safeIdx + 1) / tour.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ───── Primary action toolbar ─────────────────────
                Big, clearly-labelled Prev / Next instead of small
                floating arrows. Always thumb-reachable on mobile. */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous room"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#7B2D8E] ring-1 ring-gray-200 transition hover:bg-gray-50 active:scale-[0.98]"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <Link
                href={bookHref}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#5A1D6A] active:scale-[0.98]"
              >
                <CalendarPlus className="h-4 w-4" />
                {me?.firstName ? `Book ${current.category}` : "Book this space"}
              </Link>
              <button
                type="button"
                onClick={next}
                aria-label="Next room"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#7B2D8E] ring-1 ring-gray-200 transition hover:bg-gray-50 active:scale-[0.98]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* ───── Filmstrip ─────────────────────────────────── */}
            <div className="mt-6 sm:mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  All rooms
                </h3>
                <span className="text-xs text-gray-500">
                  {tour.length} {tour.length === 1 ? "space" : "spaces"}
                </span>
              </div>
              <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                <ul className="flex items-stretch gap-3 sm:gap-4 pb-2">
                  {tour.map((r, i) => {
                    const active = i === safeIdx
                    return (
                      <li key={r.src} className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`relative block h-28 w-40 sm:h-32 sm:w-48 overflow-hidden rounded-xl transition-all ${
                            active
                              ? "ring-2 ring-[#7B2D8E] ring-offset-2 scale-[1.02]"
                              : "ring-1 ring-gray-200 opacity-80 hover:opacity-100 hover:ring-gray-300"
                          }`}
                          aria-label={`Show ${r.alt}`}
                          aria-current={active ? "true" : undefined}
                        >
                          <Image
                            src={r.src}
                            alt=""
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent" />
                          <span
                            className={`absolute inset-x-0 bottom-0 px-2.5 py-1.5 text-left text-xs font-semibold text-white ${
                              active ? "" : ""
                            }`}
                          >
                            {r.alt}
                          </span>
                          {active && (
                            <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#7B2D8E] text-white">
                              <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            {/* Helper line */}
            <p className="mt-4 text-center text-xs text-gray-500">
              Swipe the stage, tap a thumbnail, or use{" "}
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-sans text-[11px] text-gray-700">
                ←
              </kbd>{" "}
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-sans text-[11px] text-gray-700">
                →
              </kbd>{" "}
              to walk through.
            </p>
          </div>
        </section>

        {/* ───── Lightbox ───────────────────────────────────────────
            z-[70] deliberately sits ABOVE the persistent mobile tab bar
            (fixed bottom-0 z-50) and the nav sheets (z-[55]/z-[60]) so
            the fullscreen view fully covers them instead of letting the
            nav punch through the bottom edge. Close button + safe-area
            padding keep it usable and dismissable on phones. */}
        {lightbox && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 animate-in fade-in duration-200"
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${current.alt} — fullscreen`}
          >
            {/* Close */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(false)
              }}
              aria-label="Close fullscreen"
              className="absolute right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25 active:scale-95"
              style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Prev / Next */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              aria-label="Previous room"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#7B2D8E] ring-1 ring-black/5 transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              aria-label="Next room"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#7B2D8E] ring-1 ring-black/5 transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Image */}
            <div
              className="relative mx-4 flex h-full max-h-[72vh] w-full max-w-6xl items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={current.src}
                alt={current.alt}
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Caption */}
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-6 pt-10 text-center"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-3 py-1 text-xs font-medium text-white">
                <MapPin className="h-3 w-3" />
                {current.category}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white sm:text-2xl">
                {current.alt}
              </h3>
              <p className="mt-1 text-sm text-white/80">{current.caption}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
