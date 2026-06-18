'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Pause, ArrowRight } from 'lucide-react'

/**
 * Anniversary "story reel" — a full-screen, Instagram-stories-style
 * experience celebrating 7 years of Dermaspace.
 *
 * Mechanics:
 *  - Segment progress bars across the top auto-fill; the reel advances
 *    when a bar completes.
 *  - Tap/click the left third to go back, the right two-thirds to go
 *    forward. Press-and-hold (or the Pause affordance) pauses playback.
 *  - Arrow keys navigate; Escape closes.
 *  - A persistent close (X) sits top-right, and the final segment also
 *    carries its own close / "back to site" actions, per request.
 *
 * Visual language stays on-brand: deep brand purple (#7B2D8E), Playfair
 * serif for the display numerals/headlines, Lexend for body. Photo
 * segments use a neutral dark scrim purely for legibility.
 */

type Segment = {
  /** 'cover' = brand-purple panel, 'photo' = full-bleed image */
  kind: 'cover' | 'photo' | 'finale'
  image?: string
  kicker: string
  title: string
  highlight?: string
  body?: string
  stat?: string
  statLabel?: string
}

const SEGMENTS: Segment[] = [
  {
    kind: 'cover',
    kicker: 'Est. 2018',
    title: 'Seven years of',
    highlight: 'glowing skin',
    body: 'A little story about how far we have come — and the faces that brought us here.',
  },
  {
    kind: 'photo',
    image: '/images/hero-1.jpg',
    kicker: 'How it started',
    title: 'One room. One promise.',
    body: 'We opened with a simple idea: skincare built for Lagos skin and Lagos weather. No gimmicks — just results you can see.',
  },
  {
    kind: 'photo',
    image: '/images/hero-2.jpg',
    kicker: 'The work',
    title: 'Thousands of afternoons,',
    highlight: 'off your shoulders',
    body: 'Facials, peels, massages and steam — quiet hours that sent you out lighter than you walked in.',
  },
  {
    kind: 'cover',
    kicker: 'By the numbers',
    title: 'A community that',
    highlight: 'kept glowing',
    stat: '20,000+',
    statLabel: 'treatments and counting',
  },
  {
    kind: 'photo',
    image: '/images/hero-3.jpg',
    kicker: 'Always learning',
    title: 'Therapists who',
    highlight: 'know your skin',
    body: 'We listen first, recommend second, and build a plan that fits your life. Seven years on, that has never changed.',
  },
  {
    kind: 'finale',
    kicker: 'Year seven',
    title: 'Thank you for',
    highlight: 'celebrating with us',
    body: 'Here is to the next chapter — and to skin that always feels like yours.',
  },
]

const SEGMENT_MS = 6000

