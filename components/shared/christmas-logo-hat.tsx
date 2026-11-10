'use client'

import React from 'react'

/**
 * ChristmasLogoHat
 * ---------------------------------------------------------------
 * Miniature holiday Santa hat & festive bell accent designed to
 * adorn the "D" of the Dermaspace logo during the Christmas season.
 *
 * Adheres strictly to design constraints:
 *   - Flat design: zero gradients, zero drop shadows.
 *   - Zero Zap, zero Sparkles icons.
 *   - Palette: Holiday Crimson (#D32F2F), Pure White (#FFFFFF),
 *     Champagne Gold (#D4AF37).
 *   - Non-blocking: pointer-events-none select-none.
 */
export function ChristmasLogoHat({
  className = 'w-6 h-6 -top-2.5 -left-1.5',
}: {
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`absolute pointer-events-none select-none z-20 ${className}`}
    >
      <svg
        viewBox="0 0 36 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform -rotate-12"
      >
        {/* Santa hat cone (curved tip) - Flat Christmas Red */}
        <path
          d="M8 21 C10 12, 16 5, 26 4 C24 10, 24 16, 29 21 Z"
          fill="#D32F2F"
        />

        {/* White brim band - Flat Solid White */}
        <rect
          x="6"
          y="20"
          width="25"
          height="5.5"
          rx="2.75"
          fill="#FFFFFF"
        />

        {/* White pom-pom at folded tip - Flat Solid White */}
        <circle
          cx="8"
          cy="20.5"
          r="3.2"
          fill="#FFFFFF"
        />

        {/* Delicate golden holiday bell hanging at the edge */}
        <path
          d="M24 21 C24 19 26.5 19 26.5 21 L27.5 23.5 L23 23.5 Z"
          fill="#D4AF37"
        />
        <circle
          cx="25.2"
          cy="24.2"
          r="0.9"
          fill="#D4AF37"
        />
      </svg>
    </span>
  )
}

export default ChristmasLogoHat
