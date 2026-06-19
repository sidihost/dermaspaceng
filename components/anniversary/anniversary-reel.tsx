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
 * This version trades photographs for bespoke editorial ILLUSTRATIONS
 * (the kind of flat, premium brand art big tech companies use on their
 * story pages). Every segment shares one classy plum "stage": the
 * illustration floats inside a soft rounded card with a glow ring, and
 * the copy sits beside it (split layout on desktop, stacked on mobile).
 *
 * Mechanics:
 *  - Segment progress bars across the top auto-fill; the reel advances
 *    when a bar completes.
 *  - Tap/click the left third to go back, the right two-thirds forward.
 *    Press-and-hold (or the Pause affordance) pauses playback.
 *  - Arrow keys navigate; space toggles pause; Escape closes.
 *  - A persistent close (X) sits top-right, and the final segment also
 *    carries its own close / "back to site" actions, per request.
 *  - An animated brand emblem (a serif "7" inside a drawing + rotating
 *    ring) anchors the top bar and the cover.
 */

type Segment = {
  kind: 'cover' | 'story' | 'stat' | 'finale'
  image: string
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
    image: '/images/anniversary/illus-cover.png',
    kicker: 'Est. 2018',
    title: 'Seven years of',
    highlight: 'glowing skin',
    body: 'A little story about how far we have come — and the faces that brought us here.',
  },
  {
    kind: 'story',
    image: '/images/anniversary/illus-origin.png',
    kicker: 'How it started',
    title: 'One room.',
    highlight: 'One promise.',
    body: 'We opened with a simple idea: skincare built for Lagos skin and Lagos weather. No gimmicks — just results you can see.',
  },
  {
    kind: 'story',
    image: '/images/anniversary/illus-treatments.png',
    kicker: 'The work',
    title: 'Thousands of afternoons,',
    highlight: 'off your shoulders',
    body: 'Facials, peels, massages and steam — quiet hours that sent you out lighter than you walked in.',
  },
  {
    kind: 'stat',
    image: '/images/anniversary/illus-community.png',
    kicker: 'By the numbers',
    title: 'A community that kept glowing',
    stat: '20,000+',
    statLabel: 'treatments and counting',
  },
  {
    kind: 'story',
    image: '/images/anniversary/illus-team.png',
    kicker: 'Always learning',
    title: 'Therapists who',
    highlight: 'know your skin',
    body: 'We listen first, recommend second, and build a plan that fits your life. Seven years on, that has never changed.',
  },
  {
    kind: 'finale',
    image: '/images/anniversary/illus-finale.png',
    kicker: 'Year seven',
    title: 'Thank you for',
    highlight: 'celebrating with us',
    body: 'Here is to the next chapter — and to skin that always feels like yours.',
  },
]

const SEGMENT_MS = 6500

/** Animated brand emblem: a serif "7" framed by a ring that draws in
 *  once and an outer dotted ring that rotates forever. Size-driven so it
 *  works both small (top bar) and large (cover). */
