'use client'

/**
 * Glow Year — Dermaspace birthday & year-in-review story.
 *
 * Design system compliance:
 *   - Strictly purple (#7B2D8E / #5A1D6A / #9B4DB0), white (#FFFFFF), and
 *     black neutrals (#1a0d1f).
 *   - Zero gradients (no linear/radial/repeating-linear gradients).
 *   - Zero Sparkles/Zap icons or sparkle emojis.
 *   - Flat surfaces framed by crisp 1px borders instead of heavy drop shadows.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Pause,
  Play,
  MapPin,
  Calendar,
  Heart,
  Share2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Gift,
  Award,
  Check,
  RotateCcw,
} from 'lucide-react'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'
import { useNotify } from '@/components/shared/notify'
import {
  BIRTHDAY_CONFETTI_COLORS,
  buildShareText,
  buildSlides,
  formatLongDate,
  formatNairaCompact,
  getIntroSlideCopy,
  type RecapPayload,
} from '@/lib/birthday'

export type { RecapPayload }

const BRAND = '#7B2D8E'

export default function BirthdayWrapped({ recap }: { recap: RecapPayload }) {
  const router = useRouter()
  const notify = useNotify()
  const slides = useMemo(() => buildSlides(recap), [recap])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [holdPaused, setHoldPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle')

  const startedAtRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const activeBarRef = useRef<HTMLSpanElement | null>(null)

  // Gesture / press-and-hold tracking refs
  const pointerRef = useRef<{
    active: boolean
    x: number
    y: number
    interactive: boolean
    holdTriggered: boolean
    holdTimer: number | null
  }>({
    active: false,
    x: 0,
    y: 0,
    interactive: false,
    holdTriggered: false,
    holdTimer: null,
  })

  const current = slides[index]
  const isEffectivelyPaused = paused || holdPaused

  // Navigation handlers declared BEFORE keyboard/timer effects (prevents TDZ)
  const goPrev = useCallback(() => {
    setDone(false)
    elapsedRef.current = 0
    if (activeBarRef.current) activeBarRef.current.style.width = '0%'
    if (index === 0) {
      return
    }
    setIndex((prev) => Math.max(0, prev - 1))
  }, [index])

  const goNext = useCallback(() => {
    elapsedRef.current = 0
    if (activeBarRef.current) activeBarRef.current.style.width = '0%'
    if (index >= slides.length - 1) {
      setDone(true)
      return
    }
    setIndex((prev) => Math.min(slides.length - 1, prev + 1))
  }, [index, slides.length])

  const goToSlide = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= slides.length) return
      setDone(false)
      elapsedRef.current = 0
      if (activeBarRef.current) activeBarRef.current.style.width = '0%'
      setIndex(targetIndex)
    },
    [slides.length],
  )

  const handleClose = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  const handleReplay = useCallback(() => {
    elapsedRef.current = 0
    if (activeBarRef.current) activeBarRef.current.style.width = '0%'
    setIndex(0)
    setPaused(false)
    setDone(false)
  }, [])

  const handleShare = useCallback(async () => {
    const text = buildShareText(recap)
    const url = typeof window !== 'undefined' ? window.location.href : ''

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: 'My Glow Year · Dermaspace',
          text,
          url: url || undefined,
        })
        setShareStatus('shared')
        notify.success('Glow Year shared', 'Thanks for sharing your Dermaspace story.')
        window.setTimeout(() => setShareStatus('idle'), 2600)
        return
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url ? `${text}\n${url}` : text)
        setShareStatus('copied')
        notify.success('Glow Year copied', 'Ready to paste and share anywhere.')
        window.setTimeout(() => setShareStatus('idle'), 2600)
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }

    notify.info('Ready to share', text)
  }, [recap, notify])

  // Auto-advance timer driven by requestAnimationFrame (DOM-direct bar fill avoids 60fps re-renders)
  useEffect(() => {
    if (done || !current) return
    let raf = 0
    startedAtRef.current = performance.now()

    const tick = (now: number) => {
      if (!isEffectivelyPaused) {
        const delta = now - startedAtRef.current
        startedAtRef.current = now
        elapsedRef.current += delta
        const pct = Math.min(1, elapsedRef.current / current.ms)
        if (activeBarRef.current) {
          activeBarRef.current.style.width = `${pct * 100}%`
        }
        if (pct >= 1) {
          if (index < slides.length - 1) {
            setIndex((prev) => prev + 1)
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

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, isEffectivelyPaused, done, current, slides.length])

  // Reset per-slide accumulator whenever the active slide changes
  useEffect(() => {
    elapsedRef.current = 0
    if (activeBarRef.current) {
      activeBarRef.current.style.width = '0%'
    }
  }, [index])

  // Lock body scroll while the full-screen story overlay is mounted
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === ' ' || e.code === 'Space') {
        if ((e.target as HTMLElement | null)?.closest('button, a')) return
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, handleClose])

  // Confetti burst on intro & wish slides — strictly purple + white palette
  useEffect(() => {
    if (done || !current) return
    if (current.id !== 'intro' && current.id !== 'wish') return
    let cancelled = false
    const timers: number[] = []
    let resetFn: (() => void) | undefined

    ;(async () => {
      try {
        const mod = await import('canvas-confetti')
        if (cancelled) return
        const confetti = mod.default
        resetFn = typeof confetti.reset === 'function' ? () => confetti.reset() : undefined
        const colors = [...BIRTHDAY_CONFETTI_COLORS]
        confetti({
          particleCount: 70,
          spread: 68,
          origin: { x: 0.18, y: 0.55 },
          colors,
        })
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) {
              confetti({
                particleCount: 70,
                spread: 68,
                origin: { x: 0.82, y: 0.55 },
                colors,
              })
            }
          }, 220),
        )
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) {
              confetti({
                particleCount: 55,
                angle: 270,
                spread: 110,
                startVelocity: 26,
                gravity: 0.55,
                origin: { x: 0.5, y: 0 },
                colors,
              })
            }
          }, 440),
        )
      } catch {
        /* non-essential */
      }
    })()

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      resetFn?.()
    }
  }, [current, done])

  const clearHoldTimer = () => {
    if (pointerRef.current.holdTimer !== null) {
      window.clearTimeout(pointerRef.current.holdTimer)
      pointerRef.current.holdTimer = null
    }
  }

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    const interactive = Boolean(target?.closest('button, a, [data-interactive="true"]'))
    pointerRef.current.active = true
    pointerRef.current.x = e.clientX
    pointerRef.current.y = e.clientY
    pointerRef.current.interactive = interactive
    pointerRef.current.holdTriggered = false
    clearHoldTimer()

    if (!interactive) {
      pointerRef.current.holdTimer = window.setTimeout(() => {
        pointerRef.current.holdTriggered = true
        setHoldPaused(true)
      }, 180)
    }
  }

  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    clearHoldTimer()
    const state = pointerRef.current
    if (!state.active) return
    state.active = false

    if (holdPaused) {
      setHoldPaused(false)
    }

    if (state.interactive || state.holdTriggered) return

    const dx = e.clientX - state.x
    const dy = e.clientY - state.y

    // Swipe down to close
    if (dy > 75 && Math.abs(dy) > Math.abs(dx)) {
      handleClose()
      return
    }

    // Horizontal swipe navigation
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext()
      else goPrev()
      return
    }

    // Tap left third = previous, right two-thirds = next
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left
    if (relX < rect.width * 0.33) goPrev()
    else goNext()
  }

  const onStagePointerCancel = () => {
    clearHoldTimer()
    pointerRef.current.active = false
    if (holdPaused) setHoldPaused(false)
  }

  if (done) {
    return (
      <FinishedScreen
        recap={recap}
        shareStatus={shareStatus}
        onReplay={handleReplay}
        onClose={handleClose}
        onShare={handleShare}
        onBook={() => router.push('/booking')}
      />
    )
  }

  const firstName = recap.user.firstName?.trim() || 'Friend'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden font-sans select-none"
      style={{ backgroundColor: BRAND, color: '#FFFFFF' }}
    >
      {/* Solid architectural hairline rings — zero gradients */}
      <StoryBackdropLines />

      {/* Top progress bars & controls */}
      <header className="relative z-30 mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6 sm:pt-5">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Glow Year story slides"
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1} of ${slides.length}: ${s.label}`}
              onClick={() => goToSlide(i)}
              className="group relative py-1.5 flex-1 focus:outline-none"
            >
              <span className="block h-[3px] w-full overflow-hidden rounded-full bg-white/25 transition-colors group-hover:bg-white/40">
                <span
                  ref={i === index ? activeBarRef : undefined}
                  className="block h-full rounded-full bg-white"
                  style={{
                    width: i < index ? '100%' : '0%',
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-[#5A1D6A]">
              <ButterflyLogo className="h-3.5 w-3.5 text-white" />
            </span>
            <span>Glow Year</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/20 bg-[#5A1D6A] px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/90">
              {index + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Resume story' : 'Pause story'}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Glow Year"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main interactive stage — buttons inside slides stay 100% clickable */}
      <main
        className="relative z-10 flex flex-1 items-center justify-center px-5 pb-8 pt-4 sm:px-16"
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerCancel}
      >
        {/* Desktop side navigation controls */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous slide"
          className="hidden sm:grid absolute left-5 lg:left-10 top-1/2 -translate-y-1/2 z-20 h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label={index >= slides.length - 1 ? 'Finish story' : 'Next slide'}
          className="hidden sm:grid absolute right-5 lg:right-10 top-1/2 -translate-y-1/2 z-20 h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="relative w-full max-w-md">
          <AnimatePresence mode="popLayout" initial={false}>
            {current && (
              <motion.div
                key={current.id}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative w-full"
              >
                {current.id === 'intro' && (
                  <SlideIntro
                    firstName={firstName}
                    birthday={recap.birthday}
                    isBirthdayToday={recap.isBirthdayToday}
                  />
                )}
                {current.id === 'joined' && (
                  <SlideJoined
                    daysWithUs={recap.daysWithUs}
                    joinedOn={recap.joinedOn}
                  />
                )}
                {current.id === 'stats' && (
                  <SlideStats recap={recap} firstName={firstName} />
                )}
                {current.id === 'treatment' && (
                  <SlideTreatment
                    name={recap.stats.topTreatment!}
                    count={recap.stats.topTreatmentCount}
                  />
                )}
                {current.id === 'location' && (
                  <SlideLocation
                    name={recap.stats.topLocation!}
                    count={recap.stats.topLocationCount}
                  />
                )}
                {current.id === 'share' && (
                  <SlideShare
                    recap={recap}
                    shareStatus={shareStatus}
                    onShare={handleShare}
                  />
                )}
                {current.id === 'wish' && (
                  <SlideWish
                    firstName={firstName}
                    isBirthdayToday={recap.isBirthdayToday}
                    onBook={() => router.push('/booking')}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Subtle footer navigation hint */}
      <footer className="relative z-20 pb-4 text-center text-[11px] font-medium tracking-wide text-white/60">
        {isEffectivelyPaused ? 'Paused' : 'Tap to continue · Hold to pause'}
      </footer>
    </div>
  )
}

function StoryBackdropLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <circle
        cx="600"
        cy="450"
        r="260"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
      <circle
        cx="600"
        cy="450"
        r="410"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      <circle
        cx="600"
        cy="450"
        r="560"
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="1"
      />
    </svg>
  )
}

// ===================================================================
// Slides
// ===================================================================

const slideVariants = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.99,
    transition: { duration: 0.12, ease: [0.22, 0.61, 0.36, 1] as const },
  },
}

function SlideShell({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>
}

// ----- 1. Intro -----

function SlideIntro({
  firstName,
  birthday,
  isBirthdayToday,
}: {
  firstName: string
  birthday: string | null
  isBirthdayToday: boolean
}) {
  const copy = useMemo(
    () => getIntroSlideCopy({ birthday, isBirthdayToday }),
    [birthday, isBirthdayToday],
  )

  return (
    <SlideShell>
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-[#5A1D6A]"
        >
          <Heart className="h-6 w-6 text-white" aria-hidden />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/85"
        >
          {copy.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09, duration: 0.22 }}
          className="font-serif mt-2 text-balance text-4xl font-semibold leading-tight sm:text-5xl"
        >
          Hi {firstName}!
        </motion.h1>

        {copy.dateText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.22 }}
            className="mt-7 w-full rounded-2xl border border-white/80 bg-white px-6 py-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7B2D8E]">
              {copy.cardLabel}
            </p>
            <p className="font-serif mt-2 text-2xl font-bold leading-tight text-[#1a0d1f] tabular-nums sm:text-3xl">
              {copy.dateText.month} {copy.dateText.day}
              <sup className="ml-0.5 text-sm align-super">{copy.dateText.suffix}</sup>
              {copy.dateText.year ? `, ${copy.dateText.year}` : ''}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="mt-8 max-w-[300px] text-balance text-sm leading-relaxed text-white/90 sm:text-base"
        >
          <p>{copy.subtitleLead}</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-white sm:text-lg">
            {copy.subtitleBrand}
          </p>
        </motion.div>
      </div>
    </SlideShell>
  )
}

// ----- 2. Joined / Days with us -----

function SlideJoined({
  daysWithUs,
  joinedOn,
}: {
  daysWithUs: number
  joinedOn: string | null
}) {
  const date = formatLongDate(joinedOn)
  const dayUnit = daysWithUs === 1 ? 'Day' : 'Days'

  return (
    <SlideShell>
      <div className="relative px-3">
        {/* Stacked solid cards framed with hairline borders — zero gradients/shadows */}
        <motion.div
          initial={{ rotate: -8, x: -12, opacity: 0 }}
          animate={{ rotate: -6, x: -10, opacity: 1 }}
          transition={{ delay: 0.04, duration: 0.24 }}
          className="absolute inset-x-3 inset-y-0 rounded-3xl border border-white/25 bg-[#9B4DB0]"
        />
        <motion.div
          initial={{ rotate: 8, x: 12, opacity: 0 }}
          animate={{ rotate: 5, x: 10, opacity: 1 }}
          transition={{ delay: 0.07, duration: 0.24 }}
          className="absolute inset-x-3 inset-y-0 rounded-3xl border border-white/20 bg-[#5A1D6A]"
        />

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.24 }}
          className="relative rounded-3xl border border-white/25 bg-[#5A1D6A] px-7 py-9"
        >
          {date ? (
            <p className="font-serif text-base font-medium tracking-tight text-white/90 sm:text-lg">
              {date.monthTitle} {date.day}
              <sup className="ml-0.5 text-xs align-super">{date.suffix}</sup>,{' '}
              {date.year} <span className="mx-1.5 text-white/50">·</span> You Joined
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Your Dermaspace Journey
            </p>
          )}

          <div className="mt-6 flex items-baseline gap-3.5">
            <span className="font-serif text-6xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-7xl">
              {daysWithUs.toLocaleString('en-NG')}
            </span>
            <span className="text-xs font-semibold uppercase leading-snug tracking-[0.18em] text-white/85">
              {dayUnit} of
              <br />
              Glow With
              <br />
              <span className="font-bold text-white">Dermaspace</span>
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

function SlideStats({
  recap,
  firstName,
}: {
  recap: RecapPayload
  firstName: string
}) {
  const { totalBookings, totalSpentNaira, busiestMonth } = recap.stats

  return (
    <SlideShell>
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24 }}
        className="relative overflow-hidden rounded-3xl border border-white bg-white text-[#1a0d1f]"
      >
        {/* Minimal geometric hairline arc in corner — zero gradients */}
        <svg
          aria-hidden="true"
          viewBox="0 0 240 240"
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48"
        >
          <circle
            cx="120"
            cy="120"
            r="96"
            fill="none"
            stroke="#7B2D8E"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
          <circle
            cx="120"
            cy="120"
            r="68"
            fill="none"
            stroke="#7B2D8E"
            strokeOpacity="0.12"
            strokeWidth="1"
          />
        </svg>

        <div className="relative p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7B2D8E]">
            Your Spa Year
          </p>
          <h2 className="font-serif mt-1.5 text-4xl font-bold leading-none tracking-tight text-[#7B2D8E] sm:text-5xl">
            GLOW
            <br />
            MOVES
          </h2>

          <div className="relative mx-auto mt-6 grid h-44 place-items-center sm:h-48">
            <CircularName name={`${firstName} · glow year`} />
            <div className="text-center">
              <p className="font-serif text-5xl font-bold leading-none tracking-tight text-[#1a0d1f] tabular-nums sm:text-6xl">
                {totalBookings}
              </p>
              <p className="mt-1.5 text-xs font-medium tracking-wide text-gray-600">
                {totalBookings === 1 ? 'Total Booking' : 'Total Bookings'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-5 border-t border-gray-200 pt-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Invested
              </p>
              <p className="font-serif mt-1.5 text-3xl font-bold leading-none tracking-tight text-[#1a0d1f] tabular-nums sm:text-4xl">
                ₦{formatNairaCompact(totalSpentNaira)}
              </p>
              <p className="mt-1.5 text-[11px] leading-tight text-gray-500">
                On your self-care
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Peak Month
              </p>
              <p className="font-serif mt-1.5 text-3xl font-bold leading-none tracking-tight text-[#1a0d1f] sm:text-4xl">
                {busiestMonth ?? '—'}
              </p>
              <p className="mt-1.5 text-[11px] leading-tight text-gray-500">
                Most active month
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <ButterflyLogo className="h-5 w-5 text-[#7B2D8E]" />
            <Heart className="h-5 w-5 text-[#7B2D8E]" aria-hidden />
          </div>
        </div>
      </motion.div>
    </SlideShell>
  )
}

/** Deterministic symmetric SVG textPath using React useId() so SSR/client never mismatch. */
function CircularName({ name }: { name: string }) {
  const reactId = useId()
  const safeId = `arc-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle
        cx="100"
        cy="100"
        r="74"
        fill="none"
        stroke="rgba(123, 45, 142, 0.14)"
        strokeWidth="1"
      />
      <defs>
        <path
          id={safeId}
          d="M 22,100 A 78,78 0 0,1 178,100"
          fill="none"
        />
      </defs>
      <text
        fontSize="9.5"
        fontWeight="600"
        letterSpacing="2"
        fill="rgba(123, 45, 142, 0.85)"
        style={{ textTransform: 'uppercase' }}
      >
        <textPath href={`#${safeId}`} startOffset="50%" textAnchor="middle">
          {name}
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
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.2 }}
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/85"
        >
          Your Go-To Treatment
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.22 }}
          className="font-serif mt-2.5 text-balance text-3xl font-bold leading-tight sm:text-4xl"
        >
          {name}
        </motion.h2>

        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.24, ease: 'easeOut' }}
          className="mx-auto mt-8 grid h-44 w-44 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] sm:h-52 sm:w-52"
        >
          <div className="grid h-32 w-32 place-items-center rounded-full border border-white bg-white text-center sm:h-36 sm:w-36">
            <div>
              <p className="font-serif text-5xl font-bold leading-none tracking-tight text-[#7B2D8E] tabular-nums sm:text-6xl">
                {count}
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                {count === 1 ? 'Session' : 'Sessions'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="mx-auto mt-8 max-w-[300px] text-balance text-sm leading-relaxed text-white/90 sm:text-base"
        >
          Some people call it routine. We call it knowing exactly what your skin
          loves.
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
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.2 }}
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/85"
        >
          Your Sanctuary
        </motion.p>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.2 }}
          className="mx-auto mt-3"
        >
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-[#5A1D6A] px-4 py-1.5 text-xs font-medium text-white">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Dermaspace · Lagos
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.22 }}
          className="font-serif mt-6 text-balance text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl"
        >
          {name}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.16, duration: 0.22 }}
          className="mt-8 inline-flex items-baseline gap-2.5 rounded-2xl border border-white/25 bg-[#5A1D6A] px-6 py-3.5"
        >
          <span className="font-serif text-4xl font-bold leading-none tabular-nums">
            {count}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
            {count === 1 ? 'Visit this year' : 'Visits this year'}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.2 }}
          className="mx-auto mt-8 max-w-[320px] text-balance text-sm leading-relaxed text-white/90 sm:text-base"
        >
          Familiar rooms, familiar faces, and treatments tailored to how your skin
          evolves.
        </motion.p>
      </div>
    </SlideShell>
  )
}

