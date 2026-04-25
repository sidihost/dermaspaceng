/**
 * Derma AI Live — voice catalog.
 *
 * Curated personas viewers can pick before starting a voice-to-voice
 * session. Two distinct, Nigeria-friendly voices powered by Mistral's
 * Voxtral TTS (`voxtral-mini-tts-2603`):
 *
 *   • Joshua — warm, English-leaning male host.
 *   • Juwon  — steady, Yoruba-flavoured English male host.
 *
 * Each entry maps its catalog slug to a real Mistral `voiceId` UUID.
 * The resolver below is the single source of truth used by both the
 * client-side picker and the server-side `/api/voice` TTS route.
 *
 * Preview lines are short (under ~90 chars) so the audio round-trip
 * stays snappy — TTS is billed per character and a crisp preview is
 * more "try on" than "listen to a monologue".
 */
export type LiveVoiceCategory = 'english' | 'yoruba'
export type LiveVoiceGender = 'female' | 'male'

export interface LiveVoice {
  /** Stable slug used in URLs / localStorage / client routing. */
  id: string
  /** Display name, localized. */
  name: string
  /** Second-line summary shown under the name on the picker card. */
  tagline: string
  /** Rendered under the card as a filter chip. */
  category: LiveVoiceCategory
  gender: LiveVoiceGender
  /** Real Mistral Voxtral voice id (UUID) used by /api/voice. */
  mistralVoiceId: string
  /** Short line played when the user taps the card to preview. */
  previewText: string
}

export const DERMA_LIVE_VOICES: LiveVoice[] = [
  {
    id: 'joshua',
    name: 'Joshua',
    tagline: 'Warm · English-speaking host',
    category: 'english',
    gender: 'male',
    mistralVoiceId: 'e0e2005c-5383-40d7-9183-d72e63c38f6d',
    previewText:
      "Hi, I'm Joshua, your Derma AI Live concierge. Tell me about your skin today.",
  },
  {
    id: 'juwon',
    name: 'Juwon',
    tagline: 'Steady · Yoruba-flavoured English',
    category: 'yoruba',
    gender: 'male',
    mistralVoiceId: '8b322014-02dc-467f-ad83-64899062830f',
    previewText:
      'Ẹ n lẹ. Juwon here. Let us walk through your skin goals together.',
  },
]

/** Default voice when the viewer hasn't picked one yet. */
export const DEFAULT_LIVE_VOICE_ID: string = 'joshua'

/**
 * Per-voice Mistral voiceId override.
 *
 * Operators can swap the voice id used for any catalog slug at
 * runtime (without a code change) by setting an env var of the form
 * `MISTRAL_VOICE_<SLUG>` — e.g. `MISTRAL_VOICE_JOSHUA=<new-uuid>`.
 * Useful when Mistral ships a new voice that's a better fit for our
 * Nigerian audience and we don't want to redeploy to roll it out.
 *
 * Read on the server only (`process.env` is empty in the browser).
 * The lookup is keyed by slug, so stale localStorage values keep
 * mapping to the right voice.
 */
function envOverrideFor(slug: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined
  const key = `MISTRAL_VOICE_${slug.toUpperCase()}`
  const v = process.env[key]
  return v && v.trim().length > 0 ? v.trim() : undefined
}

/**
 * Lookup helper that never returns undefined — falls back to the
 * default so callers (including the server TTS route) can assume a
 * valid voice. Accepts either the slug (`'joshua'`) or the raw
 * Mistral voiceId UUID to stay flexible when picker state is
 * hydrated from stale localStorage.
 */
export function resolveLiveVoice(idOrMistralVoiceId: string | null | undefined): LiveVoice {
  let match: LiveVoice | undefined
  if (idOrMistralVoiceId) {
    match = DERMA_LIVE_VOICES.find((v) => v.id === idOrMistralVoiceId)
      ?? DERMA_LIVE_VOICES.find((v) => v.mistralVoiceId === idOrMistralVoiceId)
  }
  if (!match) {
    match = DERMA_LIVE_VOICES.find((v) => v.id === DEFAULT_LIVE_VOICE_ID)
      ?? DERMA_LIVE_VOICES[0]
  }
  const override = envOverrideFor(match.id)
  return override ? { ...match, mistralVoiceId: override } : match
}

/** Ordered, de-duplicated list of categories for the filter chips. */
export const LIVE_VOICE_CATEGORIES: { id: LiveVoiceCategory; label: string }[] = [
  { id: 'english', label: 'English' },
  { id: 'yoruba', label: 'Yoruba' },
]
