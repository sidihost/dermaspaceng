'use client'

/**
 * ChristmasHero3D
 * ---------------------------------------------------------------
 * Real-time interactive 3D Christmas Sanctuary built with Three.js
 * for the Dermaspace Hero Slider: "The Celestial Orchid Astrolabe".
 *
 * Design & engineering commitments:
 *   - Brand palette: Midnight Plum (#14041F, #240933, #5A1D6A), Signature Purple
 *     (#7B2D8E), Orchid (#9B4DB0, #C084FC, #D8B4FE, #E9D5FF), Frost Pearl
 *     (#F5ECF8, #FFFFFF), and Botanical Eucalyptus (#26543C).
 *   - Studio PBR lighting via RoomEnvironment PMREM + custom GLSL silk-aurora
 *     cyclorama backdrop + composite multi-part Lathe/Extrude/Tube sculptures.
 *   - Software-WebGL safe (`isSoftwareGl` detection + `afterDraw` pacing +
 *     transmission fallback + fallback image on WebGL context loss).
 *   - Zero THREE.Clock deprecation warnings, zero render-loop allocations,
 *     complete GPU resource disposal on unmount.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
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
  bobAmp: number
  phase: number
  spinY: number
  spinZ: number
}

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
 * using an HTML5 2D canvas (zero external requests).
 */
function createPlumMarbleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#2A0B3D'
  ctx.fillRect(0, 0, size, size)

  ctx.lineCap = 'round'
  for (let i = 0; i < 18; i++) {
    ctx.beginPath()
    let x = (i * 41) % size
    let y = 0
    ctx.moveTo(x, y)
    for (let step = 0; step <= 8; step++) {
      y = (step / 8) * size
      x += Math.sin(step * 1.15 + i * 0.85) * 20
      ctx.lineTo(x, y)
    }
    ctx.strokeStyle =
      i % 4 === 0 ? 'rgba(233, 213, 255, 0.24)' : 'rgba(155, 77, 176, 0.22)'
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
 * Generates a tileable fine satin micro-weave bump texture.
 */
function createSatinMicroTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#969696'
  for (let y = 0; y < size; y += 2) {
    ctx.fillRect(0, y, size, 1)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(8, 8)
  return tex
}

/**
 * Generates a subtle matte dark-plum grounded contact shadow disc beneath the plinth.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  grad.addColorStop(0, 'rgba(8, 2, 14, 0.72)')
  grad.addColorStop(0.55, 'rgba(12, 3, 20, 0.36)')
  grad.addColorStop(1, 'rgba(20, 4, 31, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Builds a beveled 6-point crystalline star-snowflake ExtrudeGeometry.
 */
function buildCrystalSnowflakeGeometry(radius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const arms = 6
  const outer = radius
  const inner = radius * 0.22
  const mid = radius * 0.56
  const notch = radius * 0.14

  for (let i = 0; i < arms; i++) {
    const a0 = (i / arms) * Math.PI * 2
    const aNext = ((i + 1) / arms) * Math.PI * 2
    const aMid = (a0 + aNext) / 2

    const p0x = Math.cos(a0 - 0.09) * inner
    const p0y = Math.sin(a0 - 0.09) * inner
    const tipX = Math.cos(a0) * outer
    const tipY = Math.sin(a0) * outer
    const p1x = Math.cos(a0 + 0.09) * inner
    const p1y = Math.sin(a0 + 0.09) * inner
    const notchX = Math.cos(aMid) * (inner * 0.85)
    const notchY = Math.sin(aMid) * (inner * 0.85)
    const branchLx = Math.cos(a0 - 0.25) * mid
    const branchLy = Math.sin(a0 - 0.25) * mid
    const branchRx = Math.cos(a0 + 0.25) * mid
    const branchRy = Math.sin(a0 + 0.25) * mid
    const waistLx = Math.cos(a0 - 0.07) * (mid - notch)
    const waistLy = Math.sin(a0 - 0.07) * (mid - notch)
    const waistRx = Math.cos(a0 + 0.07) * (mid - notch)
    const waistRy = Math.sin(a0 + 0.07) * (mid - notch)

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
    bevelSize: radius * 0.032,
    bevelSegments: 2,
  })
  geom.center()
  return geom
}

/**
 * Builds an elegant 6-petal sculptural crystal orchid star bloom.
 */
function buildOrchidStarGeometry(radius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const petals = 6
  for (let i = 0; i < petals; i++) {
    const a0 = (i / petals) * Math.PI * 2
    const aMid = ((i + 0.5) / petals) * Math.PI * 2
    const a1 = ((i + 1) / petals) * Math.PI * 2

    const rInner = radius * 0.28
    const rTip = radius

    const sx = Math.cos(a0) * rInner
    const sy = Math.sin(a0) * rInner
    const cx1 = Math.cos(a0 + 0.14) * (radius * 0.68)
    const cy1 = Math.sin(a0 + 0.14) * (radius * 0.68)
    const tx = Math.cos(aMid) * rTip
    const ty = Math.sin(aMid) * rTip
    const cx2 = Math.cos(a1 - 0.14) * (radius * 0.68)
    const cy2 = Math.sin(a1 - 0.14) * (radius * 0.68)
    const ex = Math.cos(a1) * rInner
    const ey = Math.sin(a1) * rInner

    if (i === 0) shape.moveTo(sx, sy)
    shape.quadraticCurveTo(cx1, cy1, tx, ty)
    shape.quadraticCurveTo(cx2, cy2, ex, ey)
  }
  shape.closePath()

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.55,
    bevelSize: radius * 0.045,
    bevelSegments: 3,
  })
  geom.center()
  return geom
}

