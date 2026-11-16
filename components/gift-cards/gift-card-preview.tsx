'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import {
  Award,
  Cake,
  Flower2,
  Gem,
  Gift,
  Heart,
  Leaf,
  Snowflake,
} from 'lucide-react'
import {
  getDesignMedallionHex,
  getGiftCardOccasionMeta,
  resolveOccasionMotif,
  type GiftCardDesign,
  type GiftCardOccasionMotif,
} from '@/lib/gift-card-templates'

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

function EditorialFrame({ accentHex }: { accentHex: string }) {
  return (
    <>
      <path
        d="M208 0 H360 V227 H208 C190 176, 190 51, 208 0 Z"
        fill={accentHex}
        fillOpacity="0.48"
      />
      <path
        d="M236 0 H360 V227 H236 C220 175, 220 52, 236 0 Z"
        fill={accentHex}
        fillOpacity="0.38"
      />
      {/* Subtle architectural brand lavender spine */}
      <path
        d="M208 6 C192 54, 192 173, 208 221"
        stroke="#E9D5FF"
        strokeOpacity="0.36"
        strokeWidth="0.9"
      />
      {/* Clean single architectural hairline frame clear of typography */}
      <rect
        x="6.5"
        y="6.5"
        width="347"
        height="212"
        rx="12"
        stroke="#E9D5FF"
        strokeOpacity="0.3"
        strokeWidth="0.9"
      />
    </>
  )
}

function ChristmasCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />
        <rect
          x="291"
          y="9"
          width="10"
          height="207"
          fill={accentHex}
          fillOpacity="0.45"
        />
        <line
          x1="291"
          y1="9"
          x2="291"
          y2="216"
          stroke="#E9D5FF"
          strokeOpacity="0.38"
          strokeWidth="0.85"
        />
        <line
          x1="301"
          y1="9"
          x2="301"
          y2="216"
          stroke="#E9D5FF"
          strokeOpacity="0.38"
          strokeWidth="0.85"
        />
        <g transform="translate(0, 18)">
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
          <circle cx="284" cy="27" r="3.4" fill="#C63D3D" />
          <circle cx="291" cy="26" r="3.1" fill="#D94E4E" />
          <circle cx="288" cy="32.5" r="2.9" fill="#B22D2D" />
          <circle cx="283" cy="26" r="0.9" fill="#FDE2E2" />
        </g>
        <g>
          <line
            x1="262"
            y1="42"
            x2="262"
            y2="68"
            stroke="#E9D5FF"
            strokeOpacity="0.85"
            strokeWidth="1.2"
          />
          <rect x="256" y="67" width="12" height="5" rx="1.5" fill="#E9D5FF" />
          <path d="M262 67 C254 60, 246 64, 255 69 Z" fill="#E9D5FF" />
          <path d="M262 67 C270 60, 278 64, 269 69 Z" fill="#E9D5FF" />
          <circle
            cx="262"
            cy="98"
            r="26"
            fill={medallionHex}
            stroke="#E9D5FF"
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
          <circle cx="262" cy="98" r="3" fill="#E9D5FF" />
        </g>
        <g>
          <line
            x1="319"
            y1="47"
            x2="319"
            y2="92"
            stroke="#E9D5FF"
            strokeOpacity="0.8"
            strokeWidth="1.15"
          />
          <rect x="314" y="91" width="10" height="4.5" rx="1.5" fill="#E9D5FF" />
          <circle
            cx="319"
            cy="115"
            r="19.5"
            fill="#B8333A"
            stroke="#E9D5FF"
            strokeWidth="1.5"
          />
          <path
            d="M300.5 111 H337.5 M300.5 119 H337.5"
            stroke="#E9D5FF"
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
        <g stroke="#F3E8FF" strokeOpacity="0.55" strokeWidth="1.15" strokeLinecap="round">
          <g transform="translate(226, 62)">
            <line x1="0" y1="-7" x2="0" y2="7" />
            <line x1="-6.1" y1="-3.5" x2="6.1" y2="3.5" />
            <line x1="6.1" y1="-3.5" x2="-6.1" y2="3.5" />
            <circle cx="0" cy="0" r="1.4" fill="#E9D5FF" stroke="none" />
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
            <circle cx="0" cy="0" r="1.3" fill="#E9D5FF" stroke="none" />
          </g>
        </g>
        <circle cx="215" cy="118" r="1.4" fill="#E9D5FF" fillOpacity="0.45" />
        <circle cx="282" cy="144" r="1.6" fill="#E9D5FF" fillOpacity="0.65" />
        <circle cx="342" cy="138" r="1.3" fill="#E9D5FF" fillOpacity="0.4" />
        <circle cx="268" cy="154" r="1.3" fill="#E9D5FF" fillOpacity="0.4" />
      </svg>
    </div>
  )
}

function BirthdayCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Celebratory pennant banner positioned below the top header strip */}
        <g transform="translate(0, 20)" opacity="0.88">
          <path
            d="M206 16 Q275 40 348 22"
            stroke="#E9D5FF"
            strokeOpacity="0.7"
            strokeWidth="1.2"
          />
          <polygon points="222,21 232,24 224,33" fill="#F9D5E5" />
          <polygon points="244,26 255,28 248,38" fill="#E9D5FF" />
          <polygon points="268,29 279,30 273,40" fill="#F8F0FC" />
          <polygon points="292,29 303,29 298,39" fill="#F4A6B8" />
          <polygon points="316,27 327,25 323,36" fill="#E9D5FF" />
        </g>

        {/* Circular medallion backing behind celebration cake */}
        <circle
          cx="286"
          cy="118"
          r="50"
          fill={medallionHex}
          fillOpacity="0.55"
          stroke="#E9D5FF"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />

        {/* Pedestal cake stand */}
        <rect x="260" y="156" width="52" height="4.5" rx="2.25" fill="#E9D5FF" />
        <rect x="281" y="160" width="10" height="7" fill="#E9D5FF" />
        <rect x="268" y="166" width="36" height="4" rx="2" fill="#E9D5FF" />

        {/* Bottom tier */}
        <rect
          x="252"
          y="128"
          width="68"
          height="28"
          rx="5"
          fill="#F8F0FC"
          stroke="#E9D5FF"
          strokeWidth="1.2"
        />
        <path
          d="M252 136 Q260.5 143 269 136 Q277.5 143 286 136 Q294.5 143 303 136 Q311.5 143 320 136 V128 H252 Z"
          fill="#F4A6B8"
        />
        <rect x="252" y="147" width="68" height="4" fill="#E9D5FF" fillOpacity="0.85" />

        {/* Top tier */}
        <rect
          x="264"
          y="102"
          width="44"
          height="26"
          rx="5"
          fill="#FDE8EF"
          stroke="#E9D5FF"
          strokeWidth="1.2"
        />
        <path
          d="M264 110 Q271 116 278.5 110 Q286 116 293.5 110 Q301 116 308 110 V102 H264 Z"
          fill="#E9D5FF"
        />
        <circle cx="274" cy="120" r="2" fill="#7B2D8E" />
        <circle cx="286" cy="120" r="2" fill="#B8336A" />
        <circle cx="298" cy="120" r="2" fill="#7B2D8E" />

        {/* Three slender celebration candles with flat warm flames */}
        {[273, 286, 299].map((cx) => (
          <g key={cx}>
            <rect x={cx - 2.2} y="83" width="4.4" height="19" rx="2" fill="#F8F0FC" />
            <line x1={cx - 2} y1="89" x2={cx + 2} y2="92" stroke="#E9D5FF" strokeWidth="1.2" />
            <line x1={cx - 2} y1="95" x2={cx + 2} y2="98" stroke="#E9D5FF" strokeWidth="1.2" />
            <path
              d={`M${cx} 70 C${cx + 4.5} 75, ${cx + 4} 81, ${cx} 81 C${cx - 4} 81, ${cx - 4.5} 75, ${cx} 70 Z`}
              fill="#E9D5FF"
            />
            <path
              d={`M${cx} 73.5 C${cx + 2.2} 76.5, ${cx + 2} 79.5, ${cx} 79.5 C${cx - 2} 79.5, ${cx - 2.2} 76.5, ${cx} 73.5 Z`}
              fill="#FFF4D2"
            />
          </g>
        ))}

        {/* Flat festive ribbons & geometric confetti strictly on the right */}
        <path
          d="M225 78 C231 72, 237 82, 243 76"
          stroke="#F9D5E5"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M332 82 C338 88, 333 95, 340 101"
          stroke="#E9D5FF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="229" y="122" width="6" height="6" rx="1.2" transform="rotate(24 229 122)" fill="#E9D5FF" />
        <rect x="334" y="138" width="6" height="6" rx="1.2" transform="rotate(-18 334 138)" fill="#F9D5E5" />
        <circle cx="240" cy="154" r="3" fill="#F8F0FC" fillOpacity="0.8" />
        <circle cx="337" cy="60" r="2.8" fill="#E9D5FF" />
        <circle cx="222" cy="100" r="2.2" fill="#F4A6B8" />
      </svg>
    </div>
  )
}

function AnniversaryCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Vertical champagne ribbon band */}
        <rect x="281" y="9" width="10" height="207" fill="#E9D5FF" fillOpacity="0.22" />

        {/* Medallion backdrop */}
        <circle
          cx="286"
          cy="112"
          r="46"
          fill={medallionHex}
          fillOpacity="0.55"
          stroke="#E9D5FF"
          strokeOpacity="0.5"
          strokeWidth="1.2"
        />
        <circle
          cx="286"
          cy="112"
          r="39"
          stroke="#F8F0FC"
          strokeOpacity="0.25"
          strokeWidth="0.9"
          strokeDasharray="3 3"
        />

        {/* Botanical laurel leaves hugging bottom arc */}
        <path
          d="M248 134 C262 152, 310 152, 324 134"
          stroke="#A7D7C5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <ellipse cx="256" cy="138" rx="6" ry="3" transform="rotate(-35 256 138)" fill="#A7D7C5" />
        <ellipse cx="268" cy="144" rx="6" ry="3" transform="rotate(-15 268 144)" fill="#74B49B" />
        <ellipse cx="304" cy="144" rx="6" ry="3" transform="rotate(15 304 144)" fill="#74B49B" />
        <ellipse cx="316" cy="138" rx="6" ry="3" transform="rotate(35 316 138)" fill="#A7D7C5" />

        {/* Twin interlocking anniversary rings */}
        <circle cx="274" cy="110" r="20" stroke="#E9D5FF" strokeWidth="4.5" />
        <circle cx="298" cy="110" r="20" stroke="#F8F0FC" strokeWidth="4.5" />
        <circle cx="274" cy="110" r="20" stroke="#FFF4D2" strokeOpacity="0.5" strokeWidth="1" />

        {/* Faceted diamond crest at the crown */}
        <polygon points="286,78 294,85 286,93 278,85" fill="#F8F0FC" stroke="#E9D5FF" strokeWidth="1.2" />

        {/* Small accent beads */}
        <circle cx="242" cy="84" r="2.2" fill="#E9D5FF" />
        <circle cx="330" cy="84" r="2.2" fill="#E9D5FF" />
        <circle cx="286" cy="154" r="2.6" fill="#E9D5FF" />
      </svg>
    </div>
  )
}

function ThankYouCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Soft stationery frame card behind bouquet */}
        <rect
          x="240"
          y="46"
          width="92"
          height="132"
          rx="14"
          fill={medallionHex}
          fillOpacity="0.5"
          stroke="#E9D5FF"
          strokeOpacity="0.45"
          strokeWidth="1.1"
        />

        {/* Eucalyptus stems */}
        <path d="M286 146 C284 118, 276 92, 265 68" stroke="#A7D7C5" strokeWidth="2" strokeLinecap="round" />
        <path d="M286 146 C290 116, 298 92, 310 70" stroke="#74B49B" strokeWidth="2" strokeLinecap="round" />
        <path d="M286 146 L286 66" stroke="#A7D7C5" strokeWidth="2" strokeLinecap="round" />

        {/* Botanical leaves */}
        <ellipse cx="268" cy="96" rx="9" ry="5" transform="rotate(-35 268 96)" fill="#A7D7C5" />
        <ellipse cx="305" cy="98" rx="9" ry="5" transform="rotate(35 305 98)" fill="#74B49B" />
        <ellipse cx="272" cy="118" rx="8" ry="4.5" transform="rotate(-25 272 118)" fill="#74B49B" />
        <ellipse cx="301" cy="120" rx="8" ry="4.5" transform="rotate(25 301 120)" fill="#A7D7C5" />

        {/* Chamomile / blossom flowers */}
        <g transform="translate(286, 72)">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-9"
              rx="4.5"
              ry="7.5"
              transform={`rotate(${deg})`}
              fill="#F8F0FC"
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#E9D5FF" />
        </g>

        <g transform="translate(263, 76) scale(0.75)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-8"
              rx="4.2"
              ry="7"
              transform={`rotate(${deg})`}
              fill="#F9D5E5"
            />
          ))}
          <circle cx="0" cy="0" r="4.5" fill="#E9D5FF" />
        </g>

        <g transform="translate(310, 78) scale(0.75)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-8"
              rx="4.2"
              ry="7"
              transform={`rotate(${deg})`}
              fill="#F9D5E5"
            />
          ))}
          <circle cx="0" cy="0" r="4.5" fill="#E9D5FF" />
        </g>

        {/* Tied ribbon bow & wax gratitude seal */}
        <path d="M286 138 C272 130, 266 142, 280 144 Z" fill="#E9D5FF" />
        <path d="M286 138 C300 130, 306 142, 292 144 Z" fill="#E9D5FF" />
        <path d="M283 144 L274 166 M289 144 L298 166" stroke="#E9D5FF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="286" cy="142" r="9.5" fill="#D98B9E" stroke="#F8F0FC" strokeWidth="1.2" />
        <circle cx="286" cy="142" r="5.5" stroke="#FFF4D2" strokeWidth="0.9" />
      </svg>
    </div>
  )
}

function SelfCareCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Concentric calm sanctuary ripples */}
        <ellipse
          cx="286"
          cy="144"
          rx="54"
          ry="16"
          stroke="#E9D5FF"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <ellipse
          cx="286"
          cy="144"
          rx="40"
          ry="11"
          stroke="#E9D5FF"
          strokeOpacity="0.48"
          strokeWidth="1.1"
        />
        <ellipse
          cx="286"
          cy="144"
          rx="25"
          ry="6.5"
          fill={medallionHex}
          fillOpacity="0.5"
          stroke="#F8F0FC"
          strokeOpacity="0.45"
          strokeWidth="1"
        />

        {/* Serene botanical lotus flower */}
        <path
          d="M286 136 C256 130, 240 108, 244 88 C262 94, 276 112, 286 136 Z"
          fill="#D8B4E2"
        />
        <path
          d="M286 136 C316 130, 332 108, 328 88 C310 94, 296 112, 286 136 Z"
          fill="#D8B4E2"
        />
        <path
          d="M286 136 C266 118, 258 94, 266 72 C280 86, 286 108, 286 136 Z"
          fill="#F3E8FF"
        />
        <path
          d="M286 136 C306 118, 314 94, 306 72 C292 86, 286 108, 286 136 Z"
          fill="#F3E8FF"
        />
        <path
          d="M286 136 C272 110, 272 80, 286 60 C300 80, 300 110, 286 136 Z"
          fill="#FFFFFF"
          stroke="#E9D5FF"
          strokeWidth="1.2"
        />
        <circle cx="286" cy="96" r="4" fill="#E9D5FF" />

        {/* Balanced smooth spa stones below ripple */}
        <ellipse cx="286" cy="164" rx="22" ry="7.5" fill={medallionHex} stroke="#E9D5FF" strokeWidth="1.1" />
        <ellipse cx="286" cy="153" rx="14" ry="5.5" fill="#A7D7C5" stroke="#F8F0FC" strokeWidth="1" />

        {/* Subtle botanical dew drops */}
        <circle cx="242" cy="64" r="2.2" fill="#E9D5FF" />
        <circle cx="330" cy="68" r="2.2" fill="#A7D7C5" />
        <circle cx="286" cy="46" r="2.5" fill="#F8F0FC" />
      </svg>
    </div>
  )
}

function WeddingCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Cathedral bridal floral arch */}
        <path
          d="M242 174 V96 C242 64, 330 64, 330 96 V174"
          fill={medallionHex}
          fillOpacity="0.52"
          stroke="#F8F0FC"
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />
        <path
          d="M250 174 V98 C250 74, 322 74, 322 98 V174"
          stroke="#E9D5FF"
          strokeOpacity="0.45"
          strokeWidth="1"
        />

        {/* Floral clusters crowning the arch */}
        <circle cx="286" cy="66" r="9" fill="#F8F0FC" />
        <circle cx="274" cy="70" r="6.5" fill="#F9D5E5" />
        <circle cx="298" cy="70" r="6.5" fill="#F9D5E5" />
        <circle cx="286" cy="66" r="3.5" fill="#E9D5FF" />
        <ellipse cx="263" cy="76" rx="7" ry="3.2" transform="rotate(-25 263 76)" fill="#A7D7C5" />
        <ellipse cx="309" cy="76" rx="7" ry="3.2" transform="rotate(25 309 76)" fill="#A7D7C5" />

        {/* Interlocking bridal rings */}
        <circle cx="277" cy="122" r="15.5" stroke="#E9D5FF" strokeWidth="3.8" />
        <circle cx="295" cy="122" r="15.5" stroke="#F8F0FC" strokeWidth="3.8" />
        <polygon points="286,95 292,101 286,108 280,101" fill="#F8F0FC" stroke="#E9D5FF" strokeWidth="1" />

        {/* Satin ribbon floor sash */}
        <path
          d="M258 156 H314 L308 164 L314 172 H258 L264 164 Z"
          fill="#E9D5FF"
          fillOpacity="0.9"
        />
        <line x1="268" y1="164" x2="304" y2="164" stroke={medallionHex} strokeOpacity="0.55" strokeWidth="1" />
      </svg>
    </div>
  )
}

function MothersDayCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Soft circular halo behind peony */}
        <circle
          cx="286"
          cy="108"
          r="46"
          fill={medallionHex}
          fillOpacity="0.5"
          stroke="#E9D5FF"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />

        {/* Curved stem & botanical leaves */}
        <path
          d="M286 122 C286 144, 282 162, 276 176"
          stroke="#A7D7C5"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M284 148 C268 140, 260 148, 264 158 C274 160, 281 155, 284 148 Z"
          fill="#A7D7C5"
        />
        <path
          d="M285 138 C302 130, 312 138, 307 148 C296 150, 289 145, 285 138 Z"
          fill="#74B49B"
        />

        {/* Layered blooming peony rose */}
        <g transform="translate(286, 104)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-18"
              rx="10"
              ry="14"
              transform={`rotate(${deg})`}
              fill="#F4A6B8"
            />
          ))}
          {[22.5, 82.5, 142.5, 202.5, 262.5, 322.5].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-12"
              rx="8"
              ry="11"
              transform={`rotate(${deg})`}
              fill="#F9D5E5"
            />
          ))}
          <circle cx="0" cy="0" r="11" fill="#F8F0FC" />
          <circle cx="0" cy="0" r="5.5" fill="#E9D5FF" />
        </g>

        {/* Champagne corner flourish dots */}
        <circle cx="242" cy="68" r="2.2" fill="#E9D5FF" />
        <circle cx="330" cy="74" r="2.2" fill="#F9D5E5" />
        <circle cx="322" cy="154" r="2.4" fill="#E9D5FF" />
      </svg>
    </div>
  )
}

function ValentinesCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Twin vertical silk ribbon trim */}
        <rect x="281" y="9" width="10" height="207" fill="#F4A6B8" fillOpacity="0.22" />

        {/* Medallion ring */}
        <circle
          cx="286"
          cy="112"
          r="46"
          fill={medallionHex}
          fillOpacity="0.55"
          stroke="#E9D5FF"
          strokeOpacity="0.5"
          strokeWidth="1.2"
        />

        {/* Back ivory hairline heart */}
        <path
          d="M296 144 C296 144, 264 124, 264 102 C264 90, 274 82, 285 88 C291 91, 294 96, 296 99 C298 96, 301 91, 307 88 C318 82, 328 90, 328 102 C328 124, 296 144, 296 144 Z"
          fill="#F9D5E5"
          fillOpacity="0.25"
          stroke="#F8F0FC"
          strokeWidth="1.6"
        />

        {/* Front sculpted rose heart */}
        <path
          d="M278 148 C278 148, 248 128, 248 106 C248 94, 258 86, 269 92 C274 95, 277 99, 278 102 C279 99, 282 95, 287 92 C298 86, 308 94, 308 106 C308 128, 278 148, 278 148 Z"
          fill="#D4577A"
          stroke="#E9D5FF"
          strokeWidth="1.6"
        />
        <circle cx="265" cy="105" r="3" fill="#F9D5E5" fillOpacity="0.85" />

        {/* Delicate floating petals */}
        <ellipse cx="236" cy="76" rx="4.5" ry="2.5" transform="rotate(-30 236 76)" fill="#F9D5E5" />
        <ellipse cx="336" cy="82" rx="4.5" ry="2.5" transform="rotate(30 336 82)" fill="#E9D5FF" />
        <ellipse cx="328" cy="148" rx="4" ry="2.2" transform="rotate(-20 328 148)" fill="#F4A6B8" />
      </svg>
    </div>
  )
}

function JustBecauseCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />

        {/* Medallion halo */}
        <circle
          cx="286"
          cy="116"
          r="46"
          fill={medallionHex}
          fillOpacity="0.55"
          stroke="#E9D5FF"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />

        {/* Luxury gift box body */}
        <rect
          x="256"
          y="104"
          width="60"
          height="48"
          rx="6"
          fill="#F8F0FC"
          stroke="#E9D5FF"
          strokeWidth="1.4"
        />
        {/* Box lid */}
        <rect
          x="252"
          y="94"
          width="68"
          height="13"
          rx="4"
          fill="#FFFFFF"
          stroke="#E9D5FF"
          strokeWidth="1.4"
        />
        {/* Vertical & horizontal satin ribbons */}
        <rect x="281" y="94" width="10" height="58" fill="#E9D5FF" />
        <rect x="256" y="124" width="60" height="7" fill={accentHex} fillOpacity="0.85" />

        {/* Sculpted ribbon bow */}
        <path
          d="M286 94 C272 78, 256 86, 272 94 Z"
          fill="#E9D5FF"
          stroke="#FFF4D2"
          strokeWidth="1"
        />
        <path
          d="M286 94 C300 78, 316 86, 300 94 Z"
          fill="#E9D5FF"
          stroke="#FFF4D2"
          strokeWidth="1"
        />
        <circle cx="286" cy="93" r="4.5" fill={medallionHex} stroke="#FFF4D2" strokeWidth="1" />

        {/* Playful botanical & confetti dots */}
        <circle cx="236" cy="80" r="2.8" fill="#E9D5FF" />
        <circle cx="334" cy="84" r="2.8" fill="#F9D5E5" />
        <circle cx="242" cy="146" r="2.4" fill="#A7D7C5" />
        <circle cx="332" cy="148" r="2.4" fill="#E9D5FF" />
      </svg>
    </div>
  )
}

function ClassicCardArtwork({
  accentHex,
  medallionHex,
}: {
  accentHex: string
  medallionHex: string
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 360 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <EditorialFrame accentHex={accentHex} />
        <circle
          cx="286"
          cy="112"
          r="38"
          fill={medallionHex}
          fillOpacity="0.45"
          stroke="#E9D5FF"
          strokeOpacity="0.4"
          strokeWidth="1.1"
        />
        <circle
          cx="286"
          cy="112"
          r="26"
          stroke="#F8F0FC"
          strokeOpacity="0.28"
          strokeWidth="0.9"
        />
        <path
          d="M286 90 C295 102, 295 122, 286 134 C277 122, 277 102, 286 90 Z"
          fill="#E9D5FF"
          fillOpacity="0.7"
        />
        <path
          d="M264 112 C276 103, 296 103, 308 112 C296 121, 276 121, 264 112 Z"
          fill="#F8F0FC"
          fillOpacity="0.6"
        />
      </svg>
    </div>
  )
}

function renderMotifArtwork(
  motif: GiftCardOccasionMotif,
  accentHex: string,
  medallionHex: string,
) {
  switch (motif) {
    case 'christmas':
      return <ChristmasCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'birthday':
      return <BirthdayCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'anniversary':
      return <AnniversaryCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'thank-you':
      return <ThankYouCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'self-care':
      return <SelfCareCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'wedding':
      return <WeddingCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'mothers-day':
      return <MothersDayCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'valentines':
      return <ValentinesCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'just-because':
      return <JustBecauseCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
    case 'classic':
    default:
      return <ClassicCardArtwork accentHex={accentHex} medallionHex={medallionHex} />
  }
}

