/**
 * Glow Year Celebration Soundtrack — Polyphonic Web Audio Engine
 * -----------------------------------------------------------------
 * Plays a warm, luxury spa-lounge Neo-Soul / R&B birthday celebration
 * groove (Key of F Major, 86 BPM, 8-bar seamless loop) with lush Rhodes
 * electric piano chords, a celebratory celesta-bell melody motif, warm
 * sub-bass, and subtle brushed percussion routed through a stereo room
 * reverb impulse response.
 *
 * Pure Web Audio synthesis requires zero external audio CDN hosts (so it
 * never suffers 403/404 network failures) and handles browser autoplay
 * policies gracefully by unlocking on the first user gesture or explicit
 * header Sound button tap.
 */

export const SONG_TEMPO_BPM = 86
export const SONG_STEPS_PER_BEAT = 2 // 8th-note resolution
export const SONG_TOTAL_STEPS = 64 // 8 bars * 4 beats * 2 steps

export type SongPlaybackState = 'playing' | 'awaiting-gesture' | 'muted'

export interface ChordEvent {
  /** Step index (0..63) where chord triggers */
  step: number
  /** Duration in 8th-note steps */
  durationSteps: number
  /** MIDI note numbers */
  notes: readonly number[]
  /** Sub-bass root MIDI note */
  bass: number
}

export interface MelodyNote {
  /** Step index (0..63) */
  step: number
  /** MIDI note number */
  midi: number
  /** Duration in 8th-note steps */
  durationSteps: number
  /** Velocity 0..1 */
  velocity: number
}

/**
 * 8-bar uplifting F-major Neo-Soul chord progression:
 * Fmaj9 -> Dm9 -> Gm9 -> C13sus4 / C9
 */
export const SONG_CHORD_PROGRESSION: readonly ChordEvent[] = [
  // Bars 1–2: Fmaj9 (F3, A3, C4, E4, G4)
  { step: 0, durationSteps: 7, notes: [53, 57, 60, 64, 67], bass: 41 },
  { step: 7, durationSteps: 9, notes: [53, 57, 60, 64, 67], bass: 41 },
  // Bars 3–4: Dm9 (D3, F3, A3, C4, E4)
  { step: 16, durationSteps: 7, notes: [50, 53, 57, 60, 64], bass: 38 },
  { step: 23, durationSteps: 9, notes: [50, 53, 57, 60, 64], bass: 38 },
  // Bars 5–6: Gm9 (G3, Bb3, D4, F4, A4)
  { step: 32, durationSteps: 7, notes: [55, 58, 62, 65, 69], bass: 43 },
  { step: 39, durationSteps: 9, notes: [55, 58, 62, 65, 69], bass: 43 },
  // Bar 7: C13sus4 (C3, F3, Bb3, D4, G4)
  { step: 48, durationSteps: 8, notes: [48, 53, 58, 62, 67], bass: 36 },
  // Bar 8: C9 turnaround (C3, E3, Bb3, D4, G4)
  { step: 56, durationSteps: 8, notes: [48, 52, 58, 62, 67], bass: 36 },
]

/**
 * Celebratory celesta-bell & Rhodes melody motif weaving through F major
 * with warm birthday-inspired intervals (C5-C5-D5-C5-F5-E5 cadence).
 */
