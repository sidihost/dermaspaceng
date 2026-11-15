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

function FlatSnowflakeMark({
  className = 'w-5 h-5',
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
 * Bespoke, modular flat Christmas artwork layer rendered strictly for the
 * `christmas` template. Uses Dermaspace's sanctuary plum/violet geometry paired
 * with refined evergreen holly sprigs and crimson berries — zero gradients,
 * zero drop shadows, zero Sparkles/Zap icons.
 */
function ChristmasCardArtwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Flat architectural sanctuary accent panel on the right */}
      <div className="absolute top-0 right-0 bottom-0 w-[42%] rounded-l-[56px] bg-[#7B2D8E]/55" />

      {/* Crisp hairline holiday frame inset */}
      <div className="absolute inset-2.5 rounded-lg border border-[#E9D5FF]/25" />

      {/* Delicate ornament medallion & evergreen holly sprig in open right zone */}
      <svg
        viewBox="0 0 110 110"
        fill="none"
        className="absolute top-11 right-2.5 w-24 h-24"
      >
        {/* Subtle framing arch */}
        <path
          d="M24 102 C24 52, 54 18, 102 18"
          stroke="#D8B4FE"
          strokeOpacity="0.2"
          strokeWidth="1.1"
        />

        {/* Hanging cord from upper frame line */}
        <line
          x1="74"
          y1="4"
          x2="74"
          y2="24"
          stroke="#F5ECF8"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        {/* Crown cap & satin bow */}
        <rect
          x="69.5"
          y="23.5"
          width="9"
          height="4"
          rx="1.5"
          fill="#F5ECF8"
          fillOpacity="0.82"
        />
        <path
          d="M74 23.5 C68.5 18.5, 63 21, 69 24.5 Z"
          fill="#D8B4FE"
          fillOpacity="0.85"
        />
        <path
          d="M74 23.5 C79.5 18.5, 85 21, 79 24.5 Z"
          fill="#D8B4FE"
          fillOpacity="0.85"
        />

        {/* Bauble body */}
        <circle
          cx="74"
          cy="45"
          r="16.5"
          fill="#5A1D6A"
          stroke="#E9D5FF"
          strokeOpacity="0.65"
          strokeWidth="1.2"
        />
        <circle
          cx="74"
          cy="45"
          r="12"
          stroke="#D8B4FE"
          strokeOpacity="0.32"
          strokeWidth="0.9"
        />
        {/* Snowflake filigree inside bauble */}
        <g stroke="#F5ECF8" strokeOpacity="0.88" strokeWidth="1.15" strokeLinecap="round">
          <line x1="74" y1="36.5" x2="74" y2="53.5" />
          <line x1="66.6" y1="40.8" x2="81.4" y2="49.2" />
          <line x1="81.4" y1="40.8" x2="66.6" y2="49.2" />
          <circle cx="74" cy="45" r="2" fill="#5A1D6A" stroke="#F5ECF8" strokeWidth="1.1" />
        </g>

        {/* Evergreen holly sprig tucked below bauble */}
        <path
          d="M79 68 C71 66, 68 71, 70 76 C76 77, 81 74, 83 69 Z"
          fill="#2E7D32"
        />
        <path
          d="M84 67 C85 73, 90 76, 95 74 C95 69, 91 65, 85 65.5 Z"
          fill="#1B5E20"
        />
        <circle cx="81" cy="69" r="2.1" fill="#C5221F" />
        <circle cx="85" cy="67" r="1.9" fill="#E53935" />
        <circle cx="84" cy="71.5" r="1.7" fill="#D32F2F" />
      </svg>

      {/* Delicate corner snowflake watermark */}
      <div className="absolute bottom-3 left-3 text-white/15">
        <FlatSnowflakeMark className="w-6 h-6" strokeWidth={1.3} />
      </div>
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

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-full border border-white/25">
            {isChristmas ? (
              <Snowflake className="w-3 h-3 text-white" aria-hidden="true" />
            ) : (
              <Gift className="w-3 h-3 text-white" aria-hidden="true" />
            )}
            <span className="text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
              {isChristmas ? design.badgeLabel || 'Holiday Edition' : 'Gift Card'}
            </span>
          </div>
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
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/15 rounded-full border border-white/20">
              {occasion === 'Christmas' || isChristmas ? (
                <Snowflake className="w-2.5 h-2.5 text-white" aria-hidden="true" />
              ) : (
                <Heart className="w-2.5 h-2.5 text-white" aria-hidden="true" />
              )}
              <span className="text-[10px] font-medium text-white whitespace-nowrap">
                {occasion}
              </span>
            </div>
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
