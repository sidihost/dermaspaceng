'use client'

import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { generateFestiveSnowflakes } from '@/lib/christmas-hero-math'

interface ChristmasHeroIllustrationProps {
  active?: boolean
}

const TONE_FILL: Record<'white' | 'lilac' | 'orchid', string> = {
  white: 'rgba(255, 255, 255, 0.86)',
  lilac: 'rgba(233, 213, 255, 0.82)',
  orchid: 'rgba(216, 180, 254, 0.72)',
}

/**
 * Geometric 6-arm snow crystal (pure flat SVG strokes, no Zap/Sparkles glyphs).
 */
function CrystalGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="3.34" y1="7" x2="20.66" y2="17" />
        <line x1="20.66" y1="7" x2="3.34" y2="17" />
        <polyline points="9.5,5 12,7.5 14.5,5" />
        <polyline points="9.5,19 12,16.5 14.5,19" />
      </g>
    </svg>
  )
}

/**
 * ChristmasHeroIllustration
 * -------------------------
 * Clean, flat architectural Dermaspace Christmas Sanctuary illustration.
 * Uses pure solid brand colors (#240933, #350F4A, #5A1D6A, #7B2D8E, #D8B4FE,
 * #E9D5FF, #F5ECF8, #FFFFFF), zero gradients, zero shadows, zero dashed lines,
 * and zero Sparkles/Zap icons.
 */