export const SONG_MELODY_EVENTS: readonly MelodyNote[] = [
  // Phrase 1 over Fmaj9
  { step: 0, midi: 72, durationSteps: 1.5, velocity: 0.72 }, // C5
  { step: 2, midi: 72, durationSteps: 1.5, velocity: 0.65 }, // C5
  { step: 4, midi: 74, durationSteps: 2, velocity: 0.78 }, // D5
  { step: 6, midi: 72, durationSteps: 2, velocity: 0.72 }, // C5
  { step: 8, midi: 77, durationSteps: 3, velocity: 0.86 }, // F5
  { step: 11, midi: 76, durationSteps: 4, velocity: 0.78 }, // E5

  // Phrase 2 over Dm9
  { step: 16, midi: 72, durationSteps: 1.5, velocity: 0.7 }, // C5
  { step: 18, midi: 72, durationSteps: 1.5, velocity: 0.66 }, // C5
  { step: 20, midi: 74, durationSteps: 2, velocity: 0.78 }, // D5
  { step: 22, midi: 72, durationSteps: 2, velocity: 0.72 }, // C5
  { step: 24, midi: 79, durationSteps: 3, velocity: 0.88 }, // G5
  { step: 27, midi: 77, durationSteps: 4, velocity: 0.8 }, // F5

  // Phrase 3 over Gm9 (soaring octave glow)
  { step: 32, midi: 72, durationSteps: 1.5, velocity: 0.72 }, // C5
  { step: 34, midi: 72, durationSteps: 1.5, velocity: 0.68 }, // C5
  { step: 36, midi: 84, durationSteps: 2.5, velocity: 0.9 }, // C6
  { step: 39, midi: 81, durationSteps: 2.5, velocity: 0.82 }, // A5
  { step: 42, midi: 77, durationSteps: 2, velocity: 0.76 }, // F5
  { step: 44, midi: 76, durationSteps: 2, velocity: 0.74 }, // E5
  { step: 46, midi: 74, durationSteps: 2, velocity: 0.72 }, // D5

  // Phrase 4 over C13sus4 -> C9 (warm resolution)
  { step: 48, midi: 82, durationSteps: 1.5, velocity: 0.78 }, // Bb5
  { step: 50, midi: 82, durationSteps: 1.5, velocity: 0.72 }, // Bb5
  { step: 52, midi: 81, durationSteps: 2, velocity: 0.82 }, // A5
  { step: 54, midi: 77, durationSteps: 2, velocity: 0.76 }, // F5
  { step: 56, midi: 79, durationSteps: 3, velocity: 0.84 }, // G5
  { step: 60, midi: 77, durationSteps: 4, velocity: 0.82 }, // F5
]

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function getStepDurationSeconds(bpm = SONG_TEMPO_BPM): number {
  return 60 / bpm / SONG_STEPS_PER_BEAT
}

type StateListener = (state: SongPlaybackState) => void

export class BirthdaySongPlayer {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null

  private schedulerTimer: number | null = null
  private nextNoteTime = 0
  private currentStep = 0
  private userMuted = false
  private destroyed = false
  private state: SongPlaybackState = 'awaiting-gesture'
  private listeners = new Set<StateListener>()

