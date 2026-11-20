// ---------------------------------------------------------------------------
// Subtle, spa-calm notification chimes for Live Chat (Web Audio API)
// ---------------------------------------------------------------------------
// Zero external MP3 assets, zero localStorage usage, and fails silently if
// the browser has not unlocked audio yet.
// Preferences persist server-side via /api/live-chat/sound-preference
// (Postgres for signed-in customers & staff; httpOnly cookie for guests) and
// are mirrored in memory for instant synchronous playback checks.
// ---------------------------------------------------------------------------

export type LiveChatSoundScope = 'customer' | 'staff'
export type LiveChatChimeVariant = 'reply' | 'queue'

const soundEnabledByScope: Record<LiveChatSoundScope, boolean> = {
  customer: true,
  staff: true,
}

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctor()
    } catch {
      return null
    }
  }
  return sharedAudioCtx
}

export function isLiveChatSoundEnabled(scope: LiveChatSoundScope): boolean {
  return soundEnabledByScope[scope]
}

export function setLiveChatSoundEnabled(
  scope: LiveChatSoundScope,
  enabled: boolean,
): void {
  soundEnabledByScope[scope] = Boolean(enabled)
}

/**
 * Hydrates the sound preference from PostgreSQL (signed-in users/staff) or
 * the server-managed cookie (guests) without touching localStorage.
 */
export async function fetchLiveChatSoundPreference(
  scope: LiveChatSoundScope,
): Promise<boolean> {
  if (typeof window === 'undefined') return soundEnabledByScope[scope]
  try {
    const res = await fetch(
      `/api/live-chat/sound-preference?scope=${encodeURIComponent(scope)}`,
      { credentials: 'include', cache: 'no-store' },
    )
    if (!res.ok) return soundEnabledByScope[scope]
    const data = (await res.json().catch(() => null)) as {
      enabled?: unknown
    } | null
    if (typeof data?.enabled === 'boolean') {
      soundEnabledByScope[scope] = data.enabled
      return data.enabled
    }
  } catch {
    /* keep current in-memory value on transient network hiccup */
  }
  return soundEnabledByScope[scope]
}

/**
 * Updates the in-memory preference immediately and persists it to PostgreSQL
 * (for signed-in users/staff) + server cookie (for guests).
 */
export async function saveLiveChatSoundPreference(
  scope: LiveChatSoundScope,
  enabled: boolean,
): Promise<boolean> {
  soundEnabledByScope[scope] = Boolean(enabled)
  if (typeof window === 'undefined') return soundEnabledByScope[scope]
  try {
    const res = await fetch('/api/live-chat/sound-preference', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ scope, enabled: Boolean(enabled) }),
    })
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as {
        enabled?: unknown
      } | null
      if (typeof data?.enabled === 'boolean') {
        soundEnabledByScope[scope] = data.enabled
      }
    }
  } catch {
    /* keep optimistic in-memory toggle */
  }
  return soundEnabledByScope[scope]
}

/**
 * Gently resumes the shared AudioContext on a user gesture so subsequent
 * incoming live-chat replies can play their chime reliably.
 */
export function unlockLiveChatAudio(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

/**
 * Plays a soft, boutique-spa harmonic chime.
 * - `'reply'`: warm two-note chime (D5 -> A5) when a new live message arrives.
 * - `'queue'`: gentle three-note rising chime (C5 -> E5 -> G5) when a new
 *   customer enters the waiting queue for staff.
 */
export function playLiveChatChime(
  variant: LiveChatChimeVariant = 'reply',
  scope?: LiveChatSoundScope,
): boolean {
  if (scope && !isLiveChatSoundEnabled(scope)) return false
  const ctx = getAudioContext()
  if (!ctx) return false

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    if (ctx.state !== 'running') return false

    const now = ctx.currentTime + 0.01
    const notes =
      variant === 'queue'
        ? [
            { freq: 523.25, offset: 0, duration: 0.19, peak: 0.05 }, // C5
            { freq: 659.25, offset: 0.1, duration: 0.21, peak: 0.055 }, // E5
            { freq: 783.99, offset: 0.2, duration: 0.28, peak: 0.06 }, // G5
          ]
        : [
            { freq: 587.33, offset: 0, duration: 0.18, peak: 0.055 }, // D5
            { freq: 880.0, offset: 0.095, duration: 0.26, peak: 0.06 }, // A5
          ]

    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(note.freq, now + note.offset)

      gain.gain.setValueAtTime(0.0001, now + note.offset)
      gain.gain.linearRampToValueAtTime(note.peak, now + note.offset + 0.018)
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + note.offset + note.duration,
      )

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + note.offset)
      osc.stop(now + note.offset + note.duration + 0.02)
    }

    return true
  } catch {
    return false
  }
}
