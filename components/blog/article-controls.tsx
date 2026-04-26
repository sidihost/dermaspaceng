'use client'

// ---------------------------------------------------------------------------
// components/blog/article-controls.tsx
//
// Two reader-side affordances bolted onto every blog detail page:
//
//   1. **Listen** — text-to-speech via the Web Speech API
//      (`window.speechSynthesis`). Reads the article body aloud paragraph
//      by paragraph, with the active paragraph visually highlighted via
//      the `.blog-prose-active` class added in `globals.css`. Works
//      offline on every modern browser; gracefully hides when the API
//      isn't available (older Android WebViews, locked-down corp
//      browsers).
//
//   2. **Resume reading** — auto-saves the reader's vertical position
//      to `localStorage` keyed by post slug, then on revisit shows a
//      small "Resume where you left off — ~37% in" pill that scrolls
//      the article back into place. Once the reader actually finishes
//      the post (>=92% scrolled) we clear the saved position so the
//      pill doesn't keep popping up forever.
//
// Both controls live in a single sticky toolbar that sits just above
// the article body. Sticky on mobile too — the reader can pause TTS
// without thumb-yoga, and the resume pill stays in view when the user
// scrolls a long way down.
// ---------------------------------------------------------------------------

import * as React from 'react'
import { Headphones, Pause, Play, Square, X, ChevronUp } from 'lucide-react'

interface ArticleControlsProps {
  /** Stable id used for the localStorage key. Use the post slug. */
  slug: string
  /** Selector for the article body root — defaults to `.blog-prose`. */
  proseSelector?: string
}

const STORAGE_KEY = (slug: string) => `dermaspace.blog.resume.${slug}`
const SAVE_THROTTLE_MS = 1500
const FINISHED_PCT = 0.92         // ≥92% scrolled = "done", clear saved
const SHOW_PILL_PCT = 0.05        // <5% scroll = haven't scrolled yet
const PILL_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

interface SavedPosition {
  scrollY: number
  percent: number
  ts: number
}

