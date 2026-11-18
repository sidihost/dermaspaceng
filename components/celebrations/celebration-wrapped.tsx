'use client'

/**
 * CelebrationWrapped — Unified Snapchat-Style Collector Story Stage
 * -------------------------------------------------------------------
 * Powers Dermaspace's three milestone & seasonal stories:
 *   - Birthday ("Glow Year" -> /birthday)
 *   - Christmas ("Christmas Glow" -> /christmas)
 *   - New Year ("Hello [Year] Wrap" -> /new-year)
 *
 * Strict design system compliance:
 *   - Brand palette only: #7B2D8E, #5A1D6A, #3E104B, #9B4DB0, #F5ECFA, #FFFFFF, #1a0d1f
 *   - Official Dermaspace Crescent-Wing emblem (not Derma AI butterfly)
 *   - ZERO gradients (no linear/radial/repeating-linear gradients)
 *   - ZERO shadows (no shadow-*, drop-shadow-*, or boxShadow)
 *   - ZERO Sparkles or Zap icons or sparkle emojis
 *   - Polyphonic Web Audio soundtrack tailored per occasion
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
  Snowflake,
  Clock,
} from 'lucide-react'
import {
  DermaspaceEmblem,
  DermaspaceWordmark,
} from '@/components/shared/dermaspace-emblem'
import { useNotify } from '@/components/shared/notify'
import {
  formatLongDate,
  formatNairaCompact,
  type RecapPayload,
} from '@/lib/birthday'
import {
  buildCelebrationShareText,
  buildCelebrationSlides,
  getCelebrationConfettiColors,
  getCelebrationThemeCopy,
  type CelebrationOccasion,
  type OccasionThemeCopy,
} from '@/lib/celebrations'
import {
  BirthdaySongPlayer,
  type SongPlaybackState,
} from '@/lib/birthday-song'

const BRAND = '#7B2D8E'

export default function CelebrationWrapped({
  recap,
  occasion = 'birthday',
}: {
  recap: RecapPayload
  occasion?: CelebrationOccasion
}) {
  const router = useRouter()
  const notify = useNotify()
  const slides = useMemo(
    () => buildCelebrationSlides(occasion, recap),
    [occasion, recap],
  )
  const theme = useMemo(
    () => getCelebrationThemeCopy(occasion, recap),
    [occasion, recap],
  )

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

  // Initialize occasion-matched polyphonic Web Audio soundtrack
  useEffect(() => {
    const player = new BirthdaySongPlayer(occasion)
    songPlayerRef.current = player
    const unsubscribe = player.subscribe((next) => setSongState(next))
    void player.start()

    return () => {
      unsubscribe()
      player.destroy()
      songPlayerRef.current = null
    }
  }, [occasion])

  const unlockSong = useCallback(() => {
    void songPlayerRef.current?.unlockFromGesture()
  }, [])

  const handleToggleSong = useCallback(() => {
    void songPlayerRef.current?.toggle()
  }, [])

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
    const text = buildCelebrationShareText(occasion, recap)
    const url = typeof window !== 'undefined' ? window.location.href : ''

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: theme.share.shareTitle,
          text,
          url: url || undefined,
        })
        setShareStatus('shared')
        notify.success(theme.share.shareTitle, 'Thanks for sharing your Dermaspace story.')
        window.setTimeout(() => setShareStatus('idle'), 2600)
        return
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url ? `${text}\n${url}` : text)
        setShareStatus('copied')
        notify.success(theme.share.toastTitle, theme.share.toastSubtitle)
        window.setTimeout(() => setShareStatus('idle'), 2600)
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }

    notify.info('Ready to share', text)
  }, [occasion, recap, notify, theme, unlockSong])

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

  // Keyboard navigation
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

  // Confetti burst on intro & wish slides — strictly brand purple + white
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
        const colors = [...getCelebrationConfettiColors(occasion)]
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
  }, [current, done, occasion])

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

    if (dy > 75 && Math.abs(dy) > Math.abs(dx)) {
      handleClose()
      return
    }

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext()
      else goPrev()
      return
    }

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
        theme={theme}
        shareStatus={shareStatus}
        songState={songState}
        onToggleSong={handleToggleSong}
        onReplay={handleReplay}
        onClose={handleClose}
        onShare={handleShare}
        onBook={() => router.push('/booking')}
        onSecondary={(href) => router.push(href)}
      />
    )
  }

  const firstName = recap.user.firstName?.trim() || 'Friend'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden font-sans select-none"
      style={{ backgroundColor: BRAND, color: '#FFFFFF' }}
    >
      {/* Bespoke flat geometric hairline artwork per occasion */}
      <StoryBackdropLines occasion={occasion} />

      {/* Top progress bars & controls */}
      <header className="relative z-30 mx-auto w-full max-w-2xl px-4 pt-3.5 sm:px-6 sm:pt-5">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label={theme.ariaStoryLabel}
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
              <p className="mt-0.5 text-[10px] font-medium tracking-[0.12em] text-white/75">
                {theme.headerTag} · {index + 1}/{slides.length}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <SongToggleButton
              state={songState}
              label={theme.songButtonTitle}
              onToggle={handleToggleSong}
            />
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
              aria-label={theme.closeAriaLabel}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main interactive stage */}
      <main
        className="relative z-10 flex flex-1 items-center justify-center px-4 pb-6 pt-3 sm:px-16 sm:pb-8 sm:pt-4"
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerCancel}
      >
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
                    theme={theme}
                  />
                )}
                {current.id === 'joined' && (
                  <SlideJoined
                    daysWithUs={recap.daysWithUs}
                    joinedOn={recap.joinedOn}
                    theme={theme}
                  />
                )}
                {current.id === 'stats' && (
                  <SlideStats
                    recap={recap}
                    firstName={firstName}
                    theme={theme}
                  />
                )}
                {current.id === 'treatment' && (
                  <SlideTreatment
                    name={recap.stats.topTreatment!}
                    count={recap.stats.topTreatmentCount}
                    theme={theme}
                  />
                )}
                {current.id === 'location' && (
                  <SlideLocation
                    name={recap.stats.topLocation!}
                    count={recap.stats.topLocationCount}
                    theme={theme}
                  />
                )}
                {current.id === 'share' && (
                  <SlideShare
                    recap={recap}
                    theme={theme}
                    shareStatus={shareStatus}
                    onShare={handleShare}
                  />
                )}
                {current.id === 'wish' && (
                  <SlideWish
                    firstName={firstName}
                    theme={theme}
                    onBook={() => router.push('/booking')}
                    onSecondary={(href) => router.push(href)}
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
            ? `Tap anywhere to play ${theme.songHintLabel} · Hold to pause`
            : 'Tap to continue · Hold to pause'}
      </footer>
    </div>
  )
}

