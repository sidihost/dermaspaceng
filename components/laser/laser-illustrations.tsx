import type { CSSProperties } from 'react'
import { computeLaserPulseRings } from '@/lib/christmas-hero-math'

interface IllustrationProps {
  className?: string
}

/**
 * LaserHairRemovalIllustration
 * ----------------------------
 * Clean, flat animated Dermaspace illustration for Laser Hair Removal.
 * Replaces awkward clinical stock photos with a sleek Sapphire Diode
 * handpiece gliding over smooth plum-silk contours and cooling pulse rings.
 * Zero gradients, zero shadows, zero Sparkles/Zap icons.
 */
export function LaserHairRemovalIllustration({ className = '' }: IllustrationProps) {
  const pulseRings = computeLaserPulseRings(3, 3.0)

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#240933] select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        fill="none"
      >
        {/* Architectural Backdrop Shapes */}
        <rect width="640" height="400" fill="#240933" />
        <path
          d="M270 0 H640 V400 H180 C215 265, 250 130, 270 0 Z"
          fill="#2F0C44"
        />
        <circle cx="460" cy="128" r="134" fill="#3B1154" />
        <circle cx="460" cy="128" r="98" stroke="#7B2D8E" strokeWidth="1.5" strokeOpacity="0.7" />

        {/* Left-Side Botanical Orchid & Silk Motif (below top-left pill, above bottom title bar) */}
        <g className="laser-orb-float" style={{ animationDelay: '0.3s' }}>
          <circle cx="136" cy="176" r="48" fill="#2F0C44" stroke="#5A1D6A" strokeWidth="1.2" />
          <path d="M136 140 C148 158, 148 172, 136 180 C124 172, 124 158, 136 140 Z" fill="#7B2D8E" />
          <path d="M136 212 C148 194, 148 180, 136 172 C124 180, 124 194, 136 212 Z" fill="#5A1D6A" />
          <path d="M100 176 C118 164, 132 164, 140 176 C132 188, 118 188, 100 176 Z" fill="#9B4DB0" />
          <path d="M172 176 C154 164, 140 164, 132 176 C140 188, 154 188, 172 176 Z" fill="#D8B4FE" />
          <circle cx="136" cy="176" r="5" fill="#FFFFFF" />
        </g>

        {/* Subtle Botanical Eucalyptus Sprig (Top-Right Framing) */}
        <g className="laser-orb-float" style={{ animationDelay: '0.8s' }}>
          <path d="M558 186 Q574 128 594 82" stroke="#9B4DB0" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="570" cy="148" rx="16" ry="7.5" transform="rotate(-35 570 148)" fill="#5A1D6A" />
          <ellipse cx="586" cy="128" rx="15" ry="7" transform="rotate(28 586 128)" fill="#7B2D8E" />
          <ellipse cx="578" cy="104" rx="13" ry="6" transform="rotate(-30 578 104)" fill="#9B4DB0" />
          <circle cx="594" cy="82" r="5" fill="#E9D5FF" />
        </g>

        {/* Smooth Layered Silk Skin Contour Waves (Sweeping across full width, elevated above bottom cards) */}
        <path
          d="M0 258 C160 228, 340 198, 640 232 V400 H0 Z"
          fill="#4A1766"
        />
        <path
          d="M0 278 C185 244, 385 212, 640 248 V400 H0 Z"
          fill="#5A1D6A"
        />
        <path
          d="M0 264 C175 232, 365 204, 640 238"
          stroke="#E9D5FF"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Expanding Concentric Cooling Pulse Rings at Elevated Contact Focal Point */}
        {pulseRings.map((ring) => {
          const style = {
            '--pulse-dur': `${ring.durationSec}s`,
            '--pulse-delay': `${ring.delaySec}s`,
          } as CSSProperties
          return (
            <circle
              key={ring.index}
              cx="452"
              cy="208"
              r={ring.baseRadius}
              stroke={ring.index === 0 ? '#FFFFFF' : '#D8B4FE'}
              strokeWidth="1.75"
              className="laser-pulse-ring"
              style={style}
            />
          )
        })}
        <circle cx="452" cy="208" r="5.5" fill="#FFFFFF" />

        {/* Sleek Gliding Sapphire Diode Handpiece */}
        <g className="laser-glide">
          {/* Calm precision light cone */}
          <path
            d="M440 142 L464 142 L478 206 L426 206 Z"
            fill="#E9D5FF"
            fillOpacity="0.32"
            className="laser-beam-sweep"
          />

          {/* Ergonomic Angled Applicator Head */}
          <g transform="translate(412, 26) rotate(-14 40 60)">
            {/* Upper smooth handle */}
            <rect x="20" y="0" width="38" height="80" rx="18" fill="#FFFFFF" />
            <rect x="44" y="6" width="14" height="68" rx="7" fill="#E9D5FF" />
            {/* Signature Dermaspace purple collar */}
            <rect x="18" y="64" width="42" height="16" rx="6" fill="#7B2D8E" />
            {/* Lower white nozzle */}
            <path d="M23 80 H55 L50 106 H28 Z" fill="#F5ECF8" />
            {/* Sapphire chill crystal tip */}
            <rect x="26" y="106" width="26" height="10" rx="4" fill="#D8B4FE" />
            <circle cx="39" cy="36" r="5" fill="#7B2D8E" />
          </g>
        </g>

        {/* Minimal Floating Cooling Dew Motes */}
        <circle cx="288" cy="118" r="5" fill="#D8B4FE" className="laser-orb-float" />
        <circle
          cx="326"
          cy="88"
          r="3.5"
          fill="#FFFFFF"
          className="laser-orb-float"
          style={{ animationDelay: '1.1s' }}
        />
        <circle
          cx="526"
          cy="176"
          r="4"
          fill="#E9D5FF"
          className="laser-orb-float"
          style={{ animationDelay: '1.7s' }}
        />
      </svg>
    </div>
  )
}

