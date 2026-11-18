/**
 * Celebration Soundtrack Engine — Polyphonic Web Audio Synthesizer
 * -----------------------------------------------------------------
 * Supports three curated luxury spa-lounge tracks sharing zero-CDN,
 * studio-warm polyphonic synthesis routed through stereo room reverb:
 *   1. `birthday`: Fmaj9 Neo-Soul Birthday Lounge (86 BPM)
 *   2. `christmas`: Gmaj7 Holiday Carol Celesta & Sleigh-Chime Lounge (82 BPM)
 *   3. `new-year`: Cmaj9 Midnight Toast & Auld Lang Syne Chime Groove (94 BPM)
 *
 * Keeps all legacy exports (`SONG_*`, `BirthdaySongPlayer`) intact for
 * full backward compatibility.
 */

export const SONG_TEMPO_BPM = 86
export const CHRISTMAS_TEMPO_BPM = 82
export const NEW_YEAR_TEMPO_BPM = 94
export const SONG_STEPS_PER_BEAT = 2 // 8th-note resolution
export const SONG_TOTAL_STEPS = 64 // 8 bars * 4 beats * 2 steps

export type CelebrationSongTrack = 'birthday' | 'christmas' | 'new-year'
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

export interface SongTrackDefinition {
  track: CelebrationSongTrack
  label: string
  bpm: number
  totalSteps: number
  chords: readonly ChordEvent[]
  melody: readonly MelodyNote[]
  percussionStyle: 'lofi-snap' | 'sleigh-chime' | 'midnight-groove'
}

/**
 * 1. Birthday: 8-bar F-major Neo-Soul chord progression
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

  // Phrase 3 over Gm9
  { step: 32, midi: 72, durationSteps: 1.5, velocity: 0.72 }, // C5
  { step: 34, midi: 72, durationSteps: 1.5, velocity: 0.68 }, // C5
  { step: 36, midi: 84, durationSteps: 2.5, velocity: 0.9 }, // C6
  { step: 39, midi: 81, durationSteps: 2.5, velocity: 0.82 }, // A5
  { step: 42, midi: 77, durationSteps: 2, velocity: 0.76 }, // F5
  { step: 44, midi: 76, durationSteps: 2, velocity: 0.74 }, // E5
  { step: 46, midi: 74, durationSteps: 2, velocity: 0.72 }, // D5

  // Phrase 4 over C13sus4 -> C9
  { step: 48, midi: 82, durationSteps: 1.5, velocity: 0.78 }, // Bb5
  { step: 50, midi: 82, durationSteps: 1.5, velocity: 0.72 }, // Bb5
  { step: 52, midi: 81, durationSteps: 2, velocity: 0.82 }, // A5
  { step: 54, midi: 77, durationSteps: 2, velocity: 0.76 }, // F5
  { step: 56, midi: 79, durationSteps: 3, velocity: 0.84 }, // G5
  { step: 60, midi: 77, durationSteps: 4, velocity: 0.82 }, // F5
]

/**
 * 2. Christmas: Lush G-Major Winter Holiday Jazz / Carol Lounge (82 BPM)
 * Gmaj9 -> Em9 -> Cmaj9 -> Am9 / D13sus4
 */
export const CHRISTMAS_CHORD_PROGRESSION: readonly ChordEvent[] = [
  // Bars 1–2: Gmaj9 (G3, B3, D4, F#4, A4)
  { step: 0, durationSteps: 8, notes: [55, 59, 62, 66, 69], bass: 43 },
  { step: 8, durationSteps: 8, notes: [55, 59, 62, 66, 69], bass: 43 },
  // Bars 3–4: Em9 (E3, G3, B3, D4, F#4)
  { step: 16, durationSteps: 8, notes: [52, 55, 59, 62, 66], bass: 40 },
  { step: 24, durationSteps: 8, notes: [52, 55, 59, 62, 66], bass: 40 },
  // Bars 5–6: Cmaj9 (C3, E3, G3, B3, D4)
  { step: 32, durationSteps: 8, notes: [48, 52, 55, 59, 62], bass: 36 },
  { step: 40, durationSteps: 8, notes: [48, 52, 55, 59, 62], bass: 36 },
  // Bar 7: Am9 (A3, C4, E4, G4, B4)
  { step: 48, durationSteps: 8, notes: [57, 60, 64, 67, 71], bass: 45 },
  // Bar 8: D13sus4 (D3, G3, C4, E4, F#4)
  { step: 56, durationSteps: 8, notes: [50, 55, 60, 64, 66], bass: 38 },
]

/**
 * Warm winter-carol celesta motif inspired by "We Wish You a Merry Christmas"
 * & classic winter standards softened into a serene luxury spa chime melody.
 */
