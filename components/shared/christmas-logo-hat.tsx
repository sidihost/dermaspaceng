'use client'

import React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * ChristmasLogoHat
 * ---------------------------------------------------------------
 * Professional holiday Santa hat accent tailored to elegantly perch
 * on the capital "D" of the Dermaspace logo during the holiday season.
 *
 * Adheres strictly to design constraints:
 *   - Flat design: ZERO gradients, ZERO drop shadows.
 *   - ZERO Zap, ZERO Sparkles icons.
 *   - Clean hairline borders (#E2E8F0) on white fur elements so they
 *     stay crisp and distinct on both pure white headers and dark footers.
 *   - Pure holiday red (#D32F2F / #B71C1C) for iconic instant recognition,
 *     with optional brand variant.
 *   - Subtle, ultra-clean framer-motion sway for a delightful festive feel.
 *   - Tied to /api/festive so it turns off immediately when the admin
 *     disables holiday features in Feature Flags.
 *   - Non-blocking: pointer-events-none select-none.
 */
export function ChristmasLogoHat({
  className = 'w-7 h-7 -top-3.5 -left-1 sm:w-8 sm:h-8 sm:-top-4 sm:-left-1.5',
  variant = 'classic',
}: {
  className?: string
  variant?: 'classic' | 'brand'
}) {
  const { data } = useSWR<{ enabled: boolean }>('/api/festive', fetcher, {
    revalidateOnFocus: false,
  })

  // Respect admin switch (default enabled if loading or set to true)
  const isEnabled = data ? data.enabled !== false : true

  if (!isEnabled) return null

  const crownColor = variant === 'brand' ? '#7B2D8E' : '#D32F2F'
  const foldColor = variant === 'brand' ? '#5A1D6A' : '#B71C1C'

  return (
    <motion.span
      aria-hidden="true"
      className={`absolute pointer-events-none select-none z-20 ${className}`}
      initial={{ scale: 0.85, opacity: 0, rotate: -4 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: [-4, 0, -4],
        y: [0, -0.6, 0],
      }}
      transition={{
        scale: { duration: 0.3, ease: 'easeOut' },
        opacity: { duration: 0.3 },
        rotate: {
          duration: 4.8,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'mirror',
        },
        y: {
          duration: 4.8,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'mirror',
        },
      }}
      style={{ transformOrigin: 'bottom center' }}
    >
      <svg
        viewBox="0 0 32 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Santa hat cone (curved crown) - Flat solid color */}
        <path
          d="M3.5 19 C4.5 11 10 2 17.5 1.5 C22.5 1.2 26 3.5 26 7 C26 10 24 14.5 22 19 Z"
          fill={crownColor}
        />

        {/* Drooping tip folding to the right - Slightly darker flat solid fold */}
        <path
          d="M22 6.5 C25.5 6.5 28.5 9 27.5 14.5 C26.2 15.5 25 15.5 24.2 14.5 C24 12 23.5 9 22 6.5 Z"
          fill={foldColor}
        />

        {/* Crisp white fluffy brim band with subtle hairline border for contrast on white header */}
        <rect
          x="1.5"
          y="17.5"
          width="22.5"
          height="7"
          rx="3.5"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="0.8"
        />

        {/* Crisp white pom-pom ball at drooping tip with subtle hairline border */}
        <circle
          cx="27.5"
          cy="15"
          r="4"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="0.8"
        />
      </svg>
    </motion.span>
  )
}

export default ChristmasLogoHat

