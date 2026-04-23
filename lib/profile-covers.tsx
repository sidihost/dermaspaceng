/**
 * Profile covers
 *
 * A curated set of brand-aligned cover designs for the public profile
 * page. Each preset is rendered purely with CSS + inline SVG in the
 * Dermaspace brand colour (#7B2D8E), its tints, and neutral whites —
 * no loud gradients, no generated images, no external assets.
 *
 * Picking a slug -> the design. A `NULL` slug falls back to a
 * deterministic choice derived from the user id (see `coverForUser`),
 * so every profile has a lovely cover even before the owner picks one.
 */
import * as React from 'react'

export const COVER_BRAND = '#7B2D8E'

export type CoverSlug =
  | 'aurora'
  | 'mesh'
  | 'waves'
  | 'bloom'
  | 'dots'
  | 'rings'
  | 'spotlight'
  | 'lattice'

type Preset = {
  slug: CoverSlug
  label: string
  /** Short caption shown under the tile in the picker. */
  hint: string
  /** Renders the design filling its container. */
  Render: React.FC
}

/* ------------------------------------------------------------------ */
/* Individual designs                                                 */
/* ------------------------------------------------------------------ */

// 1. Aurora — the original soft radial flare. Understated.
const Aurora: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: COVER_BRAND }}>
    <div
      className="absolute inset-0 opacity-45"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35), transparent 42%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2), transparent 45%)',
      }}
    />
  </div>
)

// 2. Mesh — soft blurred mesh using two analogous brand tints.
const Mesh: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: '#5A1D6A' }}>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 15% 20%, rgba(200, 140, 220, 0.55), transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(123,45,142,0.8), transparent 60%), radial-gradient(ellipse at 75% 90%, rgba(255,255,255,0.18), transparent 55%)',
      }}
    />
  </div>
)

// 3. Waves — layered curvy waves in brand tints.
const Waves: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: COVER_BRAND }}>
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,60 C80,30 160,90 240,60 C320,30 400,70 400,70 L400,120 L0,120 Z"
        fill="rgba(255,255,255,0.14)"
      />
      <path
        d="M0,80 C100,50 200,110 300,80 C360,60 400,90 400,90 L400,120 L0,120 Z"
        fill="rgba(255,255,255,0.22)"
      />
      <path
        d="M0,100 C120,80 220,120 400,100 L400,120 L0,120 Z"
        fill="rgba(255,255,255,0.32)"
      />
    </svg>
  </div>
)

// 4. Bloom — large soft petal silhouettes that nod to skin & flower
// imagery on the rest of the site without being literal.
const Bloom: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: COVER_BRAND }}>
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="rgba(255,255,255,0.13)">
        <ellipse cx="70" cy="40" rx="90" ry="40" transform="rotate(-20 70 40)" />
        <ellipse cx="330" cy="120" rx="120" ry="50" transform="rotate(18 330 120)" />
        <ellipse cx="200" cy="80" rx="70" ry="28" transform="rotate(-8 200 80)" />
      </g>
    </svg>
  </div>
)

// 5. Dots — soft scattered confetti of tiny white circles.
const Dots: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: COVER_BRAND }}>
    <svg
      className="absolute inset-0 w-full h-full opacity-70"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dots-pattern"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="1.4" fill="rgba(255,255,255,0.55)" />
          <circle cx="16" cy="14" r="0.9" fill="rgba(255,255,255,0.35)" />
        </pattern>
      </defs>
      <rect width="400" height="160" fill="url(#dots-pattern)" />
    </svg>
  </div>
)

// 6. Rings — concentric brand rings, reminiscent of ripples.
const Rings: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: COVER_BRAND }}>
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5">
        <circle cx="330" cy="40" r="30" />
        <circle cx="330" cy="40" r="58" />
        <circle cx="330" cy="40" r="90" />
        <circle cx="330" cy="40" r="130" />
      </g>
      <g fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5">
        <circle cx="60" cy="130" r="22" />
        <circle cx="60" cy="130" r="44" />
        <circle cx="60" cy="130" r="70" />
      </g>
    </svg>
  </div>
)

