/**
 * Derma AI Live — voice catalog.
 *
 * Eight curated personas that viewers can pick before starting a
 * voice-to-voice session. The roster was chosen with Nigerian users
 * in mind — two Yoruba, two Igbo, two Muslim and two Christian first
 * names across male/female voices — so that whoever picks up Live
 * hears someone who sounds familiar.
 *
 * Each entry maps its label to a real ElevenLabs voice id. IDs are
 * drawn from ElevenLabs' public voice library (stable, permanent ids
 * shipped with every API account) so no per-project setup is needed
 * beyond the existing ELEVENLABS_API_KEY env var.
 *
 * Preview lines are short (under ~90 chars) so the audio round-trip
 * stays snappy — ElevenLabs charges per character, and a crisp
 * preview is more "try on" than "listen to a monologue."
 */
export type LiveVoiceCategory = 'yoruba' | 'igbo' | 'muslim' | 'christian'
export type LiveVoiceGender = 'female' | 'male'

export interface LiveVoice {
  /** Stable slug used in URLs / localStorage. */
  id: string
  /** Display name, localized. */
  name: string
  /** Second-line summary shown under the name on the picker card. */
  tagline: string
  /** Rendered under the card as a filter chip. */
  category: LiveVoiceCategory
  gender: LiveVoiceGender
  /** Real ElevenLabs voice id used by /api/voice. */
  elevenLabsVoiceId: string
  /** Short line played when the user taps the card to preview. */
  previewText: string
}

export const DERMA_LIVE_VOICES: LiveVoice[] = [
  {
    id: 'adunni',
    name: 'Adunni',
    tagline: 'Warm · Yoruba female',
    category: 'yoruba',
    gender: 'female',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    previewText: 'Ẹ kú àárọ̀. I am Adunni, your Derma AI Live companion.',
  },
  {
    id: 'tunde',
    name: 'Tunde',
    tagline: 'Steady · Yoruba male',
    category: 'yoruba',
    gender: 'male',
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
    previewText: 'Ẹ n lẹ. Tunde here. Let us talk about your skin today.',
  },
  {
    id: 'ada',
    name: 'Ada',
    tagline: 'Gentle · Igbo female',
    category: 'igbo',
    gender: 'female',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    previewText: 'Kedu. I am Ada. So glad you chose to go Live with Derma today.',
  },
  {
    id: 'chidi',
    name: 'Chidi',
    tagline: 'Confident · Igbo male',
    category: 'igbo',
    gender: 'male',
    elevenLabsVoiceId: 'ErXwobaYiN019PkySvjV', // Antoni
    previewText: 'Nno. Chidi with you. Ask me anything about your routine.',
  },
  {
    id: 'aisha',
    name: 'Aisha',
    tagline: 'Calm · Muslim female',
    category: 'muslim',
    gender: 'female',
    elevenLabsVoiceId: 'MF3mGyEYCl7XYWbV9V6O', // Elli
    previewText: 'As-salamu alaykum. Aisha here — ready whenever you are.',
  },
  {
    id: 'yusuf',
    name: 'Yusuf',
    tagline: 'Wise · Muslim male',
    category: 'muslim',
    gender: 'male',
    elevenLabsVoiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh
    previewText: 'As-salamu alaykum. This is Yusuf. How can I help your skin today?',
  },
  {
    id: 'grace',
    name: 'Grace',
    tagline: 'Bright · Christian female',
    category: 'christian',
    gender: 'female',
    elevenLabsVoiceId: 'AZnzlk1XvdvUeBnXmlld', // Domi
    previewText: 'Hi, I am Grace. Blessed to be on Derma AI Live with you.',
  },
  {
    id: 'david',
    name: 'David',
    tagline: 'Reassuring · Christian male',
    category: 'christian',
    gender: 'male',
    elevenLabsVoiceId: 'yoZ06aMxZJJ28mfd3POQ', // Sam
    previewText: 'Hello, I am David. Let us walk through your skin goals together.',
  },
]

/** Default voice when the viewer hasn't picked one yet. */
export const DEFAULT_LIVE_VOICE_ID: string = 'ada'

/**
 * Per-voice ElevenLabs id override.
 *
 * The default voice ids in the catalog above are stand-ins from
 * ElevenLabs' shared library — they're stable and free to call,
 * but they don't all sound *Nigerian*. Once an admin clones a real
 * Nigerian voice (or uploads a recording via ElevenLabs' Voice Lab),
 * they can drop the resulting id into an env var like
 * `ELEVENLABS_VOICE_ADUNNI` (slug → uppercase) and the resolver
 * below will use that id at runtime without any code change.
 *
 * We only read the env at module init (server-only — `process.env`
 * is empty in the browser), and the lookup is keyed by slug, so
 * stale localStorage values keep mapping to the right voice.
 */
function envOverrideFor(slug: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined
  const key = `ELEVENLABS_VOICE_${slug.toUpperCase()}`
  const v = process.env[key]
  return v && v.trim().length > 0 ? v.trim() : undefined
}

/**
 * Lookup helper that never returns undefined — falls back to the
 * default so callers (including the server TTS route) can assume a
 * valid voice. Accepts either the slug (`'adunni'`) or the raw
 * ElevenLabs voice id (`'EXAVITQu4vr4xnSDxMaL'`) to stay flexible
 * when the picker state is hydrated from stale localStorage.
 *
 * If a matching `ELEVENLABS_VOICE_<SLUG>` env var is present, the
 * returned voice swaps in that id transparently — see the comment on
 * `envOverrideFor` above. This is how admins plug in real Nigerian
 * voices without touching the code.
 */
export function resolveLiveVoice(idOrElevenLabsId: string | null | undefined): LiveVoice {
  let match: LiveVoice | undefined
  if (idOrElevenLabsId) {
    match = DERMA_LIVE_VOICES.find((v) => v.id === idOrElevenLabsId)
      ?? DERMA_LIVE_VOICES.find((v) => v.elevenLabsVoiceId === idOrElevenLabsId)
  }
  if (!match) {
    match = DERMA_LIVE_VOICES.find((v) => v.id === DEFAULT_LIVE_VOICE_ID)
      ?? DERMA_LIVE_VOICES[0]
  }
  const override = envOverrideFor(match.id)
  return override ? { ...match, elevenLabsVoiceId: override } : match
}

/** Ordered, de-duplicated list of categories for the filter chips. */
export const LIVE_VOICE_CATEGORIES: { id: LiveVoiceCategory; label: string }[] = [
  { id: 'yoruba', label: 'Yoruba' },
  { id: 'igbo', label: 'Igbo' },
  { id: 'muslim', label: 'Muslim' },
  { id: 'christian', label: 'Christian' },
]