function SongToggleButton({
  state,
  label,
  onToggle,
}: {
  state: SongPlaybackState
  label: string
  onToggle: () => void
}) {
  const isPlaying = state === 'playing'
  const isMuted = state === 'muted'
  const ariaLabel = isPlaying ? `Mute ${label}` : `Play ${label}`

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

/**
 * Architectural monochrome hairline background SVG tailored cleanly per occasion.
 * Zero gradients, zero shadows — crisp hairline circles, evergreen compass lines, or clock ticks.
 */
function StoryBackdropLines({ occasion }: { occasion: CelebrationOccasion }) {
  const clockTicks = Array.from({ length: 12 }, (_, idx) => {
    const angle = (idx * 30 * Math.PI) / 180
    const r1 = 248
    const r2 = idx % 3 === 0 ? 270 : 262
    return {
      x1: (600 + Math.cos(angle) * r1).toFixed(2),
      y1: (450 + Math.sin(angle) * r1).toFixed(2),
      x2: (600 + Math.cos(angle) * r2).toFixed(2),
      y2: (450 + Math.sin(angle) * r2).toFixed(2),
      major: idx % 3 === 0,
    }
  })

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

      {occasion === 'christmas' && (
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none">
          {/* Hanging geometric holiday ornament cords */}
          <line x1="210" y1="0" x2="210" y2="128" />
          <circle cx="210" cy="164" r="36" />
          <circle cx="210" cy="164" r="22" />
          <line x1="990" y1="0" x2="990" y2="160" />
          <circle cx="990" cy="200" r="40" />
          <circle cx="990" cy="200" r="26" />
          {/* Architectural 8-point winter star hairline cross */}
          <line x1="600" y1="70" x2="600" y2="120" />
          <line x1="575" y1="95" x2="625" y2="95" />
          <line x1="584" y1="79" x2="616" y2="111" />
          <line x1="616" y1="79" x2="584" y2="111" />
        </g>
      )}

      {occasion === 'new-year' && (
        <g stroke="rgba(255,255,255,0.1)" fill="none">
          {clockTicks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={t.major ? '1.6' : '1'}
            />
          ))}
        </g>
      )}
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