// ----- 6. Share -----

function SlideShare({
  recap,
  shareStatus,
  onShare,
}: {
  recap: RecapPayload
  shareStatus: 'idle' | 'copied' | 'shared'
  onShare: () => void
}) {
  const firstName = recap.user.firstName?.trim() || 'Friend'

  return (
    <SlideShell>
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.22 }}
          className="font-serif text-balance text-3xl font-bold leading-tight sm:text-4xl"
        >
          Share what your
          <br />
          Glow Year looks like
        </motion.h2>

        {/* Fanned flat preview cards — strictly purple & white palette */}
        <div className="relative mt-8 flex h-56 items-center justify-center sm:h-64">
          <motion.div
            initial={{ rotate: -10, x: -46, opacity: 0 }}
            animate={{ rotate: -8, x: -56, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.24 }}
            className="absolute h-44 w-32 rounded-2xl border-4 border-white bg-[#5A1D6A] p-2 sm:h-52 sm:w-36"
          >
            <div className="flex h-full flex-col items-center justify-between rounded-lg border border-white/15 p-3 text-center">
              <ButterflyLogo className="h-4 w-4 text-white/80" />
              <div>
                <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums">
                  {recap.daysWithUs}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                  Days of Glow
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ rotate: 10, x: 46, opacity: 0 }}
            animate={{ rotate: 8, x: 56, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.24 }}
            className="absolute h-44 w-32 rounded-2xl border-4 border-white bg-[#9B4DB0] p-2 sm:h-52 sm:w-36"
          >
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-white/20 p-3 text-center">
              <Award className="h-5 w-5 text-white" aria-hidden />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white">
                {recap.stats.topTreatment
                  ? 'Your Go-To'
                  : recap.stats.topLocation
                    ? 'Sanctuary'
                    : 'Dermaspace'}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-white/90">
                {recap.stats.topTreatment || recap.stats.topLocation || 'Self-Care Club'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.16, duration: 0.24 }}
            className="relative h-48 w-36 rounded-2xl border-4 border-white bg-white p-2 sm:h-56 sm:w-40"
          >
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-[#7B2D8E]/15 bg-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
                Glow
              </p>
              <p className="font-serif mt-0.5 text-2xl font-bold leading-none text-[#1a0d1f]">
                Moves
              </p>
              <p className="mt-3 rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[10px] font-semibold text-[#7B2D8E] tabular-nums">
                {recap.stats.totalBookings}{' '}
                {recap.stats.totalBookings === 1 ? 'booking' : 'bookings'}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.button
          type="button"
          onClick={onShare}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.22 }}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-[#5A1D6A] py-4 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-[0.98]"
        >
          {shareStatus === 'copied' || shareStatus === 'shared' ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              {shareStatus === 'copied' ? 'Copied to clipboard' : 'Shared'}
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" aria-hidden />
              Share my Glow Year, {firstName}
            </>
          )}
        </motion.button>
      </div>
    </SlideShell>
  )
}

