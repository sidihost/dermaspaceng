'use client'

/**
 * Christmas / Festive Snowfall & Bells Animation
 * ---------------------------------------------------------------
 * Luxury winter holiday animation designed specifically for Dermaspace.
 *
 * Design constraints strictly enforced:
 *   - Brand color palette: Pure White (#FFFFFF), Signature Purple (#7B2D8E),
 *     Deep Plum (#5A1D6A), and warm Holiday Champagne Gold (#D4AF37).
 *   - Flat design: ZERO gradients (no linear-gradient, no radial-gradient).
 *   - ZERO drop-shadows or box-shadows.
 *   - ZERO Zap or Sparkles icons.
 *   - Pure canvas animation only — zero added UI, badges, or overlays.
 *   - 100% Cross-Browser: Standard Canvas 2D paths only (ZERO ctx.ellipse calls
 *     to prevent crashes on iOS Safari, Android WebViews, and older browsers).
 *   - Retina / High-DPI crisp: Scales with window.devicePixelRatio.
 *   - Non-blocking: `pointer-events-none` full-screen canvas so every button,
 *     input, and link remains 100% clickable.
 *   - Controlled from Admin Dashboard via `/api/festive`.
 */

import { useEffect, useRef } from 'react'
import useSWR from 'swr'

interface SnowflakeParticle {
  x: number
  y: number
  radius: number
  speedY: number
  speedX: number
  swaySpeed: number
  swayOffset: number
  rotation: number
  rotationSpeed: number
  opacity: number
  color: string
  type: 'bell' | 'crystal' | 'star' | 'circle'
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ChristmasAnimation() {
  const { data } = useSWR<{ enabled: boolean; intensity?: string }>('/api/festive', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30_000,
  })

