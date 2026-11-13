'use client'

/**
 * ChristmasHero3D
 * ---------------------------------------------------------------
 * Real-time interactive 3D Christmas Spa Sanctuary built with Three.js
 * for the Dermaspace Hero Slider.
 *
 * Design rules strictly honored:
 *   - Brand palette: Deep Plum (#240933, #5A1D6A), Signature Purple (#7B2D8E),
 *     Orchid (#9B4DB0, #D8B4FE, #E9D5FF), Pearl Silver (#F5ECF8), Pure White
 *     (#FFFFFF), and Botanical Eucalyptus (#26543C). Zero gold/yellow.
 *   - ZERO CSS shadows, ZERO CSS gradients, ZERO Sparkles/Zap icons,
 *     ZERO dashed lines or borders.
 *   - Software-WebGL safe (`isSoftwareGl` detection + `afterDraw` pacing +
 *     graceful fallback image on context loss).
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  computeHero3DLayout,
  computeParallaxTarget,
  generateSnowMoteSpecs,
  type Hero3DLayout,
} from '@/lib/christmas-hero-math'

interface AnimatedBauble {
  group: THREE.Group
  baseY: number
  bobAmp: number
  bobFreq: number
  phase: number
  spinSpeed: number
}

interface AnimatedCrystal {
  group: THREE.Group
  baseY: number
  baseX: number
  bobAmp: number
  phase: number
  spinY: number
  spinZ: number
}

const _dummy = new THREE.Object3D()

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') || probe.getContext('webgl')
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER
    const gpu = String(gl.getParameter(param) || '')
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu)
  } catch {
    return true
  }
}

/**
 * Generates a subtle veined deep-plum marble texture procedurally
 * using an HTML5 2D canvas (zero external asset requests).
 */
function createPlumMarbleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#310E44'
  ctx.fillRect(0, 0, size, size)

  // Subtle organic mineral veins in soft lilac & orchid
  ctx.lineCap = 'round'
  for (let i = 0; i < 16; i++) {
    ctx.beginPath()
    let x = (i * 37) % size
    let y = 0
    ctx.moveTo(x, y)
    for (let step = 0; step <= 8; step++) {
      y = (step / 8) * size
      x += Math.sin(step * 1.1 + i * 0.9) * 18
      ctx.lineTo(x, y)
    }
    ctx.strokeStyle = i % 5 === 0 ? 'rgba(233, 213, 255, 0.22)' : 'rgba(155, 77, 176, 0.2)'
    ctx.lineWidth = i % 3 === 0 ? 1.8 : 0.9
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = Math.min(maxAnisotropy, 4)
  return texture
}

/**
 * Generates a subtle woven satin bump texture for the gift box & ribbon.
 */
function createSatinMicroTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#929292'
  for (let y = 0; y < size; y += 2) {
    ctx.fillRect(0, y, size, 1)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 6)
  return tex
}

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const hw = w / 2
  const hh = h / 2
  s.moveTo(-hw + r, -hh)
  s.lineTo(hw - r, -hh)
  s.quadraticCurveTo(hw, -hh, hw, -hh + r)
  s.lineTo(hw, hh - r)
  s.quadraticCurveTo(hw, hh, hw - r, hh)
  s.lineTo(-hw + r, hh)
  s.quadraticCurveTo(-hw, hh, -hw, hh - r)
  s.lineTo(-hw, -hh + r)
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return s
}

function buildCrystalSnowflakeGeometry(radius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const arms = 6
  const outer = radius
  const inner = radius * 0.24
  const mid = radius * 0.56
  const notch = radius * 0.14

  for (let i = 0; i < arms; i++) {
    const a0 = (i / arms) * Math.PI * 2
    const aNext = ((i + 1) / arms) * Math.PI * 2
    const aMid = (a0 + aNext) / 2

    const p0x = Math.cos(a0 - 0.1) * inner
    const p0y = Math.sin(a0 - 0.1) * inner
    const tipX = Math.cos(a0) * outer
    const tipY = Math.sin(a0) * outer
    const p1x = Math.cos(a0 + 0.1) * inner
    const p1y = Math.sin(a0 + 0.1) * inner
    const notchX = Math.cos(aMid) * (inner * 0.85)
    const notchY = Math.sin(aMid) * (inner * 0.85)
    const branchLx = Math.cos(a0 - 0.24) * mid
    const branchLy = Math.sin(a0 - 0.24) * mid
    const branchRx = Math.cos(a0 + 0.24) * mid
    const branchRy = Math.sin(a0 + 0.24) * mid
    const waistLx = Math.cos(a0 - 0.08) * (mid - notch)
    const waistLy = Math.sin(a0 - 0.08) * (mid - notch)
    const waistRx = Math.cos(a0 + 0.08) * (mid - notch)
    const waistRy = Math.sin(a0 + 0.08) * (mid - notch)

    if (i === 0) shape.moveTo(p0x, p0y)
    else shape.lineTo(p0x, p0y)
    shape.lineTo(waistLx, waistLy)
    shape.lineTo(branchLx, branchLy)
    shape.lineTo(tipX, tipY)
    shape.lineTo(branchRx, branchRy)
    shape.lineTo(waistRx, waistRy)
    shape.lineTo(p1x, p1y)
    shape.lineTo(notchX, notchY)
  }
  shape.closePath()

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.45,
    bevelSize: radius * 0.035,
    bevelSegments: 2,
  })
  geom.center()
  return geom
}