// 7. Spotlight — vignette + a warm off-white highlight at the top.
const Spotlight: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: '#4A1656' }}>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% -10%, rgba(255,235,245,0.45), transparent 55%), radial-gradient(ellipse at 50% 140%, rgba(0,0,0,0.35), transparent 60%)',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 50%, rgba(123,45,142,0.55), transparent 65%)',
      }}
    />
  </div>
)

// 8. Lattice — crisp diagonal line lattice, the most structured of
// the set; good fit for a "professional" vibe.
const Lattice: React.FC = () => (
  <div className="absolute inset-0" style={{ backgroundColor: COVER_BRAND }}>
    <svg
      className="absolute inset-0 w-full h-full opacity-55"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="lattice-pattern"
          x="0"
          y="0"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="28"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="0"
            x2="28"
            y2="0"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="400" height="160" fill="url(#lattice-pattern)" />
    </svg>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 85% 10%, rgba(255,255,255,0.25), transparent 50%)',
      }}
    />
  </div>
)

/* ------------------------------------------------------------------ */
/* Registry                                                           */
/* ------------------------------------------------------------------ */

export const PROFILE_COVERS: Preset[] = [
  { slug: 'aurora', label: 'Aurora', hint: 'Soft radial glow', Render: Aurora },
  { slug: 'mesh', label: 'Mesh', hint: 'Blurred brand mesh', Render: Mesh },
  { slug: 'waves', label: 'Waves', hint: 'Layered curves', Render: Waves },
  { slug: 'bloom', label: 'Bloom', hint: 'Petal silhouettes', Render: Bloom },
  { slug: 'dots', label: 'Dots', hint: 'Scattered confetti', Render: Dots },
  { slug: 'rings', label: 'Rings', hint: 'Concentric ripples', Render: Rings },
  {
    slug: 'spotlight',
    label: 'Spotlight',
    hint: 'Warm vignette',
    Render: Spotlight,
  },
  {
    slug: 'lattice',
    label: 'Lattice',
    hint: 'Diagonal weave',
    Render: Lattice,
  },
]

export const COVER_SLUGS = PROFILE_COVERS.map((p) => p.slug) as readonly CoverSlug[]

export function isCoverSlug(value: unknown): value is CoverSlug {
  return typeof value === 'string' && (COVER_SLUGS as readonly string[]).includes(value)
}

/**
 * Deterministic fallback — if a user hasn't picked a cover yet we
 * still want their profile to look intentional rather than showing
 * the same default for everyone. Hashes the user id into a stable
 * index in the preset list.
 */
export function coverForUser(userId: string | null | undefined): CoverSlug {
  if (!userId) return 'aurora'
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return PROFILE_COVERS[hash % PROFILE_COVERS.length].slug
}

/**
 * Resolve a cover slug or user-id to a preset. Falls back to the
 * deterministic pick if the stored slug is unknown (e.g. a preset
 * was removed in a future release).
 */
export function resolveCover(
  slug: string | null | undefined,
  userId: string | null | undefined,
): Preset {
  if (isCoverSlug(slug)) {
    return PROFILE_COVERS.find((p) => p.slug === slug)!
  }
  const fallback = coverForUser(userId)
  return PROFILE_COVERS.find((p) => p.slug === fallback)!
}

/* ------------------------------------------------------------------ */
/* Render component                                                   */
/* ------------------------------------------------------------------ */

export function ProfileCover({
  slug,
  userId,
  className = '',
}: {
  slug: string | null | undefined
  userId: string | null | undefined
  className?: string
}) {
  const preset = resolveCover(slug, userId)
  const Render = preset.Render
  // NOTE: we intentionally DON'T hardcode `relative` on this wrapper.
  // Callers pass layout classes via `className` (commonly
  // `absolute inset-0` to fill a positioned parent), and Tailwind's
  // output CSS puts `.relative` AFTER `.absolute`, so combining them
  // on one element silently turned the wrapper back into position
  // relative. That made `inset-0` a no-op, collapsed the wrapper to
  // zero height, and rendered the cover band as plain white — the
  // "my picked cover isn't showing" bug. The caller now owns
  // positioning entirely; we just handle clipping + data attribute.
  return (
    <div
      className={`overflow-hidden ${className}`}
      aria-hidden="true"
      data-cover={preset.slug}
    >
      <Render />
    </div>
  )
}
