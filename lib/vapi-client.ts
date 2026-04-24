/**
 * Vapi Web SDK — thin, lazy-loaded wrapper.
 *
 * Vapi powers Derma AI Live's real-time voice-to-voice experience.
 * We import the SDK dynamically so the ~60KB bundle only lands on
 * devices that actually open Live, and so server-side rendering
 * doesn't choke on `window` references inside the SDK.
 *
 * Credentials:
 *   NEXT_PUBLIC_VAPI_PUBLIC_KEY   — browser-safe Vapi public key
 *   VAPI_ASSISTANT_ID             — default assistant id (server-only)
 *
 * The keys may be unset in dev; `getVapi()` resolves to `null` in
 * that case so callers can fall back to the legacy Web Speech +
 * ElevenLabs path instead of crashing.
 */

export type VapiEvent =
  | 'call-start'
  | 'call-end'
  | 'speech-start'
  | 'speech-end'
  | 'volume-level'
  | 'message'
  | 'error'

// Keep a single instance across the app so we don't pile up
// parallel WebRTC connections when the user opens and closes Live.
let singleton: unknown = null
let loaderPromise: Promise<unknown> | null = null

export async function getVapi(): Promise<{
  start: (assistantId: string, overrides?: Record<string, unknown>) => Promise<unknown>
  stop: () => void
  say: (text: string, endCallAfterSpoken?: boolean) => void
  setMuted: (muted: boolean) => void
  isMuted: () => boolean
  on: (event: VapiEvent, handler: (...args: unknown[]) => void) => void
  off: (event: VapiEvent, handler: (...args: unknown[]) => void) => void
} | null> {
  if (typeof window === 'undefined') return null
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
  if (!publicKey) return null

  if (singleton) return singleton as never

  if (!loaderPromise) {
    loaderPromise = (async () => {
      try {
        const mod = await import('@vapi-ai/web')
        const Vapi = (mod as { default: new (key: string) => unknown }).default
        singleton = new Vapi(publicKey)
        return singleton
      } catch (err) {
        // Package not installed, offline, or SDK init failure. We
        // intentionally keep this quiet and let callers degrade to
        // the legacy voice path.
        console.warn('[v0] Vapi SDK unavailable:', err)
        singleton = null
        loaderPromise = null
        return null
      }
    })()
  }

  return (await loaderPromise) as never
}

/**
 * Mapping from our Derma voice slugs to Vapi voice configuration.
 * We ship with the 11labs provider because Vapi proxies to ElevenLabs
 * out of the box using the same voice ids we already use for previews
 * — so the Live session sounds exactly like the picker preview.
 */
export function voiceToVapiOverrides(voiceElevenLabsId: string): Record<string, unknown> {
  return {
    voice: {
      provider: '11labs',
      voiceId: voiceElevenLabsId,
      stability: 0.55,
      similarityBoost: 0.8,
    },
    firstMessage:
      "Hi, I'm your Derma AI Live concierge. You can ask me about services, bookings, or your skin goals. Tap or talk to interrupt me anytime.",
  }
}
