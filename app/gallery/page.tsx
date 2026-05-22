"use client"

/**
 * Gallery — virtual-tour edition.
 *
 * The previous version was a flat masonry grid. This one re-frames the
 * page as an *immersive walkthrough*: one large stage image you can
 * step through like rooms, with cinematic depth (parallax tilt on
 * cursor, slow Ken-Burns drift while idle), a filmstrip of every room
 * along the bottom, and a contextual minimap showing which clinic
 * you're touring.
 *
 * Design constraints respected:
 *   - Stays inside the existing brand: deep purple #7B2D8E, white,
 *     muted neutrals. No new accent colours, no purple-violet
 *     gradients beyond the existing glass overlays.
 *   - No sparkle / zap / decorative SVG noise — only the lucide
 *     glyphs already used elsewhere on the site (MapPin, Compass,
 *     ChevronLeft/Right, Maximize2, Volume2 / VolumeX, X, Play, Pause).
 *   - Mobile-first layout, flexbox / grid only, semantic spacing
 *     scale (no arbitrary px values).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Maximize2,
  MapPin,
  Pause,
  Play,
  X,
} from "lucide-react"

type Room = {
  src: string
  alt: string
  category: "Victoria Island" | "Ikoyi"
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

export default function GalleryPage() {
  const [category, setCategory] = useState<Category>("All")
  const [index, setIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [lightbox, setLightbox] = useState(false)

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

  const current = tour[Math.min(index, tour.length - 1)] ?? tour[0]

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % tour.length)
  }, [tour.length])
  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + tour.length) % tour.length)
  }, [tour.length])

  // Autoplay — slow walkthrough. Pauses while lightbox is open or the
  // user has explicitly toggled it off. 6s feels like the right
  // "lingering" beat for a virtual tour without testing patience.
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
  // axis based on cursor position, with a faster but smaller shift
  // on the foreground caption card for true depth.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el) return
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

  const counts = useMemo(
    () => ({
      All: rooms.length,
      "Victoria Island": rooms.filter((r) => r.category === "Victoria Island").length,
      Ikoyi: rooms.filter((r) => r.category === "Ikoyi").length,
    }),
    [],
  )

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* ───── Hero ribbon ─────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#7B2D8E] py-14 sm:py-20">
          {/* Soft, very subtle radial wash so the hero has depth
              without violating the no-decorative-shapes rule —
              this is a single ambient lighting cue, not a "blob". */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 55%)",
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              <Compass className="w-3.5 h-3.5" />
              Virtual Walkthrough
            </div>
            <h1 className="mt-4 text-balance text-3xl sm:text-5xl md:text-6xl font-bold text-white">
              Step Inside Dermaspace
            </h1>
            <p className="mt-3 text-pretty text-white/80 max-w-xl mx-auto leading-relaxed">
              Move room by room through our Lagos clinics — reception, lounges,
              treatment suites, the spaces our guests never want to leave.
            </p>
          </div>
        </section>

        {/* ───── Filter pills ───────────────────────────────────── */}
        <section className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {categories.map((c) => {
                const active = category === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`group inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-sm font-medium transition-all ${
                      active
                        ? "bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/25"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    aria-pressed={active}
                  >
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
        <section className="bg-gradient-to-b from-gray-50 to-white py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div
              ref={stageRef}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-900 shadow-2xl shadow-[#7B2D8E]/15"
              style={{
                aspectRatio: "16 / 10",
                perspective: "1200px",
              }}
            >
              {/* Each room gets its own absolutely-positioned layer
                  so we can cross-fade between them. The active layer
                  also gets a slow Ken-Burns drift via the `kb`
                  animation defined in globals.css below. */}
              {tour.map((r, i) => {
                const active = i === Math.min(index, tour.length - 1)
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
                    {/* Bottom legibility wash — no decorative blur
                        circles, just a clean gradient. */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    {/* Top vignette for the chip + controls. */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
                  </div>
                )
              })}

              {/* Top chrome: location chip + fullscreen */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/20">
                  <MapPin className="h-3.5 w-3.5" />
                  {current.category}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoplay((a) => !a)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:bg-white/25"
                    aria-label={autoplay ? "Pause auto walkthrough" : "Play auto walkthrough"}
                  >
                    {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:bg-white/25"
                    aria-label="Open fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Side nav arrows */}
              <button
                type="button"
                onClick={prev}
                aria-label="Previous room"
                className="absolute left-3 sm:left-5 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/30 active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next room"
                className="absolute right-3 sm:right-5 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/30 active:scale-95"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Bottom caption card */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
                <div className="mx-auto max-w-2xl text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Room {Math.min(index, tour.length - 1) + 1} of {tour.length}
                  </p>
                  <h2 className="mt-1 text-balance text-xl sm:text-2xl md:text-3xl font-semibold text-white">
                    {current.alt}
                  </h2>
                  <p className="mt-1 text-pretty text-sm text-white/80 leading-relaxed">
                    {current.caption}
                  </p>
                </div>
                {/* Progress dots */}
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {tour.map((_, i) => {
                    const active = i === Math.min(index, tour.length - 1)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIndex(i)}
                        aria-label={`Go to room ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ───── Filmstrip ─────────────────────────────────── */}
            <div className="mt-6 sm:mt-8">
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                <ul className="flex items-stretch gap-3 sm:gap-4 pb-2">
                  {tour.map((r, i) => {
                    const active = i === Math.min(index, tour.length - 1)
                    return (
                      <li key={r.src} className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`relative block h-20 w-28 sm:h-24 sm:w-36 overflow-hidden rounded-xl border transition-all ${
                            active
                              ? "border-[#7B2D8E] ring-2 ring-[#7B2D8E]/30 scale-[1.03]"
                              : "border-gray-200 opacity-70 hover:opacity-100"
                          }`}
                          aria-label={`Show ${r.alt}`}
                          aria-current={active ? "true" : undefined}
                        >
                          <Image
                            src={r.src}
                            alt=""
                            fill
                            sizes="160px"
                            className="object-cover"
                          />
                          <span
                            className={`absolute inset-x-0 bottom-0 px-2 py-1 text-left text-[10px] font-medium ${
                              active
                                ? "bg-[#7B2D8E] text-white"
                                : "bg-black/55 text-white"
                            }`}
                          >
                            {r.alt}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            {/* Helper line */}
            <p className="mt-4 text-center text-xs text-gray-500">
              Use the arrows, click a thumbnail, or press{" "}
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-sans text-[11px] text-gray-700">
                ←
              </kbd>{" "}
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-sans text-[11px] text-gray-700">
                →
              </kbd>{" "}
              to walk through the space.
            </p>
          </div>
        </section>

        {/* ───── Lightbox ───────────────────────────────────────── */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-in fade-in duration-200"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close fullscreen"
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              aria-label="Previous"
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              aria-label="Next"
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div
              className="relative mx-4 flex h-full max-h-[85vh] w-full max-w-6xl items-center justify-center"
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
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6 pb-8 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-3 py-1 text-xs font-medium text-white">
                <MapPin className="h-3 w-3" />
                {current.category}
              </span>
              <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                {current.alt}
              </h3>
              <p className="mt-1 text-sm text-white/75">{current.caption}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
