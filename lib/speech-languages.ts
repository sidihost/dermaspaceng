/**
 * Speech / response languages the AI assistant supports.
 *
 * Distinct from the *voice catalog* (`derma-live-voices.ts`) — voice
 * controls *who* speaks (timbre, accent), language controls *what*
 * language they speak in. We expose Nigeria's three majority
 * languages alongside English and Pidgin so the assistant feels like
 * it actually belongs to the audience using it. The picker UI in
 * `derma-ai.tsx` reads from this list, so adding a new language is
 * a one-line change here.
 *
 * `bcp47` follows IETF BCP-47 conventions:
 *   - Yoruba → `yo-NG`
 *   - Hausa  → `ha-NG`
 *   - Igbo   → `ig-NG`
 *   - Pidgin → `pcm-NG` (Nigerian Pidgin macrolanguage code)
 * These are passed through to the model in the system prompt
 * (`Respond in <language>.`) and to the browser SpeechSynthesis API
 * as a `lang` hint when reading text aloud, so a Yoruba user gets
 * Yoruba output even when the underlying voice (Joshua / Juwon) is
 * an English-base persona.
 */
export interface SpeechLanguage {
  /** Stable id used in localStorage and routing. */
  id: string
  /** Display label in English (so the picker is universally legible). */
  label: string
  /** Native name shown as a subtitle, anchoring the option visually. */
  nativeName: string
  /** BCP-47 tag forwarded to the model and SpeechSynthesis. */
  bcp47: string
}

export const SPEECH_LANGUAGES: SpeechLanguage[] = [
  { id: 'en',      label: 'English',         nativeName: 'English',           bcp47: 'en-US' },
  { id: 'en-NG',   label: 'English (Nigeria)', nativeName: 'Nigerian English', bcp47: 'en-NG' },
  { id: 'yo',      label: 'Yoruba',          nativeName: 'Yorùbá',            bcp47: 'yo-NG' },
  { id: 'ha',      label: 'Hausa',           nativeName: 'Hausa',             bcp47: 'ha-NG' },
  { id: 'ig',      label: 'Igbo',            nativeName: 'Igbo',              bcp47: 'ig-NG' },
  { id: 'pcm',     label: 'Nigerian Pidgin', nativeName: 'Naijá',             bcp47: 'pcm-NG' },
  { id: 'fr',      label: 'French',          nativeName: 'Français',          bcp47: 'fr-FR' },
]

/** Default language when the user hasn't picked one. */
export const DEFAULT_SPEECH_LANGUAGE_ID = 'en'

/** Lookup that always returns a valid entry. */
export function resolveSpeechLanguage(id: string | null | undefined): SpeechLanguage {
  if (id) {
    const match = SPEECH_LANGUAGES.find((l) => l.id === id)
    if (match) return match
  }
  return (
    SPEECH_LANGUAGES.find((l) => l.id === DEFAULT_SPEECH_LANGUAGE_ID)
      ?? SPEECH_LANGUAGES[0]
  )
}
