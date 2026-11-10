'use client'

import React from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * ChristmasLogoHat
 * ---------------------------------------------------------------
 * Professional holiday Santa hat accent designed to elegantly adorn
 * the capital "D" of the Dermaspace logo during the holiday season.
 *
 * Adheres strictly to design constraints:
 *   - Flat design: zero gradients, zero drop shadows.
 *   - Zero Zap, zero Sparkles icons.
 *   - Clean hairline borders on white elements so they stay crisp and
 *     visible on both pure white headers and dark footers.
 *   - Tied to /api/festive so it turns off when the admin toggles
 *     the holiday features off in Feature Flags.
 *   - Non-blocking: pointer-events-none select-none.
 */
export function ChristmasLogoHat({
  className = 'w-5 h-5 -top-2.5 -left-1 sm:w-6 sm:h-6 sm:-top-3 sm:-left-1.5',
}: {
  className?: string
}) {
  const { data } = useSWR<{ enabled: boolean }>('/api/festive', fetcher, {
    revalidateOnFocus: false,
  })

  // Respect admin switch (default enabled if loading or set to true)
  const isEnabled = data ? data.enabled !== false : true

  if (!isEnabled) return null

  return (
    <span
      aria-hidden="true"
      className={`absolute pointer-events-none select-none z-20 ${className}`}
    >
      <svg
        viewBox="0 0 32 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform -rotate-6"
      >
        {/* Santa hat cone (curved crown) - Holiday Crimson Red */}
        <path
          d="M6 19 C7 11 12 4 19 3 C23 3 26 5 26 9 C26 12 24 15 23 18 C23 19 22 19 21 19 Z"
          fill="#D32F2F"
        />

        {/* Drooping tip folding to the right */}
        <path
          d="M22 8 C25 8 28 11 27 16 C26 17 25 17 24 16 C24 14 24 10 22 8 Z"
          fill="#C62828"
        />

        {/* Crisp white fluffy brim band with subtle hairline border for contrast on white header */}
        <rect
          x="4"
          y="17"
          width="21"
          height="6"
          rx="3"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {/* Crisp white pom-pom ball at drooping tip with subtle hairline border */}
        <circle
          cx="26.5"
          cy="17.5"
          r="3.5"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
      </svg>
    </span>
  )
}

export default ChristmasLogoHat