  // Respect admin switch. If data isn't loaded yet, default to true.
  const isEnabled = data ? data.enabled !== false : true

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!isEnabled) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let isRunning = true
    let isPaused = false

    // Check prefers-reduced-motion for a gentle, slow drift
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cssWidth = window.innerWidth || document.documentElement.clientWidth || 1024
    let cssHeight = window.innerHeight || document.documentElement.clientHeight || 768

    const setupCanvasSize = () => {
      if (!canvas || !ctx) return
      cssWidth = window.innerWidth || document.documentElement.clientWidth || 1024
      cssHeight = window.innerHeight || document.documentElement.clientHeight || 768
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
      canvas.width = cssWidth * dpr
      canvas.height = cssHeight * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    setupCanvasSize()

    const handleResize = () => {
      setupCanvasSize()
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Flat colors from Dermaspace palette:
    // Visible against both pure white cards/sections and dark purple hero banners.
    const FLAKE_COLORS = ['#7B2D8E', '#5A1D6A', '#D4AF37', '#9333EA', '#7B2D8E']
    const BELL_COLORS = ['#7B2D8E', '#D4AF37', '#7B2D8E', '#5A1D6A']

    // Particle count: optimal for smooth 60fps performance across all devices
    const count = reducedMotion
      ? 14
      : cssWidth < 640
        ? 24
        : 44

    const particles: SnowflakeParticle[] = []

    for (let i = 0; i < count; i++) {
      const typeChoice = Math.random()
      // ~20% Christmas bells, 30% 6-arm crystals, 25% stars, 25% circular snow
      const type: SnowflakeParticle['type'] =
        typeChoice < 0.20
          ? 'bell'
          : typeChoice < 0.50
            ? 'crystal'
            : typeChoice < 0.75
              ? 'star'
              : 'circle'

      const radius =
        type === 'bell'
          ? Math.random() * 2.5 + 7
          : Math.random() * 3.5 + 3.5

      particles.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        radius,
        speedY: reducedMotion
          ? 0.25
          : type === 'bell'
            ? Math.random() * 0.55 + 0.35
            : Math.random() * 0.75 + 0.45,
        speedX: (Math.random() - 0.5) * 0.3,
        swaySpeed: Math.random() * 0.02 + 0.012,
        swayOffset: Math.random() * Math.PI * 2,
        rotation: (Math.random() - 0.5) * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        opacity: Math.random() * 0.4 + 0.55,
        color:
          type === 'bell'
            ? BELL_COLORS[Math.floor(Math.random() * BELL_COLORS.length)]
            : FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)],
        type,
      })
    }

    /**
     * Draw Christmas Bell with swinging clapper & ribbon.
     * Uses 100% universal Canvas 2D methods (arc, bezierCurveTo, lineTo)
     * with ZERO ctx.ellipse to guarantee compatibility in all browsers.
     */
    function drawBell(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      rotation: number,
      color: string,
      opacity: number,
      swayOffset: number,
    ) {
      context.save()
      context.translate(x, y)
      // Gentle swing angle
      const chimeAngle = rotation + Math.sin(swayOffset * 1.5) * 0.2
      context.rotate(chimeAngle)
      context.globalAlpha = opacity

      // 1. Top hanging ring
      context.strokeStyle = color
      context.lineWidth = 1.3
      context.beginPath()
      context.arc(0, -size * 0.95, size * 0.22, 0, Math.PI * 2)
      context.stroke()

      // 2. Bell body (flared Christmas bell contour with solid flat fill)
      context.beginPath()
      context.moveTo(-size * 0.28, -size * 0.72)
      // Top crown
      context.quadraticCurveTo(0, -size * 0.88, size * 0.28, -size * 0.72)
      // Right waist and flare
      context.bezierCurveTo(size * 0.35, -size * 0.2, size * 0.72, size * 0.38, size * 0.85, size * 0.64)
      // Bottom curved rim
      context.quadraticCurveTo(0, size * 0.76, -size * 0.85, size * 0.64)
      // Left waist and flare
      context.bezierCurveTo(-size * 0.72, size * 0.38, -size * 0.35, -size * 0.2, -size * 0.28, -size * 0.72)
      context.closePath()
      context.fillStyle = color
      context.fill()

      // 3. Bottom rim contour accent (flat, non-gradient)
      context.strokeStyle = '#FFFFFF'
      context.lineWidth = 1.1
      context.beginPath()
      context.moveTo(-size * 0.78, size * 0.62)
      context.quadraticCurveTo(0, size * 0.74, size * 0.78, size * 0.62)
      context.stroke()

      // 4. Swinging clapper ball
      const clapperX = Math.sin(swayOffset * 2.2) * (size * 0.25)
      context.beginPath()
      context.arc(clapperX, size * 0.74, size * 0.17, 0, Math.PI * 2)
      context.fillStyle = color === '#7B2D8E' ? '#D4AF37' : '#7B2D8E'
      context.fill()

      // 5. Tiny festive bow at the top loop (universal arcs)
      context.strokeStyle = '#7B2D8E'
      context.lineWidth = 1.2
      context.beginPath()
      context.arc(-size * 0.26, -size * 0.82, size * 0.16, 0, Math.PI * 2)
      context.arc(size * 0.26, -size * 0.82, size * 0.16, 0, Math.PI * 2)
      context.stroke()

      context.restore()
    }

    /**
     * Draw 6-point snowflake crystal with solid flat lines.
     */
    function drawCrystal(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      rotation: number,
      color: string,
      opacity: number,
    ) {
      context.save()
      context.translate(x, y)
      context.rotate(rotation)
      context.strokeStyle = color
      context.globalAlpha = opacity
      context.lineWidth = 1.3
      context.lineCap = 'round'

      for (let i = 0; i < 6; i++) {
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(0, radius)
        const branchY = radius * 0.55
        const branchLen = radius * 0.35
        context.moveTo(0, branchY)
        context.lineTo(branchLen, branchY + branchLen * 0.5)
        context.moveTo(0, branchY)
        context.lineTo(-branchLen, branchY + branchLen * 0.5)
        context.stroke()
        context.rotate(Math.PI / 3)
      }

      context.restore()
    }

    /**
     * Draw 4-point star crystal.
     */
    function drawStar(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      rotation: number,
      color: string,
      opacity: number,
    ) {
      context.save()
      context.translate(x, y)
      context.rotate(rotation)
      context.strokeStyle = color
      context.globalAlpha = opacity
      context.lineWidth = 1.3
      context.lineCap = 'round'

      for (let i = 0; i < 4; i++) {
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(0, radius)
        context.stroke()
        context.rotate(Math.PI / 2)
      }

      // Center decorative pin
      context.beginPath()
      context.arc(0, 0, 1.2, 0, Math.PI * 2)
      context.fillStyle = color
      context.fill()

      context.restore()
    }

    const handleVisibility = () => {
      isPaused = document.hidden
      if (!isPaused) {
        lastTime = performance.now()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    let lastTime = performance.now()

    const render = (time: number) => {
      if (!isRunning) return

      const now = time || performance.now()
      const elapsed = now - lastTime
      const delta = Math.min(Math.max(elapsed / 16.67, 0.5), 2.5)
      lastTime = now

      if (!isPaused && ctx) {
        ctx.clearRect(0, 0, cssWidth, cssHeight)

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]

          // Physics update
          p.swayOffset += p.swaySpeed * delta
          p.y += p.speedY * delta
          p.x += (p.speedX + Math.sin(p.swayOffset) * 0.45) * delta
          p.rotation += p.rotationSpeed * delta

          // Wrap boundaries
          if (p.y > cssHeight + 25) {
            p.y = -20
            p.x = Math.random() * cssWidth
          }
          if (p.x > cssWidth + 20) p.x = -15
          if (p.x < -20) p.x = cssWidth + 15

          // Render particle
          if (p.type === 'bell') {
            drawBell(ctx, p.x, p.y, p.radius, p.rotation, p.color, p.opacity, p.swayOffset)
          } else if (p.type === 'crystal') {
            drawCrystal(ctx, p.x, p.y, p.radius, p.rotation, p.color, p.opacity)
          } else if (p.type === 'star') {
            drawStar(ctx, p.x, p.y, p.radius * 0.9, p.rotation, p.color, p.opacity)
          } else {
            // Soft solid circular snow flake with delicate brand outline
            ctx.save()
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.globalAlpha = p.opacity * 0.65
            ctx.fill()
            // Hairline outline to guarantee visibility on pure white backgrounds
            ctx.strokeStyle = '#7B2D8E'
            ctx.lineWidth = 0.6
            ctx.globalAlpha = p.opacity * 0.4
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      isRunning = false
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isEnabled])

  if (!isEnabled) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full select-none"
    />
  )
}