export const CHRISTMAS_MELODY_EVENTS: readonly MelodyNote[] = [
  // Phrase 1 over Gmaj9 (D5 -> G5-G5-A5-G5-F#5 -> E5)
  { step: 0, midi: 74, durationSteps: 2, velocity: 0.72 }, // D5
  { step: 2, midi: 79, durationSteps: 2, velocity: 0.84 }, // G5
  { step: 4, midi: 79, durationSteps: 1, velocity: 0.74 }, // G5
  { step: 5, midi: 81, durationSteps: 1, velocity: 0.78 }, // A5
  { step: 6, midi: 79, durationSteps: 1, velocity: 0.76 }, // G5
  { step: 7, midi: 78, durationSteps: 1, velocity: 0.74 }, // F#5
  { step: 8, midi: 76, durationSteps: 3, velocity: 0.8 }, // E5
  { step: 12, midi: 76, durationSteps: 3, velocity: 0.74 }, // E5

  // Phrase 2 over Em9 (E5 -> A5-A5-B5-A5-G5 -> F#5)
  { step: 16, midi: 76, durationSteps: 2, velocity: 0.74 }, // E5
  { step: 18, midi: 81, durationSteps: 2, velocity: 0.86 }, // A5
  { step: 20, midi: 81, durationSteps: 1, velocity: 0.76 }, // A5
  { step: 21, midi: 83, durationSteps: 1, velocity: 0.82 }, // B5
  { step: 22, midi: 81, durationSteps: 1, velocity: 0.78 }, // A5
  { step: 23, midi: 79, durationSteps: 1, velocity: 0.74 }, // G5
  { step: 24, midi: 78, durationSteps: 3, velocity: 0.82 }, // F#5
  { step: 28, midi: 74, durationSteps: 3, velocity: 0.72 }, // D5

  // Phrase 3 over Cmaj9 (D5 -> B5-B5-C6-B5-A5 -> G5)
  { step: 32, midi: 74, durationSteps: 2, velocity: 0.74 }, // D5
  { step: 34, midi: 83, durationSteps: 2, velocity: 0.88 }, // B5
  { step: 36, midi: 83, durationSteps: 1, velocity: 0.78 }, // B5
  { step: 37, midi: 84, durationSteps: 1, velocity: 0.84 }, // C6
  { step: 38, midi: 83, durationSteps: 1, velocity: 0.8 }, // B5
  { step: 39, midi: 81, durationSteps: 1, velocity: 0.76 }, // A5
  { step: 40, midi: 79, durationSteps: 3, velocity: 0.84 }, // G5
  { step: 44, midi: 76, durationSteps: 3, velocity: 0.76 }, // E5

  // Phrase 4 over Am9 -> D13sus4 (D5-D5-E5-A5-F#5 -> G5)
  { step: 48, midi: 74, durationSteps: 1, velocity: 0.72 }, // D5
  { step: 49, midi: 74, durationSteps: 1, velocity: 0.68 }, // D5
  { step: 50, midi: 76, durationSteps: 2, velocity: 0.78 }, // E5
  { step: 52, midi: 81, durationSteps: 2, velocity: 0.84 }, // A5
  { step: 54, midi: 78, durationSteps: 2, velocity: 0.8 }, // F#5
  { step: 56, midi: 79, durationSteps: 6, velocity: 0.88 }, // G5
]

/**
 * 3. New Year: Bright, Uplifting C-Major Midnight Toast Groove (94 BPM)
 * Cmaj9 -> Am9 -> Fmaj9 -> G13sus4 -> Em7 -> Am7 -> Dm9 -> G13sus4
 */
export const NEW_YEAR_CHORD_PROGRESSION: readonly ChordEvent[] = [
  // Bars 1–2: Cmaj9 (C3, E3, G3, B3, D4)
  { step: 0, durationSteps: 8, notes: [48, 52, 55, 59, 62], bass: 36 },
  { step: 8, durationSteps: 8, notes: [48, 52, 55, 59, 62], bass: 36 },
  // Bars 3–4: Am9 (A3, C4, E4, G4, B4)
  { step: 16, durationSteps: 8, notes: [57, 60, 64, 67, 71], bass: 45 },
  { step: 24, durationSteps: 8, notes: [57, 60, 64, 67, 71], bass: 45 },
  // Bars 5–6: Fmaj9 (F3, A3, C4, E4, G4) -> Em7 (E3, G3, B3, D4, G4)
  { step: 32, durationSteps: 8, notes: [53, 57, 60, 64, 67], bass: 41 },
  { step: 40, durationSteps: 8, notes: [52, 55, 59, 62, 67], bass: 40 },
  // Bar 7: Dm9 (D3, F3, A3, C4, E4)
  { step: 48, durationSteps: 8, notes: [50, 53, 57, 60, 64], bass: 38 },
  // Bar 8: G13sus4 (G3, C4, F4, A4, D5)
  { step: 56, durationSteps: 8, notes: [55, 60, 65, 69, 74], bass: 43 },
]

