import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeHero3DLayout,
  computeParallaxTarget,
  generateSnowMoteSpecs,
} from './christmas-hero-math'

test('computeHero3DLayout keeps centerpiece framed above bottom nav across viewports', () => {
  const viewports: Array<[number, number, boolean]> = [
    [390, 480, true],
    [768, 520, false],
    [1024, 560, false],
    [1440, 560, false],
  ]

  for (const [w, h, expectedCompact] of viewports) {
    const layout = computeHero3DLayout(w, h)
    assert.equal(layout.isCompact, expectedCompact)
    assert.ok(layout.fov >= 35 && layout.fov <= 45)
    assert.ok(layout.stageScale > 0.5 && layout.stageScale <= 1.0)
    assert.ok(layout.stageOffset[0] > 0, `expected right-shifted sculpture at ${w}x${h}`)

    // Verify top/bottom bounds of a ~2.7-unit tall sculpture stay clear of top edge and bottom nav
    const halfVisibleH = layout.cameraPos[2] * Math.tan((layout.fov * Math.PI) / 360)
    const minVisibleY = layout.lookAt[1] - halfVisibleH * 0.72 // bottom nav occupies lower ~14% of section
    const maxVisibleY = layout.lookAt[1] + halfVisibleH * 0.96
    const sculptureBottom = layout.stageOffset[1] - 1.3 * layout.stageScale
    const sculptureTop = layout.stageOffset[1] + 1.35 * layout.stageScale

    assert.ok(
      sculptureBottom > minVisibleY,
      `sculpture bottom (${sculptureBottom.toFixed(2)}) clips below visible dark zone (${minVisibleY.toFixed(2)}) at ${w}x${h}`,
    )
    assert.ok(
      sculptureTop < maxVisibleY,
      `sculpture top (${sculptureTop.toFixed(2)}) clips above top edge (${maxVisibleY.toFixed(2)}) at ${w}x${h}`,
    )
  }
})

test('computeParallaxTarget clamps inputs and respects reducedMotion', () => {
  const zero = computeParallaxTarget(0.8, -0.5, true)
  assert.deepEqual(zero, { offsetX: 0, offsetY: 0 })

  const clamped = computeParallaxTarget(5, -5, false)
  assert.ok(Math.abs(clamped.offsetX) <= 0.5)
  assert.ok(Math.abs(clamped.offsetY) <= 0.3)
  assert.ok(clamped.offsetX > 0 && clamped.offsetY < 0)

  const nanSafe = computeParallaxTarget(Number.NaN, Number.POSITIVE_INFINITY, false)
  assert.equal(nanSafe.offsetX, 0)
  assert.ok(Number.isFinite(nanSafe.offsetY))
})

test('generateSnowMoteSpecs is deterministic and uses only brand festive tones', () => {
  const a = generateSnowMoteSpecs(120)
  const b = generateSnowMoteSpecs(120)
  assert.equal(a.length, 120)
  assert.deepEqual(a, b)

  for (const mote of a) {
    assert.ok(['white', 'lilac', 'orchid'].includes(mote.tone))
    assert.ok(mote.scale > 0)
    assert.ok(mote.speedY > 0)
  }
})
