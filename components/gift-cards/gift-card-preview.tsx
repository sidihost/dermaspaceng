'use client'

import Image from 'next/image'
import { Gift, Heart, Snowflake } from 'lucide-react'
import type { GiftCardDesign } from '@/lib/gift-card-templates'

interface GiftCardPreviewProps {
  design: GiftCardDesign
  amountText: string
  recipientName?: string | null
  senderName?: string | null
  occasion?: string | null
  fontClassName?: string
  showStack?: boolean
  className?: string
}


/**
 * Bespoke flat-vector Christmas artwork for the `christmas` template.
 * Built strictly with flat brand-cohesive fills and crisp hairline strokes
 * (sanctuary plum, deep violet, champagne gold, evergreen pine, crimson holly) —
 * zero CSS gradients, zero drop shadows, zero Sparkles/Zap icons.
 */
function ChristmasCardArtwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Full-bleed flat vector scene calibrated to card aspect */}
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Architectural right sanctuary arch */}
        <path
          d="M214 0 H360 V225 H214 C194 176, 194 49, 214 0 Z"
          fill="#6E2682"
        />
        <path
          d="M238 0 H360 V225 H238 C222 175, 222 50, 238 0 Z"
          fill="#7B2D8E"
          fillOpacity="0.55"
        />

        {/* Delicate outer & inner flat editorial border lines */}
        <rect
          x="9"
          y="9"
          width="342"
          height="207"
          rx="11"
          stroke="#E9D5FF"
          strokeOpacity="0.26"
          strokeWidth="1"
        />
        <rect
          x="13"
          y="13"
          width="334"
          height="199"
          rx="8"
          stroke="#E5C896"
          strokeOpacity="0.22"
          strokeWidth="0.75"
        />

        {/* Subtle flat gift ribbon framing the right third */}
        <rect
          x="291"
          y="9"
          width="10"
          height="207"
          fill="#8E3BA3"
          fillOpacity="0.45"
        />
        <line
          x1="291"
          y1="9"
          x2="291"
          y2="216"
          stroke="#E5C896"
          strokeOpacity="0.38"
          strokeWidth="0.85"
        />
        <line
          x1="301"
          y1="9"
          x2="301"
          y2="216"
          stroke="#E5C896"
          strokeOpacity="0.38"
          strokeWidth="0.85"
        />

        {/* Evergreen pine & holly garland sweep across top-right corner */}
        <g>
          {/* Pine needles */}
          <path
            d="M210 10 C248 22, 294 34, 350 28"
            stroke="#1B4332"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M226 15 L218 28 M236 18 L230 32 M248 21 L243 36 M260 23 L256 38 M273 25 L270 40 M286 27 L284 42 M300 28 L300 43 M314 29 L316 44 M328 29 L332 43 M340 28 L346 41"
            stroke="#2D6A4F"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M232 16 L241 10 M252 21 L262 14 M272 25 L283 17 M294 27 L305 18 M316 28 L328 19 M336 28 L346 20"
            stroke="#40916C"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          {/* Sculpted holly leaves */}
          <path
            d="M276 26 C264 20, 256 26, 255 34 C264 38, 273 35, 278 29 Z"
            fill="#2D6A4F"
          />
          <path
            d="M298 29 C305 20, 316 20, 321 28 C316 35, 305 36, 297 31 Z"
            fill="#1B4332"
          />
          <path
            d="M286 30 C282 40, 288 49, 296 51 C301 43, 298 34, 290 29 Z"
            fill="#40916C"
          />
          {/* Holly berries */}
          <circle cx="284" cy="27" r="3.4" fill="#C63D3D" />
          <circle cx="291" cy="26" r="3.1" fill="#D94E4E" />
          <circle cx="288" cy="32.5" r="2.9" fill="#B22D2D" />
          <circle cx="283" cy="26" r="0.9" fill="#FDE2E2" />
        </g>

        {/* Left hanging ornament — large champagne & plum filigree bauble */}
        <g>
          <line
            x1="262"
            y1="24"
            x2="262"
            y2="68"
            stroke="#E5C896"
            strokeOpacity="0.85"
            strokeWidth="1.2"
          />
          {/* Crown cap & tidy flat bow */}
          <rect
            x="256"
            y="67"
            width="12"
            height="5"
            rx="1.5"
            fill="#E5C896"
          />
          <path
            d="M262 67 C254 60, 246 64, 255 69 Z"
            fill="#E5C896"
          />
          <path
            d="M262 67 C270 60, 278 64, 269 69 Z"
            fill="#E5C896"
          />
          {/* Bauble shell */}
          <circle
            cx="262"
            cy="98"
            r="26"
            fill="#4A1558"
            stroke="#E5C896"
            strokeWidth="1.6"
          />
          <circle
            cx="262"
            cy="98"
            r="21"
            stroke="#F3E8FF"
            strokeOpacity="0.35"
            strokeWidth="0.9"
          />
          {/* Geometric snowflake filigree inside bauble */}
          <g stroke="#F8F0FC" strokeWidth="1.35" strokeLinecap="round">
            <line x1="262" y1="82" x2="262" y2="114" />
            <line x1="248.1" y1="90" x2="275.9" y2="106" />
            <line x1="275.9" y1="90" x2="248.1" y2="106" />
            <polyline points="258.5,86 262,89.5 265.5,86" fill="none" />
            <polyline points="258.5,110 262,106.5 265.5,110" fill="none" />
            <polyline points="250.5,94.5 254.8,93.8 253.8,89.5" fill="none" />
            <polyline points="273.5,101.5 269.2,102.2 270.2,106.5" fill="none" />
            <polyline points="270.2,89.5 269.2,93.8 273.5,94.5" fill="none" />
            <polyline points="253.8,106.5 254.8,102.2 250.5,101.5" fill="none" />
          </g>
          <circle cx="262" cy="98" r="3" fill="#E5C896" />
        </g>

        {/* Right hanging ornament — crimson & champagne jewel teardrop/round */}
        <g>
          <line
            x1="319"
            y1="29"
            x2="319"
            y2="92"
            stroke="#E5C896"
            strokeOpacity="0.8"
            strokeWidth="1.15"
          />
          <rect
            x="314"
            y="91"
            width="10"
            height="4.5"
            rx="1.5"
            fill="#E5C896"
          />
          <circle
            cx="319"
            cy="115"
            r="19.5"
            fill="#B8333A"
            stroke="#E5C896"
            strokeWidth="1.5"
          />
          {/* Crisp geometric band across crimson bauble */}
          <path
            d="M300.5 111 H337.5 M300.5 119 H337.5"
            stroke="#E5C896"
            strokeWidth="1.2"
          />
          <path
            d="M304 115 L311.5 111 L319 115 L326.5 111 L334 115 L326.5 119 L319 115 L311.5 119 Z"
            fill="#F6E9D7"
            fillOpacity="0.9"
          />
          <circle cx="319" cy="105" r="1.5" fill="#F6E9D7" fillOpacity="0.8" />
          <circle cx="319" cy="125" r="1.5" fill="#F6E9D7" fillOpacity="0.8" />
        </g>

        {/* Crisp flat snowflakes — placed strictly in the right artwork zone */}
        <g stroke="#F3E8FF" strokeOpacity="0.55" strokeWidth="1.15" strokeLinecap="round">
          <g transform="translate(226, 62)">
            <line x1="0" y1="-7" x2="0" y2="7" />
            <line x1="-6.1" y1="-3.5" x2="6.1" y2="3.5" />
            <line x1="6.1" y1="-3.5" x2="-6.1" y2="3.5" />
            <circle cx="0" cy="0" r="1.4" fill="#E5C896" stroke="none" />
          </g>
          <g transform="translate(242, 140)">
            <line x1="0" y1="-8.5" x2="0" y2="8.5" />
            <line x1="-7.4" y1="-4.25" x2="7.4" y2="4.25" />
            <line x1="7.4" y1="-4.25" x2="-7.4" y2="4.25" />
            <circle cx="0" cy="0" r="1.6" fill="#F3E8FF" stroke="none" />
          </g>
          <g transform="translate(337, 68)">
            <line x1="0" y1="-5.5" x2="0" y2="5.5" />
            <line x1="-4.8" y1="-2.75" x2="4.8" y2="2.75" />
            <line x1="4.8" y1="-2.75" x2="-4.8" y2="2.75" />
          </g>
          <g transform="translate(319, 152)">
            <line x1="0" y1="-6" x2="0" y2="6" />
            <line x1="-5.2" y1="-3" x2="5.2" y2="3" />
            <line x1="5.2" y1="-3" x2="-5.2" y2="3" />
            <circle cx="0" cy="0" r="1.3" fill="#E5C896" stroke="none" />
          </g>
        </g>

        {/* Soft snow-dot accents in upper/mid right half */}
        <circle cx="215" cy="118" r="1.4" fill="#E9D5FF" fillOpacity="0.45" />
        <circle cx="282" cy="144" r="1.6" fill="#E5C896" fillOpacity="0.65" />
        <circle cx="342" cy="138" r="1.3" fill="#E9D5FF" fillOpacity="0.4" />
        <circle cx="268" cy="154" r="1.3" fill="#E9D5FF" fillOpacity="0.4" />
      </svg>
    </div>
  )
}

