// Premium-feeling notification sounds generated on the fly with the Web Audio
// API. Zero asset weight, zero network cost, works offline.
//
// - "send"    → a short rising pop (F5 → A5)
// - "receive" → a softer two-tone ding (A5 → E5)
// - "notify"  → a gentler editorial two-tone (E5 → B5) for ambient events
//
// All sounds respect a global mute flag persisted in localStorage under
// "dermaspace-sound-muted". Each call is a no-op if the user muted sounds or
// the browser hasn't granted audio playback yet (silent failure).

type SoundType = 'send' | 'receive' | 'notify'

let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    return audioCtx
  } catch {
    return null
  }
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('dermaspace-sound-muted') === '1'
  } catch {
    return false
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('dermaspace-sound-muted', muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function playSound(type: SoundType): void {
  if (isSoundMuted()) return
  const ctx = getContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    // Two-note sequences tuned for warmth and brevity
    const config: Record<
      SoundType,
      { notes: { f: number; t: number; d: number }[]; peak: number }
    > = {
      send: {
        notes: [
          { f: 698.46, t: 0, d: 0.1 },
          { f: 880, t: 0.055, d: 0.14 },
        ],
        peak: 0.09,
      },
      receive: {
        notes: [
          { f: 880, t: 0, d: 0.16 },
          { f: 659.25, t: 0.11, d: 0.22 },
        ],
        peak: 0.11,
      },
      notify: {
        notes: [
          { f: 659.25, t: 0, d: 0.15 },
          { f: 987.77, t: 0.09, d: 0.22 },
        ],
        peak: 0.1,
      },
    }

    const { notes, peak } = config[type]

    // Low-pass for warmth
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 4200
    filter.Q.value = 0.6
    filter.connect(ctx.destination)

    notes.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(peak, now + t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d)

      osc.connect(gain).connect(filter)
      osc.start(now + t)
      osc.stop(now + t + d + 0.02)
    })
  } catch {
    /* silent */
  }
}