function OccasionCornerMotif({ occasion }: { occasion: CelebrationOccasion }) {
  if (occasion === 'christmas') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 320 180"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 w-full"
      >
        <circle cx="160" cy="52" r="72" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <circle cx="160" cy="52" r="102" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" strokeWidth="1" />
        {/* Delicate 6-point winter geometric stars framing top left/right */}
        <g stroke="rgba(255,255,255,0.24)" strokeWidth="1.1" strokeLinecap="round">
          <line x1="56" y1="36" x2="56" y2="56" />
          <line x1="47.3" y1="41" x2="64.7" y2="51" />
          <line x1="64.7" y1="41" x2="47.3" y2="51" />
          <line x1="264" y1="36" x2="264" y2="56" />
          <line x1="255.3" y1="41" x2="272.7" y2="51" />
          <line x1="272.7" y1="41" x2="255.3" y2="51" />
        </g>
      </svg>
    )
  }

  if (occasion === 'new-year') {
    const dialTicks = Array.from({ length: 12 }, (_, idx) => {
      const a = (idx * 30 * Math.PI) / 180
      return {
        x1: (160 + Math.cos(a) * 62).toFixed(2),
        y1: (52 + Math.sin(a) * 62).toFixed(2),
        x2: (160 + Math.cos(a) * 72).toFixed(2),
        y2: (52 + Math.sin(a) * 72).toFixed(2),
      }
    })
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 320 180"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 w-full"
      >
        <circle cx="160" cy="52" r="74" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="160" cy="52" r="106" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <g stroke="rgba(255,255,255,0.2)" strokeWidth="1.2">
          {dialTicks.map((t, idx) => (
            <line key={idx} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 180"
      className="pointer-events-none absolute inset-x-0 top-0 h-44 w-full"
    >
      <circle cx="160" cy="52" r="74" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="160" cy="52" r="106" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
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
  theme,
}: {
  firstName: string
  theme: OccasionThemeCopy
}) {
  const copy = theme.intro

  return (
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-8 text-center sm:px-8 sm:py-9">
        <CardCornerBrackets />
        <OccasionCornerMotif occasion={theme.occasion} />

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
  theme,
}: {
  daysWithUs: number
  joinedOn: string | null
  theme: OccasionThemeCopy
}) {
  const date = formatLongDate(joinedOn)
  const dayUnit = daysWithUs === 1 ? 'Day' : 'Days'

  return (
    <div className="relative px-3 py-2">
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
                {theme.joined.eyebrowFallback}
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
              {theme.joined.unitHeadlineSuffix}
              <br />
              <span className="font-bold text-white">Dermaspace</span>
            </span>
          </div>

          <p className="relative mt-6 max-w-[300px] text-balance text-sm leading-relaxed text-white/90">
            {theme.joined.description}
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
  theme,
}: {
  recap: RecapPayload
  firstName: string
  theme: OccasionThemeCopy
}) {
  const { totalBookings, totalSpentNaira, busiestMonth } = recap.stats

  return (
    <div className="relative rounded-[28px] border-2 border-white bg-white p-2 text-[#1a0d1f]">
      <div className="relative overflow-hidden rounded-[22px] border border-[#7B2D8E]/15 bg-white p-6 sm:p-7">
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
            <span>{theme.stats.topLeftLabel}</span>
            <span className="text-[#7B2D8E]/70">{theme.stats.topRightLabel}</span>
          </div>
          <h2 className="font-serif mt-1.5 text-4xl font-bold leading-none tracking-tight text-[#7B2D8E] sm:text-5xl">
            {theme.stats.headlineLine1}
            <br />
            {theme.stats.headlineLine2}
          </h2>

          <div className="relative mx-auto mt-5 grid h-44 place-items-center sm:h-48">
            <CircularName name={theme.stats.ringLabel(firstName)} />
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
                {theme.stats.investedLabel}
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
                {theme.stats.peakLabel}
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
            {theme.occasion === 'christmas' ? (
              <Snowflake className="h-5 w-5 text-[#7B2D8E]" aria-hidden />
            ) : theme.occasion === 'new-year' ? (
              <Clock className="h-5 w-5 text-[#7B2D8E]" aria-hidden />
            ) : (
              <Heart className="h-5 w-5 text-[#7B2D8E]" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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

function SlideTreatment({
  name,
  count,
  theme,
}: {
  name: string
  count: number
  theme: OccasionThemeCopy
}) {
  return (
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-7 text-center sm:px-7 sm:py-8">
        <CardCornerBrackets />

        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
            {theme.treatment.eyebrow}
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
            {theme.treatment.note}
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

function SlideLocation({
  name,
  count,
  theme,
}: {
  name: string
  count: number
  theme: OccasionThemeCopy
}) {
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
            {theme.location.eyebrow}
          </p>
          <h2 className="font-serif mt-2 text-balance text-3xl font-bold uppercase leading-none tracking-tight text-white sm:text-4xl">
            {name}
          </h2>

          <div className="mt-6 inline-flex items-baseline gap-2.5 rounded-2xl border border-white/25 bg-[#3E104B] px-6 py-3.5">
            <span className="font-serif text-4xl font-bold leading-none text-white tabular-nums">
              {count}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
              {theme.location.visitLabel(count)}
            </span>
          </div>
        </div>

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
            {theme.location.note}
          </p>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
            {theme.location.passLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

// ----- 6. Share Snapchat-Style Fanned Collector Cards -----

function SlideShare({
  recap,
  theme,
  shareStatus,
  onShare,
}: {
  recap: RecapPayload
  theme: OccasionThemeCopy
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
        {theme.share.headlineLine1}
        <br />
        {theme.share.headlineLine2}
      </h2>

      {/* Fanned Snapchat-style 3-card collector stack */}
      <div className="relative mx-auto mt-7 flex h-64 w-full max-w-[360px] items-center justify-center sm:h-72 sm:max-w-[420px]">
        <motion.div
          initial={{ rotate: -8, x: -66, y: 12, opacity: 0 }}
          animate={{ rotate: -14, x: -90, y: 12, opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.24 }}
          className="absolute h-48 w-32 rounded-[22px] border-[3px] border-white bg-[#3E104B] p-1.5 sm:h-56 sm:w-36 sm:-translate-x-5"
        >
          <div className="flex h-full flex-col justify-between rounded-[14px] border border-white/20 p-2.5 text-left">
            <div className="w-[48px] sm:w-[60px]">
              <DermaspaceEmblem className="h-5 w-5 text-white" />
            </div>
            <div className="w-[48px] sm:w-[60px]">
              <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums sm:text-3xl">
                {recap.daysWithUs}
              </p>
              <p className="mt-1 text-[7.5px] font-bold uppercase leading-tight tracking-[0.11em] text-white/85 sm:text-[8px]">
                Days
                <br />
                Glow
              </p>
            </div>
            <p className="w-[48px] text-[8px] font-semibold uppercase tracking-[0.14em] text-white/60 sm:w-[60px]">
              {theme.share.leftTag}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ rotate: 8, x: 66, y: 12, opacity: 0 }}
          animate={{ rotate: 14, x: 90, y: 12, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.24 }}
          className="absolute h-48 w-32 rounded-[22px] border-[3px] border-white bg-[#9B4DB0] p-1.5 sm:h-56 sm:w-36 sm:translate-x-5"
        >
          <div className="flex h-full flex-col items-end justify-between rounded-[14px] border border-white/25 p-2.5 text-right">
            <div className="flex w-[48px] justify-end sm:w-[60px]">
              {theme.occasion === 'christmas' ? (
                <Snowflake className="h-4 w-4 text-white" aria-hidden />
              ) : theme.occasion === 'new-year' ? (
                <Clock className="h-4 w-4 text-white" aria-hidden />
              ) : (
                <Award className="h-4 w-4 text-white" aria-hidden />
              )}
            </div>
            <div className="w-[48px] sm:w-[60px]">
              <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums sm:text-3xl">
                {rightCount}×
              </p>
              <p className="mt-1 text-[7.5px] font-bold uppercase leading-tight tracking-[0.11em] text-white sm:text-[8px]">
                Top
                <br />
                {rightHeading}
              </p>
            </div>
            <p className="w-[46px] text-[8px] font-semibold uppercase tracking-[0.14em] text-white/75 sm:w-[58px]">
              {theme.share.rightTag}
            </p>
          </div>
        </motion.div>

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
                {theme.share.centerTag}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-[#7B2D8E]/25 bg-[#F5ECFA]">
                <span className="font-serif text-2xl font-bold leading-none text-[#7B2D8E] tabular-nums">
                  {recap.stats.totalBookings}
                </span>
              </div>
              <p className="font-serif mt-2.5 text-xl font-bold leading-none text-[#1a0d1f]">
                {theme.share.centerTitle}
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
            {theme.share.buttonLabel(firstName)}
          </>
        )}
      </button>
    </div>
  )
}

// ----- 7. Wish Invitation Card + CTA -----

function SlideWish({
  firstName,
  theme,
  onBook,
  onSecondary,
}: {
  firstName: string
  theme: OccasionThemeCopy
  onBook: () => void
  onSecondary: (href: string) => void
}) {
  return (
    <div className="relative rounded-[28px] border border-white/35 bg-[#5A1D6A] p-2">
      <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#3E104B] px-6 py-7 text-center sm:px-7 sm:py-8">
        <CardCornerBrackets />

        <div className="relative">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
            {theme.occasion === 'christmas' ? (
              <Snowflake className="h-6 w-6" aria-hidden />
            ) : theme.occasion === 'new-year' ? (
              <Clock className="h-6 w-6" aria-hidden />
            ) : (
              <Gift className="h-6 w-6" aria-hidden />
            )}
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            {theme.wish.eyebrow}
          </p>

          <h2 className="font-serif mt-2 text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
            {theme.wish.headlineTop}
            <br />
            <span className="italic">{theme.wish.headlineAccent}</span>
            <br />
            {theme.wish.headlineBottom(firstName)}
          </h2>

          <div className="mx-auto mt-6 rounded-2xl border border-white/20 bg-[#5A1D6A] px-5 py-4 text-left">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {theme.wish.boxLabel}
            </p>
            <p className="mt-2 text-balance text-sm leading-relaxed text-white/95">
              {theme.wish.boxBody}
            </p>
          </div>

          <button
            type="button"
            onClick={onBook}
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
          >
            {theme.wish.primaryCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          {theme.wish.secondaryCta && (
            <button
              type="button"
              onClick={() => onSecondary(theme.wish.secondaryCta!.href)}
              className="mt-2.5 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-[#5A1D6A] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-[0.98]"
            >
              {theme.wish.secondaryCta.label}
            </button>
          )}
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
  theme,
  shareStatus,
  songState,
  onToggleSong,
  onReplay,
  onClose,
  onShare,
  onBook,
  onSecondary,
}: {
  recap: RecapPayload
  theme: OccasionThemeCopy
  shareStatus: 'idle' | 'copied' | 'shared'
  songState: SongPlaybackState
  onToggleSong: () => void
  onReplay: () => void
  onClose: () => void
  onShare: () => void
  onBook: () => void
  onSecondary: (href: string) => void
}) {
  const firstName = recap.user.firstName?.trim() || 'Friend'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-4 font-sans"
      style={{ backgroundColor: BRAND, color: '#FFFFFF' }}
    >
      <StoryBackdropLines occasion={theme.occasion} />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <SongToggleButton
          state={songState}
          label={theme.songButtonTitle}
          onToggle={onToggleSong}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={theme.closeAriaLabel}
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
            {theme.finished.eyebrow}
          </p>

          <h2 className="font-serif mt-2 text-balance text-3xl font-bold leading-tight text-white">
            {theme.finished.headline(firstName)}
          </h2>

          <p className="mt-2.5 max-w-xs text-balance text-sm leading-relaxed text-white/85">
            {theme.finished.body}
          </p>

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
                  {theme.finished.shareButton}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBook}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/35 bg-[#5A1D6A] py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-[0.98]"
            >
              {theme.finished.bookButton}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-5">
              <button
                type="button"
                onClick={onReplay}
                className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Watch again
              </button>
              {theme.finished.secondaryCta && (
                <button
                  type="button"
                  onClick={() => onSecondary(theme.finished.secondaryCta!.href)}
                  className="min-h-[36px] text-xs font-semibold uppercase tracking-[0.16em] text-white/75 hover:text-white"
                >
                  {theme.finished.secondaryCta.label}
                </button>
              )}
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
