'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FlipHorizontal2,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import {
  GiftCardBackPreview,
  GiftCardPreview,
} from '@/components/gift-cards/gift-card-preview'
import {
  CR80_SPEC,
  generateGiftCardA4CutSheetPdfBlob,
  generateGiftCardPrintShopPdfBlob,
  triggerBlobDownload,
} from '@/lib/gift-card-print-pdf'
import { buildGiftCardVerificationUrl } from '@/lib/gift-card-code-helpers'
import {
  findGiftCardDesignById,
  findGiftCardFontById,
} from '@/lib/gift-card-templates'

export interface GiftCardPrintStudioProps {
  id: number
  verificationCode: string
  amount: number
  designId?: string | null
  designName?: string | null
  occasion?: string | null
  fontId?: string | null
  fontName?: string | null
  recipientName: string
  senderName?: string | null
  personalMessage?: string | null
  issuedAt?: string | null
  compact?: boolean
}

type ViewMode = 'front' | 'back' | 'both'

export function GiftCardPrintStudio({
  id,
  verificationCode,
  amount,
  designId,
  designName,
  occasion,
  fontId,
  fontName,
  recipientName,
  senderName,
  personalMessage,
  issuedAt,
  compact = false,
}: GiftCardPrintStudioProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [showSafeGuide, setShowSafeGuide] = useState(false)
  const [downloadingType, setDownloadingType] = useState<'press' | 'a4' | null>(null)
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const chosenDesign = findGiftCardDesignById(designId || designName)
  const chosenFont = findGiftCardFontById(fontId || fontName)

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://dermaspaceng.com'
  const verificationUrl = buildGiftCardVerificationUrl(origin, verificationCode)
  const verifyPath = `/gift-cards/verify?code=${encodeURIComponent(verificationCode)}`
  const amountText = `₦${Math.max(0, Math.round(Number(amount) || 0)).toLocaleString('en-NG')}`

  const printInput = {
    id,
    verificationCode,
    verificationBaseUrl: origin,
    amount,
    designId: chosenDesign.id,
    designName: designName || chosenDesign.name,
    occasion,
    fontId: chosenFont.id,
    fontName: fontName || chosenFont.name,
    recipientName,
    senderName,
    personalMessage,
    issuedAt,
  }

  const handleDownloadPressPdf = async () => {
    setDownloadingType('press')
    setDownloadFeedback(null)
    try {
      const { blob, filename } = await generateGiftCardPrintShopPdfBlob(printInput)
      triggerBlobDownload(blob, filename)
      setDownloadFeedback(
        `Downloaded ${filename} (CR80 85.6 × 53.98 mm + 3 mm bleed & crop marks).`,
      )
    } catch {
      setDownloadFeedback('Unable to generate print-shop PDF right now.')
    } finally {
      setDownloadingType(null)
    }
  }

  const handleDownloadA4Sheet = async () => {
    setDownloadingType('a4')
    setDownloadFeedback(null)
    try {
      const { blob, filename } = await generateGiftCardA4CutSheetPdfBlob(printInput)
      triggerBlobDownload(blob, filename)
      setDownloadFeedback(
        `Downloaded ${filename} (A4 1:1 scale cut & proof sheet).`,
      )
    } catch {
      setDownloadFeedback('Unable to generate A4 cut sheet right now.')
    } finally {
      setDownloadingType(null)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(verificationCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 1800)
    } catch {
      // Ignore clipboard failure in restricted iframes
    }
  }

  return (
    <div
      data-testid="gift-card-print-studio"
      className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
    >
      {/* Studio Toolbar */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#FAF6FB] border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#7B2D8E]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#1a0d1f]">
              Print-Ready Card &amp; Verification Studio
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            ISO CR80 ({CR80_SPEC.trimWidthMm} × {CR80_SPEC.trimHeightMm} mm) ·{' '}
            {CR80_SPEC.bleedMm} mm bleed · Scannable QR back
          </p>
        </div>

        {/* View Mode Tabs */}
        <div
          role="tablist"
          aria-label="Gift card print view mode"
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 text-xs"
        >
          {(
            [
              { id: 'both', label: 'Both Sides' },
              { id: 'front', label: 'Front' },
              { id: 'back', label: 'Back (QR)' },
            ] as const
          ).map((tab) => {
            const active = viewMode === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(tab.id)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-600 hover:text-[#1a0d1f]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Card Canvas Stage */}
      <div className={compact ? 'p-4 space-y-4' : 'p-5 sm:p-6 space-y-5'}>
        <div
          className={`grid gap-5 items-start ${
            viewMode === 'both' && !compact
              ? 'lg:grid-cols-2'
              : 'grid-cols-1 max-w-md mx-auto'
          }`}
        >
          {(viewMode === 'front' || viewMode === 'both') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <span>Side 1 — Front Artwork</span>
                <span className="font-mono text-[10px] text-gray-400">
                  85.6 × 53.98 mm
                </span>
              </div>
              <div className="relative">
                <GiftCardPreview
                  design={chosenDesign}
                  amountText={amountText}
                  recipientName={recipientName}
                  senderName={senderName}
                  occasion={occasion}
                  fontClassName={chosenFont.className}
                  showStack={false}
                />
                {showSafeGuide && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-3 border border-dashed border-[#E9D5FF]/80 rounded-xl"
                  />
                )}
              </div>
            </div>
          )}

          {(viewMode === 'back' || viewMode === 'both') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <span>Side 2 — Back &amp; QR Verification</span>
                <span className="font-mono text-[10px] text-gray-400">
                  3 mm bleed ready
                </span>
              </div>
              <GiftCardBackPreview
                design={chosenDesign}
                verificationCode={verificationCode}
                verificationUrl={verificationUrl}
                senderName={senderName}
                personalMessage={personalMessage}
                fontClassName={chosenFont.className}
                showBleedGuide={showSafeGuide}
              />
            </div>
          )}
        </div>

        {/* Verification Serial + Safe Margin Toggle */}
        <div className="rounded-xl border border-gray-200 bg-[#FAF6FB] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#7B2D8E] shrink-0" aria-hidden="true" />
            <span className="text-xs text-gray-600">Verify Code:</span>
            <code className="font-mono text-xs font-bold text-[#1a0d1f] bg-white border border-gray-200 px-2 py-0.5 rounded">
              {verificationCode}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:underline cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSafeGuide}
                onChange={(e) => setShowSafeGuide(e.target.checked)}
                className="rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
              />
              <span>Safe-zone guide</span>
            </label>

            <Link
              href={verifyPath}
              target="_blank"
              className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E] hover:underline"
            >
              <span>Test Verification Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Print Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleDownloadPressPdf}
            disabled={downloadingType !== null}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {downloadingType === 'press' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download Print-Shop PDF (CR80 + 3mm Bleed)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadA4Sheet}
            disabled={downloadingType !== null}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#7B2D8E]/30 bg-white hover:bg-[#FAF6FB] text-[#7B2D8E] text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {downloadingType === 'a4' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Download A4 Cut &amp; Proof Sheet</span>
          </button>

          {!compact && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Proof</span>
            </button>
          )}

          {viewMode !== 'both' && (
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'front' ? 'back' : 'front')}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
              <span>Flip Card</span>
            </button>
          )}
        </div>

        {downloadFeedback && (
          <p
            role="status"
            className="text-xs text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-lg px-3 py-2 print:hidden"
          >
            {downloadFeedback}
          </p>
        )}
      </div>
    </div>
  )
}
