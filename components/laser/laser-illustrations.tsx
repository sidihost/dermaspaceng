import { computeLaserPulseRings } from '@/lib/christmas-hero-math'

interface IllustrationProps {
  className?: string
}

/**
 * LaserHairRemovalIllustration
 * ----------------------------
 * Clean, flat static Dermaspace illustration for Laser Hair Removal.
 * Depicts a sleek Sapphire Diode handpiece poised over smooth plum-silk
 * contours and concentric cooling rings.
 * Zero animations, zero gradients, zero shadows, zero Sparkles/Zap icons.
 */
export function LaserHairRemovalIllustration({ className = '' }: IllustrationProps) {
  const pulseRings = computeLaserPulseRings(3, 3.0)

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#7B2D8E] select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        fill="none"
      >
        {/* Architectural Backdrop Shapes */}
        <rect width="640" height="400" fill="#7B2D8E" />
        <path
          d="M270 0 H640 V400 H180 C215 265, 250 130, 270 0 Z"
          fill="#5A1D6A"
        />
        <circle cx="460" cy="128" r="134" fill="#7B2D8E" />
        <circle cx="460" cy="128" r="98" stroke="#D8B4FE" strokeWidth="1.5" strokeOpacity="0.65" />

        {/* Left-Side Botanical Orchid & Silk Motif */}
        <g>
          <circle cx="136" cy="176" r="48" fill="#5A1D6A" stroke="#D8B4FE" strokeOpacity="0.55" strokeWidth="1.2" />
          <path d="M136 140 C148 158, 148 172, 136 180 C124 172, 124 158, 136 140 Z" fill="#9B4DB0" />
          <path d="M136 212 C148 194, 148 180, 136 172 C124 180, 124 194, 136 212 Z" fill="#E9D5FF" />
          <path d="M100 176 C118 164, 132 164, 140 176 C132 188, 118 188, 100 176 Z" fill="#7B2D8E" />
          <path d="M172 176 C154 164, 140 164, 132 176 C140 188, 154 188, 172 176 Z" fill="#D8B4FE" />
          <circle cx="136" cy="176" r="5" fill="#FFFFFF" />
        </g>

        {/* Subtle Botanical Eucalyptus Sprig (Top-Right Framing) */}
        <g>
          <path d="M558 186 Q574 128 594 82" stroke="#D8B4FE" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="570" cy="148" rx="16" ry="7.5" transform="rotate(-35 570 148)" fill="#9B4DB0" />
          <ellipse cx="586" cy="128" rx="15" ry="7" transform="rotate(28 586 128)" fill="#D8B4FE" />
          <ellipse cx="578" cy="104" rx="13" ry="6" transform="rotate(-30 578 104)" fill="#9B4DB0" />
          <circle cx="594" cy="82" r="5" fill="#FFFFFF" />
        </g>

        {/* Smooth Layered Silk Skin Contour Waves */}
        <path
          d="M0 258 C160 228, 340 198, 640 232 V400 H0 Z"
          fill="#9B4DB0"
        />
        <path
          d="M0 278 C185 244, 385 212, 640 248 V400 H0 Z"
          fill="#5A1D6A"
        />
        <path
          d="M0 264 C175 232, 365 204, 640 238"
          stroke="#FFFFFF"
          strokeOpacity="0.85"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Crisp Static Concentric Cooling Rings at Contact Focal Point */}
        {pulseRings.map((ring) => (
          <circle
            key={ring.index}
            cx="452"
            cy="208"
            r={ring.baseRadius}
            stroke={ring.index === 0 ? '#FFFFFF' : '#E9D5FF'}
            strokeOpacity={Number((0.8 - ring.index * 0.2).toFixed(2))}
            strokeWidth="1.5"
          />
        ))}
        <circle cx="452" cy="208" r="5.5" fill="#FFFFFF" />

        {/* Sleek Static Sapphire Diode Handpiece */}
        <g>
          {/* Precision light cone */}
          <path
            d="M440 142 L464 142 L478 206 L426 206 Z"
            fill="#FFFFFF"
            fillOpacity="0.22"
          />

          {/* Ergonomic Angled Applicator Head */}
          <g transform="translate(412, 26) rotate(-14 40 60)">
            {/* Upper smooth handle */}
            <rect x="20" y="0" width="38" height="80" rx="18" fill="#FFFFFF" />
            <rect x="44" y="6" width="14" height="68" rx="7" fill="#E9D5FF" />
            {/* Deep plum collar contrasting cleanly against handle & backdrop */}
            <rect x="18" y="64" width="42" height="16" rx="6" fill="#5A1D6A" />
            {/* Lower white nozzle */}
            <path d="M23 80 H55 L50 106 H28 Z" fill="#F5ECF8" />
            {/* Sapphire chill crystal tip */}
            <rect x="26" y="106" width="26" height="10" rx="4" fill="#D8B4FE" />
            <circle cx="39" cy="36" r="5" fill="#7B2D8E" />
          </g>
        </g>

        {/* Static Cooling Dew Accents */}
        <circle cx="288" cy="118" r="5" fill="#D8B4FE" />
        <circle cx="326" cy="88" r="3.5" fill="#FFFFFF" />
        <circle cx="526" cy="176" r="4" fill="#E9D5FF" />
      </svg>
    </div>
  )
}

