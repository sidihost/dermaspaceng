import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SONG_CHORD_PROGRESSION,
  SONG_MELODY_EVENTS,
  SONG_TEMPO_BPM,
  SONG_TOTAL_STEPS,
  getStepDurationSeconds,
  midiToFreq,
} from './birthday-song'

test('midiToFreq converts A4=69 and C4=60 accurately', () => {
  assert.equal(midiToFreq(69), 440)
  assert.ok(Math.abs(midiToFreq(60) - 261.625565) < 0.001)
})

test('getStepDurationSeconds matches 8th-note grid for song BPM', () => {
  const stepSec = getStepDurationSeconds(SONG_TEMPO_BPM)
  // At 86 BPM, one beat = 60/86 ≈ 0.6977s, one 8th-note step = half of that
  assert.ok(Math.abs(stepSec - 60 / SONG_TEMPO_BPM / 2) < 1e-6)
})

test('chord progression and melody events stay within 64-step seamless loop', () => {
  assert.equal(SONG_CHORD_PROGRESSION[0]?.step, 0)
  for (const chord of SONG_CHORD_PROGRESSION) {
    assert.ok(chord.step >= 0 && chord.step < SONG_TOTAL_STEPS)
    assert.ok(chord.notes.length >= 4)
    assert.ok(chord.bass < chord.notes[0])
  }
  for (const note of SONG_MELODY_EVENTS) {
    assert.ok(note.step >= 0 && note.step < SONG_TOTAL_STEPS)
    assert.ok(note.velocity > 0 && note.velocity <= 1)
    assert.ok(note.midi >= 60 && note.midi <= 96)
  }
})
