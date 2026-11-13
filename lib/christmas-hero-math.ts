/**
 * Pure math & layout helpers for the clean flat Christmas Hero Sanctuary
 * illustration and the animated Laser Tech pulse geometry.
 * Decoupled from React/DOM so responsive framing, snowflake distributions,
 * and pulse-ring phases are deterministic and unit-testable.
 */

export interface SanctuaryViewportLayout {
  isCompact: boolean
  showFullSanctuary: boolean
  flakeCount: number
  archRightPercent: number
}

export interface FestiveSnowflakeSpec {
  xPercent: number
  topOffsetPercent: number
  sizePx: number
  durationSec: number
  delaySec: number
  driftPx: number
  variant: 'crystal' | 'dot'
  tone: 'white' | 'lilac' | 'orchid'
}

export interface PulseRingSpec {
  index: number
  delaySec: number
  durationSec: number
  baseRadius: number
}

/**
 * Computes responsive sanctuary framing so the Christmas architectural
 * tableau sits cleanly beside the left-aligned hero typography on tablet/desktop,
 * and simplifies gracefully on narrow mobile viewports.
 */
export function computeSanctuaryViewport(
  width: number,
  height: number,
): SanctuaryViewportLayout {
  const safeW = Math.max(width, 320)
  const safeH = Math.max(height, 360)

  if (safeW < 768) {
    return {
      isCompact: true,
      showFullSanctuary: false,
      flakeCount: 8,
      archRightPercent: 4,
    }
  }

  if (safeW < 1024) {
    return {
      isCompact: false,
      showFullSanctuary: true,
      flakeCount: 12,
      archRightPercent: safeH > 500 ? 6 : 5,
    }
  }

  return {
    isCompact: false,
    showFullSanctuary: true,
    flakeCount: 16,
    archRightPercent: 8,
  }
}

/**
 * Deterministic LCG PRNG for reproducible snowflake positions without hydration drift.
 */
function createRng(seed: number) {
  let state = (seed >>> 0) || 1
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Generates deterministic geometric snowflakes biased toward the right-hand
 * sanctuary showcase (52%–96% X) so left-aligned headline copy stays clean.
 */
export function generateFestiveSnowflakes(
  count: number,
  seed = 20261225,
): FestiveSnowflakeSpec[] {
  const safeCount = Math.max(0, Math.min(40, Math.floor(count)))
  const rand = createRng(seed)
  const specs: FestiveSnowflakeSpec[] = []

  for (let i = 0; i < safeCount; i++) {
    const toneRoll = rand()
    const tone: FestiveSnowflakeSpec['tone'] =
      toneRoll < 0.5 ? 'white' : toneRoll < 0.84 ? 'lilac' : 'orchid'

    // Keep most flakes in the right showcase half; allow a sparse high-altitude few across the sky
    const inRightShowcase = i % 4 !== 0
    const xPercent = inRightShowcase
      ? Number((52 + rand() * 44).toFixed(2))
      : Number((12 + rand() * 38).toFixed(2))

    specs.push({
      xPercent,
      topOffsetPercent: Number((-8 - rand() * 10).toFixed(2)),
      sizePx: i % 2 === 0 ? Math.round(10 + rand() * 6) : Math.round(4 + rand() * 3),
      durationSec: Number((11 + rand() * 8).toFixed(2)),
      delaySec: Number((rand() * 10).toFixed(2)),
      driftPx: Number(((rand() - 0.5) * 32).toFixed(1)),
      variant: i % 2 === 0 ? 'crystal' : 'dot',
      tone,
    })
  }

  return specs
}

/**
 * Computes evenly staggered concentric pulse rings for the animated laser handpiece.
 */
export function computeLaserPulseRings(
  count = 3,
  durationSec = 3.0,
): PulseRingSpec[] {
  const safeCount = Math.max(1, Math.min(6, Math.floor(count)))
  const safeDuration = Math.max(0.8, durationSec)
  const rings: PulseRingSpec[] = []

  for (let i = 0; i < safeCount; i++) {
    rings.push({
      index: i,
      delaySec: Number(((i * safeDuration) / safeCount).toFixed(2)),
      durationSec: safeDuration,
      baseRadius: 18 + i * 8,
    })
  }

  return rings
}
