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

  // Mobile (< 768px): dedicated lower showcase well below the stacked headline & CTA buttons
  if (safeW < 768) {
    return {
      fov: 42,
      cameraPos: [0, 1.55, 11.4],
      lookAt: [0, 1.45, 0],
      stageOffset: [0, -1.48, 0],
      stageScale: 0.61,
      isCompact: true,
    }
  }

  // Tablet (768px–1023px): centerpiece occupies the right half clear of the left text column
  if (safeW < 1024) {
    return {
      fov: 39,
      cameraPos: [0, 1.48, 9.2],
      lookAt: [0.3, 0.95, 0],
      stageOffset: [2.58, 0.0, 0],
      stageScale: 0.68,
      isCompact: false,
    }
  }

  // Laptop (1024px–1279px)
  if (safeW < 1280) {
    return {
      fov: 38,
      cameraPos: [0, 1.44, 8.2],
      lookAt: [0.45, 0.92, 0],
      stageOffset: [2.75, 0.0, 0],
      stageScale: 0.78,
      isCompact: false,
    }
  }

  // Wide desktop (>= 1280px): generous separation between editorial copy and 3D sculpture
  const wideShift = aspect > 2.3 ? 2.95 : 2.7
  return {
    fov: 38,
    cameraPos: [0, 1.42, 7.6],
    lookAt: [0.45, 0.9, 0],
    stageOffset: [wideShift, 0.02, 0],
    stageScale: 0.9,
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
    offsetX: clampedX * 0.42,
    offsetY: clampedY * 0.22,
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
 * Generates deterministic 3D snow-crystal & brand-lilac mote specs.
 */
export function generateSnowMoteSpecs(count: number, seed = 20261225): SnowMoteSpec[] {
  const safeCount = Math.max(0, Math.min(200, Math.floor(count)))
  const rand = createRng(seed)
  const specs: SnowMoteSpec[] = []

  for (let i = 0; i < safeCount; i++) {
    const toneRoll = rand()
    const tone: SnowMoteSpec['tone'] =
      toneRoll < 0.45 ? 'white' : toneRoll < 0.8 ? 'lilac' : 'orchid'

    specs.push({
      x: (rand() - 0.35) * 11,
      y: rand() * 5.2 - 0.6,
      z: (rand() - 0.5) * 5.5,
      scale: 0.028 + rand() * 0.048,
      speedY: 0.18 + rand() * 0.28,
      swayAmp: 0.08 + rand() * 0.18,
      swayFreq: 0.6 + rand() * 1.1,
      phase: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * 1.4,
      tone,
    })
  }

  return specs
}
