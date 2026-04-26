// ---------------------------------------------------------------------------
// components/blog/blog-illustration.tsx
//
// Brand-tinted SVG illustration used as the "cover image" for posts that
// don't have one yet. Replaces the empty translucent rectangle the
// blog index used to show, which read as a layout glitch.
//
// Why an illustration (not a generated photo)?
// ------------------------------------------------
//   * The brief is "in our brand color, no images written by the AI".
//     Auto-uploaded photographs would feel off-brand and would also
//     require image-host config for routes admins haven't reached yet.
//   * SVG ships < 2 KB, themes via category accent without a re-upload
//     and stays crisp at any size.
//   * Composition is *deterministic* per slug — readers visiting the
//     same post twice see the same artwork, but each post in the list
//     gets a slightly different layout (rotation, accent dot count,
//     leaf positions) so the index doesn't look like a wallpaper of
//     identical tiles.
//
// We deliberately keep the language of the illustration small and
// brand-coded:
//
//   * 4 overlapping ovals at the centre — a stylised reference to the
//     Dermaspace butterfly mark.
//   * Soft circle blobs in the back, lit by purple at varying tints.
//   * Optional thin diagonal accent lines.
//   * Optional little "sparkle" dots scattered like spa "glow" particles.
//
// All shapes are tinted from the post's `accent` colour (defaults to
// brand purple) using rgba() with varying opacities, so when an admin
// later sets `category_accent` on the post's category, the illustration
// re-tints to match — without us regenerating anything.
// ---------------------------------------------------------------------------

interface BlogIllustrationProps {
  /** Stable seed (use the post slug). Drives composition variant + dot
   *  positions so each post gets a unique-looking but deterministic art
   *  piece. */
  seed: string
  /** Optional accent color override — falls back to brand purple. */
  accent?: string | null
  /** Optional small label rendered top-left (e.g. category name). */
  label?: string | null
  /** Extra wrapper classes — e.g. aspect-ratio on the parent. */
  className?: string
}

// Tiny FNV-1a-ish hash — deterministic and good enough for picking
// composition variants. We don't need cryptographic strength here.
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

const BRAND = '#7B2D8E'

export function BlogIllustration({
  seed,
  accent,
  label,
  className = '',
}: BlogIllustrationProps) {
  const color = accent || BRAND
  const h = hashSeed(seed || 'dermaspace')

  // Pick a composition variant 0..2 from the hash.
  const variant = h % 3
  // Pick a rotation in degrees -8..+8 so the art doesn't feel like a
  // template stamp.
  const rotation = ((h >> 3) % 17) - 8

  // Sparkle dot positions — six brand-coloured dots scattered across
  // the canvas. Pre-computed from the seed so SSR + client agree.
  const sparkles = Array.from({ length: 6 }, (_, i) => {
    const k = (h >> (i * 4)) & 0xff
    return {
      cx: 60 + ((k * 13) % 680),
      cy: 50 + (((k >> 3) * 7) % 380),
      r: 1.5 + ((k >> 1) % 3),
      o: 0.18 + ((k % 5) / 25), // 0.18 .. 0.34
    }
  })

  // RGBA helper (works for any 6-char hex).
  const rgba = (hex: string, a: number) => {
    const m = /^#?([a-f0-9]{6})$/i.exec(hex.replace('#', '#'))
    if (!m) return hex
    const v = m[1]
    const r = parseInt(v.slice(0, 2), 16)
    const g = parseInt(v.slice(2, 4), 16)
    const b = parseInt(v.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        backgroundColor: rgba(color, 0.07),
        backgroundImage: `linear-gradient(135deg, ${rgba(color, 0.04)} 0%, ${rgba(
          color,
          0.12,
        )} 100%)`,
      }}
      aria-hidden="true"
    >
      {/* Optional category label — tiny pill in the top-left.
          Rendered above the SVG so it stays readable even when
          decorative shapes overlap. */}
      {label && (
        <span
          className="absolute top-3 left-3 z-10 inline-flex items-center px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
      )}

      {/* Soft back blobs — large semi-transparent circles tinted with
          the accent. Position varies by variant. */}
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`bg-${seed}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={rgba(color, 0.0)} />
            <stop offset="100%" stopColor={rgba(color, 0.18)} />
          </linearGradient>
          <radialGradient id={`blob-${seed}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={rgba(color, 0.32)} />
            <stop offset="100%" stopColor={rgba(color, 0)} />
          </radialGradient>
        </defs>

        {/* Wash gradient under everything */}
        <rect width="800" height="500" fill={`url(#bg-${seed})`} />

        {/* Big back blob — always present, position rotates with variant */}
        <circle
          cx={variant === 0 ? 600 : variant === 1 ? 200 : 400}
          cy={variant === 0 ? 120 : variant === 1 ? 380 : 260}
          r="220"
          fill={`url(#blob-${seed})`}
        />
        {/* Smaller secondary blob */}
        <circle
          cx={variant === 0 ? 160 : variant === 1 ? 640 : 700}
          cy={variant === 0 ? 380 : variant === 1 ? 120 : 80}
          r="120"
          fill={rgba(color, 0.1)}
        />

        {/* Diagonal accent line set — quiet, only on variant 1 + 2 */}
        {variant !== 0 && (
          <g
            stroke={rgba(color, 0.18)}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          >
            <line x1="80" y1="60" x2="220" y2="200" />
            <line x1="120" y1="40" x2="260" y2="180" />
            <line x1="540" y1="430" x2="680" y2="290" />
          </g>
        )}

        {/* Centerpiece — stylised butterfly mark made of 4 overlapping
            ovals. Slightly rotated by hash so each post tilts a bit
            differently. The transparent-fill outline gives the shape
            a "drawn" feel rather than a stamped logo. */}
        <g
          transform={`translate(400 250) rotate(${rotation})`}
          fill="none"
          stroke={color}
          strokeWidth="3"
          opacity="0.92"
        >
          {/* upper-left wing */}
          <ellipse cx="-58" cy="-40" rx="55" ry="68" />
          {/* upper-right wing */}
          <ellipse cx="58" cy="-40" rx="55" ry="68" />
          {/* lower-left wing */}
          <ellipse cx="-44" cy="56" rx="42" ry="52" />
          {/* lower-right wing */}
          <ellipse cx="44" cy="56" rx="42" ry="52" />
          {/* tiny body dot */}
          <circle cx="0" cy="0" r="4" fill={color} stroke="none" />
        </g>

        {/* Leaf accents — small organic shapes on variant 0 + 2 */}
        {variant !== 1 && (
          <g fill={rgba(color, 0.22)}>
            <path
              d="M 110 200 Q 80 160 120 130 Q 160 160 130 200 Z"
              transform="rotate(-12 120 165)"
            />
            <path
              d="M 670 320 Q 700 280 660 250 Q 620 280 650 320 Z"
              transform="rotate(18 660 285)"
            />
          </g>
        )}

        {/* Sparkle particles — small dots with mixed sizes/opacities */}
        {sparkles.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={color}
            opacity={s.o}
          />
        ))}
      </svg>
    </div>
  )
}
