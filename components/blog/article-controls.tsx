'use client'

// ---------------------------------------------------------------------------
// components/blog/article-controls.tsx
//
// Two reader-side affordances bolted onto every blog detail page:
//
//   1. **Listen** — text-to-speech via the Web Speech API
//      (`window.speechSynthesis`). Reads the article body aloud
//      paragraph by paragraph, with the active paragraph visually
//      highlighted via the `.blog-prose-active` class added in
//      `globals.css`.
//
//      The Listen control is now a *voice-picker selection*, not a
//      one-tap "go live and read aloud immediately" button. Tapping
//      Listen opens a small action sheet where the reader picks a
//      voice (we curate the available system voices and prioritise
//      the natural / neural ones — the robotic eSpeak default ranks
//      last). The chosen voice is saved to `localStorage` under
//      `dermaspace.blog.tts.voice` so we use the same narrator on
//      every future article. Only after the reader picks a voice do
//      we actually start speaking. Hitting Listen again while
//      playing pauses, and a small Stop button lives next to the
//      pill while audio is active.
//
//   2. **Resume reading** — auto-saves the reader's vertical position
//      to `localStorage` keyed by post slug, then on revisit shows a
//      small "Resume where you left off — ~37% in" pill that scrolls
//      the article back into place. Once the reader actually finishes
//      the post (>=92% scrolled) we clear the saved position so the
//      pill doesn't keep popping up forever.
// ---------------------------------------------------------------------------

import * as React from 'react'
import { Headphones, Pause, Play, Square, X, ChevronUp, Check, Settings2 } from 'lucide-react'

interface ArticleControlsProps {
  /** Stable id used for the localStorage key. Use the post slug. */
  slug: string
  /** Selector for the article body root — defaults to `.blog-prose`. */
  proseSelector?: string
}

const STORAGE_KEY = (slug: string) => `dermaspace.blog.resume.${slug}`
const VOICE_KEY = 'dermaspace.blog.tts.voice'
const SAVE_THROTTLE_MS = 1500
const FINISHED_PCT = 0.92         // ≥92% scrolled = "done", clear saved
const SHOW_PILL_PCT = 0.05        // <5% scroll = haven't scrolled yet
const PILL_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

interface SavedPosition {
  scrollY: number
  percent: number
  ts: number
}

// Score a voice by how "natural" / premium it sounds across the major
// platforms. Higher = better. Used to sort the voice picker so the
// reader is offered the nicest narrators first.
function scoreVoiceName(name: string, localService: boolean | undefined): number {
  const n = name.toLowerCase()
  let s = 0
  if (/(natural|neural|online|premium|enhanced)/.test(n)) s += 100
  if (/^samantha\b|^ava\b|^serena\b|^allison\b|^karen\b|^jamie\b/.test(n)) s += 90
  if (/^aria|^jenny|^michelle|^libby|^emma|^olivia/.test(n)) s += 85
  if (/google.+(us english|uk english female|english.+female)/.test(n)) s += 80
  if (/google/.test(n)) s += 60
  if (/female/.test(n)) s += 40
  if (localService === false) s += 5
  return s || 10
}

// Shorten a verbose voice name for the pick list. Most platforms ship
// names like "Microsoft Aria Online (Natural) - English (United States)";
// we trim that to "Aria · Natural · en-US" so the menu reads cleanly.
function prettifyVoice(v: SpeechSynthesisVoice): { label: string; sublabel: string } {
  const lang = v.lang || 'en'
  let label = v.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/^Google\s+/i, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s+-\s+.*$/, '')
    .trim()
  if (!label) label = v.name
  const tags: string[] = []
  if (/natural|neural/i.test(v.name)) tags.push('Natural')
  else if (/online|premium|enhanced/i.test(v.name)) tags.push('Premium')
  if (v.localService === false) tags.push('Cloud')
  tags.push(lang)
  return { label, sublabel: tags.join(' · ') }
}

