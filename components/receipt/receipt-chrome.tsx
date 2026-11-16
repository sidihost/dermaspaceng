'use client'

import React from 'react'
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Printer,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Single-color (#7B2D8E) pattern styles for Dermaspace receipts.
 * Zero CSS gradients, zero shadows, zero custom SVG icon elements.
 */

const DIAMOND_CROWN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M7 1L13 5L7 9L1 5Z" stroke="#7B2D8E" stroke-opacity="0.28" stroke-width="1"/></svg>`,
)

const MASTHEAD_DOT_MATRIX_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="3" r="0.9" fill="#7B2D8E" fill-opacity="0.12"/><circle cx="11" cy="11" r="0.9" fill="#7B2D8E" fill-opacity="0.09"/></svg>`,
)

const TOTAL_LATTICE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1L17 9L9 17L1 9Z" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="0.9"/></svg>`,
)

export const RECEIPT_CROWN_BAND_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${DIAMOND_CROWN_SVG}")`,
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'center',
}

export const RECEIPT_MASTHEAD_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${MASTHEAD_DOT_MATRIX_SVG}")`,
  backgroundRepeat: 'repeat',
}

export const RECEIPT_TOTAL_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${TOTAL_LATTICE_SVG}")`,
  backgroundRepeat: 'repeat',
}

/**
 * Top geometric diamond trellis crown band shared across all Dermaspace receipts.
 */
export function ReceiptCrownBand({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('w-full', className)}>
      <div className="h-1 w-full bg-[#7B2D8E]" />
      <div
        className="h-3 w-full bg-[#F7F2FA] border-b border-[#7B2D8E]/25"
        style={RECEIPT_CROWN_BAND_STYLE}
      />
    </div>
  )
}

/**
 * Crisp corner registration brackets for the official receipt masthead / frame.
 */
export function ReceiptCornerMarks({
  inset = 'inset-2.5',
}: {
  inset?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute', inset)}
    >
      <span className="absolute top-0 left-0 h-2.5 w-2.5 border-t-2 border-l-2 border-[#7B2D8E]/45" />
      <span className="absolute top-0 right-0 h-2.5 w-2.5 border-t-2 border-r-2 border-[#7B2D8E]/45" />
      <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2 border-[#7B2D8E]/45" />
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2 border-[#7B2D8E]/45" />
    </div>
  )
}

/**
 * Tactile perforated tear-line divider with semicircular ticket notches and
 * centered #7B2D8E geometric diamond seal.
 */
export function ReceiptTearDivider({
  notchBgClass = 'bg-[#F7F5F9]',
  className,
}: {
  notchBgClass?: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative flex items-center py-2.5 print:py-2', className)}
    >
      <span
        className={cn(
          'absolute -left-2.5 h-4 w-4 rounded-full border-r border-[#7B2D8E]/20 print:hidden',
          notchBgClass,
        )}
      />
      <div className="w-full border-t border-dashed border-[#7B2D8E]/25" />
      <span className="mx-2.5 h-2 w-2 flex-shrink-0 rotate-45 bg-[#7B2D8E]" />
      <div className="w-full border-t border-dashed border-[#7B2D8E]/25" />
      <span
        className={cn(
          'absolute -right-2.5 h-4 w-4 rounded-full border-l border-[#7B2D8E]/20 print:hidden',
          notchBgClass,
        )}
      />
    </div>
  )
}

/**
 * Compact, single-color receipt action bar (Download Image, Download PDF, Print, Share).
 * Uniform h-8 (32px) sizing — never bulky or oversized.
 */
export function ReceiptActionButtons({
  onDownloadPdf,
  onDownloadImage,
  onPrint,
  onShare,
  downloadingPdf = false,
  downloadingImage = false,
  shared = false,
  shareMode = 'share',
  className,
}: {
  onDownloadPdf: () => void
  onDownloadImage: () => void
  onPrint?: () => void
  onShare?: () => void
  downloadingPdf?: boolean
  downloadingImage?: boolean
  shared?: boolean
  shareMode?: 'share' | 'copy'
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 print:hidden', className)}>
      <button
        type="button"
        onClick={onDownloadImage}
        disabled={downloadingImage}
        aria-label="Download receipt as image"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#7B2D8E]/30 bg-white px-2.5 text-xs font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F7F2FA] disabled:opacity-60 cursor-pointer"
      >
        {downloadingImage ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
        <span>{downloadingImage ? 'Saving…' : 'Image'}</span>
      </button>

      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={downloadingPdf}
        aria-label="Download receipt as PDF"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#7B2D8E] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A] disabled:opacity-60 cursor-pointer"
      >
        {downloadingPdf ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        <span>{downloadingPdf ? 'Saving…' : 'PDF'}</span>
      </button>

      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          aria-label="Print receipt"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print</span>
        </button>
      )}

      {onShare && (
        <button
          type="button"
          onClick={onShare}
          aria-label={shared ? 'Receipt copied' : 'Share receipt'}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] cursor-pointer"
        >
          {shared ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#7B2D8E]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              {shareMode === 'copy' ? (
                <Copy className="h-3.5 w-3.5" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              <span>Share</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
