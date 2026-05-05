'use client'

/**
 * Glow Year Wrapped — DermaspaceNG birthday recap.
 *
 * A vertical, mobile-first, story-style flow (think Spotify Wrapped /
 * ALAT Evolution / IG Stories) that walks a member through their
 * year with Dermaspace on their birthday:
 *
 *   1. Hello + the date
 *   2. Days with us (joined-on cards)
 *   3. Spa stats — bookings, total spent, busiest month
 *   4. Most-booked treatment ("your go-to")
 *   5. Most-visited branch ("your sanctuary")
 *   6. Share preview
 *   7. Birthday wish + booking CTA
 *
 * Interactions follow the "stories" mental model:
 *   - tap left half  → previous slide
 *   - tap right half → next slide
 *   - tap centre top → pause / play
 *   - on every slide an auto-advance progress bar fills
 *   - swipe down (pull) → close (returns to /dashboard)
 *
 * Brand: deep purple background (#7B2D8E), white cards on stat
 * slides, matching the rest of the app. No new colours — we only
 * use existing tokens / brand variables defined in globals.css.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  MapPin,
  Calendar,
  Heart,
  Share2,
  ArrowRight,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface RecapPayload {
  user: {
    firstName: string | null
    lastName:  string | null
  }
  isBirthdayToday: boolean
  birthday: string | null   // YYYY-MM-DD
  joinedOn: string | null   // YYYY-MM-DD
  daysWithUs: number
  stats: {
    totalBookings:      number
    totalSpentNaira:    number
    topTreatment:       string | null
    topTreatmentCount:  number
    topLocation:        string | null
    topLocationCount:   number
    busiestMonth:       string | null
  }
}

// -------------------------------------------------------------------
// Date / number helpers
// -------------------------------------------------------------------

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

function formatLongDate(iso: string | null): { month: string; day: number; year: number; suffix: string } | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10))
  if (!y || !m || !d) return null
  return {
    month:  (MONTHS_FULL[m - 1] ?? '').toUpperCase(),
    day:    d,
    year:   y,
    suffix: ordinalSuffix(d),
  }
}

function formatNaira(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >=     1_000) return `${(n /     1_000).toFixed(n >=    10_000 ? 0 : 1)}K`
  return n.toLocaleString('en-NG')
}

// -------------------------------------------------------------------
// Slide registry — each slide declares its id + how long it lingers.
// -------------------------------------------------------------------

interface SlideSpec { id: string; ms: number }

function buildSlides(recap: RecapPayload): SlideSpec[] {
  const hasBookings = recap.stats.totalBookings > 0
  return [
    { id: 'intro',    ms: 6000 },
    { id: 'joined',   ms: 6000 },
    ...(hasBookings ? [{ id: 'stats',     ms: 7000 }] : []),
    ...(recap.stats.topTreatment ? [{ id: 'treatment', ms: 6000 }] : []),
    ...(recap.stats.topLocation  ? [{ id: 'location',  ms: 6000 }] : []),
    { id: 'share',    ms: 6000 },
    { id: 'wish',     ms: 9000 },
  ]
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

const BRAND = '#7B2D8E'

export default function BirthdayWrapped({ recap }: { recap: RecapPayload }) {
  const router = useRouter()
  const slides = useMemo(() => buildSlides(recap), [recap])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)   // visual parity with the ALAT story; no real audio
  const [done, setDone]   = useState(false)
  const [progress, setProgress] = useState(0)

  // Per-slide ms accumulator. Refs (not state) so the rAF loop
  // doesn't trigger React re-renders 60×/s.
  const startedAtRef = useRef<number>(performance.now())
  const elapsedRef   = useRef<number>(0)

  const current = slides[index]

  // Auto-advance — drives both the visual progress bar at the top
  // and the slide change. Pauses when `paused` flips true. Skips
  // entirely once we hit the final "done" state.
  useEffect(() => {
    if (done || !current) return
    let raf = 0
    const tick = (now: number) => {
      if (!paused) {
        const delta = now - startedAtRef.current
        startedAtRef.current = now
        elapsedRef.current  += delta
        const pct = Math.min(1, elapsedRef.current / current.ms)
        setProgress(pct)
        if (pct >= 1) {
          if (index < slides.length - 1) {
            setIndex(index + 1)
          } else {
            setDone(true)
          }
          return
        }
      } else {
        startedAtRef.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    startedAtRef.current = performance.now()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, paused, done, current, slides.length])

  // Reset per-slide accumulator whenever we land on a new slide.
  useEffect(() => {
    elapsedRef.current = 0
    setProgress(0)
  }, [index])

  // Lock body scroll for the lifetime of the story — without this the
  // page underneath bounces when a touch drag escapes the slide stage.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  // Keyboard support — left/right arrows and space to pause. Trivial
  // to add, makes the story usable from a desktop in QA.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.key === 'Escape') {
        router.push('/dashboard')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, router])

  // Confetti on the intro slide. Lazy-imported so the canvas-confetti
  // bundle only ships when the recap is actually opened.
  useEffect(() => {
    if (!current) return
    if (current.id !== 'intro' && current.id !== 'wish') return
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import('canvas-confetti')
        if (cancelled) return
        const confetti = mod.default
        const colors = ['#7B2D8E', '#9B4DB0', '#F4A7B9', '#F5B841', '#FFFFFF']
        confetti({ particleCount: 80, spread: 70, origin: { x: 0.18, y: 0.55 }, colors })
        setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { x: 0.82, y: 0.55 }, colors }), 220)
        setTimeout(() => confetti({
          particleCount: 60,
          angle: 270,
          spread: 110,
          startVelocity: 28,
          gravity: 0.55,
          origin: { x: 0.5, y: 0 },
          colors,
        }), 440)
      } catch {
        /* non-essential */
      }
    })()
    return () => { cancelled = true }
  }, [current])

  const goPrev = useCallback(() => {
    if (index === 0) {
      // Re-fire current intro instead of doing nothing — feels nicer.
      elapsedRef.current = 0
      setProgress(0)
      return
    }
    setDone(false)
    setIndex(index - 1)
  }, [index])

  const goNext = useCallback(() => {
    if (index >= slides.length - 1) {
      setDone(true)
      return
    }
    setIndex(index + 1)
  }, [index, slides.length])

  const handleClose = () => router.push('/dashboard')

  const handleShare = useCallback(async () => {
    const name = recap.user.firstName ?? 'a Dermaspace member'
    const text = `${name}'s Glow Year with Dermaspace ✨ — ${recap.daysWithUs} days, ${recap.stats.totalBookings} bookings.`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'My Glow Year · Dermaspace',
          text,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        })
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${typeof window !== 'undefined' ? window.location.href : ''}`)
      }
    } catch {
      /* user cancelled — no-op */
    }
  }, [recap])

  // Tap zones — left third = back, right two-thirds = next. We split
  // unevenly because users instinctively reach for forward.
  const onTapZone = (zone: 'prev' | 'next') => () => {
    if (zone === 'prev') goPrev(); else goNext()
  }

  if (done) {
    return <FinishedScreen recap={recap} onReplay={() => { setIndex(0); setDone(false) }} onClose={handleClose} onShare={handleShare} />
  }

  const firstName = recap.user.firstName ?? 'Friend'

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden font-sans select-none"
      style={{ background: BRAND, color: 'white' }}
    >
      {/* Decorative background pattern: thin diagonal hatch — same trick
          ALAT used on slide 2. Kept very subtle so the foreground
          content never has to fight it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 22px)',
        }}
      />

      {/* Soft radial glow behind the content centre */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 65%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 70%)',
        }}
      />

      {/* Top bar — progress + controls */}
      <div className="absolute inset-x-0 top-0 z-30 px-4 pt-3">
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                style={{
                  width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Glow Year
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition active:scale-95"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play' : 'Pause'}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition active:scale-95"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tap zones — sit ABOVE the content so a tap anywhere advances,
          but BELOW the top bar buttons (those use z-30 above). */}
      <button
        type="button"
        aria-label="Previous"
        onClick={onTapZone('prev')}
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default"
      />
      <button
        type="button"
        aria-label="Next"
        onClick={onTapZone('next')}
        className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-default"
      />

      {/* Slide stage */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="relative z-0 w-full max-w-md">
          <AnimatePresence mode="wait">
            {current?.id === 'intro' && (
              <SlideIntro key="intro" firstName={firstName} birthday={recap.birthday} />
            )}
            {current?.id === 'joined' && (
              <SlideJoined key="joined" daysWithUs={recap.daysWithUs} joinedOn={recap.joinedOn} />
            )}
            {current?.id === 'stats' && (
              <SlideStats key="stats" recap={recap} firstName={firstName} />
            )}
            {current?.id === 'treatment' && (
              <SlideTreatment key="treatment" name={recap.stats.topTreatment!} count={recap.stats.topTreatmentCount} />
            )}
            {current?.id === 'location' && (
              <SlideLocation key="location" name={recap.stats.topLocation!} count={recap.stats.topLocationCount} />
            )}
            {current?.id === 'share' && (
              <SlideShare key="share" recap={recap} onShare={handleShare} />
            )}
            {current?.id === 'wish' && (
              <SlideWish key="wish" firstName={firstName} onBook={() => router.push('/booking')} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ===================================================================
// Slides
// ===================================================================

const slideVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0,  scale: 1 },
  exit:    { opacity: 0, y: -12, scale: 0.98 },
}

function SlideShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative"
    >
      {children}
    </motion.div>
  )
}

// ----- 1. Intro -----

function SlideIntro({ firstName, birthday }: { firstName: string; birthday: string | null }) {
  const date = formatLongDate(birthday) ?? formatLongDate(new Date().toISOString().slice(0, 10))!
  return (
    <SlideShell>
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 18 }}
          className="grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur-sm"
        >
          <Heart className="h-6 w-6 text-white" aria-hidden />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-white/80"
        >
          Happy Birthday
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="font-serif mt-2 text-balance text-4xl font-semibold leading-tight sm:text-5xl"
        >
          Hi {firstName}!
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 w-full rounded-2xl border border-white/40 bg-white px-5 py-6 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]"
        >
          <p className="font-serif text-2xl font-bold leading-tight text-[#1a0d1f] sm:text-3xl">
            {date.month} {date.day}
            <sup className="ml-0.5 text-sm align-super">{date.suffix}</sup>{' '}
            {date.year}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-8 max-w-[300px] text-balance text-sm leading-relaxed text-white/90 sm:text-base"
        >
          <p>Your Glow Year with</p>
          <p className="mt-1 text-base font-semibold sm:text-lg">DermaspaceNG</p>
        </motion.div>
      </div>
    </SlideShell>
  )
}

// ----- 2. Joined / Days with us -----

function SlideJoined({ daysWithUs, joinedOn }: { daysWithUs: number; joinedOn: string | null }) {
  const date = formatLongDate(joinedOn)
  return (
    <SlideShell>
      {/* Stacked cards, fanned out behind the foreground */}
      <div className="relative">
        <motion.div
          initial={{ rotate: -10, x: -18, opacity: 0 }}
          animate={{ rotate: -8,  x: -14, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="absolute inset-0 rounded-3xl bg-white/15 backdrop-blur-sm"
        />
        <motion.div
          initial={{ rotate: 10, x: 18, opacity: 0 }}
          animate={{ rotate: 6,  x: 14, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="absolute inset-0 rounded-3xl bg-white/10 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.55 }}
          className="relative rounded-3xl border border-white/20 bg-[#5A1D6A]/55 px-6 py-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md"
        >
          {date && (
            <p className="font-serif text-base font-medium tracking-tight text-white/90 sm:text-lg">
              {date.month.charAt(0) + date.month.slice(1).toLowerCase()} {date.day}
              <sup className="ml-0.5 text-xs align-super">{date.suffix}</sup>{' '}
              {date.year} <span className="mx-2 text-white/60">•</span> You Joined
            </p>
          )}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-serif text-7xl font-bold leading-none tracking-tight text-white sm:text-8xl">
              {daysWithUs}
            </span>
            <span className="text-xs font-semibold uppercase leading-tight tracking-[0.18em] text-white/85">
              Days of<br />Glow With
              <span className="ml-1 font-bold text-white">Dermaspace</span>
            </span>
          </div>

          <p className="mt-7 max-w-[300px] text-balance text-sm leading-relaxed text-white/90">
            The day you started taking your skin seriously — and we&apos;ve been
            in your corner ever since.
          </p>
        </motion.div>
      </div>
    </SlideShell>
  )
}

// ----- 3. Stats card (white) -----

function SlideStats({ recap, firstName }: { recap: RecapPayload; firstName: string }) {
  const { totalBookings, totalSpentNaira, busiestMonth } = recap.stats
  return (
    <SlideShell>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-white text-[#1a0d1f] shadow-[0_24px_60px_-22px_rgba(0,0,0,0.55)]"
      >
        {/* Soft brand chevron pattern in the corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #7B2D8E 0 1px, transparent 1px 14px)',
          }}
        />

        <div className="relative p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7B2D8E]">
            Your Spa Year
          </p>
          <h2 className="font-serif mt-1 text-5xl font-bold leading-none tracking-tight text-[#7B2D8E] sm:text-6xl">
            GLOW
            <br />
            MOVES
          </h2>

          {/* Central count + circular name. Replaces ALAT's "Yousef no
              small" curve with the user's first name on a ring. */}
          <div className="relative mx-auto mt-7 grid h-44 place-items-center sm:h-48">
            <CircularName name={`${firstName} · feeling fresh`} />
            <div className="text-center">
              <p className="font-serif text-5xl font-bold leading-none tracking-tight sm:text-6xl">
                {totalBookings}
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[#1a0d1f]/70">
                Total Bookings
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-5 border-t border-[#1a0d1f]/10 pt-5">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-[#1a0d1f]/60">Spent</p>
              <p className="font-serif mt-1 text-3xl font-bold leading-none tracking-tight sm:text-4xl">
                ₦{formatNaira(totalSpentNaira)}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-[#1a0d1f]/60">
                On your<br />Self-Care
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-wide text-[#1a0d1f]/60">Month</p>
              <p className="font-serif mt-1 text-3xl font-bold leading-none tracking-tight sm:text-4xl">
                {busiestMonth ?? '—'}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-[#1a0d1f]/60">
                Your<br />Glow Peak
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Sparkles className="h-5 w-5 text-[#F5B841]" aria-hidden />
            <Heart className="h-5 w-5 text-[#7B2D8E]" aria-hidden />
          </div>
        </div>
      </motion.div>
    </SlideShell>
  )
}

/** Curves the user's name around the central stat — small SVG. */
function CircularName({ name }: { name: string }) {
  const id = useMemo(() => `arc-${Math.random().toString(36).slice(2, 8)}`, [])
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <path
          id={id}
          d="M 100,100 m -75,0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
          fill="none"
        />
      </defs>
      <text className="text-[10px] font-medium tracking-[0.18em] uppercase fill-[#1a0d1f]/70">
        <textPath href={`#${id}`} startOffset="2%">
          {name} · {name}
        </textPath>
      </text>
    </svg>
  )
}