  getState(): SongPlaybackState {
    return this.state
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(next: SongPlaybackState) {
    if (this.state === next) return
    this.state = next
    this.listeners.forEach((fn) => fn(next))
  }

  /**
   * Attempts to initialize and start playback. Safe to call on mount or on
   * any user gesture. Resolves without throwing if AudioContext is unavailable.
   */
  async start(): Promise<void> {
    if (this.destroyed || this.userMuted) return
    if (typeof window === 'undefined') return

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx()
        this.setupGraph(this.ctx)
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume()
      }

      if (this.destroyed || this.userMuted) return

      if (this.ctx.state === 'running') {
        this.fadeInMaster()
        this.startScheduler()
        this.setState('playing')
      } else {
        this.setState('awaiting-gesture')
      }
    } catch {
      this.setState('awaiting-gesture')
    }
  }

  /**
   * Unlocks audio seamlessly when the user taps, clicks, or presses a key.
   */
  async unlockFromGesture(): Promise<void> {
    if (this.destroyed || this.userMuted) return
    if (this.state === 'playing' && this.ctx?.state === 'running') return
    await this.start()
  }

  async toggle(): Promise<void> {
    if (this.destroyed) return
    if (this.state === 'playing') {
      this.userMuted = true
      this.stopScheduler()
      this.fadeOutMaster()
      this.setState('muted')
      return
    }
    this.userMuted = false
    await this.start()
  }

  destroy() {
    this.destroyed = true
    this.stopScheduler()
    if (this.ctx) {
      const ctx = this.ctx
      this.ctx = null
      this.masterGain = null
      this.dryGain = null
      this.wetGain = null
      this.noiseBuffer = null
      ctx.close().catch(() => {
        /* ignore */
      })
    }
    this.listeners.clear()
  }

  private setupGraph(ctx: AudioContext) {
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, ctx.currentTime)

    const dry = ctx.createGain()
    dry.gain.value = 0.78

    const wet = ctx.createGain()
    wet.gain.value = 0.28

    // Gentle stereo room reverb impulse (1.4s warm spa acoustics)
    const convolver = ctx.createConvolver()
    convolver.buffer = this.createReverbImpulse(ctx, 1.4, 2.8)

    const toneFilter = ctx.createBiquadFilter()
    toneFilter.type = 'lowpass'
    toneFilter.frequency.value = 4200
    toneFilter.Q.value = 0.5

    dry.connect(toneFilter)
    wet.connect(convolver)
    convolver.connect(toneFilter)
    toneFilter.connect(master)
    master.connect(ctx.destination)

    // Pre-build short noise buffer for brushed lo-fi hats/rim
    const len = Math.floor(ctx.sampleRate * 0.2)
    const nBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = nBuf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1
    }

    this.masterGain = master
    this.dryGain = dry
    this.wetGain = wet
    this.noiseBuffer = nBuf
  }

  private createReverbImpulse(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec)
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const channel = impulse.getChannelData(ch)
      let prev = 0
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay)
        // One-pole lowpass smoothing for warm room tail
        const white = (Math.random() * 2 - 1) * env
        prev = prev * 0.68 + white * 0.32
        channel[i] = prev
      }
    }
    return impulse
  }

  private fadeInMaster() {
    if (!this.ctx || !this.masterGain) return
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now)
    this.masterGain.gain.linearRampToValueAtTime(0.36, now + 0.55)
  }

  private fadeOutMaster() {
    if (!this.ctx || !this.masterGain) return
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
  }

  private startScheduler() {
    if (!this.ctx || this.schedulerTimer !== null) return
    this.nextNoteTime = this.ctx.currentTime + 0.05
    this.schedulerTimer = window.setInterval(() => this.scheduler(), 25)
  }

  private stopScheduler() {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
  }

  private scheduler() {
    if (!this.ctx || this.userMuted || this.destroyed) return
    if (this.ctx.state !== 'running') return

    const stepDur = getStepDurationSeconds(SONG_TEMPO_BPM)
    const scheduleAhead = 0.14

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAhead) {
      this.scheduleStep(this.currentStep, this.nextNoteTime, stepDur)
      this.nextNoteTime += stepDur
      this.currentStep = (this.currentStep + 1) % SONG_TOTAL_STEPS
    }
  }

  private scheduleStep(step: number, time: number, stepDur: number) {
    // 1. Rhodes electric piano chords + warm sub bass
    for (const chord of SONG_CHORD_PROGRESSION) {
      if (chord.step === step) {
        const dur = chord.durationSteps * stepDur
        // Slight strum spread (14ms between voices) for natural pianist touch
        chord.notes.forEach((midi, idx) => {
          this.playRhodesVoice(midi, time + idx * 0.014, dur, 0.068)
        })
        this.playBassVoice(chord.bass, time, dur * 0.92)
      }
    }

    // 2. Celebratory celesta-Rhodes melody line
    for (const note of SONG_MELODY_EVENTS) {
      if (note.step === step) {
        this.playMelodyBell(note.midi, time, note.durationSteps * stepDur, note.velocity * 0.11)
      }
    }

    // 3. Soft brushed percussion groove (hi-hat on every beat, soft snap on beats 2 & 4)
    if (step % 2 === 0) {
      const accent = step % 4 === 0 ? 0.018 : 0.012
      this.playBrushedHat(time, accent)
    }
    if (step % 8 === 2 || step % 8 === 6) {
      this.playSoftRimSnap(time, 0.028)
    }
  }

  private playRhodesVoice(midi: number, time: number, duration: number, gainLevel: number) {
    if (!this.ctx || !this.dryGain || !this.wetGain) return
    const freq = midiToFreq(midi)

    const osc = this.ctx.createOscillator()
    const tine = this.ctx.createOscillator()
    const tineGain = this.ctx.createGain()
    const env = this.ctx.createGain()
    const lp = this.ctx.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)

    tine.type = 'triangle'
    tine.frequency.setValueAtTime(freq * 2, time)

    // Soft glassy tine transient that fades within 120ms
    tineGain.gain.setValueAtTime(0.22, time)
    tineGain.gain.exponentialRampToValueAtTime(0.001, time + 0.13)

    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(1750, time)

    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.018)
    env.gain.exponentialRampToValueAtTime(gainLevel * 0.45, time + duration * 0.55)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.12)

    osc.connect(lp)
    tine.connect(tineGain)
    tineGain.connect(lp)
    lp.connect(env)
    env.connect(this.dryGain)
    env.connect(this.wetGain)

    osc.start(time)
    tine.start(time)
    osc.stop(time + duration + 0.16)
    tine.stop(time + duration + 0.16)
  }

  private playMelodyBell(midi: number, time: number, duration: number, gainLevel: number) {
    if (!this.ctx || !this.dryGain || !this.wetGain) return
    const freq = midiToFreq(midi)

    const body = this.ctx.createOscillator()
    const overtone = this.ctx.createOscillator()
    const overtoneGain = this.ctx.createGain()
    const env = this.ctx.createGain()

    body.type = 'sine'
    body.frequency.setValueAtTime(freq, time)

    overtone.type = 'sine'
    overtone.frequency.setValueAtTime(freq * 3, time)
    overtoneGain.gain.setValueAtTime(0.14, time)
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09)

    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.25)

    body.connect(env)
    overtone.connect(overtoneGain)
    overtoneGain.connect(env)
    env.connect(this.dryGain)
    env.connect(this.wetGain)

    body.start(time)
    overtone.start(time)
    body.stop(time + duration + 0.3)
    overtone.stop(time + duration + 0.3)
  }

  private playBassVoice(midi: number, time: number, duration: number) {
    if (!this.ctx || !this.dryGain) return
    const freq = midiToFreq(midi)

    const osc = this.ctx.createOscillator()
    const lp = this.ctx.createBiquadFilter()
    const env = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, time)

    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(240, time)

    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(0.22, time + 0.025)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc.connect(lp)
    lp.connect(env)
    env.connect(this.dryGain)

    osc.start(time)
    osc.stop(time + duration + 0.05)
  }

  private playBrushedHat(time: number, gainLevel: number) {
    if (!this.ctx || !this.noiseBuffer || !this.dryGain) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer

    const hp = this.ctx.createBiquadFilter()
    hp.type = 'bandpass'
    hp.frequency.setValueAtTime(6200, time)
    hp.Q.value = 1.4

    const env = this.ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.003)
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)

    src.connect(hp)
    hp.connect(env)
    env.connect(this.dryGain)

    src.start(time)
    src.stop(time + 0.05)
  }

  private playSoftRimSnap(time: number, gainLevel: number) {
    if (!this.ctx || !this.noiseBuffer || !this.dryGain || !this.wetGain) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer

    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1650, time)
    bp.Q.value = 2.8

    const env = this.ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.048)

    src.connect(bp)
    bp.connect(env)
    env.connect(this.dryGain)
    env.connect(this.wetGain)

    src.start(time)
    src.stop(time + 0.06)
  }
}
