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

    if (type === 'notify') {
      // ----------------------------------------------------------
      // Dermaspace brand chime.
      // A calm, spa-like two-note bell (E5 → A5, a major fourth)
      // with a quieter octave shimmer layered on top so it reads as
      // "wellness centre" rather than "OS alert". The whole thing
      // routes through a soft low-pass so it never feels harsh on
      // small phone speakers.
      // ----------------------------------------------------------
      const master = ctx.createGain()
      master.gain.value = 0.0001

      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 4400
      lp.Q.value = 0.7

      master.connect(lp)
      lp.connect(ctx.destination)

      // Master envelope so the chime fades in and out without click.
      master.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.7)

      const tones = [
        { freq: 659.25, start: 0.0, dur: 0.95 }, // E5
        { freq: 880.0, start: 0.18, dur: 1.25 }, // A5
      ]

      for (const t of tones) {
        const startAt = now + t.start
        const peakAt = startAt + 0.045
        const endAt = startAt + t.dur

        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = t.freq

        const shimmer = ctx.createOscillator()
        shimmer.type = 'sine'
        shimmer.frequency.value = t.freq * 2

        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, startAt)
        g.gain.exponentialRampToValueAtTime(0.9, peakAt)
        g.gain.exponentialRampToValueAtTime(0.0001, endAt)

        const sg = ctx.createGain()
        sg.gain.setValueAtTime(0.0001, startAt)
        sg.gain.exponentialRampToValueAtTime(0.18, peakAt)
        sg.gain.exponentialRampToValueAtTime(0.0001, endAt)

        osc.connect(g).connect(master)
        shimmer.connect(sg).connect(master)

        osc.start(startAt)
        osc.stop(endAt + 0.05)
        shimmer.start(startAt)
        shimmer.stop(endAt + 0.05)
      }
      return
    }

    // ---- send / receive (chat-style short cues) ----
    const config: Record<
      Exclude<SoundType, 'notify'>,
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
    }

    const { notes, peak } = config[type]

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