// ----- 4. Top treatment -----

function SlideTreatment({ name, count }: { name: string; count: number }) {
  return (
    <SlideShell>
      <div className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80"
        >
          Your Go-To
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="font-serif mt-2 text-balance text-3xl font-bold leading-tight sm:text-4xl"
        >
          {name}
        </motion.h2>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.55, ease: 'easeOut' }}
          className="mx-auto mt-8 grid h-44 w-44 place-items-center rounded-full bg-white/12 backdrop-blur-sm sm:h-52 sm:w-52"
        >
          <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center sm:h-36 sm:w-36">
            <div>
              <p className="font-serif text-5xl font-bold leading-none tracking-tight text-[#7B2D8E] sm:text-6xl">
                {count}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#1a0d1f]/60">
                Times
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mx-auto mt-8 max-w-[300px] text-balance text-sm leading-relaxed text-white/90 sm:text-base"
        >
          Some people call it routine. We call it knowing exactly what your skin loves.
        </motion.p>
      </div>
    </SlideShell>
  )
}

// ----- 5. Top location -----

function SlideLocation({ name, count }: { name: string; count: number }) {
  return (
    <SlideShell>
      <div className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80"
        >
          Your Sanctuary
        </motion.p>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-3"
        >
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Dermaspace · Lagos
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-serif mt-6 text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl"
        >
          {name}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-8 inline-flex items-baseline gap-2 rounded-2xl bg-white/12 px-5 py-3 backdrop-blur-sm"
        >
          <span className="font-serif text-4xl font-bold leading-none">{count}</span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/85">
            Visits this year
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="mx-auto mt-8 max-w-[320px] text-balance text-sm leading-relaxed text-white/90 sm:text-base"
        >
          The room knows you. The team knows you. And the playlist? Yeah, that&apos;s for you too.
        </motion.p>
      </div>
    </SlideShell>
  )
}