// ----- 7. Birthday wish + CTA -----

function SlideWish({
  firstName,
  isBirthdayToday,
  onBook,
}: {
  firstName: string
  isBirthdayToday: boolean
  onBook: () => void
}) {
  return (
    <SlideShell>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white bg-white"
        >
          <Gift className="h-7 w-7 text-[#7B2D8E]" aria-hidden />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-white/85"
        >
          From everyone at Dermaspace
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.22 }}
          className="font-serif mt-2 text-balance text-3xl font-bold leading-tight sm:text-4xl"
        >
          {isBirthdayToday ? (
            <>
              Wishing you the
              <br />
              <span className="italic">softest, healthiest</span>
              <br />
              year yet, {firstName}.
            </>
          ) : (
            <>
              Here&apos;s to your
              <br />
              <span className="italic">softest, healthiest</span>
              <br />
              skin yet, {firstName}.
            </>
          )}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.22 }}
          className="mx-auto mt-7 max-w-[330px] rounded-2xl border border-white/25 bg-[#5A1D6A] px-5 py-4 text-left"
        >
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {isBirthdayToday ? 'Your Birthday Treat' : 'Celebrate Your Glow'}
          </p>
          <p className="mt-2 text-balance text-sm leading-relaxed text-white/95">
            {isBirthdayToday
              ? 'Book any treatment in the next 30 days and our team will have a birthday surprise waiting for you in-clinic.'
              : 'Whenever you are ready for your next reset, our therapists are waiting with a plan tailored to your skin.'}
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onBook}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.22 }}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-white/90 active:scale-95"
        >
          {isBirthdayToday ? 'Book your birthday visit' : 'Book your next visit'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </motion.button>
      </div>
    </SlideShell>
  )
}

