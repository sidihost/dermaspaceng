'use client'

/**
 * Christmas / Festive Snowfall & Bells Animation
 * ---------------------------------------------------------------
 * Luxury winter holiday animation designed specifically for Dermaspace.
 *
 * Design constraints strictly enforced:
 *   - Brand color palette: Pure White (#FFFFFF), Signature Purple (#7B2D8E),
 *     Plum (#5A1D6A), and warm Holiday Champagne Gold (#D4AF37).
 *   - Flat design: ZERO gradients (no linear-gradient, no radial-gradient).
 *   - ZERO drop-shadows or box-shadows.
 *   - ZERO Zap or Sparkles icons.
 *   - Pure canvas animation only — zero added UI, badges, or overlays.
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
  type: 'crystal' | 'star' | 'circle' | 'bell'
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ChristmasAnimation() {
  const { data } = useSWR<{ enabled: boolean; intensity?: string }>('/api/festive', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 15_000,
  })

  // Respect admin switch. If data isn't loaded yet, default to true.
  const isEnabled = data ? data.enabled !== false : true

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!isEnabled) return

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Flat colors from Dermaspace palette: White, Brand Purple, Deep Plum Purple
    const COLORS = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#7B2D8E', '#5A1D6A']

    // Particle count for silky 60fps performance
    const count = width < 640 ? 24 : 48
    const particles: SnowflakeParticle[] = []

    for (let i = 0; i < count; i++) {
      const typeChoice = Math.random()
      // ~22% Christmas bells, 33% 6-arm crystals, 25% stars, 20% soft circular flakes
      const type: SnowflakeParticle['type'] =
        typeChoice < 0.22
          ? 'bell'
          : typeChoice < 0.55
            ? 'crystal'
            : typeChoice < 0.80
              ? 'star'
              : 'circle'

      const radius = type === 'bell'
        ? Math.random() * 2.5 + 6.5
        : Math.random() * 4.5 + 2.5

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        speedY: type === 'bell' ? Math.random() * 0.75 + 0.35 : Math.random() * 0.9 + 0.45,
        speedX: (Math.random() - 0.5) * 0.35,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayOffset: Math.random() * Math.PI * 2,
        rotation: (Math.random() - 0.5) * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 0.012,
        opacity: Math.random() * 0.5 + 0.4,
        color: type === 'bell'
          ? (Math.random() > 0.4 ? '#7B2D8E' : '#FFFFFF')
          : COLORS[Math.floor(Math.random() * COLORS.length)],
        type,
      })
    }

    // Helper: draw Christmas Bell with swinging clapper & ribbon (flat solid fill, zero gradients/shadows)
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
      // Gentle chime rotation swinging in the breeze
      const chimeAngle = rotation + Math.sin(swayOffset * 1.6) * 0.22
      context.rotate(chimeAngle)
      context.globalAlpha = opacity

      // 1. Top hanging ring
      context.strokeStyle = color
      context.lineWidth = 1.2
      context.beginPath()
      context.arc(0, -size * 0.95, size * 0.2, 0, Math.PI * 2)
      context.stroke()

      // 2. Bell body (flared Christmas bell contour)
      context.beginPath()
      context.moveTo(-size * 0.28, -size * 0.75)
      // Top dome
      context.quadraticCurveTo(0, -size * 0.9, size * 0.28, -size * 0.75)
      // Right flare
      context.bezierCurveTo(size * 0.35, -size * 0.25, size * 0.7, size * 0.35, size * 0.85, size * 0.62)
      // Bottom rim
      context.quadraticCurveTo(0, size * 0.72, -size * 0.85, size * 0.62)
      // Left flare
      context.bezierCurveTo(-size * 0.7, size * 0.35, -size * 0.35, -size * 0.25, -size * 0.28, -size * 0.75)
      context.closePath()
      context.fillStyle = color
      context.fill()

      // 3. Bottom rim highlight line (flat, non-gradient)
      context.strokeStyle = color === '#FFFFFF' ? '#7B2D8E' : '#FFFFFF'
      context.lineWidth = 1
      context.beginPath()
      context.ellipse(0, size * 0.62, size * 0.78, size * 0.16, 0, 0, Math.PI * 2)
      context.stroke()

      // 4. Swinging clapper ball
      const clapperX = Math.sin(swayOffset * 2.2) * (size * 0.28)
      context.beginPath()
      context.arc(clapperX, size * 0.72, size * 0.16, 0, Math.PI * 2)
      context.fillStyle = color === '#7B2D8E' ? '#FFFFFF' : '#7B2D8E'
      context.fill()

      // 5. Tiny festive bow at the top loop
      context.strokeStyle = '#7B2D8E'
      context.lineWidth = 1.1
      context.beginPath()
      context.ellipse(-size * 0.26, -size * 0.82, size * 0.2, size * 0.11, -0.4, 0, Math.PI * 2)
      context.ellipse(size * 0.26, -size * 0.82, size * 0.2, size * 0.11, 0.4, 0, Math.PI * 2)
      context.stroke()

      context.restore()
    }

    // Helper: draw 6-point snowflake crystal with solid flat lines
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
      context.lineWidth = 1.2
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

    // Helper: draw elegant 4-point star crystal
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
      context.lineWidth = 1.2
      context.lineCap = 'round'

      for (let i = 0; i < 4; i++) {
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(0, radius)
        context.stroke()
        context.rotate(Math.PI / 2)
      }

      context.restore()
    }

    let isPaused = false

    const handleVisibility = () => {
      isPaused = document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    let lastTime = performance.now()

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 16.67, 2)
      lastTime = time

      if (!isPaused) {
        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]

          // Physics update
          p.swayOffset += p.swaySpeed * delta
          p.y += p.speedY * delta
          p.x += (p.speedX + Math.sin(p.swayOffset) * 0.45) * delta
          p.rotation += p.rotationSpeed * delta

          // Wrap boundaries
          if (p.y > height + 20) {
            p.y = -15
            p.x = Math.random() * width
          }
          if (p.x > width + 20) p.x = -15
          if (p.x < -20) p.x = width + 15

          // Render particle without gradients or shadows
          if (p.type === 'bell') {
            drawBell(ctx, p.x, p.y, p.radius, p.rotation, p.color, p.opacity, p.swayOffset)
          } else if (p.type === 'crystal') {
            drawCrystal(ctx, p.x, p.y, p.radius, p.rotation, p.color, p.opacity)
          } else if (p.type === 'star') {
            drawStar(ctx, p.x, p.y, p.radius * 0.85, p.rotation, p.color, p.opacity)
          } else {
            // Soft solid circular snow flake
            ctx.save()
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.globalAlpha = p.opacity * 0.75
            ctx.fill()
            ctx.restore()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isEnabled])

  if (!isEnabled) return null

  // Pure canvas animation only — zero added UI, no badges, completely non-blocking
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full select-none"
    />
  )
}