export function ChristmasHero3D({
  active,
  onInteract,
}: {
  active: boolean
  onInteract?: () => void
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const activeRef = useRef(active)
  const onInteractRef = useRef(onInteract)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    onInteractRef.current = onInteract
  }, [onInteract])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const isSoftwareGl = detectSoftwareWebGL()
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      })
    } catch {
      setFallbackMode(true)
      return
    }

    const initialW = container.clientWidth || window.innerWidth || 1280
    const initialH = container.clientHeight || 560

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(initialW, initialH, false)
    renderer.shadowMap.enabled = false

    const domEl = renderer.domElement
    domEl.style.width = '100%'
    domEl.style.height = '100%'
    domEl.style.display = 'block'
    container.innerHTML = ''
    container.appendChild(domEl)

    // Scene & atmospheric sanctuary backdrop
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#240933')
    scene.fog = new THREE.FogExp2('#240933', 0.042)

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const roomEnv = new RoomEnvironment()
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04)
    scene.environment = envTarget.texture
    roomEnv.dispose()
    pmremGenerator.dispose()

    let currentLayout: Hero3DLayout = computeHero3DLayout(initialW, initialH)
    const camera = new THREE.PerspectiveCamera(
      currentLayout.fov,
      initialW / initialH,
      0.1,
      50,
    )
    camera.position.set(...currentLayout.cameraPos)
    camera.lookAt(...currentLayout.lookAt)

    // Studio 3-point lighting rig (no shadows, pure brand white & orchid)
    const hemiLight = new THREE.HemisphereLight('#E9D5FF', '#1A0626', 0.9)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 2.2)
    keyLight.position.set(4.5, 6.5, 5.5)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight('#B96CD0', 1.75)
    rimLight.position.set(-5.0, 4.0, -4.5)
    scene.add(rimLight)

    const candleWarmLight = new THREE.PointLight('#F3E8FF', 2.2, 7.5, 1.8)
    candleWarmLight.position.set(0, 1.4, 0.5)

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const textures: THREE.Texture[] = []
    const trackG = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g)
      return g
    }
    const trackM = <T extends THREE.Material>(m: T): T => {
      materials.push(m)
      return m
    }
    const trackT = <T extends THREE.Texture>(t: T): T => {
      textures.push(t)
      return t
    }

    const marbleTex = trackT(createPlumMarbleTexture(renderer.capabilities.getMaxAnisotropy()))
    const satinBump = trackT(createSatinMicroTexture())

    // Shared calibrated PBR material palette (100% Dermaspace white, pearl-silver & purple)
    const matPlumMarble = trackM(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: marbleTex,
        roughness: 0.24,
        metalness: 0.08,
      }),
    )
    const matSilverPearl = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#F4ECF8',
        metalness: 0.82,
        roughness: 0.16,
        clearcoat: 0.65,
      }),
    )
    const matOrchidAccent = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#9B4DB0',
        metalness: 0.68,
        roughness: 0.18,
        clearcoat: 0.85,
      }),
    )
    const matSatinWhiteRibbon = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#F8F2FC',
        metalness: 0.12,
        roughness: 0.26,
        sheen: 0.95,
        sheenColor: new THREE.Color('#FFFFFF'),
        bumpMap: satinBump,
        bumpScale: 0.008,
      }),
    )
    const matPlumBox = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#5A1D6A',
        roughness: 0.52,
        metalness: 0.08,
        sheen: 0.8,
        sheenRoughness: 0.4,
        sheenColor: new THREE.Color('#A855C7'),
        bumpMap: satinBump,
        bumpScale: 0.012,
      }),
    )
    const matPlumLid = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#7B2D8E',
        roughness: 0.44,
        metalness: 0.1,
        sheen: 0.9,
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color('#D8B4FE'),
        bumpMap: satinBump,
        bumpScale: 0.01,
      }),
    )
    const matFrostedGlass = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#F5ECF8',
        roughness: 0.24,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.78,
      }),
    )
    const matWax = trackM(
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.58,
        metalness: 0.0,
        emissive: new THREE.Color('#7B2D8E'),
        emissiveIntensity: 0.14,
      }),
    )
    const matFlame = trackM(
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
      }),
    )
    const matFlutedBaublePlum = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#8D35A3',
        metalness: 0.55,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      }),
    )
    const matFlutedBaublePearl = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#F4EAF8',
        metalness: 0.35,
        roughness: 0.2,
        clearcoat: 0.95,
      }),
    )
    const matCrystal = trackM(
      new THREE.MeshPhysicalMaterial({
        color: '#FBF7FF',
        metalness: 0.18,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      }),
    )
    const matEucalyptus = trackM(
      new THREE.MeshStandardMaterial({
        color: '#2B5B43',
        roughness: 0.58,
        metalness: 0.04,
      }),
    )
    const matPine = trackM(
      new THREE.MeshStandardMaterial({
        color: '#1F4231',
        roughness: 0.68,
        metalness: 0.02,
      }),
    )

    // Root stage group positioned responsively
    const stageGroup = new THREE.Group()
    stageGroup.position.set(...currentLayout.stageOffset)
    stageGroup.scale.setScalar(currentLayout.stageScale)
    scene.add(stageGroup)
    stageGroup.add(candleWarmLight)

    // ------------------------------------------------------------------
    // 1. Multi-tier Spa Pedestal + Architectural Pearl-Silver Halo Arch
    // ------------------------------------------------------------------
    const pedestalGroup = new THREE.Group()
    const pedestalProfile = [
      new THREE.Vector2(0, -0.35),
      new THREE.Vector2(1.85, -0.35),
      new THREE.Vector2(1.85, -0.14),
      new THREE.Vector2(1.75, -0.06),
      new THREE.Vector2(1.75, 0.0),
      new THREE.Vector2(0, 0.0),
    ]
    const pedestalMesh = new THREE.Mesh(
      trackG(new THREE.LatheGeometry(pedestalProfile, 48)),
      matPlumMarble,
    )
    pedestalGroup.add(pedestalMesh)

    // Brushed pearl-silver collar & top bezel ring on pedestal
    const pedestalTopInlay = new THREE.Mesh(
      trackG(new THREE.CylinderGeometry(1.66, 1.66, 0.012, 48)),
      trackM(
        new THREE.MeshPhysicalMaterial({
          color: '#3A1152',
          roughness: 0.14,
          metalness: 0.18,
          clearcoat: 0.85,
          clearcoatRoughness: 0.12,
        }),
      ),
    )
    pedestalTopInlay.position.y = 0.002
    pedestalGroup.add(pedestalTopInlay)

    const pedestalRim = new THREE.Mesh(
      trackG(new THREE.TorusGeometry(1.74, 0.026, 14, 72)),
      matSilverPearl,
    )
    pedestalRim.rotation.x = Math.PI / 2
    pedestalRim.position.y = 0.008
    pedestalGroup.add(pedestalRim)

    const lowerRim = new THREE.Mesh(
      trackG(new THREE.TorusGeometry(1.84, 0.018, 12, 72)),
      matOrchidAccent,
    )
    lowerRim.rotation.x = Math.PI / 2
    lowerRim.position.y = -0.14
    pedestalGroup.add(lowerRim)

    // Grand Architectural Pearl-Silver Halo Arch behind centerpiece
    const outerArch = new THREE.Mesh(
      trackG(new THREE.TorusGeometry(2.05, 0.042, 18, 96, Math.PI * 1.38)),
      matSilverPearl,
    )
    outerArch.position.set(0, 1.32, -0.55)
    outerArch.rotation.z = -Math.PI * 0.19
    pedestalGroup.add(outerArch)

    // Inner kinetic celestial orchid ring + orbiting pearls
    const kineticRingGroup = new THREE.Group()
    kineticRingGroup.position.set(0, 1.32, -0.32)
    const innerRing = new THREE.Mesh(
      trackG(new THREE.TorusGeometry(1.62, 0.016, 12, 84)),
      matOrchidAccent,
    )
    kineticRingGroup.add(innerRing)

    const pearlGeom = trackG(new THREE.SphereGeometry(0.055, 16, 16))
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const pearl = new THREE.Mesh(pearlGeom, i % 2 === 0 ? matOrchidAccent : matFlutedBaublePearl)
      pearl.position.set(Math.cos(angle) * 1.62, Math.sin(angle) * 1.62, 0)
      kineticRingGroup.add(pearl)
    }
    pedestalGroup.add(kineticRingGroup)
    stageGroup.add(pedestalGroup)

    // ------------------------------------------------------------------
    // 2. Signature Dermaspace 3D Gift Box with Multi-Loop Satin Bow
    // ------------------------------------------------------------------
    const giftGroup = new THREE.Group()
    giftGroup.position.set(-0.08, 0.015, 0.05)
    giftGroup.rotation.y = -0.34

    // Box body (beveled extruded rounded square)
    const boxBodyShape = roundedRectShape(1.16, 1.16, 0.07)
    const boxBodyGeom = trackG(
      new THREE.ExtrudeGeometry(boxBodyShape, {
        depth: 0.82,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 3,
      }),
    )
    boxBodyGeom.rotateX(-Math.PI / 2)
    const boxBody = new THREE.Mesh(boxBodyGeom, matPlumBox)
    boxBody.position.y = 0.03
    giftGroup.add(boxBody)

    // Overhanging beveled lid
    const lidShape = roundedRectShape(1.24, 1.24, 0.075)
    const lidGeom = trackG(
      new THREE.ExtrudeGeometry(lidShape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 3,
      }),
    )
    lidGeom.rotateX(-Math.PI / 2)
    const lidMesh = new THREE.Mesh(lidGeom, matPlumLid)
    lidMesh.position.y = 0.84
    giftGroup.add(lidMesh)

    // Cross-wrapped satin white ribbon bands
    const ribbonX = new THREE.Mesh(
      trackG(new THREE.BoxGeometry(1.31, 0.96, 0.17)),
      matSatinWhiteRibbon,
    )
    ribbonX.position.y = 0.54
    giftGroup.add(ribbonX)

    const ribbonZ = new THREE.Mesh(
      trackG(new THREE.BoxGeometry(0.17, 0.96, 1.31)),
      matSatinWhiteRibbon,
    )
    ribbonZ.position.y = 0.54
    giftGroup.add(ribbonZ)

    const ribbonTopCap = new THREE.Mesh(
      trackG(new THREE.BoxGeometry(1.3, 0.03, 0.19)),
      matSatinWhiteRibbon,
    )
    ribbonTopCap.position.y = 1.045
    giftGroup.add(ribbonTopCap)

    // Sculpted 4-loop Satin Bow + Center Knot + Flowing Ribbon Tails
    const bowGroup = new THREE.Group()
    bowGroup.position.set(0, 1.06, 0)

    const loopGeom = trackG(new THREE.TorusGeometry(0.22, 0.068, 16, 36))
    const loopAngles = [0.42, Math.PI - 0.42, Math.PI + 0.42, -0.42]
    loopAngles.forEach((ang, idx) => {
      const loop = new THREE.Mesh(loopGeom, matSatinWhiteRibbon)
      loop.rotation.y = ang
      loop.rotation.x = Math.PI / 2 - 0.34
      loop.scale.set(1.18, 0.72, 0.55)
      loop.position.set(Math.cos(ang) * 0.16, 0.12 + (idx % 2) * 0.02, -Math.sin(ang) * 0.16)
      bowGroup.add(loop)
    })

    const knot = new THREE.Mesh(
      trackG(new THREE.SphereGeometry(0.095, 20, 16)),
      matSatinWhiteRibbon,
    )
    knot.scale.set(1.15, 0.85, 1.15)
    knot.position.y = 0.1
    bowGroup.add(knot)

    // Two curved cascading ribbon tails
    const tailCurveA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 0.08, 0.06),
      new THREE.Vector3(0.24, 0.06, 0.36),
      new THREE.Vector3(0.46, -0.04, 0.58),
    ])
    const tailCurveB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 0.08, 0.06),
      new THREE.Vector3(-0.22, 0.05, 0.38),
      new THREE.Vector3(-0.38, -0.06, 0.61),
    ])
    const tailA = new THREE.Mesh(
      trackG(new THREE.TubeGeometry(tailCurveA, 20, 0.036, 8, false)),
      matSatinWhiteRibbon,
    )
    tailA.scale.set(1, 0.45, 1)
    const tailB = new THREE.Mesh(
      trackG(new THREE.TubeGeometry(tailCurveB, 20, 0.036, 8, false)),
      matSatinWhiteRibbon,
    )
    tailB.scale.set(1, 0.45, 1)
    bowGroup.add(tailA, tailB)

    giftGroup.add(bowGroup)
    stageGroup.add(giftGroup)

    // ------------------------------------------------------------------
    // 3. 3D Frosted Spa Elixir & Botanical Serum Vessels (front right)
    // ------------------------------------------------------------------
    const createSerumBottle = (scale: number, x: number, z: number) => {
      const bottle = new THREE.Group()
      bottle.position.set(x, 0.015, z)

      const glassPoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.19 * scale, 0),
        new THREE.Vector2(0.21 * scale, 0.04 * scale),
        new THREE.Vector2(0.21 * scale, 0.46 * scale),
        new THREE.Vector2(0.12 * scale, 0.57 * scale),
        new THREE.Vector2(0.09 * scale, 0.64 * scale),
        new THREE.Vector2(0, 0.64 * scale),
      ]
      const glassBody = new THREE.Mesh(
        trackG(new THREE.LatheGeometry(glassPoints, 8)), // Octagonal faceted glass
        matFrostedGlass,
      )
      bottle.add(glassBody)

      // Orchid botanical serum core inside frosted bottle
      const innerElixir = new THREE.Mesh(
        trackG(new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.36 * scale, 16)),
        matOrchidAccent,
      )
      innerElixir.position.y = 0.24 * scale
      bottle.add(innerElixir)

      // Brushed silver-pearl collar + dark plum pipette dropper bulb
      const collar = new THREE.Mesh(
        trackG(new THREE.CylinderGeometry(0.105 * scale, 0.105 * scale, 0.1 * scale, 24)),
        matSilverPearl,
      )
      collar.position.y = 0.67 * scale
      bottle.add(collar)

      const bulb = new THREE.Mesh(
        trackG(new THREE.CapsuleGeometry(0.065 * scale, 0.11 * scale, 8, 16)),
        matPlumBox,
      )
      bulb.position.y = 0.81 * scale
      bottle.add(bulb)

      return bottle
    }

    stageGroup.add(createSerumBottle(1.0, 0.82, 0.64))
    stageGroup.add(createSerumBottle(0.84, 1.18, 0.42))

    // ------------------------------------------------------------------
    // 4. Three Staggered Lit Aromatherapy Pillar Candles
    // ------------------------------------------------------------------
    const flames: THREE.Mesh[] = []
    const createCandle = (height: number, radius: number, x: number, z: number) => {
      const candle = new THREE.Group()
      candle.position.set(x, 0.015, z)

      const waxPoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(radius, 0),
        new THREE.Vector2(radius, height),
        new THREE.Vector2(radius * 0.78, height - 0.03),
        new THREE.Vector2(0, height - 0.03),
      ]
      const body = new THREE.Mesh(
        trackG(new THREE.LatheGeometry(waxPoints, 28)),
        matWax,
      )
      candle.add(body)

      const wick = new THREE.Mesh(
        trackG(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8)),
        matPlumBox,
      )
      wick.position.y = height - 0.01
      candle.add(wick)

      const flameGeom = trackG(new THREE.ConeGeometry(0.038, 0.11, 12))
      const flame = new THREE.Mesh(flameGeom, matFlame)
      flame.position.y = height + 0.06
      flames.push(flame)
      candle.add(flame)

      return candle
    }

    stageGroup.add(createCandle(0.76, 0.16, -1.04, 0.25))
    stageGroup.add(createCandle(0.54, 0.14, -1.32, 0.56))
    stageGroup.add(createCandle(0.86, 0.15, 1.12, -0.32))

    // ------------------------------------------------------------------
    // 5. Evergreen Eucalyptus & Pine Sprigs + Festive Berries
    // ------------------------------------------------------------------
    const botanicalGroup = new THREE.Group()
    const leafGeom = trackG(new THREE.SphereGeometry(0.085, 12, 10))
    const berryGeom = trackG(new THREE.SphereGeometry(0.038, 12, 12))
    const sprigSpecs = [
      { x: -0.95, y: 0.06, z: 0.72, ry: 0.6, count: 6 },
      { x: 0.55, y: 0.06, z: 0.92, ry: -0.5, count: 6 },
      { x: 0.92, y: 0.06, z: -0.58, ry: 2.1, count: 5 },
      { x: -0.68, y: 0.06, z: -0.78, ry: 2.7, count: 5 },
    ]
    sprigSpecs.forEach((sp, sIdx) => {
      const sprig = new THREE.Group()
      sprig.position.set(sp.x, sp.y, sp.z)
      sprig.rotation.y = sp.ry
      for (let i = 0; i < sp.count; i++) {
        const leaf = new THREE.Mesh(leafGeom, i % 2 === 0 ? matEucalyptus : matPine)
        leaf.scale.set(1.2, 0.22, 0.78)
        const angle = (i - sp.count / 2) * 0.34
        leaf.position.set(Math.sin(angle) * 0.18, i * 0.025, i * 0.075)
        leaf.rotation.set(-0.22, angle, (i % 2 === 0 ? 1 : -1) * 0.25)
        sprig.add(leaf)
      }
      // Cluster of 3 orchid / plum berries
      for (let b = 0; b < 3; b++) {
        const berry = new THREE.Mesh(
          berryGeom,
          (sIdx + b) % 2 === 0 ? matFlutedBaublePearl : matFlutedBaublePlum,
        )
        berry.position.set((b - 1) * 0.055, 0.08 + (b % 2) * 0.03, 0.16 + b * 0.03)
        sprig.add(berry)
      }
      botanicalGroup.add(sprig)
    })
    stageGroup.add(botanicalGroup)

    // ------------------------------------------------------------------
    // 5b. Sculpted Luxury Botanical Christmas Tree with Pearl Collars & Orchid Beads
    // ------------------------------------------------------------------
    const treeGroup = new THREE.Group()
    treeGroup.position.set(-0.92, 0.015, -0.44)

    const treeBase = new THREE.Mesh(
      trackG(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 24)),
      matSilverPearl,
    )
    treeBase.position.y = 0.09
    treeGroup.add(treeBase)

    const treeTiers = [
      { y: 0.22, h: 0.56, rBottom: 0.62, rTop: 0.14 },
      { y: 0.58, h: 0.52, rBottom: 0.5, rTop: 0.11 },
      { y: 0.92, h: 0.46, rBottom: 0.39, rTop: 0.08 },
      { y: 1.24, h: 0.4, rBottom: 0.28, rTop: 0.05 },
      { y: 1.52, h: 0.34, rBottom: 0.18, rTop: 0.015 },
    ]
    const ornamentBeadGeom = trackG(new THREE.SphereGeometry(0.032, 12, 12))

    treeTiers.forEach((tier, tIdx) => {
      const cone = new THREE.Mesh(
        trackG(new THREE.CylinderGeometry(tier.rTop, tier.rBottom, tier.h, 24)),
        tIdx % 2 === 0 ? matEucalyptus : matPine,
      )
      cone.position.y = tier.y + tier.h / 2
      treeGroup.add(cone)

      const pearlTrim = new THREE.Mesh(
        trackG(new THREE.TorusGeometry(tier.rBottom * 0.99, 0.013, 10, 48)),
        matSilverPearl,
      )
      pearlTrim.rotation.x = Math.PI / 2
      pearlTrim.position.y = tier.y + 0.015
      treeGroup.add(pearlTrim)

      const beadCount = Math.max(4, 8 - tIdx)
      for (let b = 0; b < beadCount; b++) {
        const ang = (b / beadCount) * Math.PI * 2 + tIdx * 0.45
        const bead = new THREE.Mesh(
          ornamentBeadGeom,
          b % 2 === 0 ? matOrchidAccent : matFlutedBaublePearl,
        )
        const rad = tier.rBottom * 0.88
        bead.position.set(
          Math.cos(ang) * rad,
          tier.y + 0.08,
          Math.sin(ang) * rad,
        )
        treeGroup.add(bead)
      }
    })

    // Crown star crystal atop the tree
    const treeStarGeom = trackG(buildCrystalSnowflakeGeometry(0.16, 0.022))
    const treeStar = new THREE.Mesh(treeStarGeom, matSilverPearl)
    treeStar.position.y = 1.98
    treeGroup.add(treeStar)

    stageGroup.add(treeGroup)

    // ------------------------------------------------------------------
    // 6. Floating 3D Fluted Christmas Baubles & Beveled Crystal Snowflakes
    // ------------------------------------------------------------------
    const baubles: AnimatedBauble[] = []
    const baubleSphereGeom = trackG(new THREE.SphereGeometry(0.24, 28, 22))
    const baubleRibGeom = trackG(new THREE.TorusGeometry(0.238, 0.014, 10, 32))
    const crownGeom = trackG(new THREE.CylinderGeometry(0.052, 0.062, 0.07, 16))
    const bailGeom = trackG(new THREE.TorusGeometry(0.038, 0.008, 8, 20))

    const baubleConfigs = [
      { x: -1.18, y: 1.85, z: 0.36, scale: 0.92, plum: true, phase: 0.2 },
      { x: 1.24, y: 1.72, z: 0.48, scale: 1.04, plum: false, phase: 1.7 },
      { x: 0.85, y: 2.52, z: -0.22, scale: 0.82, plum: true, phase: 3.1 },
      { x: -0.78, y: 2.38, z: -0.35, scale: 0.78, plum: false, phase: 4.4 },
      { x: 0.42, y: 0.26, z: 1.12, scale: 0.82, plum: true, phase: 2.5 },
    ]

    baubleConfigs.forEach((cfg, idx) => {
      const g = new THREE.Group()
      g.position.set(cfg.x, cfg.y, cfg.z)
      g.scale.setScalar(cfg.scale)

      const sphere = new THREE.Mesh(
        baubleSphereGeom,
        cfg.plum ? matFlutedBaublePlum : matFlutedBaublePearl,
      )
      g.add(sphere)

      // 3 crisp meridian pearl-silver ribs for jewel-like fluted read
      for (let r = 0; r < 3; r++) {
        const rib = new THREE.Mesh(baubleRibGeom, matSilverPearl)
        rib.rotation.y = (r / 3) * Math.PI
        g.add(rib)
      }

      const crown = new THREE.Mesh(crownGeom, matSilverPearl)
      crown.position.y = 0.25
      g.add(crown)

      const bail = new THREE.Mesh(bailGeom, matSilverPearl)
      bail.position.y = 0.31
      g.add(bail)

      stageGroup.add(g)
      baubles.push({
        group: g,
        baseY: cfg.y,
        bobAmp: 0.07 + (idx % 2) * 0.03,
        bobFreq: 1.1 + idx * 0.16,
        phase: cfg.phase,
        spinSpeed: (idx % 2 === 0 ? 1 : -1) * 0.35,
      })
    })

    // 3D Beveled Crystal Snowflakes (Crystal White & Signature Orchid)
    const crystals: AnimatedCrystal[] = []
    const snowflakeGeom = trackG(buildCrystalSnowflakeGeometry(0.28, 0.032))
    const gemGeom = trackG(new THREE.OctahedronGeometry(0.065, 0))

    const crystalConfigs = [
      { x: -0.62, y: 1.56, z: 0.65, scale: 1.05, orchid: false, phase: 0.5 },
      { x: 1.48, y: 1.18, z: -0.1, scale: 0.9, orchid: true, phase: 1.9 },
      { x: 0.16, y: 2.48, z: 0.12, scale: 1.15, orchid: false, phase: 2.9 },
      { x: -1.42, y: 1.16, z: -0.15, scale: 0.85, orchid: true, phase: 4.1 },
      { x: 0.68, y: 1.96, z: 0.72, scale: 0.72, orchid: false, phase: 5.2 },
    ]

    crystalConfigs.forEach((cfg, idx) => {
      const g = new THREE.Group()
      g.position.set(cfg.x, cfg.y, cfg.z)
      g.scale.setScalar(cfg.scale)

      const starMesh = new THREE.Mesh(snowflakeGeom, cfg.orchid ? matOrchidAccent : matCrystal)
      const centerGem = new THREE.Mesh(gemGeom, cfg.orchid ? matCrystal : matOrchidAccent)
      centerGem.position.z = 0.02
      g.add(starMesh, centerGem)

      stageGroup.add(g)
      crystals.push({
        group: g,
        baseY: cfg.y,
        baseX: cfg.x,
        bobAmp: 0.06 + (idx % 2) * 0.025,
        phase: cfg.phase,
        spinY: (idx % 2 === 0 ? 1 : -1) * 0.45,
        spinZ: 0.18,
      })
    })

    // ------------------------------------------------------------------
    // 7. Instanced 3D Snow Crystals & Lilac Dust Motes
    // ------------------------------------------------------------------
    const moteCount = isSoftwareGl ? 44 : 64
    const moteSpecs = generateSnowMoteSpecs(moteCount)
    const moteGeom = trackG(new THREE.OctahedronGeometry(1, 0))
    const moteMat = trackM(
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.85,
      }),
    )
    const moteInstanced = new THREE.InstancedMesh(moteGeom, moteMat, moteCount)
    moteInstanced.frustumCulled = false

    const colorWhite = new THREE.Color('#FFFFFF')
    const colorLilac = new THREE.Color('#E9D5FF')
    const colorOrchid = new THREE.Color('#9B4DB0')
    moteSpecs.forEach((spec, idx) => {
      moteInstanced.setColorAt(
        idx,
        spec.tone === 'lilac' ? colorLilac : spec.tone === 'orchid' ? colorOrchid : colorWhite,
      )
    })
    if (moteInstanced.instanceColor) {
      moteInstanced.instanceColor.needsUpdate = true
    }
    scene.add(moteInstanced)

    // ------------------------------------------------------------------
    // Interaction (Parallax & Festive Swirl Impulse) + Software-WebGL Loop
    // ------------------------------------------------------------------
    let pointerNormX = 0
    let pointerNormY = 0
    let swirlImpulse = 0
    let swirlAngle = 0
    let camOffsetX = 0
    let camOffsetY = 0
    let disposed = false
    let frameId = 0

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerNormY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }

    const handlePointerDown = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('a, button')) return
      if (!reducedMotion) {
        swirlImpulse = 1.0
      }
      onInteractRef.current?.()
    }

    const parentHost = container.closest('section') ?? container.parentElement ?? window
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    parentHost.addEventListener('pointerdown', handlePointerDown as EventListener, {
      passive: true,
    })

    const handleResize = () => {
      if (!mountRef.current || disposed) return
      const w = mountRef.current.clientWidth || window.innerWidth
      const h = mountRef.current.clientHeight || 560
      currentLayout = computeHero3DLayout(w, h)
      camera.fov = currentLayout.fov
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
      stageGroup.position.set(...currentLayout.stageOffset)
      stageGroup.scale.setScalar(currentLayout.stageScale)
      renderer.setSize(w, h, false)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    const onContextLost = (e: Event) => {
      e.preventDefault()
      setFallbackMode(true)
    }
    domEl.addEventListener('webglcontextlost', onContextLost)

    const clock = new THREE.Clock()

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null
      gl.flush()
      if (!sync) {
        frameId = window.setTimeout(cb, 80)
        return
      }
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync)
          return
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS)
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5)
        } else {
          gl.deleteSync(sync)
          frameId = window.setTimeout(cb, 80)
        }
      }
      frameId = window.setTimeout(poll, 5)
    }

    let firstFrameDrawn = false

    const tick = () => {
      if (disposed) return

      // Pause GPU work when another slide is active or tab is hidden
      if (!activeRef.current || document.hidden) {
        if (isSoftwareGl) {
          frameId = window.setTimeout(tick, 180)
        } else {
          frameId = requestAnimationFrame(tick)
        }
        return
      }

      const delta = Math.min(clock.getDelta(), 0.08)
      const elapsed = clock.elapsedTime

      // Smooth pointer parallax damping
      const targetParallax = computeParallaxTarget(pointerNormX, pointerNormY, reducedMotion)
      camOffsetX = THREE.MathUtils.damp(camOffsetX, targetParallax.offsetX, 4.5, delta)
      camOffsetY = THREE.MathUtils.damp(camOffsetY, targetParallax.offsetY, 4.5, delta)

      camera.position.set(
        currentLayout.cameraPos[0] + camOffsetX,
        currentLayout.cameraPos[1] + camOffsetY,
        currentLayout.cameraPos[2],
      )
      camera.lookAt(
        currentLayout.lookAt[0] + camOffsetX * 0.25,
        currentLayout.lookAt[1] + camOffsetY * 0.2,
        currentLayout.lookAt[2],
      )

      // Decay festive swirl impulse
      swirlImpulse = THREE.MathUtils.damp(swirlImpulse, 0, 2.2, delta)
      const motionMult = reducedMotion ? 0 : 1 + swirlImpulse * 3.0
      swirlAngle += delta * 0.22 * motionMult

      // Animate kinetic halo ring & crown star
      if (!reducedMotion) {
        kineticRingGroup.rotation.z = swirlAngle
        kineticRingGroup.rotation.x = Math.sin(elapsed * 0.55) * 0.16
        kineticRingGroup.rotation.y = Math.cos(elapsed * 0.42) * 0.18
        treeStar.rotation.y = elapsed * 0.65 + swirlImpulse * 2.5
      }

      // Animate candle flames & warm point light
      if (!reducedMotion) {
        candleWarmLight.intensity = 2.35 + Math.sin(elapsed * 7.2) * 0.18
        flames.forEach((flame, idx) => {
          const flicker = 1 + Math.sin(elapsed * 8.5 + idx * 2.1) * 0.08
          flame.scale.set(1, flicker, 1)
        })
      }

      // Animate floating baubles
      baubles.forEach((b) => {
        if (!reducedMotion) {
          b.group.position.y =
            b.baseY + Math.sin(elapsed * b.bobFreq + b.phase) * b.bobAmp
          b.group.rotation.y += delta * b.spinSpeed * motionMult
        }
      })

      // Animate beveled crystal snowflakes
      crystals.forEach((c) => {
        if (!reducedMotion) {
          c.group.position.y = c.baseY + Math.cos(elapsed * 0.9 + c.phase) * c.bobAmp
          c.group.rotation.y += delta * c.spinY * motionMult
          c.group.rotation.z += delta * c.spinZ * motionMult
        }
      })

      // Animate 3D snow crystals & lilac dust motes
      for (let i = 0; i < moteSpecs.length; i++) {
        const m = moteSpecs[i]
        const fallY = reducedMotion
          ? m.y
          : ((m.y - elapsed * m.speedY + 5.6) % 5.6) - 0.8
        const swayX = reducedMotion
          ? m.x
          : m.x + Math.sin(elapsed * m.swayFreq + m.phase) * m.swayAmp
        _dummy.position.set(swayX, fallY, m.z)
        _dummy.rotation.set(
          elapsed * m.rotSpeed * 0.5,
          elapsed * m.rotSpeed,
          m.phase,
        )
        _dummy.scale.setScalar(m.scale)
        _dummy.updateMatrix()
        moteInstanced.setMatrixAt(i, _dummy.matrix)
      }
      moteInstanced.instanceMatrix.needsUpdate = true

      renderer.render(scene, camera)

      if (!firstFrameDrawn) {
        firstFrameDrawn = true
        setIsReady(true)
      }

      if (isSoftwareGl) {
        afterDraw(tick)
      } else {
        frameId = requestAnimationFrame(tick)
      }
    }

    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      clearTimeout(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      parentHost.removeEventListener('pointerdown', handlePointerDown as EventListener)
      domEl.removeEventListener('webglcontextlost', onContextLost)

      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      envTarget.dispose()
      renderer.dispose()
    }
  }, [])

  if (fallbackMode) {
    return (
      <div className="relative w-full h-full bg-[#240933]">
        <Image
          src="/images/hero-christmas-luxury-3d.jpg"
          alt="Christmas at Dermaspace"
          fill
          sizes="100vw"
          className="object-cover object-[78%_54%] md:object-[center_54%]"
          priority
        />
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full bg-[#240933] select-none"
      data-ready={isReady ? 'true' : 'false'}
    >
      <div ref={mountRef} className="w-full h-full" />
    </div>
  )
}

export default ChristmasHero3D