export function getOccasionBadgeIcon(motif: GiftCardOccasionMotif) {
  switch (motif) {
    case 'christmas':
      return Snowflake
    case 'birthday':
      return Cake
    case 'anniversary':
      return Gem
    case 'thank-you':
      return Flower2
    case 'self-care':
      return Leaf
    case 'wedding':
      return Award
    case 'mothers-day':
      return Flower2
    case 'valentines':
      return Heart
    case 'just-because':
      return Gift
    case 'classic':
    default:
      return Gift
  }
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
  const motif = resolveOccasionMotif(occasion, design.id)
  const occasionMeta = getGiftCardOccasionMeta(occasion)
  const medallionHex = getDesignMedallionHex(design)

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
        data-occasion-motif={motif}
        className="relative aspect-[1.586/1] w-full rounded-2xl p-4 sm:p-5 overflow-hidden border border-[#E9D5FF]/40 flex flex-col justify-between"
        style={{ backgroundColor: design.surfaceHex }}
      >
        {renderMotifArtwork(motif, design.accentHex, medallionHex)}

        {/* Top Row — crisp local white Dermaspace logo mark */}
        <div className="relative flex items-start justify-between gap-2 shrink-0">
          <div className="relative inline-flex items-center">
            <Image
              src="/images/dermaspace-header-logo.png"
              alt="Dermaspace"
              width={118}
              height={32}
              referrerPolicy="no-referrer"
              style={{ width: 'auto' }}
              className="h-4 sm:h-6 w-auto object-contain brightness-0 invert"
            />
          </div>
          <div className="text-right shrink-0 pt-0.5">
            <span className="block text-[8.5px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E9D5FF] whitespace-nowrap">
              Gift Card
            </span>
          </div>
        </div>

        {/* Center Left — Recipient + Amount locked clear of right motif */}
        <div className="relative max-w-[53%] space-y-1.5 sm:space-y-2.5 my-auto py-0.5">
          <div>
            <p className="text-[7.5px] sm:text-[8.5px] uppercase tracking-[0.18em] text-[#E9D5FF] font-semibold leading-none mb-1">
              Presented To
            </p>
            <p
              className={`text-[13px] sm:text-base font-semibold text-white leading-tight line-clamp-2 ${fontClassName}`}
            >
              {recipientName?.trim() || 'Recipient Name'}
            </p>
          </div>

          <div>
            <p className="text-[7.5px] sm:text-[8.5px] uppercase tracking-[0.18em] text-white/70 font-semibold leading-none mb-1">
              Card Value
            </p>
            <p
              className={`text-lg sm:text-2xl font-bold text-white tabular-nums tracking-tight leading-none ${fontClassName}`}
            >
              {amountText}
            </p>
          </div>
        </div>

        {/* Bottom Row — hairline brand rule + edition & sender */}
        <div className="relative shrink-0 pt-1.5 sm:pt-2 border-t border-[#E9D5FF]/30 flex items-center justify-between gap-2">
          <span className="text-[9px] sm:text-[11px] font-medium text-white/90 tracking-wide truncate">
            {occasion ? occasionMeta.editionLabel : 'Signature Edition'}
          </span>
          <p className="text-[#E9D5FF] text-[9px] sm:text-[11px] truncate text-right">
            From:{' '}
            <span className="text-white font-semibold">
              {senderName?.trim() || 'Your Name'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function GiftCardQrCode({
  value,
  size = 112,
  className = '',
}: {
  value: string
  size?: number
  className?: string
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!value) return

    QRCode.toDataURL(value, {
      width: Math.max(240, size * 2),
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1a0d1f',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl(null)
      })

    return () => {
      active = false
    }
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        aria-label="Generating QR verification code"
        className={`aspect-square w-full bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded flex items-center justify-center text-[9px] font-mono text-[#7B2D8E] ${className}`}
      >
        QR
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR verification code for ${value}`}
      width={size}
      height={size}
      className={`aspect-square w-full h-auto block bg-white ${className}`}
    />
  )
}

interface GiftCardBackPreviewProps {
  design: GiftCardDesign
  verificationCode: string
  verificationUrl: string
  senderName?: string | null
  personalMessage?: string | null
  fontClassName?: string
  showBleedGuide?: boolean
  className?: string
}

export function GiftCardBackPreview({
  design,
  verificationCode,
  verificationUrl,
  senderName,
  personalMessage,
  fontClassName = 'font-serif',
  showBleedGuide = false,
  className = '',
}: GiftCardBackPreviewProps) {
  void design

  return (
    <div className={`relative ${className}`}>
      <div
        data-testid="gift-card-back-preview"
        data-verification-code={verificationCode}
        className="relative aspect-[1.586/1] w-full rounded-2xl bg-white overflow-hidden border border-[#7B2D8E]/30 flex flex-col justify-between"
      >
        {/* Top Security / Brand Header Band */}
        <div className="shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#7B2D8E] border-b-2 border-[#E9D5FF] flex items-center justify-between gap-2">
          <Image
            src="/images/dermaspace-header-logo.png"
            alt="Dermaspace"
            width={102}
            height={28}
            referrerPolicy="no-referrer"
            style={{ width: 'auto' }}
            className="h-3.5 sm:h-5 w-auto object-contain brightness-0 invert"
          />
          <div className="text-right leading-tight">
            <span className="block text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.18em] text-[#E9D5FF]">
              Authorized Gift Card
            </span>
            <span className="block text-[8.5px] sm:text-[10px] font-mono font-bold text-white tracking-wider">
              {verificationCode}
            </span>
          </div>
        </div>

        {/* Center Safe-Area Body */}
        <div className="relative flex-1 px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 min-h-0 overflow-hidden bg-white">
          {showBleedGuide && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-2 border border-dashed border-[#7B2D8E]/45 rounded-lg"
            />
          )}

          {/* Left Column — Unboxed Editorial Note & Redemption Terms */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 sm:gap-2.5 overflow-hidden">
            <div className="min-w-0 space-y-1">
              {personalMessage?.trim() && (
                <p className="text-[6.5px] sm:text-[7.5px] uppercase tracking-[0.18em] font-bold text-[#7B2D8E] leading-none">
                  Personal Note
                </p>
              )}
              <p
                className={`text-[9.5px] sm:text-[11px] text-[#1a0d1f] leading-[1.35] line-clamp-3 ${fontClassName}`}
              >
                {`\u201C${
                  personalMessage?.trim() ||
                  'An invitation to rest, restore, and glow at Dermaspace Esthetic & Wellness Centre.'
                }\u201D`}
              </p>
              {senderName?.trim() && (
                <p className="text-[8px] sm:text-[9px] font-semibold text-[#7B2D8E] leading-none truncate pt-0.5">
                  — {senderName.trim()}
                </p>
              )}
            </div>

            <div className="shrink-0 pt-1.5 border-t border-[#7B2D8E]/15 space-y-0.5 text-[7.5px] sm:text-[8.5px] text-gray-600 leading-[1.25]">
              <p className="font-semibold text-[#1a0d1f] uppercase tracking-[0.14em] text-[6.5px] sm:text-[7.5px] leading-none">
                How to Redeem
              </p>
              <p className="truncate">Present card at VI or Ikoyi reception.</p>
              <p className="truncate">Valid on spa treatments · Never expires.</p>
            </div>
          </div>

          {/* Right Column — Live Scannable QR Security Module */}
          <div className="w-[30%] max-w-[104px] shrink-0 rounded-xl bg-white border border-[#7B2D8E]/20 p-1.5 sm:p-2 flex flex-col items-center justify-center">
            <GiftCardQrCode value={verificationUrl} size={112} />
            <span className="mt-1 text-[6px] sm:text-[7px] font-bold uppercase tracking-[0.08em] text-[#7B2D8E] text-center whitespace-nowrap leading-tight">
              Scan to Verify
            </span>
          </div>
        </div>

        {/* Bottom Branch Footer */}
        <div className="shrink-0 px-3.5 sm:px-5 py-1 sm:py-1.5 border-t border-[#7B2D8E]/15 bg-[#FAF6FB] flex items-center justify-between gap-2 text-[7px] sm:text-[8.5px] text-gray-600">
          <span className="truncate font-medium">
            237B Muri Okunola St, VI · 9 Agbeke Rotinwa Cl, Ikoyi
          </span>
          <span className="font-semibold text-[#7B2D8E] shrink-0">
            dermaspaceng.com
          </span>
        </div>
      </div>
    </div>
  )
}