/**
 * Uplifting New Year chime motif inspired by "Auld Lang Syne" & midnight clock chimes.
 */
export const NEW_YEAR_MELODY_EVENTS: readonly MelodyNote[] = [
  // Pickup & Phrase 1 over Cmaj9 (G4 -> C5-C5-E5 -> D5-C5-D5)
  { step: 0, midi: 67, durationSteps: 2, velocity: 0.72 }, // G4
  { step: 2, midi: 72, durationSteps: 3, velocity: 0.85 }, // C5
  { step: 5, midi: 72, durationSteps: 1, velocity: 0.74 }, // C5
  { step: 6, midi: 76, durationSteps: 2, velocity: 0.82 }, // E5
  { step: 8, midi: 74, durationSteps: 3, velocity: 0.8 }, // D5
  { step: 11, midi: 72, durationSteps: 1, velocity: 0.72 }, // C5
  { step: 12, midi: 74, durationSteps: 4, velocity: 0.78 }, // D5

  // Phrase 2 over Am9 (E5-D5 -> C5-E5-G5 -> A5)
  { step: 16, midi: 76, durationSteps: 2, velocity: 0.8 }, // E5
  { step: 18, midi: 74, durationSteps: 2, velocity: 0.74 }, // D5
  { step: 20, midi: 72, durationSteps: 2, velocity: 0.78 }, // C5
  { step: 22, midi: 76, durationSteps: 2, velocity: 0.82 }, // E5
  { step: 24, midi: 79, durationSteps: 4, velocity: 0.86 }, // G5
  { step: 28, midi: 81, durationSteps: 4, velocity: 0.9 }, // A5

  // Phrase 3 over Fmaj9 -> Em7 (A5 -> G5-E5-C5 -> D5-C5-D5)
  { step: 32, midi: 81, durationSteps: 2, velocity: 0.84 }, // A5
  { step: 34, midi: 79, durationSteps: 3, velocity: 0.88 }, // G5
  { step: 37, midi: 76, durationSteps: 1, velocity: 0.76 }, // E5
  { step: 38, midi: 72, durationSteps: 2, velocity: 0.78 }, // C5
  { step: 40, midi: 74, durationSteps: 3, velocity: 0.8 }, // D5
  { step: 43, midi: 72, durationSteps: 1, velocity: 0.74 }, // C5
  { step: 44, midi: 74, durationSteps: 4, velocity: 0.78 }, // D5

  // Phrase 4 over Dm9 -> G13sus4 (E5-D5 -> C5-A4-G4 -> C5)
  { step: 48, midi: 76, durationSteps: 2, velocity: 0.82 }, // E5
  { step: 50, midi: 74, durationSteps: 2, velocity: 0.76 }, // D5
  { step: 52, midi: 72, durationSteps: 2, velocity: 0.8 }, // C5
  { step: 54, midi: 69, durationSteps: 2, velocity: 0.74 }, // A4
  { step: 56, midi: 67, durationSteps: 3, velocity: 0.78 }, // G4
  { step: 60, midi: 72, durationSteps: 4, velocity: 0.88 }, // C5
]