/**
 * Builds a single curved botanical eucalyptus leaf ExtrudeGeometry.
 */
function buildBotanicalLeafGeometry(length: number, width: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(width, length * 0.42, 0, length)
  shape.quadraticCurveTo(-width, length * 0.42, 0, 0)

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  })
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
    renderer.toneMappingExposure = 0.88
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(initialW, initialH, false)
    renderer.shadowMap.enabled = false

    const domEl = renderer.domElement
    domEl.style.width = '100%'
    domEl.style.height = '100%'
    domEl.style.display = 'block'
    container.appendChild(domEl)

    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const textures: THREE.Texture[] = []
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g)
      return g
    }
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m)
      return m
    }
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      textures.push(t)
      return t
    }

    // Scene & Fog
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#14041F')
    scene.fog = new THREE.FogExp2('#14041F', 0.036)

    // Studio Environment Reflections (required for authentic platinum & crystal highlights)
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const roomEnv = new RoomEnvironment()
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04)
    scene.environment = envTarget.texture
    roomEnv.dispose()
    pmremGenerator.dispose()

    const maxAniso = renderer.capabilities.getMaxAnisotropy()
    const marbleTex = trackTex(createPlumMarbleTexture(maxAniso))
    const satinBumpTex = trackTex(createSatinMicroTexture())
    const contactShadowTex = trackTex(createContactShadowTexture())

    // Camera
    let currentLayout: Hero3DLayout = computeHero3DLayout(initialW, initialH)
    const camera = new THREE.PerspectiveCamera(
      currentLayout.fov,
      initialW / initialH,
      0.1,
      60,
    )
    camera.position.set(...currentLayout.cameraPos)
    camera.lookAt(...currentLayout.lookAt)

    // Lighting Rig — Calm, Low-Key Editorial Studio Lighting (zero harsh glare)
    const hemiLight = new THREE.HemisphereLight('#C084FC', '#14041F', 0.58)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight('#F3EAF8', 1.35)
    keyLight.position.set(5.5, 6.2, 6.0)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight('#9B4DB0', 0.75)
    rimLight.position.set(-5.8, 3.8, -4.5)
    scene.add(rimLight)

    const accentFillLight = new THREE.DirectionalLight('#B784DB', 0.42)
    accentFillLight.position.set(1.5, -2.5, 5.2)
    scene.add(accentFillLight)

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init()
      const softboxRight = new THREE.RectAreaLight('#E9D5FF', 1.05, 3.2, 5.0)
      softboxRight.position.set(5.6, 1.8, 3.2)
      softboxRight.lookAt(currentLayout.stageOffset[0], 0.2, 0)
      scene.add(softboxRight)
    }

    // =========================================================================
    // 1. CURVED SILK & FROSTED AURORA CYCLORAMA BACKDROP (World-Space GLSL)
    // =========================================================================
    const cycloramaGeom = trackGeo(
      new THREE.CylinderGeometry(16, 16, 14, 64, 16, true, Math.PI * 0.58, Math.PI * 0.84),
    )
    const cycloramaMat = trackMat(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uFocusX: { value: currentLayout.stageOffset[0] * 1.45 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          uniform float uTime;
          uniform float uPulse;
          uniform vec2 uPointer;
          uniform float uFocusX;

          void main() {
            // Deep velvet plum cyclorama — subtle satin drapery folds, zero bright halo or bloom
            vec3 midnightPlum = vec3(0.068, 0.014, 0.106); // #11041B
            vec3 deepPlum     = vec3(0.125, 0.028, 0.188); // #200730
            vec3 plumSatin    = vec3(0.220, 0.055, 0.310); // #380E4F

            float t = uTime * 0.22;
            float wx = vWorldPos.x + uPointer.x * 0.35;
            float wy = vWorldPos.y + uPointer.y * 0.25;

            // Gentle matte-satin drapery folds in world space
            float foldA = sin(wx * 1.15 + wy * 0.25 - t * 1.15) * 0.5 + 0.5;
            float foldB = sin(wx * 1.95 - wy * 0.42 + t * 0.8) * 0.5 + 0.5;
            float silk = pow(foldA * 0.62 + foldB * 0.38, 2.0);

            float rightZone = smoothstep(-0.6, 3.6, wx);
            vec2 focusDelta = vec2((wx - uFocusX) / 4.8, (wy - 0.1) / 3.2);
            float gentleDepth = exp(-dot(focusDelta, focusDelta) * 0.65);

            vec3 col = mix(midnightPlum, deepPlum, rightZone * 0.48 + gentleDepth * 0.32);
            col = mix(col, plumSatin, rightZone * (silk * 0.32 + gentleDepth * 0.20 + uPulse * 0.08));

            // Gentle top & bottom studio vignette
            float edgeFade = smoothstep(-5.2, -1.8, wy) * smoothstep(5.8, 2.2, wy);
            col = mix(midnightPlum, col, edgeFade);

            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    )
    const cycloramaMesh = new THREE.Mesh(cycloramaGeom, cycloramaMat)
    cycloramaMesh.position.set(0, 0.2, 4.5)
    scene.add(cycloramaMesh)

    // =========================================================================
    // 2. HERO SCULPTURE STAGE ("The Celestial Orchid Astrolabe")
    // =========================================================================
    const stageGroup = new THREE.Group()
    stageGroup.position.set(...currentLayout.stageOffset)
    stageGroup.scale.setScalar(currentLayout.stageScale)
    scene.add(stageGroup)

    // Shared Studio PBR Materials (calm satin/metallic finishes, zero bright bloom)
    const brushedPlatinumMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#DDD0E8',
        metalness: 0.9,
        roughness: 0.2,
        anisotropy: 0.75,
        clearcoat: 0.45,
        clearcoatRoughness: 0.18,
        envMapIntensity: 0.95,
      }),
    )

    const anodizedOrchidMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#7B2D8E',
        metalness: 0.84,
        roughness: 0.26,
        anisotropy: 0.7,
        clearcoat: 0.4,
        envMapIntensity: 0.95,
      }),
    )

    const mirrorFrostMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#E5DAEE',
        metalness: 0.92,
        roughness: 0.14,
        clearcoat: 0.7,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.08,
      }),
    )

    const plumMarbleMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#EAE0F2',
        map: marbleTex,
        metalness: 0.08,
        roughness: 0.32,
        clearcoat: 0.5,
        clearcoatRoughness: 0.22,
        envMapIntensity: 0.82,
      }),
    )

    const velvetRibbonMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#6A217C',
        roughness: 0.62,
        metalness: 0.06,
        sheen: 0.85,
        sheenRoughness: 0.38,
        sheenColor: new THREE.Color('#D8B4FE'),
        bumpMap: satinBumpTex,
        bumpScale: 0.008,
        emissive: '#1D0628',
        emissiveIntensity: 0.04,
      }),
    )

    const pearlRibbonMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#E2D6EC',
        metalness: 0.78,
        roughness: 0.22,
        clearcoat: 0.6,
        clearcoatRoughness: 0.16,
        bumpMap: satinBumpTex,
        bumpScale: 0.005,
        envMapIntensity: 0.98,
      }),
    )

    const amethystLacquerMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#3A0D52',
        metalness: 0.32,
        roughness: 0.16,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1,
        iridescence: 0.45,
        envMapIntensity: 1.05,
      }),
    )

    const opticalCrystalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#7B2D8E',
        emissive: '#14041F',
        emissiveIntensity: 0.04,
        metalness: 0.06,
        roughness: 0.1,
        transmission: isSoftwareGl ? 0 : 0.82,
        transparent: true,
        opacity: isSoftwareGl ? 0.66 : 1,
        ior: 1.85,
        thickness: 0.95,
        attenuationColor: new THREE.Color('#9B4DB0'),
        attenuationDistance: 1.2,
        iridescence: 0.55,
        iridescenceIOR: 1.35,
        clearcoat: 0.75,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.08,
      }),
    )

    const amethystJewelMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#9B4DB0',
        emissive: '#240933',
        emissiveIntensity: 0.08,
        metalness: 0.18,
        roughness: 0.16,
        clearcoat: 0.8,
        iridescence: 0.5,
        envMapIntensity: 1.05,
      }),
    )

    const eucalyptusMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#26543C',
        roughness: 0.56,
        metalness: 0.06,
        emissive: '#0B1D13',
        emissiveIntensity: 0.03,
      }),
    )

    const eucalyptusFrostMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#3E6F56',
        roughness: 0.46,
        metalness: 0.1,
      }),
    )

    // -------------------------------------------------------------------------
    // 2A. Fluted Architectural Marble & Platinum Plinth (y: -1.24 to -0.82)
    // -------------------------------------------------------------------------
    const plinthGroup = new THREE.Group()
    plinthGroup.position.set(0, -1.16, 0)
    stageGroup.add(plinthGroup)

    // Subtle matte contact shadow beneath the marble plinth (zero neon floor glow)
    const floorHaloGeom = trackGeo(new THREE.CircleGeometry(1.36, 48))
    floorHaloGeom.rotateX(-Math.PI / 2)
    const floorHaloMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    )
    const floorHaloMesh = new THREE.Mesh(floorHaloGeom, floorHaloMat)
    floorHaloMesh.position.y = -0.02
    plinthGroup.add(floorHaloMesh)

    // Lathe architectural stepped pedestal profile
    const plinthProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.92, 0.0),
      new THREE.Vector2(0.92, 0.06),
      new THREE.Vector2(0.84, 0.11),
      new THREE.Vector2(0.76, 0.14),
      new THREE.Vector2(0.72, 0.22),
      new THREE.Vector2(0.79, 0.27),
      new THREE.Vector2(0.76, 0.31),
      new THREE.Vector2(0.0, 0.31),
    ]
    const plinthGeom = trackGeo(new THREE.LatheGeometry(plinthProfile, 64))
    plinthGeom.computeTangents()
    const plinthMesh = new THREE.Mesh(plinthGeom, plumMarbleMat)
    plinthGroup.add(plinthMesh)

    // Two brushed-platinum inlay trim collars on plinth
    const baseCollarGeom = trackGeo(new THREE.TorusGeometry(0.88, 0.022, 16, 72))
    baseCollarGeom.rotateX(Math.PI / 2)
    const baseCollar = new THREE.Mesh(baseCollarGeom, brushedPlatinumMat)
    baseCollar.position.y = 0.085
    plinthGroup.add(baseCollar)

    const upperCollarGeom = trackGeo(new THREE.TorusGeometry(0.77, 0.02, 16, 72))
    upperCollarGeom.rotateX(Math.PI / 2)
    const upperCollar = new THREE.Mesh(upperCollarGeom, mirrorFrostMat)
    upperCollar.position.y = 0.295
    plinthGroup.add(upperCollar)

    // Plinth cradle prong base supporting the floating astrolabe visually
    const cradleDishGeom = trackGeo(new THREE.TorusGeometry(0.46, 0.016, 14, 64))
    cradleDishGeom.rotateX(Math.PI / 2)
    const cradleDish = new THREE.Mesh(cradleDishGeom, anodizedOrchidMat)
    cradleDish.position.y = 0.34
    plinthGroup.add(cradleDish)

    // Frosted botanical eucalyptus spray tucked gracefully along the plinth rim
    const leafGeom = trackGeo(buildBotanicalLeafGeometry(0.28, 0.085))
    const leafCount = 10
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2 + 0.2
      const leaf = new THREE.Mesh(
        leafGeom,
        i % 2 === 0 ? eucalyptusMat : eucalyptusFrostMat,
      )
      leaf.position.set(
        Math.cos(angle) * 0.72,
        0.27 + (i % 2) * 0.02,
        Math.sin(angle) * 0.72,
      )
      leaf.rotation.order = 'YXZ'
      leaf.rotation.y = -angle + Math.PI / 2
      leaf.rotation.x = 1.08 + (i % 3) * 0.1
      leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.18
      plinthGroup.add(leaf)
    }

    // -------------------------------------------------------------------------
    // 2B. Counter-Rotating Celestial Astrolabe Rings (centered at y = 0.16)
    // -------------------------------------------------------------------------
    const astrolabeCenterY = 0.16
    const astrolabeGroup = new THREE.Group()
    astrolabeGroup.position.set(0, astrolabeCenterY, 0)
    stageGroup.add(astrolabeGroup)

    // Outer Meridian Ring (r = 1.04) — Glossy Dark Amethyst Lacquer flanked by twin Platinum Rails
    const outerRingGroup = new THREE.Group()
    outerRingGroup.rotation.set(0.32, -0.25, 0.18)
    astrolabeGroup.add(outerRingGroup)

    const outerTorusGeom = trackGeo(new THREE.TorusGeometry(1.04, 0.032, 20, 96))
    const outerTorus = new THREE.Mesh(outerTorusGeom, amethystLacquerMat)
    outerRingGroup.add(outerTorus)

    const outerRailGeom = trackGeo(new THREE.TorusGeometry(1.076, 0.008, 12, 96))
    const outerRail = new THREE.Mesh(outerRailGeom, mirrorFrostMat)
    outerRingGroup.add(outerRail)

    const outerInnerRailGeom = trackGeo(new THREE.TorusGeometry(1.004, 0.008, 12, 96))
    const outerInnerRail = new THREE.Mesh(outerInnerRailGeom, brushedPlatinumMat)
    outerRingGroup.add(outerInnerRail)

    const lugGeom = trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.088, 12))
    const jewelGeom = trackGeo(new THREE.OctahedronGeometry(0.05, 0))
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const r = 1.04
      if (i % 3 === 0) {
        const gem = new THREE.Mesh(jewelGeom, amethystJewelMat)
        gem.position.set(Math.cos(a) * r, Math.sin(a) * r, 0)
        gem.rotation.z = a + Math.PI / 4
        outerRingGroup.add(gem)
      } else {
        const lug = new THREE.Mesh(lugGeom, mirrorFrostMat)
        lug.position.set(Math.cos(a) * r, Math.sin(a) * r, 0)
        lug.rotation.z = a + Math.PI / 2
        outerRingGroup.add(lug)
      }
    }

    // Middle Equatorial Ring (r = 0.82) — brushed anodized orchid with inner rim collar
    const midRingGroup = new THREE.Group()
    midRingGroup.rotation.set(-0.55, 0.42, 0.25)
    astrolabeGroup.add(midRingGroup)

    const midTorusGeom = trackGeo(new THREE.TorusGeometry(0.82, 0.024, 18, 88))
    const midTorus = new THREE.Mesh(midTorusGeom, anodizedOrchidMat)
    midRingGroup.add(midTorus)

    const midInnerRimGeom = trackGeo(new THREE.TorusGeometry(0.77, 0.008, 12, 84))
    const midInnerRim = new THREE.Mesh(midInnerRimGeom, mirrorFrostMat)
    midRingGroup.add(midInnerRim)

    // Inner Solstice Ring (r = 0.62) — mirror platinum + 6 frost pearls
    const innerRingGroup = new THREE.Group()
    innerRingGroup.rotation.set(0.68, 0.35, -0.45)
    astrolabeGroup.add(innerRingGroup)

    const innerTorusGeom = trackGeo(new THREE.TorusGeometry(0.62, 0.018, 18, 80))
    const innerTorus = new THREE.Mesh(innerTorusGeom, mirrorFrostMat)
    innerRingGroup.add(innerTorus)

    const pearlBeadGeom = trackGeo(new THREE.OctahedronGeometry(0.028, 1))
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const bead = new THREE.Mesh(pearlBeadGeom, brushedPlatinumMat)
      bead.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0)
      innerRingGroup.add(bead)
    }

    // Floating Crown Halo unifying the upper spire
    const crownRingGeom = trackGeo(new THREE.TorusGeometry(0.34, 0.012, 14, 64))
    crownRingGeom.rotateX(Math.PI / 2)
    const crownHaloMesh = new THREE.Mesh(crownRingGeom, mirrorFrostMat)
    crownHaloMesh.position.set(0, 1.12, 0)
    astrolabeGroup.add(crownHaloMesh)

    // -------------------------------------------------------------------------
    // 2C. Sweeping Double-Helix Velvet & Pearl Ribbons
    // -------------------------------------------------------------------------
    const ribbonGroup = new THREE.Group()
    astrolabeGroup.add(ribbonGroup)

    const buildHelixPoints = (phaseOffset: number, radiusBase: number) => {
      const pts: THREE.Vector3[] = []
      const count = 48
      for (let i = 0; i <= count; i++) {
        const u = i / count
        const theta = u * Math.PI * 2.55 + phaseOffset
        const env = Math.sin(u * Math.PI)
        const r = radiusBase * (0.44 + 0.6 * env)
        const y = -0.92 + u * 2.02
        pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r))
      }
      return pts
    }

    const velvetPts = buildHelixPoints(0, 1.16)
    const velvetCurve = new THREE.CatmullRomCurve3(velvetPts)
    const velvetRibbonGeom = trackGeo(new THREE.TubeGeometry(velvetCurve, 84, 0.028, 12, false))
    const velvetRibbon = new THREE.Mesh(velvetRibbonGeom, velvetRibbonMat)
    ribbonGroup.add(velvetRibbon)

    const pearlPts = buildHelixPoints(Math.PI, 1.12)
    const pearlCurve = new THREE.CatmullRomCurve3(pearlPts)
    const pearlRibbonGeom = trackGeo(new THREE.TubeGeometry(pearlCurve, 84, 0.017, 12, false))
    const pearlRibbon = new THREE.Mesh(pearlRibbonGeom, pearlRibbonMat)
    ribbonGroup.add(pearlRibbon)

    // Sculpted finial caps on the top & bottom of both ribbons
    const finialProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.038, 0.025),
      new THREE.Vector2(0.022, 0.06),
      new THREE.Vector2(0, 0.105),
    ]
    const finialGeom = trackGeo(new THREE.LatheGeometry(finialProfile, 16))
    ;[velvetPts[0], velvetPts[velvetPts.length - 1], pearlPts[0], pearlPts[pearlPts.length - 1]].forEach(
      (pt, idx) => {
        const finial = new THREE.Mesh(finialGeom, mirrorFrostMat)
        finial.position.copy(pt)
        if (idx % 2 === 0) finial.rotation.x = Math.PI
        ribbonGroup.add(finial)
      },
    )

    // -------------------------------------------------------------------------
    // 2D. Suspended Optical Crystal Star-Orchid Core + Inner Luminous Heart
    // -------------------------------------------------------------------------
    const coreGroup = new THREE.Group()
    astrolabeGroup.add(coreGroup)

    const orchidStarGeom = trackGeo(buildOrchidStarGeometry(0.43, 0.06))
    const orchidStarA = new THREE.Mesh(orchidStarGeom, opticalCrystalMat)
    coreGroup.add(orchidStarA)

    const orchidStarB = new THREE.Mesh(orchidStarGeom, opticalCrystalMat)
    orchidStarB.rotation.y = Math.PI / 2
    coreGroup.add(orchidStarB)

    // Delicate platinum filigree halo framing the crystal star core
    const starFiligreeGeom = trackGeo(new THREE.TorusGeometry(0.32, 0.008, 12, 64))
    const starFiligree = new THREE.Mesh(starFiligreeGeom, mirrorFrostMat)
    starFiligree.rotation.x = Math.PI / 3
    coreGroup.add(starFiligree)

    const innerGemGeom = trackGeo(new THREE.OctahedronGeometry(0.16, 0))
    const innerGemMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#9B4DB0',
        emissive: '#240933',
        emissiveIntensity: 0.12,
        metalness: 0.16,
        roughness: 0.12,
        clearcoat: 0.85,
        iridescence: 0.55,
        envMapIntensity: 1.05,
      }),
    )
    const innerGem = new THREE.Mesh(innerGemGeom, innerGemMat)
    coreGroup.add(innerGem)

    // Subtle sculptural fill light (no bright bulb glare)
    const coreLight = new THREE.PointLight('#C084FC', 0.45, 5.0, 1.8)
    coreLight.position.set(0, astrolabeCenterY, 0.25)
    stageGroup.add(coreLight)

    const plinthUpLight = new THREE.PointLight('#7B2D8E', 0.28, 4.0, 1.8)
    plinthUpLight.position.set(0, -0.78, 0.35)
    stageGroup.add(plinthUpLight)

    // -------------------------------------------------------------------------
    // 2E. Orbiting Fluted Glass Jewel Baubles (Lathe silhouettes) & Snowflakes
    // -------------------------------------------------------------------------
    const flutedProfile = [
      new THREE.Vector2(0.0, -0.14),
      new THREE.Vector2(0.045, -0.1),
      new THREE.Vector2(0.115, -0.02),
      new THREE.Vector2(0.105, 0.06),
      new THREE.Vector2(0.052, 0.12),
      new THREE.Vector2(0.026, 0.145),
      new THREE.Vector2(0.0, 0.145),
    ]
    const flutedOrnamentGeom = trackGeo(new THREE.LatheGeometry(flutedProfile, 28))
    flutedOrnamentGeom.computeTangents()
    const crownCapGeom = trackGeo(new THREE.CylinderGeometry(0.032, 0.038, 0.036, 16))
    const crownLoopGeom = trackGeo(new THREE.TorusGeometry(0.02, 0.004, 10, 20))

    const baublePlumMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#6E2485',
        metalness: 0.22,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        iridescence: 0.65,
        envMapIntensity: 1.7,
      }),
    )

    const baublePearlMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#F5ECF8',
        metalness: 0.88,
        roughness: 0.14,
        clearcoat: 0.9,
        envMapIntensity: 1.65,
      }),
    )

    const baubleEmeraldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#2D6649',
        metalness: 0.28,
        roughness: 0.14,
        clearcoat: 1.0,
        envMapIntensity: 1.5,
      }),
    )

    const baubleConfigs: Array<{
      pos: [number, number, number]
      scale: number
      mat: THREE.Material
      bobAmp: number
      bobFreq: number
      phase: number
      spinSpeed: number
    }> = [
      { pos: [-1.18, 0.68, 0.35], scale: 0.85, mat: baublePlumMat, bobAmp: 0.06, bobFreq: 1.1, phase: 0.4, spinSpeed: 0.32 },
      { pos: [1.18, 0.56, -0.25], scale: 0.9, mat: baublePearlMat, bobAmp: 0.07, bobFreq: 0.95, phase: 1.9, spinSpeed: -0.28 },
      { pos: [-1.06, -0.45, 0.48], scale: 0.72, mat: baubleEmeraldMat, bobAmp: 0.05, bobFreq: 1.25, phase: 3.1, spinSpeed: 0.36 },
      { pos: [1.1, -0.52, 0.42], scale: 0.78, mat: baublePlumMat, bobAmp: 0.055, bobFreq: 1.05, phase: 4.5, spinSpeed: -0.34 },
      { pos: [0.06, 1.26, -0.2], scale: 0.68, mat: baublePearlMat, bobAmp: 0.045, bobFreq: 1.18, phase: 5.4, spinSpeed: 0.26 },
    ]

    const baubles: AnimatedBauble[] = baubleConfigs.map((cfg) => {
      const g = new THREE.Group()
      g.position.set(...cfg.pos)
      g.scale.setScalar(cfg.scale)

      const body = new THREE.Mesh(flutedOrnamentGeom, cfg.mat)
      const cap = new THREE.Mesh(crownCapGeom, brushedPlatinumMat)
      cap.position.y = 0.156
      const loop = new THREE.Mesh(crownLoopGeom, mirrorFrostMat)
      loop.position.y = 0.184
      g.add(body, cap, loop)
      stageGroup.add(g)

      return {
        group: g,
        baseY: cfg.pos[1],
        bobAmp: cfg.bobAmp,
        bobFreq: cfg.bobFreq,
        phase: cfg.phase,
        spinSpeed: cfg.spinSpeed,
      }
    })

    // Multi-part beveled 3D crystal snowflakes orbiting cleanly
    const flakeLargeGeom = trackGeo(buildCrystalSnowflakeGeometry(0.18, 0.02))
    const flakeSmallGeom = trackGeo(buildCrystalSnowflakeGeometry(0.12, 0.016))
    const crystalPlacements: Array<{
      pos: [number, number, number]
      large: boolean
      phase: number
      spinY: number
      spinZ: number
    }> = [
      { pos: [-1.42, 0.95, -0.45], large: true, phase: 0.2, spinY: 0.42, spinZ: 0.15 },
      { pos: [1.38, 1.02, 0.18], large: false, phase: 1.4, spinY: -0.48, spinZ: -0.18 },
      { pos: [-1.45, -0.05, -0.3], large: false, phase: 2.7, spinY: 0.36, spinZ: 0.2 },
      { pos: [1.46, 0.05, -0.42], large: true, phase: 3.9, spinY: -0.38, spinZ: -0.14 },
      { pos: [0.68, 1.32, 0.32], large: false, phase: 4.8, spinY: 0.52, spinZ: 0.22 },
      { pos: [-0.66, 1.24, 0.28], large: false, phase: 5.7, spinY: -0.44, spinZ: 0.16 },
    ]

    const crystals: AnimatedCrystal[] = crystalPlacements.map((cfg) => {
      const g = new THREE.Group()
      g.position.set(...cfg.pos)
      const mesh = new THREE.Mesh(
        cfg.large ? flakeLargeGeom : flakeSmallGeom,
        opticalCrystalMat,
      )
      g.add(mesh)
      stageGroup.add(g)

      return {
        group: g,
        baseY: cfg.pos[1],
        bobAmp: 0.055,
        phase: cfg.phase,
        spinY: cfg.spinY,
        spinZ: cfg.spinZ,
      }
    })

    // =========================================================================
    // 3. SUBTLE MATTE-FROST SNOWFLAKES (Crisp Normal-Blended Points, Zero Glow)
    // =========================================================================
    const moteSpecs = generateSnowMoteSpecs(100)
    const moteCount = moteSpecs.length
    const motePos = new Float32Array(moteCount * 3)
    const moteCol = new Float32Array(moteCount * 3)
    const moteSeed = new Float32Array(moteCount * 4) // size, speedY, swayAmp, phase

    const colorWhite = new THREE.Color('#E9D5FF')
    const colorLilac = new THREE.Color('#D8B4FE')
    const colorOrchid = new THREE.Color('#9B4DB0')

    for (let i = 0; i < moteCount; i++) {
      const spec = moteSpecs[i]
      // Bias gentle snowfall toward the sanctuary showcase while keeping left copy crisp
      motePos[i * 3] = spec.x + 1.4
      motePos[i * 3 + 1] = spec.y
      motePos[i * 3 + 2] = spec.z
      const c =
        spec.tone === 'white'
          ? colorWhite
          : spec.tone === 'lilac'
            ? colorLilac
            : colorOrchid
      moteCol[i * 3] = c.r
      moteCol[i * 3 + 1] = c.g
      moteCol[i * 3 + 2] = c.b
      moteSeed[i * 4] = 8.0 + spec.scale * 190.0
      moteSeed[i * 4 + 1] = spec.speedY
      moteSeed[i * 4 + 2] = spec.swayAmp
      moteSeed[i * 4 + 3] = spec.phase
    }

    const moteGeom = trackGeo(new THREE.BufferGeometry())
    moteGeom.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
    moteGeom.setAttribute('color', new THREE.BufferAttribute(moteCol, 3))
    moteGeom.setAttribute('aSeed', new THREE.BufferAttribute(moteSeed, 4))

    const moteMat = trackMat(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uPixelRatio: { value: isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 2) },
          uPointScale: { value: currentLayout.isCompact ? 0.52 : 0.85 },
        },
        vertexShader: /* glsl */ `
          attribute vec3 color;
          attribute vec4 aSeed;
          uniform float uTime;
          uniform float uPulse;
          uniform float uPixelRatio;
          uniform float uPointScale;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vColor = color;
            float baseSize = aSeed.x;
            float speedY   = aSeed.y;
            float swayAmp  = aSeed.z;
            float phase    = aSeed.w;

            vec3 p = position;
            p.y = mod(p.y - uTime * speedY + 4.8, 4.8) - 1.7;
            p.x += sin(uTime * 0.75 + phase) * swayAmp * 1.4;

            // Keep particles subtle across the canvas and minimal over left copy
            float leftDim = mix(0.12, 0.42, smoothstep(-1.2, 1.8, p.x));
            float shimmer = 0.78 + 0.22 * sin(uTime * 1.6 + phase * 2.0);
            vAlpha = leftDim * shimmer * (1.0 + uPulse * 0.15);

            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = baseSize * uPixelRatio * uPointScale * (4.2 / max(1.0, -mvPosition.z));
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float d = length(c);
            if (d > 0.5) discard;
            float flake = smoothstep(0.5, 0.18, d);
            gl_FragColor = vec4(vColor, flake * vAlpha);
          }
        `,
      }),
    )

    const motePoints = new THREE.Points(moteGeom, moteMat)
    motePoints.frustumCulled = false
    scene.add(motePoints)

    if (!isSoftwareGl) {
      renderer.compile(scene, camera)
    }

    // =========================================================================
    // 4. INTERACTION, RESIZE & ANIMATION LOOP (performance.now, afterDraw)
    // =========================================================================
    let pointerNormX = 0
    let pointerNormY = 0
    let camOffsetX = 0
    let camOffsetY = 0
    let swirlImpulse = 0
    let swirlAngle = 0

    const handlePointerMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      pointerNormX = (e.clientX / w) * 2 - 1
      pointerNormY = -((e.clientY / h) * 2 - 1)
    }

    const handlePointerDown = () => {
      swirlImpulse = 1.0
      onInteractRef.current?.()
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    const parentHost = container.parentElement || container
    parentHost.addEventListener('pointerdown', handlePointerDown as EventListener, {
      passive: true,
    })

    const onContextLost = (ev: Event) => {
      ev.preventDefault()
      setFallbackMode(true)
    }
    domEl.addEventListener('webglcontextlost', onContextLost)

    const applyResize = () => {
      if (!container) return
      const w = Math.max(container.clientWidth, 1)
      const h = Math.max(container.clientHeight, 1)
      currentLayout = computeHero3DLayout(w, h)
      camera.fov = currentLayout.fov
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      stageGroup.position.set(...currentLayout.stageOffset)
      stageGroup.scale.setScalar(currentLayout.stageScale)
      cycloramaMat.uniforms.uFocusX.value =
        currentLayout.stageOffset[0] * (currentLayout.isCompact ? 1.25 : 1.45)
      moteMat.uniforms.uPointScale.value = currentLayout.isCompact ? 0.52 : 0.88
      renderer.setSize(w, h, false)
      if (activeRef.current) {
        renderer.render(scene, camera)
      }
    }

    const resizeObserver = new ResizeObserver(applyResize)
    resizeObserver.observe(container)

    let disposed = false
    let frameId = 0
    let lastNow = performance.now()
    let elapsed = 0
    let firstFrameDrawn = false

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
      gl.flush()
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync)
          return
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS)
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5)
        } else {
          if (sync) gl.deleteSync(sync)
          frameId = window.setTimeout(cb, 80)
        }
      }
      frameId = window.setTimeout(poll, 5)
    }

    const tick = () => {
      if (disposed) return

      const now = performance.now()
      const delta = Math.min((now - lastNow) / 1000, 0.08)
      lastNow = now

      // Pause GPU work when another slide is active or tab is hidden
      if (!activeRef.current || document.hidden) {
        if (isSoftwareGl) {
          frameId = window.setTimeout(tick, 180)
        } else {
          frameId = requestAnimationFrame(tick)
        }
        return
      }

      elapsed += delta

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
        currentLayout.lookAt[0] + camOffsetX * 0.22,
        currentLayout.lookAt[1] + camOffsetY * 0.18,
        currentLayout.lookAt[2],
      )

      // Decay interactive shimmer impulse
      swirlImpulse = THREE.MathUtils.damp(swirlImpulse, 0, 2.2, delta)
      const motionMult = reducedMotion ? 0 : 1 + swirlImpulse * 2.8
      swirlAngle += delta * 0.26 * motionMult

      // Update GLSL silk aurora backdrop
      cycloramaMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed
      cycloramaMat.uniforms.uPulse.value = swirlImpulse
      cycloramaMat.uniforms.uPointer.value.set(camOffsetX, camOffsetY)

      // Animate counter-rotating astrolabe rings, double-helix ribbons & crystal core
      if (!reducedMotion) {
        outerRingGroup.rotation.y = -0.25 + swirlAngle * 0.72
        outerRingGroup.rotation.x = 0.32 + Math.sin(elapsed * 0.45) * 0.12

        midRingGroup.rotation.y = 0.42 - swirlAngle * 1.05
        midRingGroup.rotation.z = 0.25 + Math.cos(elapsed * 0.52) * 0.14

        innerRingGroup.rotation.x = 0.68 + swirlAngle * 1.35
        innerRingGroup.rotation.y = 0.35 + Math.sin(elapsed * 0.6) * 0.18

        ribbonGroup.rotation.y = swirlAngle * 0.55

        coreGroup.rotation.y = elapsed * 0.55 + swirlImpulse * 2.2
        coreGroup.rotation.z = Math.sin(elapsed * 0.7) * 0.14
        coreGroup.position.y = Math.sin(elapsed * 1.15) * 0.045

        innerGem.rotation.y = -elapsed * 1.1
        innerGemMat.emissiveIntensity = 0.12 + swirlImpulse * 0.08
        coreLight.intensity = 0.45 + swirlImpulse * 0.15
      }

      // Animate fluted ornaments
      for (let i = 0; i < baubles.length; i++) {
        const b = baubles[i]
        if (!reducedMotion) {
          b.group.position.y =
            b.baseY + Math.sin(elapsed * b.bobFreq + b.phase) * b.bobAmp
          b.group.rotation.y += delta * b.spinSpeed * motionMult
        }
      }

      // Animate beveled crystal snowflakes
      for (let i = 0; i < crystals.length; i++) {
        const c = crystals[i]
        if (!reducedMotion) {
          c.group.position.y = c.baseY + Math.cos(elapsed * 0.9 + c.phase) * c.bobAmp
          c.group.rotation.y += delta * c.spinY * motionMult
          c.group.rotation.z += delta * c.spinZ * motionMult
        }
      }

      // Animate soft glowing frost-bokeh particles in GPU shader
      moteMat.uniforms.uTime.value = reducedMotion ? 0 : elapsed
      moteMat.uniforms.uPulse.value = swirlImpulse

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
      if (domEl.parentNode === container) {
        container.removeChild(domEl)
      }
    }
  }, [])

  if (fallbackMode) {
    return (
      <div className="relative w-full h-full bg-[#14041F]">
        <Image
          src="/images/hero-christmas-luxury-3d.jpg"
          alt="Christmas at Dermaspace"
          fill
          sizes="100vw"
          referrerPolicy="no-referrer"
          className="object-cover object-[76%_50%] md:object-[center_48%]"
          priority
        />
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full bg-[#14041F] select-none"
      data-ready={isReady ? 'true' : 'false'}
      data-testid="christmas-hero-3d"
    >
      <div ref={mountRef} className="w-full h-full" />
    </div>
  )
}

export default ChristmasHero3D
