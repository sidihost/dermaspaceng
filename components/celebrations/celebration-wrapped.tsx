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
  shouldPlayBirthdayCelebrationEffects,
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
  const showCelebrationEffects = shouldPlayBirthdayCelebrationEffects(
    occasion,
    recap.isBirthdayToday,
  )

  // Initialize occasion-matched polyphonic Web Audio soundtrack only when celebratory effects apply
  useEffect(() => {
    if (!showCelebrationEffects) {
      songPlayerRef.current = null
      return
    }
    const player = new BirthdaySongPlayer(occasion)
    songPlayerRef.current = player
    const unsubscribe = player.subscribe((next) => setSongState(next))
    void player.start()

    return () => {
      unsubscribe()
      player.destroy()
      songPlayerRef.current = null
    }
  }, [occasion, showCelebrationEffects])

  const unlockSong = useCallback(() => {
    if (!showCelebrationEffects) return
    void songPlayerRef.current?.unlockFromGesture()
  }, [showCelebrationEffects])

  const handleToggleSong = useCallback(() => {
    if (!showCelebrationEffects) return
    void songPlayerRef.current?.toggle()
  }, [showCelebrationEffects])

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
    const url = typeof window !== 'undefined' ? window.location.origin : ''

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

  // Confetti burst on intro & wish slides — only when celebratory effects apply (not on non-birthday off-days)
  useEffect(() => {
    if (!showCelebrationEffects) return
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
  }, [current, done, occasion, showCelebrationEffects])

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
        showSongControls={showCelebrationEffects}
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
      <header className="relative z-30 mx-auto w-full max-w-lg px-4 pt-3 sm:px-5 sm:pt-4">
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
              className="group relative flex-1 py-1 focus:outline-none"
            >
              <span className="block h-[2.5px] w-full overflow-hidden rounded-full bg-white/25 transition-colors group-hover:bg-white/40">
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
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/25 bg-[#5A1D6A]">
              <DermaspaceEmblem className="h-4 w-4 text-white" />
            </span>
            <div className="min-w-0 leading-none">
              <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white">
                Dermaspace
              </p>
              <p className="mt-0.5 text-[10px] font-medium tracking-[0.12em] text-white/75">
                {theme.headerTag} · {index + 1}/{slides.length}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {showCelebrationEffects && (
              <SongToggleButton
                state={songState}
                label={theme.songButtonTitle}
                onToggle={handleToggleSong}
              />
            )}
            <button
              type="button"
              onClick={() => {
                unlockSong()
                setPaused((p) => !p)
              }}
              aria-label={paused ? 'Resume story' : 'Pause story'}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label={theme.closeAriaLabel}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main interactive stage */}
      <main
        className="relative z-10 flex flex-1 items-center justify-center px-4 py-2 sm:px-14 sm:py-4"
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerCancel}
      >
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous slide"
          className="hidden sm:grid absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-20 h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label={index >= slides.length - 1 ? 'Finish story' : 'Next slide'}
          className="hidden sm:grid absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-20 h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="relative w-full max-w-[336px] sm:max-w-[368px]">
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
                    isBirthdayToday={recap.isBirthdayToday}
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
      <footer className="relative z-20 pb-3 text-center text-[11px] font-medium tracking-wide text-white/65">
        {isEffectivelyPaused
          ? 'Paused'
          : showCelebrationEffects && songState === 'awaiting-gesture'
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
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold tracking-wide transition-colors active:scale-95 ${
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
          {/* Suspended geometric holiday ornaments flanking the stage */}
          <line x1="190" y1="0" x2="190" y2="148" />
          <circle cx="190" cy="180" r="32" />
          <circle cx="190" cy="180" r="18" />
          <line x1="1010" y1="0" x2="1010" y2="180" />
          <circle cx="1010" cy="216" r="36" />
          <circle cx="1010" cy="216" r="22" />
          {/* Architectural 8-point winter compass star above stage */}
          <line x1="600" y1="68" x2="600" y2="112" />
          <line x1="578" y1="90" x2="622" y2="90" />
          <line x1="585" y1="75" x2="615" y2="105" />
          <line x1="615" y1="75" x2="585" y2="105" />
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

function OccasionHaloMotif({ occasion }: { occasion: CelebrationOccasion }) {
  if (occasion === 'christmas') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 320 156"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 w-full"
      >
        <circle cx="160" cy="48" r="56" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <circle cx="160" cy="48" r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" strokeWidth="1" />
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" strokeLinecap="round">
          <line x1="58" y1="38" x2="58" y2="58" />
          <line x1="49.3" y1="43" x2="66.7" y2="53" />
          <line x1="66.7" y1="43" x2="49.3" y2="53" />
          <line x1="262" y1="38" x2="262" y2="58" />
          <line x1="253.3" y1="43" x2="270.7" y2="53" />
          <line x1="270.7" y1="43" x2="253.3" y2="53" />
        </g>
      </svg>
    )
  }

  if (occasion === 'new-year') {
    const dialTicks = Array.from({ length: 12 }, (_, idx) => {
      const a = (idx * 30 * Math.PI) / 180
      return {
        x1: (160 + Math.cos(a) * 48).toFixed(2),
        y1: (48 + Math.sin(a) * 48).toFixed(2),
        x2: (160 + Math.cos(a) * 58).toFixed(2),
        y2: (48 + Math.sin(a) * 58).toFixed(2),
      }
    })
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 320 156"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 w-full"
      >
        <circle cx="160" cy="48" r="60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="160" cy="48" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="1.2">
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
      viewBox="0 0 320 156"
      className="pointer-events-none absolute inset-x-0 top-0 h-36 w-full"
    >
      <circle cx="160" cy="48" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="160" cy="48" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
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
    <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-[#3E104B] px-5 py-6 text-center sm:px-6 sm:py-7">
      <OccasionHaloMotif occasion={theme.occasion} />

      <div className="relative flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
          <DermaspaceEmblem className="h-6 w-6" />
        </div>

        <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/80">
          {copy.eyebrow}
        </p>

        <h1 className="font-serif mt-1.5 text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Hi {firstName}!
        </h1>

        {copy.dateText && (
          <div className="mt-5 w-full rounded-2xl bg-white px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7B2D8E]">
              {copy.cardLabel}
            </p>
            <p className="font-serif mt-1 text-xl font-bold leading-tight text-[#1a0d1f] tabular-nums sm:text-2xl">
              {copy.dateText.month} {copy.dateText.day}
              <sup className="ml-0.5 text-xs align-super">{copy.dateText.suffix}</sup>
              {copy.dateText.year ? `, ${copy.dateText.year}` : ''}
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/75">
          <span>{copy.subtitleLead}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-white">{copy.subtitleBrand}</span>
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
    <div className="relative px-2 py-1">
      <motion.div
        initial={{ rotate: -6, x: -6, opacity: 0 }}
        animate={{ rotate: -4, x: -6, opacity: 1 }}
        transition={{ delay: 0.04, duration: 0.22 }}
        className="absolute inset-x-2 inset-y-1 rounded-3xl border border-white/25 bg-[#9B4DB0]"
      />
      <motion.div
        initial={{ rotate: 6, x: 6, opacity: 0 }}
        animate={{ rotate: 3.5, x: 6, opacity: 1 }}
        transition={{ delay: 0.07, duration: 0.22 }}
        className="absolute inset-x-2 inset-y-1 rounded-3xl border border-white/20 bg-[#3E104B]"
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-[#5A1D6A] px-5 py-6 sm:px-6 sm:py-6">
        <div className="relative flex items-center justify-between gap-3 border-b border-white/15 pb-3.5">
          {date ? (
            <p className="font-serif text-xs font-medium tracking-tight text-white/95 sm:text-sm">
              {date.monthTitle} {date.day}
              <sup className="ml-0.5 text-[10px] align-super">{date.suffix}</sup>,{' '}
              {date.year} <span className="mx-1 text-white/45">·</span> You Joined
            </p>
          ) : (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/85">
              {theme.joined.eyebrowFallback}
            </p>
          )}
          <DermaspaceEmblem className="h-4 w-4 shrink-0 text-white/85" />
        </div>

        <div className="relative mt-5 flex items-baseline gap-3.5">
          <span className="font-serif text-5xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-6xl">
            {daysWithUs.toLocaleString('en-NG')}
          </span>
          <span className="text-[11px] font-semibold uppercase leading-snug tracking-[0.16em] text-white/85">
            {dayUnit} of
            <br />
            {theme.joined.unitHeadlineSuffix}
            <br />
            <span className="font-bold text-white">Dermaspace</span>
          </span>
        </div>

        <p className="relative mt-5 max-w-[290px] text-balance text-[13px] leading-relaxed text-white/90 sm:text-sm">
          {theme.joined.description}
        </p>
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
    <div className="relative overflow-hidden rounded-3xl border border-white bg-white px-5 py-5 text-[#1a0d1f] sm:px-6 sm:py-6">
      <svg
        aria-hidden="true"
        viewBox="0 0 240 240"
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36"
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
        <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
          <span>{theme.stats.topLeftLabel}</span>
          <span className="text-[#7B2D8E]/70">{theme.stats.topRightLabel}</span>
        </div>
        <h2 className="font-serif mt-1 text-3xl font-bold leading-none tracking-tight text-[#7B2D8E] sm:text-4xl">
          {theme.stats.headlineLine1}
          <br />
          {theme.stats.headlineLine2}
        </h2>

        <div className="relative mx-auto mt-3.5 grid h-36 place-items-center sm:h-40">
          <CircularName name={theme.stats.ringLabel(firstName)} />
          <div className="text-center">
            <p className="font-serif text-4xl font-bold leading-none tracking-tight text-[#1a0d1f] tabular-nums sm:text-5xl">
              {totalBookings}
            </p>
            <p className="mt-1 text-[11px] font-medium tracking-wide text-gray-600">
              {totalBookings === 1 ? 'Total Booking' : 'Total Bookings'}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200 pt-3.5">
          <div className="pr-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {theme.stats.investedLabel}
            </p>
            <p className="font-serif mt-1 text-2xl font-bold leading-none tracking-tight text-[#1a0d1f] tabular-nums sm:text-3xl">
              ₦{formatNairaCompact(totalSpentNaira)}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-gray-500">
              On your self-care
            </p>
          </div>
          <div className="pl-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {theme.stats.peakLabel}
            </p>
            <p className="font-serif mt-1 text-2xl font-bold leading-none tracking-tight text-[#1a0d1f] sm:text-3xl">
              {busiestMonth ?? '—'}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-gray-500">
              Most active month
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3.5">
          <DermaspaceWordmark
            className="text-[#7B2D8E]"
            emblemClassName="h-5 w-5"
            showSubtitle
          />
          {theme.occasion === 'christmas' ? (
            <Snowflake className="h-4 w-4 text-[#7B2D8E]" aria-hidden />
          ) : theme.occasion === 'new-year' ? (
            <Clock className="h-4 w-4 text-[#7B2D8E]" aria-hidden />
          ) : (
            <Heart className="h-4 w-4 text-[#7B2D8E]" aria-hidden />
          )}
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
        r="72"
        fill="none"
        stroke="rgba(123, 45, 142, 0.16)"
        strokeWidth="1"
      />
      <defs>
        <path
          id={safeId}
          d="M 24,100 A 76,76 0 0,1 176,100"
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
    <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-[#3E104B] px-5 py-6 text-center sm:px-6 sm:py-6">
      <div className="relative">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">
          {theme.treatment.eyebrow}
        </p>

        <h2 className="font-serif mt-1.5 text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
          {name}
        </h2>

        <div className="mx-auto mt-5 grid h-36 w-36 place-items-center rounded-full border border-white/30 bg-[#5A1D6A] sm:h-40 sm:w-40">
          <div className="grid h-28 w-28 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-center">
            <div>
              <p className="font-serif text-4xl font-bold leading-none tracking-tight text-[#7B2D8E] tabular-nums sm:text-5xl">
                {count}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                {count === 1 ? 'Session' : 'Sessions'}
              </p>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[270px] text-balance text-[13px] leading-relaxed text-white/90 sm:text-sm">
          {theme.treatment.note}
        </p>

        <div className="mt-5 flex items-center justify-center border-t border-white/15 pt-3.5">
          <DermaspaceWordmark className="text-white/90" emblemClassName="h-4 w-4" />
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
    <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-[#5A1D6A] text-center">
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Dermaspace · Lagos
          </span>
          <DermaspaceEmblem className="h-4 w-4 text-white" />
        </div>

        <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/75">
          {theme.location.eyebrow}
        </p>
        <h2 className="font-serif mt-1.5 text-balance text-2xl font-bold uppercase leading-none tracking-tight text-white sm:text-3xl">
          {name}
        </h2>

        <div className="mt-5 inline-flex items-baseline gap-2 rounded-2xl border border-white/20 bg-[#3E104B] px-5 py-2.5">
          <span className="font-serif text-3xl font-bold leading-none text-white tabular-nums">
            {count}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
            {theme.location.visitLabel(count)}
          </span>
        </div>
      </div>

      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className="-ml-2.5 h-5 w-5 shrink-0 rounded-full border border-white/25 bg-[#7B2D8E]"
        />
        <span className="h-px flex-1 border-t border-dashed border-white/30" />
        <span
          aria-hidden="true"
          className="-mr-2.5 h-5 w-5 shrink-0 rounded-full border border-white/25 bg-[#7B2D8E]"
        />
      </div>

      <div className="px-5 pt-3.5 pb-5 sm:px-6 sm:pb-6">
        <p className="mx-auto max-w-[270px] text-balance text-[13px] leading-relaxed text-white/90 sm:text-sm">
          {theme.location.note}
        </p>
        <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
          {theme.location.passLabel}
        </p>
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
      <h2 className="font-serif text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
        {theme.share.headlineLine1}
        <br />
        {theme.share.headlineLine2}
      </h2>

      {/* Fanned 3-card collector stack */}
      <div className="relative mx-auto mt-5 flex h-52 w-full max-w-[310px] items-center justify-center sm:h-56 sm:max-w-[340px]">
        <motion.div
          initial={{ rotate: -8, x: -56, y: 10, opacity: 0 }}
          animate={{ rotate: -12, x: -72, y: 10, opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.24 }}
          className="absolute flex h-40 w-28 flex-col justify-between rounded-2xl border-2 border-white bg-[#3E104B] p-2.5 text-left sm:h-44 sm:w-32"
        >
          <div className="w-12">
            <DermaspaceEmblem className="h-4 w-4 text-white" />
          </div>
          <div className="w-12">
            <p className="font-serif text-xl font-bold leading-none text-white tabular-nums sm:text-2xl">
              {recap.daysWithUs}
            </p>
            <p className="mt-1 text-[7.5px] font-bold uppercase leading-tight tracking-[0.11em] text-white/85">
              Days
              <br />
              Glow
            </p>
          </div>
          <p className="w-12 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/65">
            {theme.share.leftTag}
          </p>
        </motion.div>

        <motion.div
          initial={{ rotate: 8, x: 56, y: 10, opacity: 0 }}
          animate={{ rotate: 12, x: 72, y: 10, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.24 }}
          className="absolute flex h-40 w-28 flex-col items-end justify-between rounded-2xl border-2 border-white bg-[#9B4DB0] p-2.5 text-right sm:h-44 sm:w-32"
        >
          <div className="flex w-12 justify-end">
            {theme.occasion === 'christmas' ? (
              <Snowflake className="h-4 w-4 text-white" aria-hidden />
            ) : theme.occasion === 'new-year' ? (
              <Clock className="h-4 w-4 text-white" aria-hidden />
            ) : (
              <Award className="h-4 w-4 text-white" aria-hidden />
            )}
          </div>
          <div className="w-12">
            <p className="font-serif text-xl font-bold leading-none text-white tabular-nums sm:text-2xl">
              {rightCount}×
            </p>
            <p className="mt-1 text-[7.5px] font-bold uppercase leading-tight tracking-[0.11em] text-white">
              Top
              <br />
              {rightHeading}
            </p>
          </div>
          <p className="w-12 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/80">
            {theme.share.rightTag}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.94, y: 4, opacity: 0 }}
          animate={{ scale: 1, y: -4, opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.24 }}
          className="relative z-10 flex h-48 w-36 flex-col justify-between overflow-hidden rounded-2xl border-2 border-white bg-white p-3 text-center text-[#1a0d1f] sm:h-52 sm:w-40"
        >
          <div className="flex items-center justify-between gap-2">
            <DermaspaceEmblem className="h-4 w-4 text-[#7B2D8E]" />
            <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#7B2D8E]">
              {theme.share.centerTag}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="grid h-13 w-13 place-items-center rounded-full border border-[#7B2D8E]/25 bg-[#F5ECFA]">
              <span className="font-serif text-xl font-bold leading-none text-[#7B2D8E] tabular-nums">
                {recap.stats.totalBookings}
              </span>
            </div>
            <p className="font-serif mt-2 text-lg font-bold leading-none text-[#1a0d1f]">
              {theme.share.centerTitle}
            </p>
            <p className="mt-1 max-w-full truncate text-[9.5px] font-medium text-gray-600 tabular-nums">
              {recap.stats.totalBookings}{' '}
              {recap.stats.totalBookings === 1 ? 'visit' : 'visits'}
              {recap.stats.totalSpentNaira > 0
                ? ` · ₦${formatNairaCompact(recap.stats.totalSpentNaira)}`
                : ''}
            </p>
          </div>

          <div className="flex items-center justify-between gap-1.5 border-t border-[#7B2D8E]/15 pt-1.5 text-[8.5px] font-semibold text-[#7B2D8E]">
            <span className="truncate">{firstName}</span>
            <span className="shrink-0 text-[8px] uppercase tracking-[0.08em] text-[#7B2D8E]/75">
              Dermaspace
            </span>
          </div>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold tracking-wide text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
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
  isBirthdayToday,
  onBook,
  onSecondary,
}: {
  firstName: string
  theme: OccasionThemeCopy
  isBirthdayToday: boolean
  onBook: () => void
  onSecondary: (href: string) => void
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-[#3E104B] px-5 py-5 text-center sm:px-6 sm:py-6">
      <div className="relative">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
          {theme.occasion === 'christmas' ? (
            <Snowflake className="h-5 w-5" aria-hidden />
          ) : theme.occasion === 'new-year' ? (
            <Clock className="h-5 w-5" aria-hidden />
          ) : isBirthdayToday ? (
            <Gift className="h-5 w-5" aria-hidden />
          ) : (
            <Heart className="h-5 w-5" aria-hidden />
          )}
        </div>

        <p className="mt-3.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/80">
          {theme.wish.eyebrow}
        </p>

        <h2 className="font-serif mt-1.5 text-balance text-2xl font-bold leading-tight text-white sm:text-[28px]">
          {theme.wish.headlineTop}
          <br />
          <span className="italic">{theme.wish.headlineAccent}</span>
          <br />
          {theme.wish.headlineBottom(firstName)}
        </h2>

        <div className="mx-auto mt-4 rounded-2xl border border-white/15 bg-[#5A1D6A] px-4 py-3.5 text-left">
          <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {theme.wish.boxLabel}
          </p>
          <p className="mt-1.5 text-balance text-[13px] leading-relaxed text-white/95">
            {theme.wish.boxBody}
          </p>
        </div>

        <button
          type="button"
          onClick={onBook}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
        >
          {theme.wish.primaryCta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>

        {theme.wish.secondaryCta && (
          <button
            type="button"
            onClick={() => onSecondary(theme.wish.secondaryCta!.href)}
            className="mt-2 inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-[#5A1D6A] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-[0.98]"
          >
            {theme.wish.secondaryCta.label}
          </button>
        )}
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
  showSongControls,
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
  showSongControls: boolean
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
        {showSongControls && (
          <SongToggleButton
            state={songState}
            label={theme.songButtonTitle}
            onToggle={onToggleSong}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={theme.closeAriaLabel}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-[#5A1D6A] text-white transition-colors hover:bg-white hover:text-[#7B2D8E]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative z-10 flex w-full max-w-[336px] flex-col items-center rounded-3xl border border-white/25 bg-[#3E104B] px-5 py-6 text-center sm:max-w-[368px] sm:px-6">
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
          <DermaspaceEmblem className="h-6 w-6" />
        </div>

        <p className="mt-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
          {theme.finished.eyebrow}
        </p>

        <h2 className="font-serif mt-1.5 text-balance text-2xl font-bold leading-tight text-white sm:text-[28px]">
          {theme.finished.headline(firstName)}
        </h2>

        <p className="mt-2 max-w-[280px] text-balance text-[13px] leading-relaxed text-white/85 sm:text-sm">
          {theme.finished.body}
        </p>

        <div className="mt-4 grid w-full grid-cols-2 divide-x divide-white/15 rounded-2xl border border-white/15 bg-[#5A1D6A] py-3">
          <div className="px-3">
            <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums">
              {recap.daysWithUs}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
              Days with us
            </p>
          </div>
          <div className="px-3">
            <p className="font-serif text-2xl font-bold leading-none text-white tabular-nums">
              {recap.stats.totalBookings}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
              {recap.stats.totalBookings === 1 ? 'Visit' : 'Visits'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onShare}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA] active:scale-[0.98]"
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
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/30 bg-[#5A1D6A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#7B2D8E] active:scale-[0.98]"
          >
            {theme.finished.bookButton}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex min-h-[34px] items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Watch again
            </button>
            {theme.finished.secondaryCta && (
              <button
                type="button"
                onClick={() => onSecondary(theme.finished.secondaryCta!.href)}
                className="min-h-[34px] text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 hover:text-white"
              >
                {theme.finished.secondaryCta.label}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[34px] text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 hover:text-white"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