/**
 * CarbonPeelIllustration
 * ----------------------
 * Clean, flat animated Dermaspace visual for the Hollywood Carbon Peel.
 * Depicts the obsidian carbon veil swept cleanly by purple light ribbons
 * into luminous porcelain clarity.
 */
export function CarbonPeelIllustration({ className = '' }: IllustrationProps) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#240933] select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 440 360"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        fill="none"
      >
        <rect width="440" height="360" fill="#240933" />

        {/* Architectural Soft Frame Circle */}
        <circle cx="242" cy="146" r="108" fill="#350F4A" />
        <circle cx="242" cy="146" r="96" stroke="#7B2D8E" strokeWidth="1.4" />

        {/* Left Obsidian Carbon Crescent */}
        <path
          d="M242 62 C195 62, 158 99, 158 146 C158 193, 195 230, 242 230 C222 198, 222 94, 242 62 Z"
          fill="#15041F"
        />

        {/* Right Luminous Glass-Skin Crescent */}
        <path
          d="M242 62 C289 62, 326 99, 326 146 C326 193, 289 230, 242 230 C262 198, 262 94, 242 62 Z"
          fill="#F5ECF8"
        />
        <path
          d="M256 88 C282 104, 294 128, 290 162"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Rhythmic Vertical Laser Sweep Ribbon */}
        <g className="laser-glide">
          <rect x="234" y="42" width="16" height="208" rx="8" fill="#7B2D8E" fillOpacity="0.45" className="laser-beam-sweep" />
          <line x1="242" y1="36" x2="242" y2="254" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="242" cy="146" r="10" fill="#FFFFFF" />
          <circle cx="242" cy="146" r="4.5" fill="#7B2D8E" />
        </g>

        {/* Botanical Accent Leaf (Upper Left clear of NEW pill) */}
        <g className="laser-orb-float">
          <ellipse cx="96" cy="108" rx="18" ry="8" transform="rotate(-38 96 108)" fill="#5A1D6A" />
          <ellipse cx="118" cy="134" rx="14" ry="6.5" transform="rotate(-14 118 134)" fill="#7B2D8E" />
          <circle cx="144" cy="96" r="4" fill="#D8B4FE" />
          <circle cx="348" cy="198" r="5" fill="#E9D5FF" />
          <circle cx="328" cy="84" r="3.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  )
}

