'use client'

import * as React from 'react'
import { X, Loader2, ChevronRight, ChevronLeft, Captions, CaptionsOff } from 'lucide-react'
import {
  DERMA_LIVE_VOICES,
  resolveLiveVoice,
  type LiveVoice,
} from '@/lib/derma-live-voices'

/**
 * Derma AI Live — voice picker.
 *
 * Full-screen, immersive, Gemini Live-style picker. The previous
 * grid layout felt like a settings form; this version puts the
 * spotlight on one voice at a time with a reactive purple/blue
 * blob under the name — same visual language Gemini uses, but
 * tinted to Dermaspace brand purple so it feels like us, not them.
 *
 * Interaction model:
 *  - Swipe or tap chevrons to move between voices.
 *  - Tap the blob (or the name) to hear a short preview.
 *  - Tap dots for direct jump.
 *  - Start button at the bottom confirms and hands off to the
 *    Live session (Vapi-powered if configured, Web Speech +
 *    ElevenLabs fallback otherwise).
 */

type Props = {
  open: boolean
  initialVoiceId: string | null
  onClose: () => void
  onStart: (voiceId: string) => void
}

const BRAND = '#7B2D8E'

export function DermaLiveVoicePicker({ open, initialVoiceId, onClose, onStart }: Props) {
  const [index, setIndex] = React.useState<number>(() => {
    const resolved = resolveLiveVoice(initialVoiceId)
    return Math.max(0, DERMA_LIVE_VOICES.findIndex((v) => v.id === resolved.id))
  })
  const [captionsOn, setCaptionsOn] = React.useState(true)
  const [previewing, setPreviewing] = React.useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  // Audio-reactive amplitude for the blob. Ranges 0..1; when 0 the
  // blob breathes on its own via CSS; when >0 it scales in response
  // to real playback so the preview looks like it's actually talking.
  const [amp, setAmp] = React.useState(0)
  const rafRef = React.useRef<number | null>(null)
  const analyserRef = React.useRef<{ ctx: AudioContext; analyser: AnalyserNode; src: MediaElementAudioSourceNode } | null>(null)
  const touchStartX = React.useRef<number | null>(null)

  const current = DERMA_LIVE_VOICES[index] ?? DERMA_LIVE_VOICES[0]

  // Re-seed on open, hard-stop on close.
  React.useEffect(() => {
    if (open) {
      const resolved = resolveLiveVoice(initialVoiceId)
      const idx = DERMA_LIVE_VOICES.findIndex((v) => v.id === resolved.id)
      setIndex(Math.max(0, idx))
    }
    if (!open) stopPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialVoiceId])

  React.useEffect(() => () => stopPreview(), [])

  const stopPreview = React.useCallback(() => {
    try { audioRef.current?.pause() } catch { /* ignore */ }
    try { abortRef.current?.abort() } catch { /* ignore */ }
    abortRef.current = null
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setAmp(0)
    setPreviewing(null)
    setLoadingPreview(null)
  }, [])

  const playPreview = React.useCallback(
    async (voice: LiveVoice) => {
      if (previewing === voice.id) {
        stopPreview()
        return
      }
      stopPreview()
      setLoadingPreview(voice.id)
      const ac = new AbortController()
      abortRef.current = ac

      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: voice.previewText, voice: voice.id }),
          signal: ac.signal,
        })
        if (!res.ok) throw new Error('preview failed')
        const buf = await res.arrayBuffer()
        if (ac.signal.aborted) return
        const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))

        if (!audioRef.current) audioRef.current = new Audio()
        const audio = audioRef.current
        audio.src = url
        audio.crossOrigin = 'anonymous'
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setPreviewing((cur) => (cur === voice.id ? null : cur))
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
          setAmp(0)
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setPreviewing((cur) => (cur === voice.id ? null : cur))
          setAmp(0)
        }
        setLoadingPreview(null)
        setPreviewing(voice.id)

        // Hook the audio element into an AnalyserNode so the blob
        // scales to the preview volume. Wrapped in try/catch because
        // some mobile browsers refuse the createMediaElementSource
        // step — in that case we fall back to the CSS breathing.
        try {
          if (!analyserRef.current) {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            const ctx = new Ctx()
            const src = ctx.createMediaElementSource(audio)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            src.connect(analyser)
            analyser.connect(ctx.destination)
            analyserRef.current = { ctx, analyser, src }
          }
          const { analyser, ctx } = analyserRef.current
          if (ctx.state === 'suspended') await ctx.resume()
          const data = new Uint8Array(analyser.frequencyBinCount)
          const tick = () => {
            analyser.getByteFrequencyData(data)
            let sum = 0
            for (let i = 0; i < data.length; i++) sum += data[i]
            const avg = sum / data.length / 255
            setAmp(Math.min(1, avg * 2.5))
            rafRef.current = requestAnimationFrame(tick)
          }
          tick()
        } catch {
          /* graceful fallback to CSS-only animation */
        }

        await audio.play()
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          console.error('[v0] Derma Live preview failed:', err)
        }
        setLoadingPreview((cur) => (cur === voice.id ? null : cur))
        setPreviewing((cur) => (cur === voice.id ? null : cur))
      }
    },
    [previewing, stopPreview],
  )

  const go = (delta: number) => {
    stopPreview()
    setIndex((i) => {
      const next = (i + delta + DERMA_LIVE_VOICES.length) % DERMA_LIVE_VOICES.length
      return next
    })
  }

  // Touch swipe between voices.
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0]?.clientX ?? null }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current
    if (start == null) return
    const end = e.changedTouches[0]?.clientX ?? start
    const dx = end - start
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    touchStartX.current = null
  }

  const handleStart = React.useCallback(() => {
    if (loadingPreview !== null) return
    stopPreview()
    onStart(current.id)
  }, [loadingPreview, onStart, stopPreview, current.id])

  if (!open) return null

  // Blob scale & hue shift based on amp. Caps prevent runaway scaling
  // on loud frames and keep the motion elegant.
  const blobScale = 1 + amp * 0.35
  const blobBlur = 60 + amp * 40

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a voice for Derma AI Live"
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top chrome */}
      <header className="relative z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <button
          type="button"
          onClick={() => { stopPreview(); onClose() }}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
          aria-label="Close voice picker"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-[15px] font-semibold tracking-tight">
          Choose a voice for Derma AI
        </p>

        <button
          type="button"
          onClick={() => setCaptionsOn((v) => !v)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
          aria-label={captionsOn ? 'Turn captions off' : 'Turn captions on'}
          aria-pressed={captionsOn}
        >
          {captionsOn ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}
        </button>
      </header>

      {/* Body: large hero name + blob. Press the body to toggle
          preview playback — matches the Gemini "tap to audition"
          expectation. */}
      <button
        type="button"
        onClick={() => playPreview(current)}
        className="relative flex-1 flex flex-col items-center justify-end pb-10 focus:outline-none group"
        aria-label={`Preview ${current.name}`}
      >
        {/* Ambient blob — animated, audio-reactive gradient. */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-[-15%] w-[180%] h-[60%] pointer-events-none"
          style={{
            transform: `translate(-50%, 0) scale(${blobScale})`,
            transition: 'transform 90ms linear',
            filter: `blur(${blobBlur}px)`,
            background:
              'radial-gradient(45% 55% at 30% 55%, rgba(123,45,142,0.95) 0%, rgba(123,45,142,0) 70%), radial-gradient(55% 55% at 70% 50%, rgba(96,150,255,0.85) 0%, rgba(96,150,255,0) 70%), radial-gradient(60% 40% at 50% 60%, rgba(180,140,255,0.85) 0%, rgba(180,140,255,0) 70%)',
            animation: 'derma-blob-drift 7s ease-in-out infinite',
          }}
        />
        {/* Secondary subtle shimmer so the blob never feels static,
            even when audio isn't playing. */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[140%] h-[45%] pointer-events-none"
          style={{
            transform: 'translate(-50%, 0)',
            filter: 'blur(50px)',
            background:
              'radial-gradient(50% 60% at 50% 70%, rgba(180,200,255,0.7) 0%, rgba(180,200,255,0) 60%)',
            animation: 'derma-blob-drift 9s ease-in-out infinite reverse',
            opacity: 0.8,
          }}
        />

        {/* Voice name + tagline */}
        <div className="relative z-10 flex flex-col items-center gap-2 mb-6 px-4">
          <h1 className="text-[54px] leading-[1.05] font-light tracking-tight text-white text-balance">
            {current.name}
          </h1>
          <p className="text-[15px] text-white/75">
            {current.tagline}
          </p>

          {/* Loading / playing hint. Small, unobtrusive — we don't
              want to pull focus from the hero name. */}
          <div className="h-5 mt-1" aria-live="polite">
            {loadingPreview === current.id ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-white/60">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading preview…
              </span>
            ) : previewing === current.id ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-white/70">
                <span className="inline-flex items-end gap-[2px] h-3">
                  <span className="w-[3px] bg-white/70 animate-[derma-bar_0.9s_ease-in-out_infinite] rounded-full" style={{ height: '60%' }} />
                  <span className="w-[3px] bg-white/70 animate-[derma-bar_0.9s_ease-in-out_infinite_0.15s] rounded-full" style={{ height: '100%' }} />
                  <span className="w-[3px] bg-white/70 animate-[derma-bar_0.9s_ease-in-out_infinite_0.3s] rounded-full" style={{ height: '75%' }} />
                </span>
                Playing preview
              </span>
            ) : (
              <span className="text-[12px] text-white/45">Tap to preview</span>
            )}
          </div>
        </div>
      </button>

      {/* Pagination strip */}
      <div className="relative z-20 flex items-center justify-center gap-3 px-6 pb-4">
        <button
          type="button"
          onClick={() => go(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
          aria-label="Previous voice"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-2">
          {DERMA_LIVE_VOICES.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => { stopPreview(); setIndex(i) }}
              aria-label={`Select ${v.name}`}
              aria-current={i === index}
              className={`rounded-full transition-all ${
                i === index ? 'w-2.5 h-2.5 bg-white' : 'w-2 h-2 bg-white/35 hover:bg-white/55'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
          aria-label="Next voice"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer CTA */}
      <footer className="relative z-20 px-6 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <div className="max-w-md mx-auto flex items-center justify-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={loadingPreview !== null}
            className="min-w-[200px] inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/[0.12] backdrop-blur border border-white/15 text-white text-[15px] font-medium hover:bg-white/[0.18] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: `0 0 40px -10px ${BRAND}66` }}
          >
            {loadingPreview !== null ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Start'
            )}
          </button>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes derma-bar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
