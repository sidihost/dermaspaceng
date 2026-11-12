'use client'

import useSWR from 'swr'

/**
 * Modular, removable Christmas visual design accents for Dermaspace Packages.
 *
 * Design-only layer (zero text overrides):
 *   - Brand palette: #7B2D8E, #5A1D6A, #FFFFFF, neutral grays, tier accents,
 *     and subtle #D4AF37 champagne-gold ornament detailing.
 *   - ZERO gradients, ZERO shadows, ZERO Zap or Sparkles icons.
 *
 * Easy removal later:
 *   1. Automatically obeys the Admin Festive toggle (`/api/festive`).
 *   2. Set `CHRISTMAS_PACKAGE_DESIGN_ENABLED = false` below to turn off immediately,
 *      or delete this file and its 5 decorative component imports.
 */
export const CHRISTMAS_PACKAGE_DESIGN_ENABLED = true

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function useChristmasDesignActive(): boolean {
  const { data } = useSWR<{ enabled: boolean }>(
    CHRISTMAS_PACKAGE_DESIGN_ENABLED ? '/api/festive' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  )

  if (!CHRISTMAS_PACKAGE_DESIGN_ENABLED) return false
  return data ? data.enabled !== false : true
}

function FlatSnowflakeSvg({
  className = 'w-6 h-6',
  stroke = 'currentColor',
  strokeWidth = 1.5,
}: {
  className?: string
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {[0, 60, 120].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 16 16)`}>
          <line
            x1="16"
            y1="3"
            x2="16"
            y2="29"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <polyline
            points="12.5,7 16,10.2 19.5,7"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="12.5,25 16,21.8 19.5,25"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
      <circle cx="16" cy="16" r="2" fill={stroke} />
    </svg>
  )
}

/**
 * Hero backdrop artwork: delicate flat hanging baubles, a miniature evergreen arc,
 * and geometric 6-point snowflakes framing the #7B2D8E hero without obscuring text.
 */
export function PackagesHeroFestiveArt() {
  const active = useChristmasDesignActive()
  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Left hanging ornaments cluster */}
      <svg
        viewBox="0 0 140 160"
        fill="none"
        className="absolute top-0 left-2 sm:left-8 md:left-14 w-24 sm:w-32 h-auto opacity-80"
      >
        <line x1="34" y1="0" x2="34" y2="62" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <path
          d="M34 62 C27 56 23 60 28 65 C31 66 34 64 34 62 Z M34 62 C41 56 45 60 40 65 C37 66 34 64 34 62 Z"
          stroke="#D4AF37"
          strokeWidth="1.2"
          fill="none"
        />
        <rect x="29" y="63" width="10" height="4.5" rx="1.2" fill="#D4AF37" />
        <circle
          cx="34"
          cy="86"
          r="19"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.36)"
          strokeWidth="1.4"
        />
        <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" strokeLinecap="round">
          <line x1="34" y1="76" x2="34" y2="96" />
          <line x1="25.3" y1="81" x2="42.7" y2="91" />
          <line x1="25.3" y1="91" x2="42.7" y2="81" />
        </g>
        <circle cx="34" cy="86" r="2" fill="#D4AF37" />

        <line x1="82" y1="0" x2="82" y2="38" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <rect x="79" y="38" width="6" height="3.5" rx="1" fill="rgba(255,255,255,0.45)" />
        <path
          d="M82 42 L93 56 L82 72 L71 56 Z"
          fill="rgba(255,255,255,0.06)"
          stroke="#D4AF37"
          strokeOpacity="0.65"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="82" cy="56" r="2" fill="rgba(255,255,255,0.55)" />
      </svg>

      {/* Right hanging ornaments cluster */}
      <svg
        viewBox="0 0 140 160"
        fill="none"
        className="absolute top-0 right-2 sm:right-8 md:right-14 w-24 sm:w-32 h-auto opacity-80"
      >
        <path
          d="M134 10 Q108 16 92 6"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="112" cy="11" r="2" fill="#D4AF37" fillOpacity="0.7" />
        <circle cx="105" cy="15" r="1.6" fill="rgba(255,255,255,0.5)" />

        <line x1="104" y1="0" x2="104" y2="54" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <rect x="99" y="54" width="10" height="4.5" rx="1.2" fill="#D4AF37" />
        <circle
          cx="104"
          cy="76"
          r="18"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.36)"
          strokeWidth="1.4"
        />
        <path
          d="M87.5 76 Q104 82 120.5 76"
          stroke="#D4AF37"
          strokeOpacity="0.65"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M89 69 Q104 75 119 69"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="1"
          fill="none"
        />

        <line x1="56" y1="0" x2="56" y2="32" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <g stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinecap="round">
          <line x1="56" y1="34" x2="56" y2="52" />
          <line x1="48.2" y1="38.5" x2="63.8" y2="47.5" />
          <line x1="48.2" y1="47.5" x2="63.8" y2="38.5" />
        </g>
        <circle cx="56" cy="43" r="1.8" fill="#D4AF37" />
      </svg>

      {/* Subtle corner snowflakes on desktop/tablet */}
      <div className="hidden sm:block absolute bottom-5 left-10 text-white/20">
        <FlatSnowflakeSvg className="w-7 h-7" strokeWidth={1.3} />
      </div>
      <div className="hidden md:block absolute bottom-8 right-12 text-[#D4AF37]/40">
        <FlatSnowflakeSvg className="w-6 h-6" strokeWidth={1.3} />
      </div>
    </div>
  )
}

/**
 * Hero divider: crisp hairline flanking a 6-point flat snowflake.
 */
export function HolidayHeroDivider() {
  const active = useChristmasDesignActive()
  if (!active) return null

  return (
    <div className="flex items-center justify-center gap-3 mt-6" aria-hidden="true">
      <div className="w-10 h-px bg-white/30" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/80" />
      <FlatSnowflakeSvg className="w-4 h-4 text-white/85" strokeWidth={1.6} />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/80" />
      <div className="w-10 h-px bg-white/30" />
    </div>
  )
}

/**
 * Delicate hanging ornament suspended cleanly from the top accent bar
 * of each package card. Offset right position (`rightClass`) avoids
 * overlapping the FavoriteButton on /packages.
 */
export function CardHangingOrnament({
  popular,
  accentColor,
  rightClass = 'right-12',
}: {
  popular: boolean
  accentColor: string
  rightClass?: string
}) {
  const active = useChristmasDesignActive()
  if (!active) return null

  const strokeColor = popular ? '#7B2D8E' : accentColor
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-1 ${rightClass} z-0 select-none`}
    >
      <svg viewBox="0 0 28 34" fill="none" className="w-6 h-7">
        <line
          x1="14"
          y1="0"
          x2="14"
          y2="9"
          stroke={strokeColor}
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        <rect
          x="11"
          y="8.5"
          width="6"
          height="3"
          rx="1"
          fill="#D4AF37"
          fillOpacity={popular ? '0.9' : '0.75'}
        />
        {popular ? (
          <>
            <circle
              cx="14"
              cy="20.5"
              r="9"
              fill="#7B2D8E"
              fillOpacity="0.08"
              stroke="#7B2D8E"
              strokeOpacity="0.55"
              strokeWidth="1.2"
            />
            <g stroke="#7B2D8E" strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round">
              <line x1="14" y1="15.5" x2="14" y2="25.5" />
              <line x1="9.7" y1="18" x2="18.3" y2="23" />
              <line x1="9.7" y1="23" x2="18.3" y2="18" />
            </g>
            <circle cx="14" cy="20.5" r="1.4" fill="#D4AF37" />
          </>
        ) : (
          <>
            <path
              d="M14 12 L22 20.5 L14 29.5 L6 20.5 Z"
              fill={accentColor}
              fillOpacity="0.08"
              stroke={accentColor}
              strokeOpacity="0.6"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <circle cx="14" cy="20.5" r="1.6" fill="#D4AF37" fillOpacity="0.85" />
          </>
        )}
      </svg>
    </div>
  )
}

/**
 * Quiet flat corner snowflake watermark placed behind the lower whitespace
 * of each package card so text remains completely crisp.
 */
export function CardSnowflakeWatermark({ popular }: { popular: boolean }) {
  const active = useChristmasDesignActive()
  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-14 right-3 select-none ${
        popular ? 'text-[#7B2D8E]/[0.07]' : 'text-[#7B2D8E]/[0.045]'
      }`}
    >
      <FlatSnowflakeSvg className="w-16 h-16" strokeWidth={1.25} />
    </div>
  )
}

/**
 * Subtle flat snowflake corner accents for the Gift Cards callout.
 */
export function HolidayCornerSnowflakes() {
  const active = useChristmasDesignActive()
  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <div className="absolute top-3 right-3 text-[#7B2D8E]/20">
        <FlatSnowflakeSvg className="w-6 h-6" strokeWidth={1.4} />
      </div>
      <div className="hidden sm:block absolute bottom-3 right-12 text-[#D4AF37]/45">
        <FlatSnowflakeSvg className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="hidden sm:block absolute top-4 left-4 text-[#7B2D8E]/15">
        <FlatSnowflakeSvg className="w-5 h-5" strokeWidth={1.4} />
      </div>
    </div>
  )
}