export function ArticleControls({
  slug,
  proseSelector = '.blog-prose',
}: ArticleControlsProps) {
  // -------- TTS state --------
  const [ttsSupported, setTtsSupported] = React.useState<boolean | null>(null)
  const [ttsState, setTtsState] = React.useState<'idle' | 'speaking' | 'paused'>('idle')
  const activeIdxRef = React.useRef<number>(-1)
  const paragraphsRef = React.useRef<HTMLElement[]>([])

  // Voice picker state — list of available English voices and the
  // currently-saved voiceURI. We re-derive this on `voiceschanged`
  // because Chrome ships the list async on first load.
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  const [chosenVoiceURI, setChosenVoiceURI] = React.useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  // -------- Resume state --------
  const [resume, setResume] = React.useState<SavedPosition | null>(null)
  const [resumeDismissed, setResumeDismissed] = React.useState(false)

  // -------- Detect TTS support + load voices --------
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const supported =
      typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    setTtsSupported(supported)
    if (!supported) return

    const refreshVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices()
        const en = list
          .filter((v) => /^en/i.test(v.lang))
          .sort(
            (a, b) =>
              scoreVoiceName(b.name, b.localService) -
              scoreVoiceName(a.name, a.localService),
          )
        setVoices(en)
      } catch {
        /* ignore */
      }
    }
    refreshVoices()
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
    } catch {
      /* not all environments expose addEventListener */
    }

    // Hydrate saved choice. If the saved URI no longer matches an
    // available voice we just leave it null and let the user pick
    // again next time they tap Listen.
    try {
      const saved = window.localStorage.getItem(VOICE_KEY)
      if (saved) setChosenVoiceURI(saved)
    } catch {
      /* localStorage may be disabled */
    }

    return () => {
      try {
        window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices)
      } catch {
        /* ignore */
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  // -------- Hydrate saved scroll position --------
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(slug))
      if (!raw) return
      const saved = JSON.parse(raw) as SavedPosition
      if (
        !saved ||
        typeof saved.scrollY !== 'number' ||
        typeof saved.percent !== 'number' ||
        typeof saved.ts !== 'number'
      ) {
        return
      }
      if (Date.now() - saved.ts > PILL_TTL_MS) {
        window.localStorage.removeItem(STORAGE_KEY(slug))
        return
      }
      if (saved.percent < SHOW_PILL_PCT) return
      setResume(saved)
    } catch {
      /* ignore — corrupt entry is no worse than no entry */
    }
  }, [slug])

  // -------- Save scroll position (throttled) --------
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    let lastSave = 0
    let frame = 0

    const save = () => {
      const now = Date.now()
      if (now - lastSave < SAVE_THROTTLE_MS) return
      lastSave = now
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const max =
        (document.documentElement.scrollHeight || document.body.scrollHeight) -
        window.innerHeight
      const percent = max <= 0 ? 0 : Math.max(0, Math.min(1, scrollY / max))
      try {
        if (percent >= FINISHED_PCT) {
          window.localStorage.removeItem(STORAGE_KEY(slug))
        } else if (percent > SHOW_PILL_PCT) {
          window.localStorage.setItem(
            STORAGE_KEY(slug),
            JSON.stringify({ scrollY, percent, ts: now } as SavedPosition),
          )
        }
      } catch {
        /* ignore */
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        save()
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [slug])

  // -------- Build paragraph list --------
  function getParagraphs(): HTMLElement[] {
    if (paragraphsRef.current.length > 0) return paragraphsRef.current
    if (typeof document === 'undefined') return []
    const root = document.querySelector<HTMLElement>(proseSelector)
    if (!root) return []
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>('h2, h3, h4, p, li, blockquote'),
    ).filter((el) => {
      const t = (el.textContent || '').trim()
      return t.length > 0 && !el.closest('pre')
    })
    paragraphsRef.current = nodes
    return nodes
  }

  function setActiveParagraph(idx: number) {
    const list = paragraphsRef.current
    const prev = activeIdxRef.current
    if (prev >= 0 && list[prev]) list[prev].classList.remove('blog-prose-active')
    if (idx >= 0 && list[idx]) {
      list[idx].classList.add('blog-prose-active')
      const r = list[idx].getBoundingClientRect()
      const buffer = 80
      if (r.top < buffer || r.bottom > window.innerHeight - buffer) {
        list[idx].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    activeIdxRef.current = idx
  }

  // Resolve the chosen voice (or the best available fallback) at
  // playback time.
  const resolveVoice = React.useCallback((): SpeechSynthesisVoice | null => {
    if (!window.speechSynthesis) return null
    const all = window.speechSynthesis.getVoices()
    if (chosenVoiceURI) {
      const match = all.find((v) => v.voiceURI === chosenVoiceURI)
      if (match) return match
    }
    // No saved choice → pick the best-scored English voice.
    const enRanked = all
      .filter((v) => /^en/i.test(v.lang))
      .map((v) => ({ v, s: scoreVoiceName(v.name, v.localService) }))
      .sort((a, b) => b.s - a.s)
    return enRanked[0]?.v ?? null
  }, [chosenVoiceURI])

  // -------- TTS controls --------
  const speakFromIndex = React.useCallback(
    (startIdx: number) => {
      const list = getParagraphs()
      if (list.length === 0 || !window.speechSynthesis) return

      window.speechSynthesis.cancel()
      const picked = resolveVoice()

      const speakOne = (i: number) => {
        if (i >= list.length) {
          setTtsState('idle')
          setActiveParagraph(-1)
          return
        }
        const text = (list[i].textContent || '').replace(/\s+/g, ' ').trim()
        if (!text) {
          speakOne(i + 1)
          return
        }
        const u = new SpeechSynthesisUtterance(text)
        // Slight slow-down + slightly lower pitch reads as a calmer
        // narrator rather than the default robotic clip. Tuned by
        // ear against the curated voices above.
        u.rate = 0.96
        u.pitch = 0.98
        if (picked) u.voice = picked
        u.onstart = () => {
          setActiveParagraph(i)
          setTtsState('speaking')
        }
        u.onend = () => {
          speakOne(i + 1)
        }
        u.onerror = () => {
          setTtsState('idle')
          setActiveParagraph(-1)
        }
        window.speechSynthesis.speak(u)
      }

      speakOne(startIdx)
    },
    [resolveVoice],
  )

  const handleStartOrToggle = () => {
    if (!ttsSupported) return
    // If a voice has never been chosen, open the picker first so the
    // reader is in control of the narrator. Saves the chosen voice
    // and starts speaking from there.
    if (!chosenVoiceURI && voices.length > 0) {
      setPickerOpen(true)
      return
    }
    if (ttsState === 'speaking') {
      window.speechSynthesis?.pause()
      setTtsState('paused')
      return
    }
    if (ttsState === 'paused') {
      window.speechSynthesis?.resume()
      setTtsState('speaking')
      return
    }
    speakFromIndex(0)
  }
  const handleStop = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setActiveParagraph(-1)
    setTtsState('idle')
  }

  const handlePickVoice = (uri: string, autoplay = true) => {
    setChosenVoiceURI(uri)
    try {
      window.localStorage.setItem(VOICE_KEY, uri)
    } catch {
      /* ignore */
    }
    setPickerOpen(false)
    if (autoplay) {
      // Tiny delay so the picker animation settles before we kick
      // the speech engine — Chrome can sometimes drop the first
      // utterance if we cancel + speak in the same tick.
      window.setTimeout(() => speakFromIndex(0), 80)
    }
  }

  const handleResume = () => {
    if (!resume) return
    window.scrollTo({ top: resume.scrollY, behavior: 'smooth' })
    setResumeDismissed(true)
  }

  const showResumePill = resume && !resumeDismissed
  const currentVoice = React.useMemo(() => {
    if (!chosenVoiceURI) return null
    return voices.find((v) => v.voiceURI === chosenVoiceURI) ?? null
  }, [chosenVoiceURI, voices])

  return (
    <div
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1.5 mb-2 bg-white/85 backdrop-blur-md border-b border-gray-100"
      role="region"
      aria-label="Article reading controls"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Listen / TTS controls */}
        {ttsSupported && (
          <div
            className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/[0.07] p-0.5"
            role="group"
            aria-label="Listen to article"
          >
            <button
              type="button"
              onClick={handleStartOrToggle}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold hover:bg-[#6A1F7C] transition-all"
              aria-label={
                ttsState === 'speaking'
                  ? 'Pause listening'
                  : ttsState === 'paused'
                    ? 'Resume listening'
                    : 'Listen to this article'
              }
            >
              {ttsState === 'speaking' ? (
                <Pause className="w-3 h-3" aria-hidden />
              ) : ttsState === 'paused' ? (
                <Play className="w-3 h-3" aria-hidden />
              ) : (
                <Headphones className="w-3 h-3" aria-hidden />
              )}
              {ttsState === 'speaking' ? 'Pause' : ttsState === 'paused' ? 'Resume' : 'Listen'}
            </button>

            {/* Voice settings — small gear button. Always visible
                when TTS is supported so the reader can swap voices
                even mid-playback (the next paragraph picks up the
                new voice). Tapping it opens an action sheet. */}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Choose voice"
              title={currentVoice ? `Voice: ${currentVoice.name}` : 'Choose a voice'}
              className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-all"
            >
              <Settings2 className="w-3 h-3" aria-hidden />
            </button>

            {ttsState !== 'idle' && (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-all"
                aria-label="Stop listening"
                title="Stop"
              >
                <Square className="w-3 h-3" aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* Resume reading pill */}
        {showResumePill && (
          <div
            className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/[0.08] border border-[#7B2D8E]/15 pl-2 pr-0.5 py-0.5"
            role="status"
          >
            <ChevronUp className="w-3 h-3 text-[#7B2D8E] rotate-180" aria-hidden />
            <button
              type="button"
              onClick={handleResume}
              className="text-[11px] font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] leading-none"
            >
              Resume reading{' '}
              <span className="text-[#7B2D8E]/70 font-normal">
                · {Math.round((resume?.percent ?? 0) * 100)}% in
              </span>
            </button>
            <button
              type="button"
              onClick={() => setResumeDismissed(true)}
              className="ml-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full text-[#7B2D8E]/70 hover:bg-[#7B2D8E]/15 hover:text-[#7B2D8E] transition-colors"
              aria-label="Dismiss resume pill"
              title="Dismiss"
            >
              <X className="w-2.5 h-2.5" aria-hidden />
            </button>
          </div>
        )}

        {ttsState !== 'idle' && (
          <span className="text-[10px] text-gray-500 font-medium">
            {ttsState === 'speaking' ? 'Reading aloud…' : 'Paused'}
          </span>
        )}
      </div>

      {/* Voice picker — bottom-sheet on mobile, centered card on
          desktop. Opens via the Listen button (first time) or the
          gear button (any time). The chosen voice persists in
          localStorage so the reader's narrator follows them across
          articles. */}
      {pickerOpen && (
        <VoicePicker
          voices={voices}
          chosenVoiceURI={chosenVoiceURI}
          onPick={handlePickVoice}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VoicePicker — a small action sheet listing every available English
// system voice, sorted with the natural / neural / cloud voices on
// top. Tapping a row saves the choice and immediately starts reading.
// ---------------------------------------------------------------------------

function VoicePicker({
  voices,
  chosenVoiceURI,
  onPick,
  onClose,
}: {
  voices: SpeechSynthesisVoice[]
  chosenVoiceURI: string | null
  onPick: (uri: string, autoplay?: boolean) => void
  onClose: () => void
}) {
  // Lock background scroll while the sheet is open.
  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-picker-title"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center sm:hidden pt-2 pb-1">
          <span className="block w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="voice-picker-title"
              className="text-base font-bold text-gray-900 leading-tight"
            >
              Choose a voice
            </h3>
            <p className="text-[12px] text-gray-500 leading-snug mt-0.5">
              Pick the narrator that reads this article aloud. We&apos;ll
              remember your choice.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {voices.length === 0 ? (
          <div className="px-5 pb-5 pt-2 text-[13px] text-gray-500 leading-relaxed">
            No voices available on this device. Try a different browser
            or check your system text-to-speech settings.
          </div>
        ) : (
          <ul className="max-h-[55vh] overflow-y-auto px-2 pb-3">
            {voices.map((v) => {
              const meta = prettifyVoice(v)
              const selected = v.voiceURI === chosenVoiceURI
              return (
                <li key={v.voiceURI}>
                  <button
                    type="button"
                    onClick={() => onPick(v.voiceURI)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      selected
                        ? 'bg-[#7B2D8E]/10'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        selected
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {selected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Headphones className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-gray-900 truncate">
                        {meta.label}
                      </span>
                      <span className="block text-[11px] text-gray-500 truncate">
                        {meta.sublabel}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