export function GiftCardPreview({
  design,
  amountText,
  recipientName,
  senderName,
  occasion,
  fontClassName = 'font-serif',
  showStack = true,
  className = '',
}: GiftCardPreviewProps) {
  const isChristmas = design.id === 'christmas'

  return (
    <div className={`relative ${className}`}>
      {showStack && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-white/15 opacity-45"
            style={{ backgroundColor: design.accentHex }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl border border-white/20 opacity-65"
            style={{ backgroundColor: design.accentHex }}
          />
        </>
      )}

      <div
        data-testid="gift-card-preview"
        data-template={design.id}
        className="relative rounded-2xl p-5 overflow-hidden border border-white/25"
        style={{ backgroundColor: design.surfaceHex }}
      >
        {isChristmas ? (
          <ChristmasCardArtwork />
        ) : (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 bottom-0 w-2/5 rounded-l-[50px] opacity-35"
            style={{ backgroundColor: design.accentHex }}
          />
        )}

        {/* Top Row */}
        <div className="relative flex items-center justify-between gap-2 mb-6">
          <div className="relative inline-flex items-center gap-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              referrerPolicy="no-referrer"
              className="h-6 w-auto object-contain brightness-0 invert"
            />
          </div>

          {!isChristmas && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-full border border-white/25">
              <Gift className="w-3 h-3 text-white" aria-hidden="true" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                Gift Card
              </span>
            </div>
          )}
        </div>

        {/* Recipient */}
        <div className="relative mb-1">
          <p className={`text-white/75 text-xs ${fontClassName}`}>
            For:{' '}
            <span className="text-white font-semibold">
              {recipientName?.trim() || 'Recipient Name'}
            </span>
          </p>
        </div>

        {/* Amount */}
        <div className="relative mb-5">
          <p className="text-white/65 text-[10px] uppercase tracking-wider mb-0.5">
            Amount
          </p>
          <p className={`text-2xl font-bold text-white tabular-nums ${fontClassName}`}>
            {amountText}
          </p>
        </div>

        {/* Bottom Row */}
        <div className="relative flex items-center justify-between gap-2">
          {occasion ? (
            isChristmas ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                <Snowflake className="w-3 h-3 text-[#E5C896]" aria-hidden="true" />
                <span className="whitespace-nowrap">{occasion}</span>
              </span>
            ) : (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/15 rounded-full border border-white/20">
                <Heart className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                <span className="text-[10px] font-medium text-white whitespace-nowrap">
                  {occasion}
                </span>
              </div>
            )
          ) : (
            <span />
          )}
          <p className="text-white/80 text-xs truncate">
            From:{' '}
            <span className="text-white font-medium">
              {senderName?.trim() || 'Your Name'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
