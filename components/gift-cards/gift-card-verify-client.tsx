'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { GiftCardPreview } from '@/components/gift-cards/gift-card-preview'
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
  code?: string
  headline: string
  summary: string
  card?: VerificationCardPayload
}

export function GiftCardVerifyClient({ initialCode }: { initialCode: string }) {
  const [codeInput, setCodeInput] = useState(initialCode)
  const [loading, setLoading] = useState(Boolean(initialCode.trim()))
  const [result, setResult] = useState<VerificationResult | null>(null)

  const runVerification = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim()
    if (!trimmed) {
      setResult(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/gift-cards/verify?code=${encodeURIComponent(trimmed)}`,
        { cache: 'no-store' },
      )
      const data = (await res.json()) as VerificationResult
      setResult(data)
    } catch {
      setResult({
        valid: false,
        state: 'not_found',
        code: trimmed,
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
    const trimmed = codeInput.trim()
    if (!trimmed) return
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('code', trimmed)
      window.history.replaceState({}, '', url.toString())
    }
    void runVerification(trimmed)
  }

  const card = result?.card
  const cardDesign = card
    ? findGiftCardDesignById(card.design || card.designName)
    : null
  const cardFont = card ? findGiftCardFontById(card.font || card.fontName) : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-6">
      {/* Page Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 text-[#7B2D8E] text-xs font-bold uppercase tracking-[0.18em]">
          <QrCode className="w-4 h-4" aria-hidden="true" />
          <span>Gift Card Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1a0d1f] tracking-tight">
          Verify a Dermaspace Gift Card
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Scan the QR code on the back of any printed or digital Dermaspace gift card, or enter its verification serial below to confirm authenticity and value.
        </p>
      </div>

      {/* Lookup Bar */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5"
      >
        <label htmlFor="gift-card-verify-input" className="sr-only">
          Gift card verification code
        </label>
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="gift-card-verify-input"
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Enter code (e.g. DSGC-00012-7F3A9C1E04)"
            className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 bg-[#FAF6FB] text-sm font-mono text-[#1a0d1f] placeholder:font-sans placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !codeInput.trim()}
          className="h-11 px-5 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer shrink-0"
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
      </form>

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
                {(card?.verificationCode || result.code) && (
                  <code className="font-mono text-xs font-semibold text-[#5A1D6A] bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                    {card?.verificationCode || result.code}
                  </code>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                {result.summary}
              </p>
            </div>
          </div>

          {/* Authenticated Card Details */}
          {card && cardDesign && cardFont && (
            <div className="p-5 sm:p-6 grid md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6">
                <GiftCardPreview
                  design={cardDesign}
                  amountText={`₦${card.amount.toLocaleString('en-NG')}`}
                  recipientName={card.recipientName}
                  senderName={card.senderName}
                  occasion={card.occasion}
                  fontClassName={cardFont.className}
                  showStack={false}
                />
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

      {/* Helpful footer action */}
      <div className="text-center pt-2">
        <Link
          href="/gift-cards"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B2D8E] hover:underline"
        >
          <span>Order a Dermaspace Gift Card</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
