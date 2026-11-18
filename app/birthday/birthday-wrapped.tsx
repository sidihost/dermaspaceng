'use client'

/**
 * Glow Year — Dermaspace birthday & year-in-review story.
 *
 * Design system compliance:
 *   - Strictly brand purple (#7B2D8E / #5A1D6A / #3E104B / #9B4DB0 / #F5ECFA),
 *     white (#FFFFFF), and black neutrals (#1a0d1f).
 *   - Uses the official Dermaspace Crescent-Wing emblem (not the Derma AI butterfly).
 *   - Zero gradients (no linear/radial/repeating-linear gradients).
 *   - Zero Sparkles/Zap icons or sparkle emojis.
 *   - Collector cards framed with crisp 1px hairline borders & geometric SVG linework.
 *   - Integrated polyphonic Web Audio birthday lounge soundtrack with header visualizer.
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
  Music2,
  VolumeX,
} from 'lucide-react'
import {
  DermaspaceEmblem,
  DermaspaceWordmark,
} from '@/components/shared/dermaspace-emblem'
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
import {
  BirthdaySongPlayer,
  type SongPlaybackState,
} from '@/lib/birthday-song'

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
  const [songState, setSongState] = useState<SongPlaybackState>('awaiting-gesture')

  const startedAtRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const activeBarRef = useRef<HTMLSpanElement | null>(null)
  const songPlayerRef = useRef<BirthdaySongPlayer | null>(null)

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

  // Initialize Glow Year soundtrack
  useEffect(() => {
    const player = new BirthdaySongPlayer()
    songPlayerRef.current = player
    const unsubscribe = player.subscribe((next) => setSongState(next))
    void player.start()

    return () => {
      unsubscribe()
      player.destroy()
      songPlayerRef.current = null
    }
  }, [])

  const unlockSong = useCallback(() => {
    void songPlayerRef.current?.unlockFromGesture()
  }, [])

  const handleToggleSong = useCallback(() => {
    void songPlayerRef.current?.toggle()
  }, [])

  // Navigation handlers declared BEFORE keyboard/timer effects (prevents TDZ)
  const goPrev = useCallback(() => {
    unlockSong()
    setDone(false)
    elapsedRef.current = 0
    if (activeBarRef.current) activeBarRef.current.style.width = '0%'
    if (index === 0) return
    setIndex((prev) => Math.max(0, prev - 1))
  }, [index, unlockSong])

  const goNext = useCallback(() => {
    unlockSong()
    elapsedRef.current = 0
    if (activeBarRef.current) activeBarRef.current.style.width = '0%'
    if (index >= slides.length - 1) {
      setDone(true)
      return
    }
    setIndex((prev) => Math.min(slides.length - 1, prev + 1))
  }, [index, slides.length, unlockSong])

  const goToSlide = useCallback(
    (targetIndex: number) => {
      unlockSong()
      if (targetIndex < 0 || targetIndex >= slides.length) return
      setDone(false)
      elapsedRef.current = 0
      if (activeBarRef.current) activeBarRef.current.style.width = '0%'
      setIndex(targetIndex)
    },
    [slides.length, unlockSong],
  )

  const handleClose = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  const handleReplay = useCallback(() => {
    unlockSong()
    elapsedRef.current = 0
    if (activeBarRef.current) activeBarRef.current.style.width = '0%'
    setIndex(0)
    setPaused(false)
    setDone(false)
  }, [unlockSong])

  const handleShare = useCallback(async () => {
    unlockSong()
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
  }, [recap, notify, unlockSong])

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
        unlockSong()
        setPaused((p) => !p)
      } else if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, handleClose, unlockSong])

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
    unlockSong()
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
        songState={songState}
        onToggleSong={handleToggleSong}
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
      <header className="relative z-30 mx-auto w-full max-w-2xl px-4 pt-3.5 sm:px-6 sm:pt-5">
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
              className="group relative flex-1 py-1.5 focus:outline-none"
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

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-[#5A1D6A]">
              <DermaspaceEmblem className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0 leading-none">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                Dermaspace
              </p>
              <p className="mt-0.5 text-[10px] font-medium tracking-[0.12em] text-white/70">
                Glow Year · {index + 1}/{slides.length}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <SongToggleButton state={songState} onToggle={handleToggleSong} />
            <button
              type="button"
              onClick={() => {
                unlockSong()
                setPaused((p) => !p)
              }}
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
        className="relative z-10 flex flex-1 items-center justify-center px-4 pb-6 pt-3 sm:px-16 sm:pb-8 sm:pt-4"
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

        <div className="relative w-full max-w-[400px] sm:max-w-md">
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
      <footer className="relative z-20 pb-3.5 text-center text-[11px] font-medium tracking-wide text-white/65">
        {isEffectivelyPaused
          ? 'Paused'
          : songState === 'awaiting-gesture'
            ? 'Tap anywhere to play Glow Song · Hold to pause'
            : 'Tap to continue · Hold to pause'}
      </footer>
    </div>
  )
}

function SongToggleButton({
  state,
  onToggle,
}: {
  state: SongPlaybackState
  onToggle: () => void
}) {
  const isPlaying = state === 'playing'
  const isMuted = state === 'muted'
  const ariaLabel = isPlaying
    ? 'Mute Glow Year song'
    : 'Play Glow Year song'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={isPlaying}
      className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11px] font-semibold tracking-wide transition-colors active:scale-95 ${
        isPlaying
          ? 'border-white bg-white text-[#7B2D8E] hover:bg-[#F5ECFA]'
          : 'border-white/25 bg-[#5A1D6A] text-white hover:bg-white hover:text-[#7B2D8E]'
      }`}
    >
      {isPlaying ? (
        <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
          <span
            className="w-[2px] rounded-full bg-current"
            style={{
              height: '7px',
              animation: 'soundwave 0.55s ease-in-out infinite',
            }}
          />
          <span
            className="w-[2px] rounded-full bg-current"
            style={{
              height: '12px',
              animation: 'soundwave 0.55s ease-in-out 0.14s infinite',
            }}
          />
          <span
            className="w-[2px] rounded-full bg-current"
            style={{
              height: '8px',
              animation: 'soundwave 0.55s ease-in-out 0.28s infinite',
            }}
          />
        </span>
      ) : isMuted ? (
        <VolumeX className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Music2 className="h-3.5 w-3.5" aria-hidden />
      )}
      <span>{isPlaying ? 'Song' : isMuted ? 'Muted' : 'Play'}</span>
    </button>
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

function CardCornerBrackets({ color = 'rgba(255,255,255,0.28)' }: { color?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 400"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <path d="M 16 32 L 16 16 L 32 16" fill="none" stroke={color} strokeWidth="1.25" />
      <path d="M 288 16 L 304 16 L 304 32" fill="none" stroke={color} strokeWidth="1.25" />
      <path d="M 16 368 L 16 384 L 32 384" fill="none" stroke={color} strokeWidth="1.25" />
      <path d="M 288 384 L 304 384 L 304 368" fill="none" stroke={color} strokeWidth="1.25" />
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

// ----- 1. Intro Keepsake Cover Card -----

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
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-8 text-center sm:px-8 sm:py-9">
        <CardCornerBrackets />

        {/* Architectural arched backdrop lines */}
        <svg
          aria-hidden="true"
          viewBox="0 0 320 180"
          className="pointer-events-none absolute inset-x-0 top-0 h-44 w-full"
        >
          <circle
            cx="160"
            cy="52"
            r="74"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle
            cx="160"
            cy="52"
            r="106"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        </svg>

        <div className="relative flex flex-col items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
            <DermaspaceEmblem className="h-8 w-8" />
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
            {copy.eyebrow}
          </p>

          <h1 className="font-serif mt-2 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Hi {firstName}!
          </h1>

          {copy.dateText && (
            <div className="mt-6 w-full rounded-2xl border border-white bg-white px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7B2D8E]">
                {copy.cardLabel}
              </p>
              <p className="font-serif mt-1.5 text-2xl font-bold leading-tight text-[#1a0d1f] tabular-nums sm:text-3xl">
                {copy.dateText.month} {copy.dateText.day}
                <sup className="ml-0.5 text-sm align-super">{copy.dateText.suffix}</sup>
                {copy.dateText.year ? `, ${copy.dateText.year}` : ''}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 text-[11px] font-medium tracking-[0.14em] uppercase text-white/75">
            <span>{copy.subtitleLead}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-white">{copy.subtitleBrand}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----- 2. Joined / Days with us Collector Stack -----

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
    <div className="relative px-3 py-2">
      {/* Stacked solid cards framed with hairline borders — zero gradients/shadows */}
      <motion.div
        initial={{ rotate: -8, x: -10, opacity: 0 }}
        animate={{ rotate: -6, x: -10, opacity: 1 }}
        transition={{ delay: 0.04, duration: 0.22 }}
        className="absolute inset-x-3 inset-y-2 rounded-[28px] border border-white/30 bg-[#9B4DB0]"
      />
      <motion.div
        initial={{ rotate: 8, x: 10, opacity: 0 }}
        animate={{ rotate: 5, x: 10, opacity: 1 }}
        transition={{ delay: 0.07, duration: 0.22 }}
        className="absolute inset-x-3 inset-y-2 rounded-[28px] border border-white/25 bg-[#3E104B]"
      />

      <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
        <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#5A1D6A] px-6 py-7 sm:px-7 sm:py-8">
          <CardCornerBrackets />

          <div className="relative flex items-center justify-between gap-3 border-b border-white/15 pb-4">
            {date ? (
              <p className="font-serif text-sm font-medium tracking-tight text-white/95 sm:text-base">
                {date.monthTitle} {date.day}
                <sup className="ml-0.5 text-[10px] align-super">{date.suffix}</sup>,{' '}
                {date.year} <span className="mx-1 text-white/45">·</span> You Joined
              </p>
            ) : (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
                Your Dermaspace Journey
              </p>
            )}
            <DermaspaceEmblem className="h-5 w-5 text-white/85" />
          </div>

          <div className="relative mt-6 flex items-baseline gap-4">
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

          <p className="relative mt-6 max-w-[300px] text-balance text-sm leading-relaxed text-white/90">
            The day you started taking your skin seriously — and we&apos;ve been
            in your corner ever since.
          </p>
        </div>
      </div>
    </div>
  )
}