// ----- 6. Share -----

function SlideShare({ recap, onShare }: { recap: RecapPayload; onShare: () => void }) {
  const firstName = recap.user.firstName ?? 'Friend'
  return (
    <SlideShell>
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-serif text-balance text-3xl font-bold leading-tight sm:text-4xl"
        >
          Share what your<br />Glow Year looks like
        </motion.h2>

        {/* Tilted preview cards — pure decoration */}
        <div className="relative mt-8 flex h-56 items-center justify-center sm:h-64">
          <motion.div
            initial={{ rotate: -10, x: -50, opacity: 0 }}
            animate={{ rotate: -8,  x: -56, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute h-44 w-32 rounded-2xl border-[6px] border-white/95 bg-[#7B2D8E] p-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] sm:h-52 sm:w-36"
          >
            <div className="flex h-full flex-col items-center justify-end rounded-md bg-white/10 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/95">
                Your Glow Year
              </p>
              <p className="mt-1 text-[9px] text-white/85">started</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ rotate: 10, x: 50, opacity: 0 }}
            animate={{ rotate: 8,  x: 56, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="absolute h-44 w-32 rounded-2xl border-[6px] border-white/95 bg-[#9B4DB0] p-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] sm:h-52 sm:w-36"
          >
            <div className="flex h-full flex-col items-center justify-center rounded-md bg-white/15 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white">
                Your Go-To
              </p>
              <Sparkles className="mt-2 h-5 w-5 text-white" aria-hidden />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative h-48 w-36 rounded-2xl border-[6px] border-white/95 bg-white p-2 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)] sm:h-56 sm:w-40"
          >
            <div className="flex h-full flex-col items-center justify-center rounded-md bg-[#F4A7B9]/20 p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B2D8E]">
                Glow
              </p>
              <p className="font-serif text-xl font-bold leading-none text-[#1a0d1f]">
                Moves
              </p>
              <p className="mt-2 text-[10px] text-[#1a0d1f]/70">
                {recap.stats.totalBookings} bookings
              </p>
            </div>
          </motion.div>
        </div>

        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onShare() }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="relative z-20 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 py-4 text-sm font-semibold tracking-wide text-white backdrop-blur-md transition active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share my Glow Year, {firstName}
        </motion.button>
      </div>
    </SlideShell>
  )
}