export default function AnniversaryReel() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [keyNonce, setKeyNonce] = useState(0) // forces content re-mount for replay of entrance anim
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = useCallback(() => {
    router.push('/')
  }, [router])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SEGMENTS.length - 1, index))
    setCurrent(clamped)
    setProgress(0)
    setKeyNonce((n) => n + 1)
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => {
      if (c >= SEGMENTS.length - 1) {
        // Stop on the finale instead of looping.
        return c
      }
      setProgress(0)
      setKeyNonce((n) => n + 1)
      return c + 1
    })
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => {
      if (c <= 0) {
        setProgress(0)
        setKeyNonce((n) => n + 1)
        return 0
      }
      setProgress(0)
      setKeyNonce((n) => n + 1)
      return c - 1
    })
  }, [])

  // Auto-advance progress loop.
  const isFinale = current === SEGMENTS.length - 1
  useEffect(() => {
    if (paused || isFinale) return
    const tick = 50
    const id = setInterval(() => {
      setProgress((p) => {
        const nextP = p + (tick / SEGMENT_MS) * 100
        if (nextP >= 100) {
          next()
          return 0
        }
        return nextP
      })
    }, tick)
    return () => clearInterval(id)
  }, [paused, isFinale, current, next])

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') close()
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, close])

  // Press-and-hold to pause (after a short delay so taps still navigate).
  const onPointerDown = () => {
    holdTimer.current = setTimeout(() => setPaused(true), 220)
  }
  const endHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setPaused(false)
  }

  const seg = SEGMENTS[current]

  return (
    <div className="fixed inset-0 z-50 bg-[#3d1547] text-white overflow-hidden select-none">
      {/* ── Backdrop ─────────────────────────────────────────────── */}
      {SEGMENTS.map((s, i) => {
        const active = i === current
        if (s.kind === 'photo' && s.image) {
          return (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: active ? 1 : 0 }}
              aria-hidden={!active}
            >
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={s.image || '/placeholder.svg'}
                  alt=""
                  fill
                  priority={i <= 1}
                  sizes="100vw"
                  className="object-cover"
                  style={{
                    animation: active
                      ? 'anniv-kenburns 7s ease-out both'
                      : 'none',
                  }}
                />
              </div>
              {/* Legibility scrim */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(20,6,26,0.92) 0%, rgba(20,6,26,0.45) 45%, rgba(20,6,26,0.25) 100%)',
                }}
              />
            </div>
          )
        }
        // cover / finale → solid brand panel
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: active ? 1 : 0,
              background:
                s.kind === 'finale'
                  ? 'radial-gradient(120% 120% at 50% 0%, #7B2D8E 0%, #5A1D6A 55%, #3d1547 100%)'
                  : 'radial-gradient(120% 120% at 50% 30%, #8a3a9e 0%, #7B2D8E 45%, #5A1D6A 100%)',
            }}
            aria-hidden={!active}
          />
        )
      })}

      {/* Floating petals — quiet ambient motion */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-white/30"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              left: `${(i * 8.3 + 4) % 100}%`,
              top: `-10%`,
              animation: `anniv-fall ${9 + (i % 5)}s linear ${i * 0.7}s infinite`,
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* ── Progress bars ────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 px-3 pt-3 sm:px-5 sm:pt-4">
        {SEGMENTS.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{
                width:
                  i < current ? '100%' : i === current ? `${progress}%` : '0%',
                transition: i === current ? 'width 50ms linear' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Top bar: brand + controls */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-7 sm:px-6 sm:pt-9">
        <div className="flex items-center gap-2">
          <span className="font-serif italic text-lg font-semibold leading-none">7</span>
          <span className="text-[11px] uppercase tracking-[0.28em] text-white/80">
            Years of Dermaspace
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={paused ? 'Play' : 'Pause'}
          >
            <Pause className="h-5 w-5" fill={paused ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={close}
            className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close anniversary story"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* ── Tap zones (sit below content actions) ────────────────── */}
      <button
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default"
        onClick={prev}
        onPointerDown={onPointerDown}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        aria-label="Previous"
        tabIndex={-1}
      />
      <button
        className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-default"
        onClick={next}
        onPointerDown={onPointerDown}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        aria-label="Next"
        tabIndex={-1}
      />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-20 flex h-full flex-col justify-end px-6 pb-16 sm:px-12 sm:pb-20 md:px-20 pointer-events-none">
        <div key={keyNonce} className="max-w-2xl">
          <p
            className="mb-4 text-xs uppercase tracking-[0.3em] text-white/80"
            style={{ animation: 'anniv-rise 600ms cubic-bezier(0.2,0.8,0.2,1) both' }}
          >
            {seg.kicker}
          </p>

          {seg.stat && (
            <p
              className="mb-2 font-serif text-6xl font-bold leading-none sm:text-8xl"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 120ms both' }}
            >
              {seg.stat}
            </p>
          )}
          {seg.statLabel && (
            <p
              className="mb-5 text-sm text-white/85 sm:text-base"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 220ms both' }}
            >
              {seg.statLabel}
            </p>
          )}

          <h2 className="font-serif text-4xl font-semibold leading-tight text-balance sm:text-6xl">
            <span
              className="block"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 180ms both' }}
            >
              {seg.title}
            </span>
            {seg.highlight && (
              <span
                className="block italic text-white/95"
                style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 320ms both' }}
              >
                {seg.highlight}
              </span>
            )}
          </h2>

          {seg.body && (
            <p
              className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 460ms both' }}
            >
              {seg.body}
            </p>
          )}

          {/* Finale actions — also carry a close button at the end */}
          {seg.kind === 'finale' && (
            <div
              className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 620ms both' }}
            >
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-white/90"
              >
                Book your glow
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={close}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop nav arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-white/25 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:block"
        aria-label="Previous segment"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      {!isFinale && (
        <button
          onClick={next}
          className="absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-white/25 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:block"
          aria-label="Next segment"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Scoped animation keyframes */}
      <style jsx global>{`
        @keyframes anniv-rise {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes anniv-kenburns {
          from {
            transform: scale(1.12);
          }
          to {
            transform: scale(1);
          }
        }
        @keyframes anniv-fall {
          0% {
            transform: translateY(-10vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(115vh) translateX(40px) rotate(220deg);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*='anniv-rise'],
          [style*='anniv-kenburns'],
          [style*='anniv-fall'] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