// ----- 3. Stats Collector Card (Ivory-White) -----

function SlideStats({
  recap,
  firstName,
}: {
  recap: RecapPayload
  firstName: string
}) {
  const { totalBookings, totalSpentNaira, busiestMonth } = recap.stats

  return (
    <div className="relative rounded-[28px] border-2 border-white bg-white p-2 text-[#1a0d1f]">
      <div className="relative overflow-hidden rounded-[22px] border border-[#7B2D8E]/15 bg-white p-6 sm:p-7">
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
            strokeOpacity="0.12"
            strokeWidth="1"
          />
          <circle
            cx="120"
            cy="120"
            r="68"
            fill="none"
            stroke="#7B2D8E"
            strokeOpacity="0.14"
            strokeWidth="1"
          />
        </svg>

        <div className="relative">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-[#7B2D8E]">
            <span>Your Spa Year</span>
            <span className="text-[#7B2D8E]/70">Edition &apos;26</span>
          </div>
          <h2 className="font-serif mt-1.5 text-4xl font-bold leading-none tracking-tight text-[#7B2D8E] sm:text-5xl">
            GLOW
            <br />
            MOVES
          </h2>

          <div className="relative mx-auto mt-5 grid h-44 place-items-center sm:h-48">
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

          <div className="mt-4 grid grid-cols-2 gap-x-5 border-t border-gray-200 pt-4">
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

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
            <DermaspaceWordmark
              className="text-[#7B2D8E]"
              emblemClassName="h-6 w-6"
              showSubtitle
            />
            <Heart className="h-5 w-5 text-[#7B2D8E]" aria-hidden />
          </div>
        </div>
      </div>
    </div>
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
        stroke="rgba(123, 45, 142, 0.16)"
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

// ----- 4. Top Treatment Signature Ritual Card -----

function SlideTreatment({ name, count }: { name: string; count: number }) {
  return (
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-7 text-center sm:px-7 sm:py-8">
        <CardCornerBrackets />

        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
            Your Go-To Treatment
          </p>

          <h2 className="font-serif mt-2 text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
            {name}
          </h2>

          <div className="mx-auto mt-7 grid h-44 w-44 place-items-center rounded-full border border-white/30 bg-[#5A1D6A] sm:h-48 sm:w-48">
            <div className="grid h-32 w-32 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-center sm:h-36 sm:w-36">
              <div>
                <p className="font-serif text-5xl font-bold leading-none tracking-tight text-[#7B2D8E] tabular-nums sm:text-6xl">
                  {count}
                </p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                  {count === 1 ? 'Session' : 'Sessions'}
                </p>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-7 max-w-[290px] text-balance text-sm leading-relaxed text-white/90">
            Some people call it routine. We call it knowing exactly what your skin
            loves.
          </p>

          <div className="mt-6 flex items-center justify-center border-t border-white/15 pt-4">
            <DermaspaceWordmark className="text-white/90" emblemClassName="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ----- 5. Top Location Sanctuary Pass Card -----

function SlideLocation({ name, count }: { name: string; count: number }) {
  return (
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#5A1D6A] text-center">
        <div className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Dermaspace · Lagos
            </span>
            <DermaspaceEmblem className="h-5 w-5 text-white" />
          </div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
            Your Sanctuary
          </p>
          <h2 className="font-serif mt-2 text-balance text-3xl font-bold uppercase leading-none tracking-tight text-white sm:text-4xl">
            {name}
          </h2>

          <div className="mt-6 inline-flex items-baseline gap-2.5 rounded-2xl border border-white/25 bg-[#3E104B] px-6 py-3.5">
            <span className="font-serif text-4xl font-bold leading-none text-white tabular-nums">
              {count}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
              {count === 1 ? 'Visit this year' : 'Visits this year'}
            </span>
          </div>
        </div>

        {/* Sanctuary pass perforated divider with side notches */}
        <div className="relative flex items-center">
          <span
            aria-hidden="true"
            className="-ml-3 h-6 w-6 shrink-0 rounded-full border border-white/25 bg-[#7B2D8E]"
          />
          <span className="h-px flex-1 border-t border-dashed border-white/30" />
          <span
            aria-hidden="true"
            className="-mr-3 h-6 w-6 shrink-0 rounded-full border border-white/25 bg-[#7B2D8E]"
          />
        </div>

        <div className="px-6 pt-4 pb-6 sm:px-7 sm:pb-7">
          <p className="mx-auto max-w-[300px] text-balance text-sm leading-relaxed text-white/90">
            Familiar rooms, familiar faces, and treatments tailored to how your skin
            evolves.
          </p>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
            Sanctuary Club Pass · 2026
          </p>
        </div>
      </div>
    </div>
  )
}

// ----- 6. Share Snapchat-Style Fanned Collector Cards -----

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
  const rightCount =
    recap.stats.topLocationCount ||
    recap.stats.topTreatmentCount ||
    recap.stats.totalBookings
  const rightHeading = recap.stats.topLocation
    ? 'Visits'
    : recap.stats.topTreatment
      ? 'Ritual'
      : 'Club'

  return (
    <div className="text-center">
      <h2 className="font-serif text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
        Share what your
        <br />
        Glow Year looks like
      </h2>

      {/* Fanned Snapchat-style 3-card collector stack — outer flank columns stay 100% unclipped */}
      <div className="relative mx-auto mt-7 flex h-64 w-full max-w-[360px] items-center justify-center sm:h-72 sm:max-w-[420px]">
        {/* Left card (#3E104B Deep Aubergine) — Days of Glow tucked cleanly in exposed left flank */}
        <motion.div
          initial={{ rotate: -8, x: -64, y: 12, opacity: 0 }}
          animate={{ rotate: -14, x: -86, y: 12, opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.24 }}
          className="absolute h-48 w-32 rounded-[22px] border-[3px] border-white bg-[#3E104B] p-1.5 sm:h-56 sm:w-36 sm:-translate-x-5"
        >
          <div className="flex h-full flex-col justify-between rounded-[14px] border border-white/20 p-2.5 text-left">
            <div className="w-[54px] sm:w-[66px]">
              <DermaspaceEmblem className="h-5 w-5 text-white" />
            </div>
            <div className="w-[54px] sm:w-[66px]">
              <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums sm:text-3xl">
                {recap.daysWithUs}
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-[0.14em] text-white/85">
                Days
                <br />
                Glow
              </p>
            </div>
            <p className="w-[54px] text-[8px] font-semibold uppercase tracking-[0.16em] text-white/60 sm:w-[66px]">
              &apos;26
            </p>
          </div>
        </motion.div>

        {/* Right card (#9B4DB0 Royal Lavender) — Top count & emblem tucked cleanly in exposed right flank */}
        <motion.div
          initial={{ rotate: 8, x: 64, y: 12, opacity: 0 }}
          animate={{ rotate: 14, x: 86, y: 12, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.24 }}
          className="absolute h-48 w-32 rounded-[22px] border-[3px] border-white bg-[#9B4DB0] p-1.5 sm:h-56 sm:w-36 sm:translate-x-5"
        >
          <div className="flex h-full flex-col items-end justify-between rounded-[14px] border border-white/25 p-2.5 text-right">
            <div className="flex w-[54px] justify-end sm:w-[66px]">
              <Award className="h-4 w-4 text-white" aria-hidden />
            </div>
            <div className="w-[54px] sm:w-[66px]">
              <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums sm:text-3xl">
                {rightCount}×
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-[0.14em] text-white">
                Top
                <br />
                {rightHeading}
              </p>
            </div>
            <p className="w-[46px] text-[8px] font-semibold uppercase tracking-[0.16em] text-white/75 sm:w-[60px]">
              &apos;26
            </p>
          </div>
        </motion.div>

        {/* Center Hero Collector Card (Crisp Ivory-White) */}
        <motion.div
          initial={{ scale: 0.94, y: 4, opacity: 0 }}
          animate={{ scale: 1, y: -4, opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.24 }}
          className="relative z-10 h-56 w-40 rounded-[24px] border-[3px] border-white bg-white p-1.5 text-[#1a0d1f] sm:h-64 sm:w-48"
        >
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[16px] border border-[#7B2D8E]/20 bg-white p-3.5 text-center">
            <div className="flex items-center justify-between gap-2">
              <DermaspaceEmblem className="h-4 w-4 text-[#7B2D8E]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Glow &apos;26
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-[#7B2D8E]/25 bg-[#F5ECFA]">
                <span className="font-serif text-2xl font-bold leading-none text-[#7B2D8E] tabular-nums">
                  {recap.stats.totalBookings}
                </span>
              </div>
              <p className="font-serif mt-2.5 text-xl font-bold leading-none text-[#1a0d1f]">
                Glow Moves
              </p>
              <p className="mt-1.5 max-w-full truncate text-[10px] font-medium text-gray-600 tabular-nums">
                {recap.stats.totalBookings}{' '}
                {recap.stats.totalBookings === 1 ? 'visit' : 'visits'}
                {recap.stats.totalSpentNaira > 0
                  ? ` · ₦${formatNairaCompact(recap.stats.totalSpentNaira)}`
                  : ''}
              </p>
            </div>

            <div className="flex items-center justify-between gap-1.5 border-t border-[#7B2D8E]/15 pt-2 text-[9px] font-semibold text-[#7B2D8E]">
              <span className="truncate">{firstName}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.08em] text-[#7B2D8E]/75">
                Dermaspace
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-white bg-white px-6 py-3.5 text-sm font-semibold tracking-wide text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
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
      </button>
    </div>
  )
}

// ----- 7. Birthday Wish Invitation Card + CTA -----

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
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-7 text-center sm:px-7 sm:py-8">
        <CardCornerBrackets />

        <div className="relative">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
            <Gift className="h-6 w-6" aria-hidden />
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            From everyone at Dermaspace
          </p>

          <h2 className="font-serif mt-2 text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
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
          </h2>

          <div className="mx-auto mt-6 rounded-2xl border border-white/20 bg-[#5A1D6A] px-5 py-4 text-left">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {isBirthdayToday ? 'Your Birthday Treat' : 'Celebrate Your Glow'}
            </p>
            <p className="mt-2 text-balance text-sm leading-relaxed text-white/95">
              {isBirthdayToday
                ? 'Book any treatment in the next 30 days and our team will have a birthday surprise waiting for you in-clinic.'
                : 'Whenever you are ready for your next reset, our therapists are waiting with a plan tailored to your skin.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onBook}
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
          >
            {isBirthdayToday ? 'Book your birthday visit' : 'Book your next visit'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

// ===================================================================
// Finished screen — shown after the last slide completes.
// ===================================================================

function FinishedScreen({
  recap,
  shareStatus,
  songState,
  onToggleSong,
  onReplay,
  onClose,
  onShare,
  onBook,
}: {
  recap: RecapPayload
  shareStatus: 'idle' | 'copied' | 'shared'
  songState: SongPlaybackState
  onToggleSong: () => void
  onReplay: () => void
  onClose: () => void
  onShare: () => void
  onBook: () => void
}) {
  const firstName = recap.user.firstName?.trim() || 'Friend'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-4 font-sans"
      style={{ backgroundColor: BRAND, color: '#FFFFFF' }}
    >
      <StoryBackdropLines />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <SongToggleButton state={songState} onToggle={onToggleSong} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Glow Year"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
        <div className="relative flex flex-col items-center rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-7 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
            <DermaspaceEmblem className="h-8 w-8" />
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
            Dermaspace · Glow Year &apos;26
          </p>

          <h2 className="font-serif mt-2 text-balance text-3xl font-bold leading-tight text-white">
            That&apos;s your year, {firstName}.
          </h2>

          <p className="mt-2.5 max-w-xs text-balance text-sm leading-relaxed text-white/85">
            Save it, share it, and let&apos;s make this next chapter even better for
            your skin.
          </p>

          {/* Compact year-at-a-glance strip */}
          <div className="mt-5 grid w-full grid-cols-2 gap-2.5 rounded-2xl border border-white/20 bg-[#5A1D6A] p-3">
            <div className="rounded-xl border border-white/15 px-3 py-2.5">
              <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums">
                {recap.daysWithUs}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
                Days with us
              </p>
            </div>
            <div className="rounded-xl border border-white/15 px-3 py-2.5">
              <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums">
                {recap.stats.totalBookings}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
                {recap.stats.totalBookings === 1 ? 'Visit' : 'Visits'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={onShare}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
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
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/35 bg-[#5A1D6A] py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-[0.98]"
            >
              Book a treatment
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            <div className="mt-1.5 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={onReplay}
                className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Watch again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[36px] text-xs font-semibold uppercase tracking-[0.16em] text-white/75 hover:text-white"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