// ----- 7. Birthday wish + CTA -----

function SlideWish({ firstName, onBook }: { firstName: string; onBook: () => void }) {
  return (
    <SlideShell>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 16 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white"
        >
          <Heart className="h-7 w-7" style={{ color: BRAND }} aria-hidden />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-white/85"
        >
          From everyone at Dermaspace
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="font-serif mt-2 text-balance text-3xl font-bold leading-tight sm:text-4xl"
        >
          Wishing you the<br />
          <span className="italic">softest, glowiest</span><br />
          year yet, {firstName}.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mx-auto mt-8 max-w-[320px] rounded-2xl border border-white/30 bg-white/10 px-5 py-4 text-left backdrop-blur-md"
        >
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Your Birthday Gift
          </p>
          <p className="mt-2 text-balance text-sm leading-relaxed text-white/95">
            Book any treatment in the next 30 days and your team will surprise you with something on the house.
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBook() }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
          className="relative z-20 mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#7B2D8E] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)] transition active:scale-95"
        >
          Book your gift treatment
          <ArrowRight className="h-4 w-4" aria-hidden />
        </motion.button>
      </div>
    </SlideShell>
  )
}

// ===================================================================
// Finished screen — shown after the last slide auto-advances.
// ===================================================================

function FinishedScreen({
  recap,
  onReplay,
  onClose,
  onShare,
}: {
  recap: RecapPayload
  onReplay: () => void
  onClose:  () => void
  onShare:  () => void
}) {
  const firstName = recap.user.firstName ?? 'Friend'
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 font-sans"
      style={{ background: BRAND, color: 'white' }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/25 text-white backdrop-blur-sm"
      >
        <X className="h-4 w-4" />
      </button>

      <Sparkles className="h-9 w-9 text-white" aria-hidden />

      <h2 className="font-serif mt-5 text-center text-balance text-3xl font-bold leading-tight sm:text-4xl">
        That&apos;s your year, {firstName}.
      </h2>

      <p className="mt-3 max-w-sm text-balance text-center text-sm leading-relaxed text-white/85 sm:text-base">
        Save it, share it, and let&apos;s make this next year even glowier.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onShare}
          className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-[#7B2D8E] transition active:scale-95"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share my Glow Year
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition active:scale-95"
        >
          <Play className="h-4 w-4" aria-hidden />
          Watch again
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 hover:text-white"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  )
}
