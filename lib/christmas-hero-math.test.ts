import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeSanctuaryViewport,
  generateFestiveSnowflakes,
  computeLaserPulseRings,
} from './christmas-hero-math'

test('computeSanctuaryViewport adapts cleanly across mobile, tablet, and desktop', () => {
  const mobile = computeSanctuaryViewport(390, 480)
  assert.equal(mobile.isCompact, true)
  assert.equal(mobile.showFullSanctuary, false)
  assert.ok(mobile.flakeCount > 0 && mobile.flakeCount <= 10)

  const tablet = computeSanctuaryViewport(768, 520)
  assert.equal(tablet.isCompact, false)
  assert.equal(tablet.showFullSanctuary, true)

  const desktop = computeSanctuaryViewport(1440, 560)
  assert.equal(desktop.isCompact, false)
  assert.equal(desktop.showFullSanctuary, true)
  assert.ok(desktop.flakeCount >= tablet.flakeCount)
  assert.ok(desktop.archRightPercent >= 6 && desktop.archRightPercent <= 10)
})

test('generateFestiveSnowflakes is deterministic, bounded, and brand-toned', () => {
  const first = generateFestiveSnowflakes(16)
  const second = generateFestiveSnowflakes(16)
  assert.equal(first.length, 16)
  assert.deepEqual(first, second)

  for (const flake of first) {
    assert.ok(flake.xPercent >= 10 && flake.xPercent <= 96)
    assert.ok(flake.sizePx >= 4 && flake.sizePx <= 16)
    assert.ok(flake.durationSec >= 10)
    assert.ok(['crystal', 'dot'].includes(flake.variant))
    assert.ok(['white', 'lilac', 'orchid'].includes(flake.tone))
  }
})

test('computeLaserPulseRings produces evenly staggered ring delays', () => {
  const rings = computeLaserPulseRings(3, 3.0)
  assert.equal(rings.length, 3)
  assert.deepEqual(
    rings.map((r) => r.delaySec),
    [0, 1, 2],
  )
  for (const ring of rings) {
    assert.equal(ring.durationSec, 3.0)
    assert.ok(ring.baseRadius >= 18)
  }
})
