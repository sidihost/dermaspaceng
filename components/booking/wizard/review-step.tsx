'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { MapPin, Calendar, Clock, Wallet, CreditCard, Info } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { VoucherInput } from './voucher-input'
import type { WizardLocation, WizardServiceChoice } from './types'

export interface AppliedVoucherState {
  voucherId: string
  code: string
  discountKobo: number
  label?: string | null
  type: 'percent' | 'fixed'
  value: number
}

interface ReviewStepProps {
  location: WizardLocation
  services: WizardServiceChoice[]
  date: string
  time: string
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
  paymentMethod: 'wallet' | 'paystack'
  voucher: AppliedVoucherState | null
  onCustomerChange: (field: 'name' | 'email' | 'phone' | 'notes', value: string) => void
  onPaymentMethodChange: (m: 'wallet' | 'paystack') => void
  onVoucherChange: (voucher: AppliedVoucherState | null) => void
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100)

export function ReviewStep({
  location,
  services,
  date,
  time,
  customerName,
  customerEmail,
  customerPhone,
  notes,
  paymentMethod,
  voucher,
  onCustomerChange,
  onPaymentMethodChange,
  onVoucherChange,
}: ReviewStepProps) {
  const totalDuration = services.reduce((s, x) => s + x.duration, 0)
  const subtotalKobo = services.reduce((s, x) => s + x.priceKobo, 0)
  // Clamp the discount to subtotal so a 100% voucher zeroes the
  // booking but never produces a negative total.
  const discountKobo = voucher
    ? Math.min(Math.max(voucher.discountKobo, 0), subtotalKobo)
    : 0
  const totalKobo = subtotalKobo - discountKobo
  const totalNaira = totalKobo / 100

  // Wallet only exists for signed-in users — guests checking out as
  // visitors don't have one, so we skip the fetch entirely (avoids a
  // 401 round-trip + a misleading "Balance: ₦0 — insufficient" card)
  // and force the payment method to Paystack so the only option they
  // see is Card / Bank. As soon as the user signs in, `isAuthenticated`
  // flips, the wallet fetches, and the wallet card appears.
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: walletData } = useSWR<{
    success?: boolean
    wallet?: { balance?: number | string }
    error?: string
  }>(
    isAuthenticated ? '/api/wallet' : null,
    fetcher,
    { revalidateOnFocus: false },
  )
  const walletBalance = Number(walletData?.wallet?.balance ?? 0)
  const walletInsufficient = walletBalance < totalNaira

  // Defensive: if a guest somehow ends up with `paymentMethod === 'wallet'`
  // (e.g. they were signed in earlier in the session, picked wallet,
  // then got logged out by token expiry), snap them back to Paystack.
  useEffect(() => {
    if (!authLoading && !isAuthenticated && paymentMethod === 'wallet') {
      onPaymentMethodChange('paystack')
    }
  }, [authLoading, isAuthenticated, paymentMethod, onPaymentMethodChange])

  const dateLabel = new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <div className="space-y-4">
      {/* Booking summary card */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Your appointment
          </p>
        </div>

        <div className="space-y-3 px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7B2D8E]" />
            <div>
              <p className="font-semibold text-gray-900">{location.name}</p>
              <p className="text-[12px] text-gray-500">{location.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#7B2D8E]" />
            <div>
              <p className="font-semibold text-gray-900">{dateLabel}</p>
              <p className="text-[12px] text-gray-500">at {time}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#7B2D8E]" />
            <p className="font-semibold text-gray-900">{totalDuration} min</p>
          </div>
        </div>

        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {services.map((s) => (
            <li
              key={`${s.categoryId}::${s.treatmentId}`}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.treatmentName}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {s.categoryName} • {s.duration} min
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-gray-900">
                {formatNaira(s.priceKobo)}
              </span>
            </li>
          ))}
        </ul>

        {/* Subtotal / discount / total breakdown.
            We always render the same triple-row layout when a voucher
            is applied so the customer can see exactly what we did
            with their code. Without a voucher we collapse to a single
            "Total" row, matching the original receipt-style summary. */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {discountKobo > 0 ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-700 tabular-nums">
                  {formatNaira(subtotalKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[#7B2D8E]">
                  Voucher{voucher?.code ? ` · ${voucher.code}` : ''}
                </span>
                <span className="font-semibold text-[#7B2D8E] tabular-nums">
                  − {formatNaira(discountKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Total due
                </span>
                <span className="text-base font-bold text-gray-900 tabular-nums">
                  {formatNaira(totalKobo)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                Total
              </span>
              <span className="text-base font-bold text-gray-900 tabular-nums">
                {formatNaira(totalKobo)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Voucher input — themed as a perforated coupon to encourage
          discovery. Lives right under the totals so the customer
          sees the discount land in the same visual frame. */}
      <VoucherInput
        subtotalKobo={subtotalKobo}
        applied={voucher}
        onApplied={onVoucherChange}
      />

      {/* Customer details */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Who is the appointment for?
        </p>
        <div className="space-y-2.5">
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerChange('name', e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
            autoComplete="name"
            required
          />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => onCustomerChange('email', e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              autoComplete="email"
              required
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => onCustomerChange('phone', e.target.value)}
              placeholder="Phone"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              autoComplete="tel"
              required
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => onCustomerChange('notes', e.target.value)}
            placeholder="Anything we should know? (allergies, preferences…)"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          />
        </div>
      </section>

      {/* Payment method */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Pay with
        </p>
        {/* When the user is signed in we offer Wallet + Card side-by-side
            (two columns on >= sm). For guests, only Card / Bank is
            available, so the grid collapses to a single full-width
            column — no empty space, no "Balance: ₦0 — insufficient"
            phantom card. */}
        <div
          className={
            isAuthenticated
              ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'
              : 'grid grid-cols-1 gap-2.5'
          }
        >
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onPaymentMethodChange('wallet')}
              disabled={walletInsufficient}
              className={[
                'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                paymentMethod === 'wallet'
                  ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                  : 'border-gray-200 bg-white hover:border-[#7B2D8E]/40',
                walletInsufficient ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Wallet</p>
                <p className="text-[11px] text-gray-500">
                  Balance: {formatNaira(walletBalance * 100)}
                </p>
                {walletInsufficient ? (
                  <p className="mt-1 text-[11px] font-medium text-red-600">
                    Insufficient &mdash; top up or use card
                  </p>
                ) : null}
              </div>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onPaymentMethodChange('paystack')}
            className={[
              'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
              paymentMethod === 'paystack'
                ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                : 'border-gray-200 bg-white hover:border-[#7B2D8E]/40',
            ].join(' ')}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
              <CreditCard className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Card / Bank</p>
              <p className="text-[11px] text-gray-500">via Paystack</p>
            </div>
          </button>
        </div>
      </section>

      {/* Cancellation policy — recoloured from `bg-blue-50 /
          text-blue-900` to brand purple. The blue read as a generic
          system-info chip and clashed with the otherwise all-purple
          booking flow (selected location/service/time pills, primary
          buttons, links). Using the brand 8%-tint background plus
          the deep brand text keeps the same "informational" weight
          (low chroma, tinted, soft) without introducing a second
          accent colour. */}
      <div className="flex items-start gap-2 rounded-xl bg-[#7B2D8E]/10 p-3 text-[12px] text-[#5B1F6B]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#7B2D8E]" />
        <p>
          Free cancellation up to 12 hours before your appointment — refunds go
          back to your wallet automatically. Late changes? Just call us.
        </p>
      </div>
    </div>
  )
}
