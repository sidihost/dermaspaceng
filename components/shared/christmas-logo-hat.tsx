'use client'

import React from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * ChristmasLogoHat
 * ---------------------------------------------------------------
 * Realistic, bespoke holiday accent tailored to perch naturally on
 * the top-left curve of the capital "D" in the Dermaspace logo.
 *
 * Adheres strictly to design constraints:
 *   - Proportional scale: Delicate ~22px footprint that crowns the "D"
 *     without overwhelming the brand wordmark.
 *   - Realistic Santa hat anatomy: Naturally curved slouch cap folding
 *     gracefully to the side, soft pillowed fluffy brim with hairline
 *     outline, and a clean pom-pom.
 *   - Subtle holiday decoration: Tucked miniature evergreen holly leaves
 *     with tiny festive berries for authentic seasonal elegance.
 *   - Flat design: ZERO gradients, ZERO drop shadows.
 *   - ZERO Zap, ZERO Sparkles icons.
 *   - Clean hairline borders (#E2E8F0) on white fur elements so they
 *     stay crisp and distinct on both pure white headers and dark footers.
 *   - Pure holiday red (#D32F2F / #991B1B) for iconic recognition.
 *   - Gentle, subtle pure-CSS motion sway (rock-solid in all browsers).
 *   - Non-blocking: pointer-events-none select-none.
 */
export function ChristmasLogoHat({
  className = 'w-5.5 h-5.5 -top-2 left-0.5 sm:w-6 sm:h-6 sm:-top-2.5 sm:left-0.5',
  variant = 'classic',
}: {
  className?: string
  variant?: 'classic' | 'brand'
}) {
  const { data } = useSWR<{ enabled: boolean }>('/api/festive', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  // Respect admin switch. Default to true during loading so there's zero layout flash.
  const isEnabled = data ? data.enabled !== false : true

  if (!isEnabled) return null

  const crownColor = variant === 'brand' ? '#7B2D8E' : '#D32F2F'
  const foldColor = variant === 'brand' ? '#5A1D6A' : '#991B1B'

  return (
    <span
      aria-hidden="true"
      className={`absolute pointer-events-none select-none z-30 ${className}`}
      style={{
        transformOrigin: 'bottom left',
        animation: 'festive-hat-sway 4.5s ease-in-out infinite',
      }}
    >
      <svg
        viewBox="-1 -1 34 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        {/* Miniature decorative holly sprig at brim base (delicate festive touch) */}
        {/* Holly leaf 1 - pointing down-left */}
        <path
          d="M 5 20 C 3.2 19.5 2 21 1.2 22.5 C 2.8 23.5 4.5 23.5 6 22.2 C 6.5 21.2 6.2 20.2 5 20 Z"
          fill="#2E7D32"
        />
        {/* Holly leaf 2 - pointing down-right */}
        <path
          d="M 6.5 21 C 6.2 22.8 7.5 24.2 8.8 25 C 9.8 23.8 10.2 22.2 9.2 21 C 8.2 20.4 7.2 20.4 6.5 21 Z"
          fill="#1B5E20"
        />
        {/* Tiny festive holly berries */}
        <circle cx="5" cy="21.5" r="1.3" fill="#C5221F" />
        <circle cx="6.8" cy="22.2" r="1.2" fill="#E53935" />

        {/* Santa hat cone (slouchy crown leaning gracefully to the right) */}
        <path
          d="M 5.5 17 C 6.5 10.5 10 3.5 15.5 2.5 C 19 2 22 4.5 23.5 7.5 C 24.2 9.2 23.8 12.8 22 17 Z"
          fill={crownColor}
        />

        {/* Drooping fold drape to the side */}
        <path
          d="M 22 6.5 C 24.8 7.5 27 10 26.2 14 C 24.8 14.5 23.8 13.5 23 11.5 C 22.4 9.5 22.1 7.8 22 6.5 Z"
          fill={foldColor}
        />

        {/* Crisp, soft fluffy brim tilted naturally on the D's arch */}
        <rect
          x="3"
          y="15.5"
          width="20"
          height="5.2"
          rx="2.6"
          transform="rotate(-5 13 18)"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="0.75"
        />

        {/* Fluffy white pom-pom at the folded tip */}
        <circle
          cx="26"
          cy="14"
          r="3.2"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="0.75"
        />
      </svg>
    </span>
  )
}

export default ChristmasLogoHat
