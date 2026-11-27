'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MapPin,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { GiftCardPreview } from '@/components/gift-cards/gift-card-preview'
import { GiftCardScanner } from '@/components/gift-cards/gift-card-scanner'
import { extractGiftCardCodeFromScan } from '@/lib/gift-card-code-helpers'
import {
  findGiftCardDesignById,
  findGiftCardFontById,
} from '@/lib/gift-card-templates'

interface VerificationCardPayload {
  id: number
  serial: string
  verificationCode: string
  amount: number
  recipientName: string
  recipientEmailMasked: string | null
  senderName: string | null
  occasion: string
  design: string
  designName: string
  font: string
  fontName: string
  status: string
  paymentStatus: string
  invoiceNumber: string | null
  issuedAt: string
  validLocations: string[]
}

interface VerificationResult {
  valid: boolean
  state:
    | 'valid'
    | 'pending_activation'
    | 'payment_required'
    | 'cancelled'
    | 'not_found'
    | 'invalid_code'
    | 'unauthorized'
    | 'forbidden'
  code?: string
  headline: string
  summary: string
  card?: VerificationCardPayload
}

interface RecentCheckItem {
  code: string
  state: VerificationResult['state']
  recipientName?: string
  amount?: number
  checkedAt: string
}

export function GiftCardVerifyClient({
  initialCode = '',
  userRole = 'staff',
  compact = false,
  embedded = false,
}: {
  initialCode?: string
  userRole?: 'admin' | 'staff'
  compact?: boolean
  /** When true, omits full-page marketing outer padding and renders inside a console layout. */
  embedded?: boolean
}) {
  const [codeInput, setCodeInput] = useState(initialCode)
  const [loading, setLoading] = useState(Boolean(initialCode.trim()))
  const [scannerOpen, setScannerOpen] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [recentChecks, setRecentChecks] = useState<RecentCheckItem[]>([])

  const isAdmin = userRole === 'admin'

  const runVerification = useCallback(async (rawCode: string) => {
    const extracted = extractGiftCardCodeFromScan(rawCode)
    if (!extracted) {
      setResult(null)
      setLoading(false)
      return
    }

    setCodeInput(extracted)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/gift-cards/verify?code=${encodeURIComponent(extracted)}`,
        { cache: 'no-store' },
      )
      const data = (await res.json()) as VerificationResult
      setResult(data)
      setRecentChecks((prev) => {
        const nextItem: RecentCheckItem = {
          code: data.card?.verificationCode || data.code || extracted,
          state: data.state,
          recipientName: data.card?.recipientName,
          amount: data.card?.amount,
          checkedAt: new Date().toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }
        return [
          nextItem,
          ...prev.filter((item) => item.code !== nextItem.code),
        ].slice(0, 5)
      })
    } catch {
      setResult({
        valid: false,
        state: 'not_found',
        code: extracted,
        headline: 'Verification Unavailable',
        summary: 'Network error while verifying this gift card. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialCode.trim()) {
      void runVerification(initialCode)
    }
  }, [initialCode, runVerification])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const extracted = extractGiftCardCodeFromScan(codeInput)
    if (!extracted) return
    if (!compact && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('code', extracted)
      window.history.replaceState({}, '', url.toString())
    }
    void runVerification(extracted)
  }

  const handleScanDetected = useCallback(
    (extractedCode: string) => {
      setScannerOpen(false)
      setCodeInput(extractedCode)
      if (!compact && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('code', extractedCode)
        window.history.replaceState({}, '', url.toString())
      }
      void runVerification(extractedCode)
    },
    [compact, runVerification],
  )

  const handleReset = () => {
    setCodeInput('')
    setResult(null)
    if (!compact && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('code')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const card = result?.card
  const cardDesign = card
    ? findGiftCardDesignById(card.design || card.designName)
    : null
  const cardFont = card ? findGiftCardFontById(card.font || card.fontName) : null

  return (
    <div
      className={
        compact
          ? 'space-y-4'
          : embedded
            ? 'space-y-5'
            : 'max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-6'
      }
    >
      {/* Standalone Page Header (used only outside console layouts) */}
      {!compact && !embedded && (
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 text-[#7B2D8E] text-xs font-bold uppercase tracking-[0.18em]">
            <QrCode className="w-4 h-4" aria-hidden="true" />
            <span>
              {isAdmin
                ? 'Admin Gift Card Verification'
                : 'Staff Gift Card Verification'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a0d1f] tracking-tight">
            Scan or Verify a Gift Card
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Scan the QR code on the back of a Dermaspace gift card with your camera, upload a QR snapshot, or enter the serial code below.
          </p>
        </div>
      )}

      {/* Lookup & Scanner Bar */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5"
      >
        <label
          htmlFor={compact ? 'gift-card-modal-verify-input' : 'gift-card-verify-input'}
          className="sr-only"
        >
          Gift card verification code
        </label>
        <div className="relative flex-1 min-w-0">
          <Search
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id={compact ? 'gift-card-modal-verify-input' : 'gift-card-verify-input'}
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Enter code or paste QR URL (e.g. DSGC-00012-7F3A9C1E04)"
            className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 bg-[#FAF6FB] text-sm font-mono text-[#1a0d1f] placeholder:font-sans placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setScannerOpen((v) => !v)}
            aria-expanded={scannerOpen}
            className={`h-11 px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              scannerOpen
                ? 'border-[#7B2D8E] bg-[#FAF6FB] text-[#7B2D8E]'
                : 'border-[#7B2D8E]/30 bg-white hover:bg-[#FAF6FB] text-[#7B2D8E]'
            }`}
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span>{scannerOpen ? 'Hide Scanner' : 'Scan QR'}</span>
          </button>

          <button
            type="submit"
            disabled={loading || !codeInput.trim()}
            className="h-11 px-4 sm:px-5 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <span>Verify Card</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Live QR Scanner Panel */}
      {scannerOpen && (
        <GiftCardScanner
          onDetected={handleScanDetected}
          onClose={() => setScannerOpen(false)}
          autoStartCamera={true}
        />
      )}

      {/* Result Stage */}
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#7B2D8E] mx-auto" />
          <p className="text-sm font-medium text-gray-600">
            Verifying gift card signature &amp; live redemption status...
          </p>
        </div>
      )}

      {!loading && result && (
        <div
          data-testid="gift-card-verify-result"
          data-verify-state={result.state}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          {/* Status Header */}
          <div
            className={`px-5 py-4 border-b flex items-start gap-3.5 ${
              result.state === 'valid'
                ? 'bg-[#FAF6FB] border-[#7B2D8E]/20'
                : result.state === 'pending_activation' ||
                    result.state === 'payment_required'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-rose-50 border-rose-200'
            }`}
          >
            <span
              className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                result.state === 'valid'
                  ? 'bg-[#7B2D8E] text-white'
                  : result.state === 'pending_activation' ||
                      result.state === 'payment_required'
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white'
              }`}
            >
              {result.state === 'valid' ? (
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              ) : result.state === 'pending_activation' ? (
                <Clock className="w-5 h-5" aria-hidden="true" />
              ) : result.state === 'payment_required' ? (
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1a0d1f]">
                  {result.headline}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {(card?.verificationCode || result.code) && (
                    <code className="font-mono text-xs font-semibold text-[#5A1D6A] bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                      {card?.verificationCode || result.code}
                    </code>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Check another
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                {result.summary}
              </p>
            </div>
          </div>

          {/* Authenticated Card Details */}
          {card && cardDesign && cardFont && (
            <div className="p-5 sm:p-6 grid md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-6 space-y-3">
                <GiftCardPreview
                  design={cardDesign}
                  amountText={`₦${card.amount.toLocaleString('en-NG')}`}
                  recipientName={card.recipientName}
                  senderName={card.senderName}
                  occasion={card.occasion}
                  fontClassName={cardFont.className}
                  showStack={false}
                />

                {/* Role-Specific Footer Strip under Preview */}
                {isAdmin ? (
                  <div className="rounded-xl border border-[#7B2D8E]/20 bg-[#FAF6FB] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7B2D8E]">
                        <FileText className="w-3.5 h-3.5" />
                        Admin Order Audit
                      </span>
                      <span className="font-mono text-xs font-semibold text-gray-700">
                        Order #{card.id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Serial
                        </p>
                        <p className="font-mono font-medium text-gray-900 mt-0.5">
                          {card.serial}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Invoice
                        </p>
                        <p className="font-mono font-medium text-gray-900 mt-0.5 truncate">
                          {card.invoiceNumber || '—'}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/gift-cards/${card.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-xs font-semibold transition-colors"
                    >
                      <span>Open Full Order &amp; Print Studio</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-[#FBF9FC] p-3.5 space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7B2D8E]">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Front-Desk Redemption Check
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {result.state === 'valid'
                        ? 'Card is verified and paid. Confirm the guest name matches and update the request status in Gift Card Requests after redeeming.'
                        : 'Do not redeem yet. Confirm payment or activation status in Gift Card Requests or escalate to an administrator.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-gray-100 bg-[#FAF6FB] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500">
                      Card Value
                    </p>
                    <p className="text-lg font-bold text-[#7B2D8E] tabular-nums mt-0.5">
                      ₦{card.amount.toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-[#FAF6FB] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500">
                      Order Status
                    </p>
                    <p className="text-sm font-semibold text-[#1a0d1f] capitalize mt-1">
                      {card.status} · {card.paymentStatus}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-gray-100 text-sm">
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Recipient</dt>
                    <dd className="font-semibold text-[#1a0d1f] text-right">
                      {card.recipientName}
                      {card.recipientEmailMasked && (
                        <span className="block text-xs font-normal text-gray-500">
                          {card.recipientEmailMasked}
                        </span>
                      )}
                    </dd>
                  </div>
                  {card.senderName && (
                    <div className="py-2 flex items-center justify-between gap-3">
                      <dt className="text-gray-500">From</dt>
                      <dd className="font-medium text-[#1a0d1f] text-right">
                        {card.senderName}
                      </dd>
                    </div>
                  )}
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Occasion</dt>
                    <dd className="font-medium text-[#1a0d1f] text-right">
                      {card.occasion}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Issued</dt>
                    <dd className="text-gray-700 text-right">
                      {new Date(card.issuedAt).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Redeemable Branches</span>
                  </div>
                  {card.validLocations.map((loc) => (
                    <p key={loc} className="text-xs text-gray-600">
                      {loc}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Check History (Staff desk convenience — stays in session) */}
      {!compact && recentChecks.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900">
              <History className="w-3.5 h-3.5 text-[#7B2D8E]" />
              Recent checks this session
            </span>
            <button
              type="button"
              onClick={() => setRecentChecks([])}
              className="text-[11px] font-medium text-gray-500 hover:text-[#7B2D8E] cursor-pointer"
            >
              Clear
            </button>
          </div>
          <ul className="divide-y divide-gray-100">
            {recentChecks.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  onClick={() => void runVerification(item.code)}
                  className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF6FB] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-gray-900 truncate">
                      {item.code}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {item.recipientName
                        ? `${item.recipientName}${typeof item.amount === 'number' ? ` · ₦${item.amount.toLocaleString('en-NG')}` : ''}`
                        : 'Unverified / not found'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                        item.state === 'valid'
                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                          : item.state === 'pending_activation' ||
                              item.state === 'payment_required'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {item.state.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {item.checkedAt}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Console return links (only when standalone) */}
      {!compact && !embedded && userRole && (
        <div className="text-center pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={isAdmin ? '/admin/gift-cards' : '/staff/gift-cards'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B2D8E] hover:underline"
          >
            <span>
              Back to {isAdmin ? 'Admin' : 'Staff'} Gift Cards Console
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