// ===================================================================
// Finished screen — shown after the last slide completes.
// ===================================================================

function FinishedScreen({
  recap,
  shareStatus,
  onReplay,
  onClose,
  onShare,
  onBook,
}: {
  recap: RecapPayload
  shareStatus: 'idle' | 'copied' | 'shared'
  onReplay: () => void
  onClose: () => void
  onShare: () => void
  onBook: () => void
}) {
  const firstName = recap.user.firstName?.trim() || 'Friend'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 font-sans"
      style={{ backgroundColor: BRAND, color: '#FFFFFF' }}
    >
      <StoryBackdropLines />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close Glow Year"
        className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E]"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-[#5A1D6A]">
          <ButterflyLogo className="h-6 w-6 text-white" />
        </div>

        <h2 className="font-serif mt-5 text-balance text-3xl font-bold leading-tight sm:text-4xl">
          That&apos;s your year, {firstName}.
        </h2>

        <p className="mt-3 max-w-xs text-balance text-sm leading-relaxed text-white/85 sm:text-base">
          Save it, share it, and let&apos;s make this next chapter even better for your
          skin.
        </p>

        {/* Compact year-at-a-glance card */}
        <div className="mt-6 grid w-full grid-cols-2 gap-2.5 rounded-2xl border border-white/25 bg-[#5A1D6A] p-3.5">
          <div className="rounded-xl border border-white/15 px-3 py-2.5">
            <p className="font-serif text-2xl font-bold leading-none tabular-nums">
              {recap.daysWithUs}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
              Days with us
            </p>
          </div>
          <div className="rounded-xl border border-white/15 px-3 py-2.5">
            <p className="font-serif text-2xl font-bold leading-none tabular-nums">
              {recap.stats.totalBookings}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
              {recap.stats.totalBookings === 1 ? 'Visit' : 'Visits'}
            </p>
          </div>
        </div>

        <div className="mt-7 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onShare}
            className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-white/90 active:scale-95"
          >
            {shareStatus === 'copied' || shareStatus === 'shared' ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                {shareStatus === 'copied' ? 'Copied to clipboard' : 'Shared'}
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" aria-hidden />
                Share my Glow Year
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBook}
            className="flex items-center justify-center gap-2 rounded-full border border-white/35 bg-[#5A1D6A] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
          >
            Book a treatment
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <div className="mt-1 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Watch again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75 hover:text-white"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
