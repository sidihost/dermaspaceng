// ---------------------------------------------------------------------------
// components/shared/derma-ai-mark.tsx
//
// Compact brand mark used everywhere we used to render a Sparkles icon
// to label a "this is Derma AI" surface. Replaces the lucide Sparkles
// across the legal-acceptance modal, the /services semantic search,
// the mobile-nav search bottom-sheet, and any future AI-touched chip.
//
// Why a custom mark
// -----------------
// The team specifically asked us to stop using a Sparkles icon — the
// Sparkles glyph is generic across every product on the web ("AI =
// stars"), and it doesn't communicate that the AI surface here is OUR
// assistant, Derma AI. The mark below is a tiny rounded badge with a
// stylised "ai" wordmark: a triangular A and a single I stroke. Reads
// instantly at 16px, looks owned at 24px, and never gets confused with
// a generic decorative sparkle.
//
// Sizing follows the lucide convention: pass `className` for sizing
// and color (`w-4 h-4 text-[#7B2D8E]`), the SVG inherits both via
// `width="100%"` / `currentColor`. The `aria-hidden` default matches
// lucide's behaviour — surrounding text always carries the meaning.
// ---------------------------------------------------------------------------

import * as React from 'react'

interface DermaAIMarkProps extends React.SVGAttributes<SVGSVGElement> {
  /** Override the default 24x24 viewBox sizing. Optional — most
   *  callers pass a Tailwind className like `w-3.5 h-3.5` instead. */
  size?: number | string
  /** Decorative by default. Set this to `false` and provide an
   *  `aria-label` on the parent if the mark is the only thing
   *  carrying meaning (rare). */
  decorative?: boolean
}

export function DermaAIMark({
  size,
  decorative = true,
  className,
  ...rest
}: DermaAIMarkProps) {
  return (
    <svg
      // currentColor lets us tint the mark with `text-[#7B2D8E]` like
      // every other lucide icon in the codebase — no extra prop wiring.
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      {...rest}
    >
      {/* Outer rounded-square badge — the "container" Derma AI lives
          in, echoing the rounded chip shapes used elsewhere on the
          dashboard. 1.6px stroke matches lucide. */}
      <rect x="3" y="3" width="18" height="18" rx="6" />

      {/* Stylised "A" — two outer strokes meeting at the apex, with
          a horizontal cross-bar two-thirds of the way down. Drawn
          left-of-centre so the A + I composition sits visually
          balanced under the badge centroid. */}
      <path d="M8.4 16 L10.5 8.5 L12.6 16" />
      <path d="M9.05 13.6 L11.95 13.6" />

      {/* Stylised "I" — one vertical stroke on the right, with subtle
          serif caps so it doesn't disappear at small sizes. */}
      <path d="M15.2 8.5 L15.2 16" />
      <path d="M14.4 8.5 L16 8.5" />
      <path d="M14.4 16 L16 16" />
    </svg>
  )
}