/**
 * CarbonPeelIllustration
 * ----------------------
 * Clean, flat static Dermaspace visual for the Hollywood Carbon Peel.
 * Depicts the deep-plum carbon veil swept cleanly by light ribbons
 * into luminous porcelain clarity using Dermaspace brand purple tones.
 */
export function CarbonPeelIllustration({ className = '' }: IllustrationProps) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#7B2D8E] select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 440 360"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        fill="none"
      >
        <rect width="440" height="360" fill="#7B2D8E" />

        {/* Architectural Soft Frame Circle */}
        <circle cx="242" cy="142" r="90" fill="#9B4DB0" />
        <circle cx="242" cy="142" r="80" stroke="#E9D5FF" strokeOpacity="0.65" strokeWidth="1.4" />

        {/* Left Deep-Plum Carbon Crescent */}
        <path
          d="M242 72 C203 72, 172 103, 172 142 C172 181, 203 212, 242 212 C224 184, 224 100, 242 72 Z"
          fill="#5A1D6A"
        />

        {/* Right Luminous Glass-Skin Crescent */}
        <path
          d="M242 72 C281 72, 312 103, 312 142 C312 181, 281 212, 242 212 C260 184, 260 100, 242 72 Z"
          fill="#F5ECF8"
        />
        <path
          d="M254 94 C276 108, 286 128, 282 156"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Crisp Static Vertical Laser Sweep Ribbon */}
        <g>
          <rect x="235" y="54" width="14" height="176" rx="7" fill="#E9D5FF" fillOpacity="0.45" />
          <line x1="242" y1="48" x2="242" y2="236" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="242" cy="142" r="9" fill="#FFFFFF" />
          <circle cx="242" cy="142" r="4" fill="#7B2D8E" />
        </g>

        {/* Botanical Accent Leaf */}
        <g>
          <ellipse cx="98" cy="112" rx="17" ry="7.5" transform="rotate(-38 98 112)" fill="#5A1D6A" />
          <ellipse cx="120" cy="136" rx="13" ry="6" transform="rotate(-14 120 136)" fill="#9B4DB0" />
          <circle cx="144" cy="96" r="4" fill="#D8B4FE" />
          <circle cx="348" cy="192" r="5" fill="#E9D5FF" />
          <circle cx="328" cy="84" r="3.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  )
}

/**
 * SkinRejuvenationIllustration
 * ----------------------------
 * Clean static blooming botanical petal & tonal renewal geometry.
 */
export function SkinRejuvenationIllustration({ className = '' }: IllustrationProps) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#7B2D8E] select-none ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" className="w-full h-full block" fill="none">
        <rect width="160" height="160" fill="#7B2D8E" />
        <circle cx="80" cy="80" r="54" fill="#5A1D6A" />
        <circle cx="80" cy="80" r="42" stroke="#D8B4FE" strokeOpacity="0.6" strokeWidth="1.5" />
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
 * High-contrast 80x80 square static thumbnail illustrations for the homepage Laser section.
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
      <div className={`w-full h-full bg-[#7B2D8E] ${className}`} aria-hidden="true">
        <svg viewBox="0 0 80 80" className="w-full h-full block" fill="none">
          <rect width="80" height="80" fill="#7B2D8E" />
          <circle cx="40" cy="40" r="24" fill="#9B4DB0" />
          <path d="M40 19 C28 19, 19 28, 19 40 C19 52, 28 61, 40 61 Z" fill="#5A1D6A" />
          <path d="M40 19 C52 19, 61 28, 61 40 C61 52, 52 61, 40 61 Z" fill="#F5ECF8" />
          <line x1="40" y1="14" x2="40" y2="66" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="40" r="4" fill="#7B2D8E" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      </div>
    )
  }

  if (variant === 'rejuvenation') {
    return <SkinRejuvenationIllustration className={className} />
  }

  return (
    <div className={`w-full h-full bg-[#7B2D8E] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 80 80" className="w-full h-full block" fill="none">
        <rect width="80" height="80" fill="#7B2D8E" />
        <circle cx="40" cy="40" r="26" fill="#9B4DB0" />
        <path d="M12 58 Q40 46 68 58 V80 H12 Z" fill="#5A1D6A" />
        <path d="M14 58 Q40 46 66 58" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="40" cy="52" r="10" stroke="#D8B4FE" strokeWidth="1.4" />
        <g transform="translate(31, 16) rotate(-12 9 14)">
          <rect x="4" y="0" width="11" height="22" rx="5" fill="#FFFFFF" />
          <rect x="3" y="18" width="13" height="5" rx="2" fill="#5A1D6A" />
          <rect x="5" y="23" width="9" height="6" rx="2" fill="#D8B4FE" />
        </g>
      </svg>
    </div>
  )
}