export function ChristmasHeroIllustration({ active = true }: ChristmasHeroIllustrationProps) {
  const snowflakes = useMemo(() => generateFestiveSnowflakes(16, 20261225), [])

  return (
    <div
      data-testid="christmas-hero-illustration"
      aria-hidden="true"
      className="relative w-full h-full overflow-hidden bg-[#240933] select-none"
    >
      {/* Subtle flat architectural corner band on right half (desktop only) */}
      <div className="hidden md:block absolute top-0 right-0 bottom-0 w-[44%] bg-[#2C0B3E]" />

      {/* Desktop & Tablet Right-Side Architectural Sanctuary Tableau */}
      <div className="hidden md:flex absolute inset-x-0 top-0 bottom-[74px] right-[6%] lg:right-[8%] xl:right-[9%] pt-4 pb-2 items-end justify-end pointer-events-none">
        <svg
          viewBox="0 0 420 450"
          className="h-full max-h-[435px] w-auto block"
          fill="none"
        >
          {/* Outer solid sanctuary arch */}
          <path
            d="M44 450 V206 C44 96 122 24 210 24 C298 24 376 96 376 206 V450 Z"
            fill="#350F4A"
            stroke="#7B2D8E"
            strokeWidth="1.5"
          />

          {/* Inner delicate framing arch */}
          <path
            d="M64 450 V210 C64 114 130 46 210 46 C290 46 356 114 356 210 V450"
            stroke="#5A1D6A"
            strokeWidth="1.25"
          />

          {/* Calm minimalist crescent & star constellation inside upper arch */}
          <circle cx="114" cy="128" r="3" fill="#D8B4FE" fillOpacity="0.65" />
          <circle cx="308" cy="118" r="2.5" fill="#FFFFFF" fillOpacity="0.65" />
          <circle cx="286" cy="166" r="2" fill="#E9D5FF" fillOpacity="0.55" />

          {/* Left Suspended Plum Bauble */}
          <g className={active ? 'christmas-sway-a' : undefined}>
            <line x1="126" y1="68" x2="126" y2="162" stroke="#D8B4FE" strokeWidth="1.25" />
            {/* Ribbon collar */}
            <rect x="119" y="160" width="14" height="7" rx="2.5" fill="#E9D5FF" />
            <path d="M126 160 C118 152, 110 156, 118 162 Z" fill="#D8B4FE" />
            <path d="M126 160 C134 152, 142 156, 134 162 Z" fill="#D8B4FE" />
            {/* Bauble sphere */}
            <circle cx="126" cy="197" r="32" fill="#7B2D8E" stroke="#E9D5FF" strokeWidth="1.25" />
            {/* Crisp snowflake line motif */}
            <g stroke="#F5ECF8" strokeWidth="1.5" strokeLinecap="round">
              <line x1="126" y1="181" x2="126" y2="213" />
              <line x1="112" y1="189" x2="140" y2="205" />
              <line x1="140" y1="189" x2="112" y2="205" />
              <circle cx="126" cy="197" r="3.5" fill="#7B2D8E" stroke="#F5ECF8" strokeWidth="1.4" />
            </g>
          </g>

          {/* Center High Luminous Pearl Bauble */}
          <g className={active ? 'christmas-sway-b' : undefined}>
            <line x1="210" y1="24" x2="210" y2="108" stroke="#E9D5FF" strokeWidth="1.25" />
            <rect x="202" y="106" width="16" height="8" rx="3" fill="#7B2D8E" />
            <path d="M210 106 C201 97, 192 101, 201 108 Z" fill="#9B4DB0" />
            <path d="M210 106 C219 97, 228 101, 219 108 Z" fill="#9B4DB0" />
            <circle cx="210" cy="152" r="40" fill="#F5ECF8" />
            <circle cx="210" cy="152" r="32" stroke="#D8B4FE" strokeWidth="1.2" />
            {/* Minimalist 4-petal botanical orchid mark */}
            <path
              d="M210 132 C215 142, 215 148, 210 152 C205 148, 205 142, 210 132 Z"
              fill="#7B2D8E"
            />
            <path
              d="M210 172 C215 162, 215 156, 210 152 C205 156, 205 162, 210 172 Z"
              fill="#7B2D8E"
            />
            <path
              d="M190 152 C200 147, 206 147, 210 152 C206 157, 200 157, 190 152 Z"
              fill="#9B4DB0"
            />
            <path
              d="M230 152 C220 147, 214 147, 210 152 C214 157, 220 157, 230 152 Z"
              fill="#9B4DB0"
            />
            <circle cx="210" cy="152" r="3.5" fill="#F5ECF8" />
          </g>

          {/* Right Finial Drop Ornament */}
          <g className={active ? 'christmas-sway-a' : undefined} style={{ animationDelay: '0.8s' }}>
            <line x1="294" y1="68" x2="294" y2="148" stroke="#D8B4FE" strokeWidth="1.25" />
            <rect x="288" y="146" width="12" height="6" rx="2" fill="#FFFFFF" />
            <path
              d="M294 152 C314 166, 318 192, 294 218 C270 192, 274 166, 294 152 Z"
              fill="#5A1D6A"
              stroke="#D8B4FE"
              strokeWidth="1.25"
            />
            <path d="M279 182 H309" stroke="#E9D5FF" strokeWidth="1.4" />
            <circle cx="294" cy="182" r="4" fill="#FFFFFF" />
          </g>

          {/* Winter Botanical Eucalyptus Sprigs behind plinth */}
          <g className={active ? 'christmas-botanical-breathe' : undefined}>
            {/* Left sprig */}
            <path d="M106 382 Q122 330 146 286" stroke="#9B4DB0" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="115" cy="346" rx="14" ry="7" transform="rotate(-38 115 346)" fill="#5A1D6A" />
            <ellipse cx="132" cy="332" rx="13" ry="6.5" transform="rotate(24 132 332)" fill="#7B2D8E" />
            <ellipse cx="122" cy="312" rx="12" ry="6" transform="rotate(-32 122 312)" fill="#9B4DB0" />
            <ellipse cx="142" cy="298" rx="11" ry="5.5" transform="rotate(28 142 298)" fill="#D8B4FE" />
            <circle cx="148" cy="282" r="4.5" fill="#F5ECF8" />

            {/* Right sprig */}
            <path d="M314 382 Q296 334 276 292" stroke="#9B4DB0" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="305" cy="346" rx="14" ry="7" transform="rotate(36 305 346)" fill="#5A1D6A" />
            <ellipse cx="288" cy="334" rx="13" ry="6.5" transform="rotate(-24 288 334)" fill="#7B2D8E" />
            <ellipse cx="296" cy="314" rx="12" ry="6" transform="rotate(30 296 314)" fill="#9B4DB0" />
            <ellipse cx="279" cy="300" rx="10" ry="5" transform="rotate(-26 279 300)" fill="#D8B4FE" />
            <circle cx="274" cy="288" r="4" fill="#F5ECF8" />
          </g>

          {/* Architectural Plinth Base (sits cleanly above bottom white bar) */}
          <rect x="72" y="382" width="276" height="44" rx="6" fill="#5A1D6A" />
          <rect x="72" y="382" width="276" height="6" rx="3" fill="#7B2D8E" />

          {/* Apothecary Dropper Serum Bottle (Left on Plinth) */}
          <g>
            <rect x="116" y="318" width="44" height="64" rx="10" fill="#F5ECF8" />
            <rect x="122" y="336" width="32" height="28" rx="4" fill="#FFFFFF" stroke="#D8B4FE" strokeWidth="1" />
            <line x1="129" y1="347" x2="147" y2="347" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" />
            <line x1="133" y1="354" x2="143" y2="354" stroke="#9B4DB0" strokeWidth="1.5" strokeLinecap="round" />
            {/* Collar & Pipette */}
            <rect x="129" y="307" width="18" height="11" rx="3" fill="#7B2D8E" />
            <rect x="133" y="294" width="10" height="14" rx="5" fill="#5A1D6A" />
          </g>

          {/* Signature Dermaspace Gift Box (Center on Plinth) */}
          <g>
            {/* Box body - crisp flat two-tone */}
            <rect x="172" y="302" width="84" height="80" rx="4" fill="#FFFFFF" />
            <rect x="234" y="302" width="22" height="80" rx="2" fill="#E9D5FF" />
            {/* Lid */}
            <rect x="167" y="290" width="94" height="16" rx="4" fill="#F5ECF8" />
            <rect x="234" y="290" width="27" height="16" rx="2" fill="#D8B4FE" />
            {/* Signature Purple Ribbon */}
            <rect x="206" y="290" width="16" height="92" fill="#7B2D8E" />
            <rect x="167" y="334" width="89" height="12" fill="#7B2D8E" />
            <rect x="234" y="334" width="22" height="12" fill="#5A1D6A" />
            {/* Ribbon Bow */}
            <path d="M214 290 C196 266, 178 278, 198 290 Z" fill="#7B2D8E" />
            <path d="M214 290 C232 266, 250 278, 230 290 Z" fill="#9B4DB0" />
            <circle cx="214" cy="288" r="5.5" fill="#5A1D6A" />
          </g>

          {/* Serene Botanical Candle (Right on Plinth) */}
          <g>
            {/* Flat halo ring behind flame */}
            <circle
              cx="288"
              cy="318"
              r="18"
              fill="#D8B4FE"
              fillOpacity="0.2"
              className={active ? 'christmas-flame-flicker' : undefined}
            />
            <rect x="269" y="336" width="38" height="46" rx="6" fill="#E9D5FF" />
            <rect x="275" y="346" width="26" height="4" rx="2" fill="#7B2D8E" />
            <line x1="288" y1="330" x2="288" y2="336" stroke="#5A1D6A" strokeWidth="1.8" />
            {/* Teardrop candle flame */}
            <path
              d="M288 308 C294 318, 294 328, 288 330 C282 328, 282 318, 288 308 Z"
              fill="#FFFFFF"
              className={active ? 'christmas-flame-flicker' : undefined}
            />
          </g>
        </svg>
      </div>

      {/* Mobile-Only Minimal Corner Ornament Accent (keeps copy 100% clear) */}
      <div className="md:hidden absolute top-0 right-2 w-14 pointer-events-none">
        <svg viewBox="0 0 64 88" className="w-full h-auto" fill="none">
          <g className={active ? 'christmas-sway-a' : undefined}>
            <line x1="34" y1="0" x2="34" y2="26" stroke="#D8B4FE" strokeWidth="1.2" />
            <rect x="30" y="24" width="8" height="4" rx="1.5" fill="#E9D5FF" />
            <circle cx="34" cy="45" r="16" fill="#7B2D8E" stroke="#E9D5FF" strokeWidth="1.2" />
            <g stroke="#F5ECF8" strokeWidth="1.2" strokeLinecap="round">
              <line x1="34" y1="36" x2="34" y2="54" />
              <line x1="26" y1="40.5" x2="42" y2="49.5" />
              <line x1="42" y1="40.5" x2="26" y2="49.5" />
            </g>
          </g>
        </svg>
      </div>

      {/* Deterministic Drifting Geometric Snowflakes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {snowflakes.map((flake, i) => {
          const fill = TONE_FILL[flake.tone]
          const style = {
            left: `${flake.xPercent}%`,
            top: `${flake.topOffsetPercent}%`,
            '--flake-dur': `${flake.durationSec}s`,
            '--flake-delay': `${flake.delaySec}s`,
            '--flake-drift': `${flake.driftPx}px`,
          } as CSSProperties

          return (
            <span
              key={i}
              style={style}
              className={`absolute block ${active ? 'christmas-flake-fall' : 'opacity-0'} ${
                i > 7 ? 'hidden md:block' : ''
              }`}
            >
              {flake.variant === 'crystal' ? (
                <CrystalGlyph size={flake.sizePx} color={fill} />
              ) : (
                <span
                  className="block rounded-full"
                  style={{
                    width: flake.sizePx,
                    height: flake.sizePx,
                    backgroundColor: fill,
                  }}
                />
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default ChristmasHeroIllustration