function Emblem({ size = 40 }: { size?: number }) {
  const stroke = size > 80 ? 2 : 1.5
  return (
    <span
      className="anniv-emblem relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {/* drawing ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="anniv-ring-draw"
          pathLength={100}
        />
        {/* rotating dotted ring */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={stroke * 0.7}
          strokeLinecap="round"
          strokeDasharray="0.5 6"
          className="anniv-ring-rotate"
          style={{ transformOrigin: '50% 50%' }}
        />
      </svg>
      <span
        className="anniv-seven-float font-serif italic font-semibold leading-none text-white"
        style={{ fontSize: size * 0.42 }}
      >
        7
      </span>
    </span>
  )
}

export default function AnniversaryReel() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [keyNonce, setKeyNonce] = useState(0) // re-mounts content to replay entrance anim
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = useCallback(() => {
    router.push('/')
  }, [router])

  const next = useCallback(() => {
    setCurrent((c) => {
      if (c >= SEGMENTS.length - 1) return c // stop on finale
      setProgress(0)
      setKeyNonce((n) => n + 1)
      return c + 1
    })
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => {
      setProgress(0)
      setKeyNonce((n) => n + 1)
      return Math.max(0, c - 1)
    })
  }, [])

  const isFinale = current === SEGMENTS.length - 1

  // Auto-advance progress loop.
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#3d1547] text-white select-none">
      {/* ── Stage backdrop (consistent plum, segment-tinted) ─────── */}
      {SEGMENTS.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: i === current ? 1 : 0,
            background:
              s.kind === 'finale'
                ? 'radial-gradient(125% 125% at 50% 8%, #8a3a9e 0%, #6a2480 45%, #3d1547 100%)'
                : 'radial-gradient(125% 125% at 50% 30%, #7B2D8E 0%, #5A1D6A 55%, #3d1547 100%)',
          }}
          aria-hidden={i !== current}
        />
      ))}

      {/* Soft glow blobs for depth (no hard shadows) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-[#c98bd8]/10 blur-3xl" />
      </div>

      {/* Floating petals — quiet ambient motion */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-white/25"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              left: `${(i * 7.1 + 3) % 100}%`,
              top: '-10%',
              animation: `anniv-fall ${9 + (i % 5)}s linear ${i * 0.6}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Progress bars ────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 top-0 z-30 flex gap-1.5 px-3 pt-3 sm:px-5 sm:pt-4">
        {SEGMENTS.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: i < current ? '100%' : i === current ? `${progress}%` : '0%',
                transition: i === current ? 'width 50ms linear' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Top bar: animated emblem + controls */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center gap-2.5">
          <Emblem size={36} />
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

      {/* ── Tap zones (below content actions) ────────────────────── */}
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

      {/* ── Content: split layout (stacked on mobile) ────────────── */}
      <div className="pointer-events-none relative z-20 mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-6 px-6 pt-20 pb-12 sm:px-10 sm:pt-24 sm:pb-16 md:flex-row md:gap-12 md:pb-12">
        {/* Illustration card */}
        <div key={`art-${keyNonce}`} className="flex w-full justify-center md:w-1/2">
          <div
            className="anniv-card relative w-full max-w-[18rem] sm:max-w-sm md:max-w-md"
            style={{ animation: 'anniv-pop 800ms cubic-bezier(0.2,0.8,0.2,1) both' }}
          >
            {/* glow ring behind the card */}
            <div className="absolute -inset-3 rounded-[2rem] bg-white/10 blur-xl" aria-hidden="true" />
            <div className="anniv-float relative overflow-hidden rounded-[1.75rem] border border-white/25 bg-[#f7efe4]">
              <Image
                src={seg.image || '/placeholder.svg'}
                alt=""
                width={640}
                height={640}
                priority={current <= 1}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div key={`copy-${keyNonce}`} className="w-full text-center md:w-1/2 md:text-left">
          <p
            className="mb-3 text-xs uppercase tracking-[0.32em] text-white/80"
            style={{ animation: 'anniv-rise 600ms cubic-bezier(0.2,0.8,0.2,1) both' }}
          >
            {seg.kicker}
          </p>

          {seg.stat && (
            <>
              <p
                className="font-serif text-6xl font-bold leading-none sm:text-7xl"
                style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 120ms both' }}
              >
                {seg.stat}
              </p>
              <p
                className="mt-2 mb-4 text-sm text-white/85 sm:text-base"
                style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 220ms both' }}
              >
                {seg.statLabel}
              </p>
            </>
          )}

          <h2 className="font-serif text-3xl font-semibold leading-tight text-balance sm:text-5xl">
            <span
              className="block"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 180ms both' }}
            >
              {seg.title}
            </span>
            {seg.highlight && (
              <span
                className="mt-1 block italic text-[#f3d9a0]"
                style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 320ms both' }}
              >
                {seg.highlight}
              </span>
            )}
          </h2>

          {seg.body && (
            <p
              className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/85 sm:text-lg md:mx-0"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 460ms both' }}
            >
              {seg.body}
            </p>
          )}

          {/* Finale actions — also carry a close button at the end */}
          {seg.kind === 'finale' && (
            <div
              className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start"
              style={{ animation: 'anniv-rise 700ms cubic-bezier(0.2,0.8,0.2,1) 620ms both' }}
            >
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#7B2D8E] transition-transform hover:scale-[1.03]"
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
          from { opacity: 0; transform: translateY(26px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes anniv-pop {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes anniv-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes anniv-fall {
          0%   { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.55; }
          90%  { opacity: 0.55; }
          100% { transform: translateY(115vh) translateX(40px) rotate(220deg); opacity: 0; }
        }
        @keyframes anniv-ring-draw {
          from { stroke-dashoffset: 100; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes anniv-ring-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes anniv-seven-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        .anniv-float { animation: anniv-float 6s ease-in-out infinite; }
        .anniv-ring-draw {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: anniv-ring-draw 1.4s ease-out forwards;
        }
        .anniv-ring-rotate { animation: anniv-ring-rotate 14s linear infinite; }
        .anniv-seven-float { animation: anniv-seven-float 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .anniv-float,
          .anniv-ring-rotate,
          .anniv-seven-float,
          [style*='anniv-rise'],
          [style*='anniv-pop'],
          [style*='anniv-fall'] {
            animation: none !important;
          }
          .anniv-ring-draw { stroke-dashoffset: 0; animation: none !important; }
        }
      `}</style>
    </div>
  )
}
