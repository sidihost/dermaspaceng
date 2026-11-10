'use client'

/**
 * ChristmasAnimation
 * ---------------------------------------------------------------
 * A purely decorative, seasonal snowfall overlay for the public
 * site. Self-contained and inert: it paints on a single fixed
 * <canvas> that ignores pointer events, so it never intercepts
 * clicks, focus, or scroll and cannot affect layout.
 *
 * Gating
 *   - Renders only when the `christmas_animation` feature flag is
 *     ON (Off / Admin only / Everyone are set in /admin/features).
 *     The mount point in ClientShell owns that check.
 *   - Self-suppresses on /admin, /staff and auth screens so the
 *     console and forms stay clean.
 *   - Honours `prefers-reduced-motion`: renders nothing at all
 *     rather than animating.
 *
 * Look & feel
 *   - Palette is locked to the design system: soft white, brand
 *     purple (#7B2D8E) / purple-light (#9B4DB0), and the brand gold
 *     accent (#F5B841). No reds/greens, no drop shadows — each flake
 *     is a soft glow (radial falloff), which reads as light, not
 *     shadow.
 *   - The violet/gold flakes carry the effect on the site's white
 *     backgrounds; the white flakes shimmer over hero imagery and
 *     the purple sections.
 *
 * Performance
 *   - Flakes are pre-rendered once to offscreen sprites and blitted
 *     with `drawImage`, so the per-frame cost is a handful of scaled
 *     blits rather than a fresh gradient per flake.
 *   - Flake count scales with viewport area and is capped, so it
 *     stays cheap on phones.
 *   - The RAF loop pauses while the tab is hidden and resumes on
 *     focus; the whole thing unmounts with the shell.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

type RGB = [number, number, number]

// Weighted palette. `weight` drives how often a flake picks this
// colour; `alpha` is the per-flake opacity range. Purple/gold sit at
// low alpha so they stay delicate rather than reading as confetti.
const PALETTE: { rgb: RGB; weight: number; alpha: [number, number] }[] = [
  { rgb: [255, 255, 255], weight: 0.46, alpha: [0.5, 0.92] }, // white — over imagery / dark sections
  { rgb: [155, 77, 176], weight: 0.3, alpha: [0.22, 0.44] }, // brand purple light — the workhorse on white
  { rgb: [123, 45, 142], weight: 0.14, alpha: [0.18, 0.34] }, // brand purple
  { rgb: [245, 184, 65], weight: 0.1, alpha: [0.34, 0.6] }, // brand gold accent
]

const MAX_FLAKES = 110
const SPRITE_SIZE = 64

function pickColor() {
  const roll = Math.random()
  let acc = 0
  for (const p of PALETTE) {
    acc += p.weight
    if (roll <= acc) return p
  }
  return PALETTE[0]
}

function isSuppressedRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/maintenance')
  )
}

interface Flake {
  x: number
  y: number
  radius: number
  speed: number
  drift: number
  swayPhase: number
  twinklePhase: number
  twinkleSpeed: number
  alpha: number
  sprite: number
}

export default function ChristmasAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pathname = usePathname() || '/'

  const suppressed = isSuppressedRoute(pathname)

  useEffect(() => {
    if (suppressed) return
    if (typeof window === 'undefined') return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Pre-render one soft-glow sprite per palette colour. The gradient
    // is created once here, then every flake is a cheap scaled blit.
    const sprites = PALETTE.map(({ rgb }) => {
      const sprite = document.createElement('canvas')
      sprite.width = SPRITE_SIZE
      sprite.height = SPRITE_SIZE
      const sctx = sprite.getContext('2d')
      if (sctx) {
        const c = SPRITE_SIZE / 2
        const [r, g, b] = rgb
        const grad = sctx.createRadialGradient(c, c, 0, c, c, c)
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
        grad.addColorStop(0.35, `rgba(${r},${g},${b},0.72)`)
        grad.addColorStop(0.7, `rgba(${r},${g},${b},0.22)`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        sctx.fillStyle = grad
        sctx.beginPath()
        sctx.arc(c, c, c, 0, Math.PI * 2)
        sctx.fill()
      }
      return sprite
    })

    let width = 0
    let height = 0
    let dpr = 1
    let flakes: Flake[] = []
    let raf = 0
    let running = true
    let last = performance.now()

    const makeFlake = (spawnAnywhere: boolean): Flake => {
      const { alpha } = pickColor()
      const spriteIndex = (Math.random() * sprites.length) | 0
      const radius = 1.2 + Math.random() * 2.4
      return {
        x: Math.random() * width,
        y: spawnAnywhere ? Math.random() * height : -radius * 3,
        radius,
        speed: 0.16 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 0.22,
        swayPhase: Math.random() * Math.PI * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        alpha: alpha[0] + Math.random() * (alpha[1] - alpha[0]),
        sprite: spriteIndex,
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = Math.min(MAX_FLAKES, Math.max(28, Math.round((width * height) / 15000)))
      flakes = Array.from({ length: target }, () => makeFlake(true))
    }

    const draw = (now: number) => {
      // Delta-time normalised to 60fps so speed is consistent across
      // refresh rates.
      const dt = Math.min((now - last) / 16.667, 3)
      last = now

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i]
        f.swayPhase += 0.01 * dt
        f.twinklePhase += f.twinkleSpeed * dt
        f.y += f.speed * dt
        f.x += (f.drift + Math.sin(f.swayPhase) * 0.3) * dt

        if (f.y - f.radius * 3 > height || f.x < -f.radius * 4 || f.x > width + f.radius * 4) {
          flakes[i] = makeFlake(false)
          continue
        }

        // Gentle twinkle keeps the fall alive without being busy.
        const twinkle = 0.78 + 0.22 * Math.sin(f.twinklePhase)
        const size = f.radius * 6.4
        ctx.globalAlpha = Math.max(0, Math.min(1, f.alpha * twinkle))
        ctx.drawImage(sprites[f.sprite], f.x - size / 2, f.y - size / 2, size, size)
      }
      ctx.globalAlpha = 1

      if (running) raf = requestAnimationFrame(draw)
    }

    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(draw)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [suppressed])

  if (suppressed) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[45] motion-reduce:hidden"
    />
  )
}
