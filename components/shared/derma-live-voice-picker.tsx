'use client'

import * as React from 'react'
import { X, Loader2, Sparkles, Check, Play, Square } from 'lucide-react'
import {
  DERMA_LIVE_VOICES,
  LIVE_VOICE_CATEGORIES,
  resolveLiveVoice,
  type LiveVoice,
  type LiveVoiceCategory,
} from '@/lib/derma-live-voices'

const BRAND = '#7B2D8E'

type Props = {
  open: boolean
  /** The currently-selected voice id (slug) — hydrated from
   *  localStorage on the caller side so the picker always opens on
   *  the user's last choice. */
  initialVoiceId: string | null
  /** Close without starting a session. */
  onClose: () => void
  /** Fired when the user taps Start — returns the chosen voice slug
   *  so the parent can persist it and begin the live session. */
  onStart: (voiceId: string) => void
}

/**
 * Full-screen sheet that lets a user pick one of the eight curated
 * Derma AI Live voices and preview each one before starting a
 * voice-to-voice session. The UX is modeled after the voice-picker
 * surface users already expect from Gemini Live / ChatGPT Voice —
 * but with a concierge twist: a filter strip to flip between
 * Yoruba / Igbo / Muslim / Christian voices.
 *
 * Interaction model:
 *  - Tapping a card selects it AND plays a short ElevenLabs preview.
 *  - Tapping the already-selected card again stops preview playback.
 *  - Start button is disabled only while a preview is still loading
 *    (to avoid double-triggering the Live session mid-fetch).
 */