export function ArticleControls({
  slug,
  proseSelector = '.blog-prose',
}: ArticleControlsProps) {
  // -------- TTS state --------
  const [ttsSupported, setTtsSupported] = React.useState<boolean | null>(null)
  // 'idle'   — never started, or stopped
  // 'speaking' — currently reading aloud
  // 'paused' — speaking but user hit pause
  const [ttsState, setTtsState] = React.useState<'idle' | 'speaking' | 'paused'>('idle')
  // Active paragraph index — used to highlight the currently-read element.
  const activeIdxRef = React.useRef<number>(-1)
  // Cached list of paragraphs so we can rebuild only when the article
  // changes (post navigation between client transitions).
  const paragraphsRef = React.useRef<HTMLElement[]>([])

  // -------- Resume state --------
  const [resume, setResume] = React.useState<SavedPosition | null>(null)
  const [resumeDismissed, setResumeDismissed] = React.useState(false)

  // -------- Detect TTS support once on mount --------
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const supported =
      typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    setTtsSupported(supported)

    // Voice list is async on Chrome/Edge — `getVoices()` returns []
    // until the engine fires `voiceschanged`. Touch it once now to
    // kick off loading so the voice picker has a populated list by
    // the time the reader hits Listen.
    if (supported) {
      try {
        window.speechSynthesis.getVoices()
        const onVoices = () => {
          // Just a no-op nudge — the list is now cached internally
          // and `getVoices()` will return it synchronously the next
          // time we ask. Using addEventListener keeps the listener
          // removable.
          window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices)
        }
        window.speechSynthesis.addEventListener?.('voiceschanged', onVoices)
      } catch {
        /* not all environments expose addEventListener — ignore */
      }
    }

    // Cancel any leftover utterance from a previous page (e.g. when the
    // reader hits "Back" on the device — Chrome can keep speaking).
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
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
      // Drop expired entries so we don't surface a "Resume" pill for
      // an article the reader abandoned weeks ago.
      if (Date.now() - saved.ts > PILL_TTL_MS) {
        window.localStorage.removeItem(STORAGE_KEY(slug))
        return
      }
      // Only surface the pill if there's enough position to actually
      // resume. <5% looks like the user just opened and bounced.
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
          // Finished — clear so the pill doesn't pop up next time.
          window.localStorage.removeItem(STORAGE_KEY(slug))
        } else if (percent > SHOW_PILL_PCT) {
          window.localStorage.setItem(
            STORAGE_KEY(slug),
            JSON.stringify({ scrollY, percent, ts: now } as SavedPosition),
          )
        }
      } catch {
        /* localStorage may be disabled in private mode — ignore. */
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

  // -------- Build paragraph list (lazily, on first TTS press) --------
  function getParagraphs(): HTMLElement[] {
    if (paragraphsRef.current.length > 0) return paragraphsRef.current
    if (typeof document === 'undefined') return []
    const root = document.querySelector<HTMLElement>(proseSelector)
    if (!root) return []
    // Read in document order — paragraphs, headings and list items.
    // We skip <pre> blocks (code is unreadable aloud) and figcaptions
    // (often duplicates of the alt text).
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        'h2, h3, h4, p, li, blockquote',
      ),
    ).filter((el) => {
      // Drop empty / whitespace-only.
      const t = (el.textContent || '').trim()
      return t.length > 0 && !el.closest('pre')
    })
    paragraphsRef.current = nodes
    return nodes
  }

  // Highlight the currently-read paragraph + scroll it into view if
  // it's offscreen.
  function setActiveParagraph(idx: number) {
    const list = paragraphsRef.current
    const prev = activeIdxRef.current
    if (prev >= 0 && list[prev]) list[prev].classList.remove('blog-prose-active')
    if (idx >= 0 && list[idx]) {
      list[idx].classList.add('blog-prose-active')
      // Soft scroll: only if the paragraph is below or above the visible
      // window. We deliberately don't auto-scroll for paragraphs that
      // are partially visible to avoid the page yo-yoing.
      const r = list[idx].getBoundingClientRect()
      const buffer = 80
      if (r.top < buffer || r.bottom > window.innerHeight - buffer) {
        list[idx].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    activeIdxRef.current = idx
  }

  // -------- TTS controls --------
  const speakFromIndex = React.useCallback(
    (startIdx: number) => {
      const list = getParagraphs()
      if (list.length === 0 || !window.speechSynthesis) return

      // Cancel any pending utterance — Chromium queues fast clicks.
      window.speechSynthesis.cancel()

      // Speak each paragraph as its own utterance so we can highlight
      // and pause at sentence-ish boundaries. (One huge utterance blocks
      // pause-resume on iOS.)
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
        // Slight rate slow-down + a touch lower pitch reads as a
        // calmer "narrator" rather than the default robotic clip
        // that ships with most browsers. These two values were tuned
        // by ear against the curated voices below — much slower and
        // it sounds dragged, much faster and the nuance disappears.
        u.rate = 0.96
        u.pitch = 0.98

        // Premium-voice picker. The default `getVoices()[0]` on most
        // platforms is the cheap eSpeak/Festival voice — robotic and
        // off-putting for a wellness brand. We score each available
        // English voice against a list of names known to be neural /
        // natural / premium across vendors:
        //   * Apple (iOS / macOS Safari): Samantha, Karen, Serena,
        //     Allison, Ava, Jamie, Tom, Arthur, Daniel, Moira.
        //   * Google (Chrome / Android): "Google US English",
        //     "Google UK English Female", any voice tagged
        //     `localService === false` (cloud voices, generally
        //     higher quality).
        //   * Microsoft (Edge): "Microsoft Aria Online (Natural)",
        //     "Microsoft Jenny Online (Natural)" — these carry the
        //     "Online" / "Natural" / "Neural" suffix and are
        //     dramatically better than their offline counterparts.
        // Falls back to the first English voice if none match —
        // which still beats the current "first voice in the list"
        // behaviour because we explicitly require `^en`.
        const voices = window.speechSynthesis.getVoices()
        const enVoices = voices.filter((v) => /^en/i.test(v.lang))
        const score = (name: string): number => {
          const n = name.toLowerCase()
          // Order matters — earlier matches outrank later ones.
          if (/(natural|neural|online|premium|enhanced)/.test(n)) return 100
          if (/^samantha\b|^ava\b|^serena\b|^allison\b|^karen\b|^jamie\b/.test(n)) return 90
          if (/^aria|^jenny|^michelle|^libby/.test(n)) return 85
          if (/google.+(us english|uk english female|english.+female)/.test(n)) return 80
          if (/google/.test(n)) return 60
          if (/female/.test(n)) return 40
          return 10
        }
        const picked = enVoices
          .map((v) => ({ v, s: score(v.name) + (v.localService === false ? 5 : 0) }))
          .sort((a, b) => b.s - a.s)[0]?.v
        if (picked) u.voice = picked

        u.onstart = () => {
          setActiveParagraph(i)
          setTtsState('speaking')
        }
        u.onend = () => {
          // Continue to the next paragraph automatically.
          speakOne(i + 1)
        }
        u.onerror = () => {
          // Most likely the user navigated away or revoked autoplay.
          setTtsState('idle')
          setActiveParagraph(-1)
        }
        window.speechSynthesis.speak(u)
      }

      speakOne(startIdx)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const handlePlay = () => {
    if (!ttsSupported) return
    if (ttsState === 'paused' && window.speechSynthesis) {
      window.speechSynthesis.resume()
      setTtsState('speaking')
      return
    }
    speakFromIndex(0)
  }
  const handlePause = () => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.pause()
    setTtsState('paused')
  }
  const handleStop = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setActiveParagraph(-1)
    setTtsState('idle')
  }

  // -------- Resume click --------
  const handleResume = () => {
    if (!resume) return
    window.scrollTo({ top: resume.scrollY, behavior: 'smooth' })
    setResumeDismissed(true)
  }

  // Don't render the pill once the user dismisses or has scrolled past.
  const showResumePill = resume && !resumeDismissed

  return (
    <div
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-3 bg-white/85 backdrop-blur-md border-b border-gray-100"
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
            {ttsState === 'speaking' ? (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#7B2D8E] text-white text-[11.5px] font-semibold transition-all"
                aria-label="Pause listening"
              >
                <Pause className="w-3 h-3" aria-hidden />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#7B2D8E] text-white text-[11.5px] font-semibold hover:bg-[#6A1F7C] transition-all"
                aria-label={ttsState === 'paused' ? 'Resume listening' : 'Listen to this article'}
              >
                {ttsState === 'paused' ? (
                  <Play className="w-3 h-3" aria-hidden />
                ) : (
                  <Headphones className="w-3 h-3" aria-hidden />
                )}
                {ttsState === 'paused' ? 'Resume' : 'Listen'}
              </button>
            )}
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

        {/* Resume reading pill — only when a saved position is found
            and the user hasn't dismissed.
            Sits in the brand purple family alongside the Listen
            button to its left. Earlier iterations were amber/yellow,
            which read as a warning chip and clashed with the rest
            of the reader toolbar; the soft-tinted purple keeps the
            "you have a saved position" cue calm and on-brand. */}
        {showResumePill && (
          <div
            className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/[0.08] border border-[#7B2D8E]/15 pl-2.5 pr-1 py-0.5"
            role="status"
          >
            <ChevronUp className="w-3 h-3 text-[#7B2D8E] rotate-180" aria-hidden />
            <button
              type="button"
              onClick={handleResume}
              className="text-[11.5px] font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] leading-none"
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

        {/* TTS state hint — small text describing what's happening,
            useful for screen readers and as a "what is this?" cue. */}
        {ttsState !== 'idle' && (
          <span className="text-[10.5px] text-gray-500 font-medium">
            {ttsState === 'speaking' ? 'Reading aloud…' : 'Paused'}
          </span>
        )}
      </div>
    </div>
  )
}
