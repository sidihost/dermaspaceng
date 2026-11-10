'use client'

import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useFeatureFlags } from '@/lib/use-feature-flags'

const SNOWFLAKE_COUNT = 28
const SNOW_COLORS = [
  'rgba(123, 45, 142, 0.3)',
  'rgba(155, 77, 176, 0.34)',
  'rgba(229, 213, 236, 0.92)',
  'rgba(207, 178, 133, 0.68)',
]

const PRIVATE_PATHS = ['/admin', '/staff', '/signin', '/signup']

type SnowflakeStyle = CSSProperties & {
  '--snow-left': string
  '--snow-size': string
  '--snow-color': string
  '--snow-duration': string
  '--snow-delay': string
  '--snow-drift': string
  '--snow-opacity': string
}

function getSnowflakeStyle(index: number): SnowflakeStyle {
  const drift = (index % 2 === 0 ? 1 : -1) * (10 + (index % 5) * 6)

  return {
    '--snow-left': `${(index * 37.7 + (index % 3) * 4.2) % 100}%`,
    '--snow-size': `${2 + (index % 4) * 0.8}px`,
    '--snow-color': SNOW_COLORS[index % SNOW_COLORS.length],
    '--snow-duration': `${17 + (index % 6) * 2.4}s`,
    '--snow-delay': `${-((index * 11) % 28)}s`,
    '--snow-drift': `${drift}px`,
    '--snow-opacity': `${0.28 + (index % 4) * 0.12}`,
  }
}

export function ChristmasAnimation() {
  const pathname = usePathname()
  const { flags } = useFeatureFlags()
  const isPrivatePage = PRIVATE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  if (flags['christmas-animation'] !== true || isPrivatePage) return null

  return (
    <div className="christmas-snowfall" aria-hidden="true">
      {Array.from({ length: SNOWFLAKE_COUNT }, (_, index) => (
        <span
          key={index}
          className="christmas-snowfall__flake"
          style={getSnowflakeStyle(index)}
        />
      ))}
    </div>
  )
}