export function DermaLiveVoicePicker({ open, initialVoiceId, onClose, onStart }: Props) {
  const [selected, setSelected] = React.useState<string>(
    () => resolveLiveVoice(initialVoiceId).id,
  )
  const [filter, setFilter] = React.useState<LiveVoiceCategory | 'all'>('all')
  const [previewing, setPreviewing] = React.useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  // Lives here so a rapid sequence of taps cancels any in-flight
  // preview fetch rather than piling up back-to-back playbacks.
  const abortRef = React.useRef<AbortController | null>(null)

  // Re-seed the selection each time the picker reopens so it never
  // drifts from the source of truth the caller persisted.
  React.useEffect(() => {
    if (open) {
      setSelected(resolveLiveVoice(initialVoiceId).id)
      setFilter('all')
    }
    if (!open) {
      stopPreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialVoiceId])

  // Hard stop on unmount so navigating away or hitting X can't leave
  // audio playing in the background.
  React.useEffect(() => {
    return () => stopPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopPreview = React.useCallback(() => {
    try { audioRef.current?.pause() } catch { /* ignore */ }
    try { abortRef.current?.abort() } catch { /* ignore */ }
    abortRef.current = null
    setPreviewing(null)
    setLoadingPreview(null)
  }, [])

  const playPreview = React.useCallback(
    async (voice: LiveVoice) => {
      // Toggle off if they re-tap the playing card.
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
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setPreviewing((cur) => (cur === voice.id ? null : cur))
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setPreviewing((cur) => (cur === voice.id ? null : cur))
        }
        setLoadingPreview(null)
        setPreviewing(voice.id)
        await audio.play()
      } catch (err) {
        // AbortError just means the user tapped another voice, so
        // it's not a "real" error we should surface.
        if ((err as { name?: string })?.name !== 'AbortError') {
          console.error('[v0] Derma Live preview failed:', err)
        }
        setLoadingPreview((cur) => (cur === voice.id ? null : cur))
        setPreviewing((cur) => (cur === voice.id ? null : cur))
      }
    },
    [previewing, stopPreview],
  )

  const handleCardTap = React.useCallback(
    (voice: LiveVoice) => {
      setSelected(voice.id)
      // Tapping a card both selects AND auditions it — matches the
      // "try before you commit" expectation users now have from
      // other voice pickers.
      playPreview(voice)
    },
    [playPreview],
  )

  const handleStart = React.useCallback(() => {
    const locked = loadingPreview !== null
    if (locked) return
    stopPreview()
    onStart(selected)
  }, [loadingPreview, onStart, selected, stopPreview])

  if (!open) return null

  const visibleVoices = filter === 'all'
    ? DERMA_LIVE_VOICES
    : DERMA_LIVE_VOICES.filter((v) => v.category === filter)

  return (
    // Full-screen overlay. z-index matches the chat panel so the
    // picker sits on top of an open Derma AI sheet without being
    // occluded by the voice-call canvas underneath.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a voice for Derma AI Live"
      className="fixed inset-0 z-[80] flex flex-col bg-white"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => { stopPreview(); onClose() }}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition"
          aria-label="Close voice picker"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <p className="text-[15px] font-semibold text-gray-900">
            Choose a voice for Derma AI Live
          </p>
        </div>

        {/* Right spacer so the title stays centered. */}
        <span aria-hidden className="w-9 h-9" />
      </header>

      {/* Filter strip. "All" is sticky-left so switching categories is
          one swipe, and each chip renders its own count so users can
          see at a glance there's content in every bucket. */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <FilterChip
            label="All"
            count={DERMA_LIVE_VOICES.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          {LIVE_VOICE_CATEGORIES.map((c) => {
            const count = DERMA_LIVE_VOICES.filter((v) => v.category === c.id).length
            return (
              <FilterChip
                key={c.id}
                label={c.label}
                count={count}
                active={filter === c.id}
                onClick={() => setFilter(c.id)}
              />
            )
          })}
        </div>
      </div>

      {/* Grid of voice cards. Two columns on phone, three on tablet+. */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {visibleVoices.map((voice) => {
            const isSelected = selected === voice.id
            const isPlaying = previewing === voice.id
            const isLoading = loadingPreview === voice.id
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => handleCardTap(voice)}
                aria-pressed={isSelected}
                aria-label={`${voice.name}, ${voice.tagline}${
                  isPlaying ? ', previewing' : ''
                }${isSelected ? ', selected' : ''}`}
                className={`relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 border-2 transition-all active:scale-[0.98] focus:outline-none ${
                  isSelected
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/[0.04] shadow-sm'
                    : 'border-gray-200 bg-white hover:border-[#7B2D8E]/40'
                }`}
              >
                {/* Avatar / play affordance. Shows a spinner while the
                    preview audio is still being fetched, and a stop
                    square while it's playing so the same tap target
                    can cancel playback. */}
                <span
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                  }`}
                >
                  <span className="text-lg font-semibold tracking-tight">
                    {voice.name.charAt(0)}
                  </span>
                  {/* Subtle ring pulse while previewing. */}
                  {isPlaying && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full ring-2 ring-[#7B2D8E] animate-ping opacity-70"
                    />
                  )}
                  {/* Play/Stop overlay. */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                      isSelected ? 'bg-white text-[#7B2D8E]' : 'bg-[#7B2D8E] text-white'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPlaying ? (
                      <Square className="w-3 h-3" fill="currentColor" />
                    ) : (
                      <Play className="w-3 h-3" fill="currentColor" />
                    )}
                  </span>
                </span>

                <span className="text-sm font-semibold text-gray-900 leading-none">
                  {voice.name}
                </span>
                <span className="text-[11px] text-gray-500 text-center leading-tight">
                  {voice.tagline}
                </span>

                {/* Selected check, top-right. Hidden while NOT
                    selected to keep cards visually quiet. */}
                {isSelected && (
                  <span
                    aria-hidden
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center"
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer with Start button. Mirrors the reference design
          (rounded pill CTA, centered, full-width on mobile) so the
          surface feels like a first-class Live-mode flow rather
          than a modal afterthought. */}
      <footer className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={loadingPreview !== null}
            className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingPreview !== null ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading preview…
              </>
            ) : (
              <>
                Start Derma AI Live
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active
          ? 'bg-[#7B2D8E] text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
      <span className={`text-[10px] ${active ? 'text-white/80' : 'text-gray-500'}`}>
        {count}
      </span>
    </button>
  )
}