export function getSongTrackDefinition(
  track: CelebrationSongTrack = 'birthday',
): SongTrackDefinition {
  if (track === 'christmas') {
    return {
      track: 'christmas',
      label: 'Holiday Carol Lounge',
      bpm: CHRISTMAS_TEMPO_BPM,
      totalSteps: SONG_TOTAL_STEPS,
      chords: CHRISTMAS_CHORD_PROGRESSION,
      melody: CHRISTMAS_MELODY_EVENTS,
      percussionStyle: 'sleigh-chime',
    }
  }
  if (track === 'new-year') {
    return {
      track: 'new-year',
      label: 'Midnight Toast Chimes',
      bpm: NEW_YEAR_TEMPO_BPM,
      totalSteps: SONG_TOTAL_STEPS,
      chords: NEW_YEAR_CHORD_PROGRESSION,
      melody: NEW_YEAR_MELODY_EVENTS,
      percussionStyle: 'midnight-groove',
    }
  }
  return {
    track: 'birthday',
    label: 'Glow Year Neo-Soul Lounge',
    bpm: SONG_TEMPO_BPM,
    totalSteps: SONG_TOTAL_STEPS,
    chords: SONG_CHORD_PROGRESSION,
    melody: SONG_MELODY_EVENTS,
    percussionStyle: 'lofi-snap',
  }
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function getStepDurationSeconds(bpm = SONG_TEMPO_BPM): number {
  return 60 / bpm / SONG_STEPS_PER_BEAT
}

type StateListener = (state: SongPlaybackState) => void

export class BirthdaySongPlayer {
  private readonly trackDef: SongTrackDefinition
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

  constructor(track: CelebrationSongTrack = 'birthday') {
    this.trackDef = getSongTrackDefinition(track)
  }

  getTrack(): CelebrationSongTrack {
    return this.trackDef.track
  }

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
    dry.gain.value = 0.76

    const wet = ctx.createGain()
    wet.gain.value = this.trackDef.track === 'christmas' ? 0.32 : 0.28

    // Gentle stereo room reverb impulse (1.4s warm spa acoustics)
    const convolver = ctx.createConvolver()
    convolver.buffer = this.createReverbImpulse(ctx, 1.45, 2.75)

    const toneFilter = ctx.createBiquadFilter()
    toneFilter.type = 'lowpass'
    toneFilter.frequency.value = 4400
    toneFilter.Q.value = 0.5

    dry.connect(toneFilter)
    wet.connect(convolver)
    convolver.connect(toneFilter)
    toneFilter.connect(master)
    master.connect(ctx.destination)

    // Pre-build short noise buffer for brushed hats / soft sleigh-shimmer
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

    const stepDur = getStepDurationSeconds(this.trackDef.bpm)
    const scheduleAhead = 0.14

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAhead) {
      this.scheduleStep(this.currentStep, this.nextNoteTime, stepDur)
      this.nextNoteTime += stepDur
      this.currentStep = (this.currentStep + 1) % this.trackDef.totalSteps
    }
  }

  private scheduleStep(step: number, time: number, stepDur: number) {
    // 1. Rhodes electric piano chords + warm sub bass
    for (const chord of this.trackDef.chords) {
      if (chord.step === step) {
        const dur = chord.durationSteps * stepDur
        chord.notes.forEach((midi, idx) => {
          this.playRhodesVoice(midi, time + idx * 0.014, dur, 0.066)
        })
        this.playBassVoice(chord.bass, time, dur * 0.92)
      }
    }

    // 2. Celebratory celesta-bell melody line
    for (const note of this.trackDef.melody) {
      if (note.step === step) {
        this.playMelodyBell(note.midi, time, note.durationSteps * stepDur, note.velocity * 0.115)
      }
    }

    // 3. Track-tuned subtle percussion / shimmer groove
    if (this.trackDef.percussionStyle === 'sleigh-chime') {
      if (step % 2 === 0) {
        this.playSleighShimmer(time, step % 4 === 0 ? 0.015 : 0.009)
      }
      if (step % 8 === 4) {
        this.playSoftRimSnap(time, 0.016)
      }
    } else if (this.trackDef.percussionStyle === 'midnight-groove') {
      if (step % 2 === 0) {
        this.playBrushedHat(time, step % 4 === 0 ? 0.02 : 0.012)
      }
      if (step % 8 === 2 || step % 8 === 6) {
        this.playSoftRimSnap(time, 0.03)
      }
      if (step % 16 === 0) {
        this.playSleighShimmer(time, 0.014)
      }
    } else {
      if (step % 2 === 0) {
        this.playBrushedHat(time, step % 4 === 0 ? 0.018 : 0.012)
      }
      if (step % 8 === 2 || step % 8 === 6) {
        this.playSoftRimSnap(time, 0.028)
      }
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
    overtoneGain.gain.setValueAtTime(0.15, time)
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)

    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.28)

    body.connect(env)
    overtone.connect(overtoneGain)
    overtoneGain.connect(env)
    env.connect(this.dryGain)
    env.connect(this.wetGain)

    body.start(time)
    overtone.start(time)
    body.stop(time + duration + 0.32)
    overtone.stop(time + duration + 0.32)
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

  /**
   * Subtle high metallic sleigh-bell pulse using band-passed noise + high sine partials.
   */
  private playSleighShimmer(time: number, gainLevel: number) {
    if (!this.ctx || !this.noiseBuffer || !this.dryGain || !this.wetGain) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer

    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(7600, time)
    bp.Q.value = 3.2

    const env = this.ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(gainLevel, time + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.075)

    src.connect(bp)
    bp.connect(env)
    env.connect(this.dryGain)
    env.connect(this.wetGain)

    src.start(time)
    src.stop(time + 0.085)
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