/**
 * SkinRejuvenationIllustration
 * ----------------------------
 * Clean blooming botanical petal & tonal renewal geometry.
 */
export function SkinRejuvenationIllustration({ className = '' }: IllustrationProps) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#240933] select-none ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" className="w-full h-full block" fill="none">
        <rect width="160" height="160" fill="#240933" />
        <circle cx="80" cy="80" r="54" fill="#3B1154" />
        <circle cx="80" cy="80" r="42" stroke="#9B4DB0" strokeWidth="1.5" className="laser-pulse-ring" />
        <path d="M80 34 C94 54, 94 72, 80 80 C66 72, 66 54, 80 34 Z" fill="#F5ECF8" />
        <path d="M80 126 C94 106, 94 88, 80 80 C66 88, 66 106, 80 126 Z" fill="#D8B4FE" />
        <path d="M34 80 C54 66, 72 66, 80 80 C72 94, 54 94, 34 80 Z" fill="#9B4DB0" />
        <path d="M126 80 C106 66, 88 66, 80 80 C88 94, 106 94, 126 80 Z" fill="#7B2D8E" />
        <circle cx="80" cy="80" r="9" fill="#FFFFFF" />
        <circle cx="80" cy="80" r="4" fill="#7B2D8E" />
      </svg>
    </div>
  )
}

/**
 * LaserMiniThumb
 * --------------
 * High-contrast 80×80 square thumbnail illustrations for the homepage Laser section.
 */
export function LaserMiniThumb({
  variant,
  className = '',
}: {
  variant: 'hair-removal' | 'rejuvenation' | 'carbon-peel'
  className?: string
}) {
  if (variant === 'carbon-peel') {
    return (
      <div className={`w-full h-full bg-[#240933] ${className}`} aria-hidden="true">
        <svg viewBox="0 0 80 80" className="w-full h-full block" fill="none">
          <rect width="80" height="80" fill="#240933" />
          <circle cx="40" cy="40" r="24" fill="#3B1154" />
          <path d="M40 19 C28 19, 19 28, 19 40 C19 52, 28 61, 40 61 Z" fill="#14041F" />
          <path d="M40 19 C52 19, 61 28, 61 40 C61 52, 52 61, 40 61 Z" fill="#F5ECF8" />
          <line x1="40" y1="14" x2="40" y2="66" stroke="#D8B4FE" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="40" r="4" fill="#7B2D8E" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      </div>
    )
  }

  if (variant === 'rejuvenation') {
    return <SkinRejuvenationIllustration className={className} />
  }

  return (
    <div className={`w-full h-full bg-[#240933] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 80 80" className="w-full h-full block" fill="none">
        <rect width="80" height="80" fill="#240933" />
        <circle cx="40" cy="40" r="26" fill="#3B1154" />
        <path d="M12 58 Q40 46 68 58 V80 H12 Z" fill="#5A1D6A" />
        <path d="M14 58 Q40 46 66 58" stroke="#E9D5FF" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="40" cy="52" r="10" stroke="#D8B4FE" strokeWidth="1.4" className="laser-pulse-ring" />
        <g transform="translate(31, 16) rotate(-12 9 14)">
          <rect x="4" y="0" width="11" height="22" rx="5" fill="#FFFFFF" />
          <rect x="3" y="18" width="13" height="5" rx="2" fill="#7B2D8E" />
          <rect x="5" y="23" width="9" height="6" rx="2" fill="#D8B4FE" />
        </g>
      </svg>
    </div>
  )
}
