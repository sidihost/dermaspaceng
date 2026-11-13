/**
 * Pure math & layout helpers for the 3D Christmas Hero Sanctuary.
 * Decoupled from WebGL / React so framing, parallax bounds, and
 * particle distributions can be unit-tested deterministically.
 */

export interface Hero3DLayout {
  fov: number
  cameraPos: [number, number, number]
  lookAt: [number, number, number]
  stageOffset: [number, number, number]
  stageScale: number
  isCompact: boolean
}

export interface SnowMoteSpec {
  x: number
  y: number
  z: number
  scale: number
  speedY: number
  swayAmp: number
  swayFreq: number
  phase: number
  rotSpeed: number
  tone: 'white' | 'lilac' | 'orchid'
}

/**
 * Computes responsive camera & stage framing so the 3D sculpture
 * sits cleanly to the right of the headline column on desktop, and
 * scales gracefully behind the centered mobile composition on phones.
 */
export function computeHero3DLayout(width: number, height: number): Hero3DLayout {
  const safeW = Math.max(width, 320)
  const safeH = Math.max(height, 360)
  const aspect = safeW / safeH

  // Mobile (< 768px): framed cleanly in upper-right dark zone above CTA & bottom nav bar
  if (safeW < 768) {
    return {
      fov: 42,
      cameraPos: [0, 0.15, 9.8],
      lookAt: [0, -0.22, 0],
      stageOffset: [1.15, 0.42, -0.5],
      stageScale: 0.56,
      isCompact: true,
    }
  }

  // Tablet (768px–1023px): centerpiece occupies the right showcase half clear of left editorial copy
  if (safeW < 1024) {
    return {
      fov: 39,
      cameraPos: [0, 0.16, 8.4],
      lookAt: [0, -0.2, 0],
      stageOffset: [2.05, 0.2, 0],
      stageScale: 0.72,
      isCompact: false,
    }
  }

  // Laptop (1024px–1279px)
  if (safeW < 1280) {
    return {
      fov: 38,
      cameraPos: [0, 0.16, 7.9],
      lookAt: [0, -0.2, 0],
      stageOffset: [2.42, 0.2, 0],
      stageScale: 0.82,
      isCompact: false,
    }
  }

  // Wide desktop (>= 1280px): balanced gallery framing beside the left-aligned headline column
  const wideShift = aspect > 2.35 ? 3.05 : 2.75
  return {
    fov: 38,
    cameraPos: [0, 0.16, 7.5],
    lookAt: [0, -0.2, 0],
    stageOffset: [wideShift, 0.2, 0],
    stageScale: 0.94,
    isCompact: false,
  }
}

/**
 * Maps normalized pointer coordinates [-1, 1] into subtle, clamped
 * camera parallax offsets. Returns zero offsets when reduced motion
 * is requested.
 */
export function computeParallaxTarget(
  normX: number,
  normY: number,
  reducedMotion: boolean,
): { offsetX: number; offsetY: number } {
  if (reducedMotion) {
    return { offsetX: 0, offsetY: 0 }
  }
  const clampedX = Math.max(-1, Math.min(1, Number.isFinite(normX) ? normX : 0))
  const clampedY = Math.max(-1, Math.min(1, Number.isFinite(normY) ? normY : 0))
  return {
    offsetX: clampedX * 0.44,
    offsetY: clampedY * 0.24,
  }
}

/**
 * Deterministic LCG PRNG for reproducible particle layouts across runs.
 */
function createRng(seed: number) {
  let state = (seed >>> 0) || 1
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Generates deterministic 3D snow-crystal & brand-lilac mote specs spanning
 * the hero stage cleanly above the bottom navigation bar.
 */
export function generateSnowMoteSpecs(count: number, seed = 20261225): SnowMoteSpec[] {
  const safeCount = Math.max(0, Math.min(220, Math.floor(count)))
  const rand = createRng(seed)
  const specs: SnowMoteSpec[] = []

  for (let i = 0; i < safeCount; i++) {
    const toneRoll = rand()
    const tone: SnowMoteSpec['tone'] =
      toneRoll < 0.45 ? 'white' : toneRoll < 0.8 ? 'lilac' : 'orchid'

    specs.push({
      x: (rand() - 0.35) * 11.5,
      y: rand() * 4.6 - 1.6,
      z: (rand() - 0.5) * 5.2,
      scale: 0.024 + rand() * 0.044,
      speedY: 0.16 + rand() * 0.24,
      swayAmp: 0.07 + rand() * 0.16,
      swayFreq: 0.55 + rand() * 1.0,
      phase: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * 1.35,
      tone,
    })
  }

  return specs
}
