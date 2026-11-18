import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHRISTMAS_CHORD_PROGRESSION,
  CHRISTMAS_MELODY_EVENTS,
  NEW_YEAR_CHORD_PROGRESSION,
  NEW_YEAR_MELODY_EVENTS,
  SONG_CHORD_PROGRESSION,
  SONG_MELODY_EVENTS,
  SONG_TEMPO_BPM,
  SONG_TOTAL_STEPS,
  getSongTrackDefinition,
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

test('birthday, christmas, and new-year tracks stay within 64-step seamless loops with distinct musical signatures', () => {
  const tracks = ['birthday', 'christmas', 'new-year'] as const
  for (const trackId of tracks) {
    const def = getSongTrackDefinition(trackId)
    assert.equal(def.totalSteps, SONG_TOTAL_STEPS)
    assert.ok(def.bpm >= 76 && def.bpm <= 110)
    assert.equal(def.chords[0]?.step, 0)
    for (const chord of def.chords) {
      assert.ok(chord.step >= 0 && chord.step < SONG_TOTAL_STEPS)
      assert.ok(chord.notes.length >= 4)
      assert.ok(chord.bass < chord.notes[0])
    }
    for (const note of def.melody) {
      assert.ok(note.step >= 0 && note.step < SONG_TOTAL_STEPS)
      assert.ok(note.velocity > 0 && note.velocity <= 1)
      assert.ok(note.midi >= 60 && note.midi <= 96)
    }
  }

  assert.equal(SONG_CHORD_PROGRESSION.length, 8)
  assert.equal(CHRISTMAS_CHORD_PROGRESSION.length, 8)
  assert.equal(NEW_YEAR_CHORD_PROGRESSION.length, 8)
  assert.notEqual(CHRISTMAS_MELODY_EVENTS[0]?.midi, SONG_MELODY_EVENTS[0]?.midi)
  assert.notEqual(NEW_YEAR_MELODY_EVENTS[0]?.midi, SONG_MELODY_EVENTS[0]?.midi)
})
