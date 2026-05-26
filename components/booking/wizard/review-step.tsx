'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import {
  MapPin,
  Calendar,
  Clock,
  Wallet,
  CreditCard,
  Info,
  Repeat,
  X,
} from 'lucide-react'
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

/**
 * Recurrence options offered by the booking flow.
 *
 * The customer can mark an appointment as repeating — Weekly,
 * Bi-weekly, Monthly, or a Custom cadence. We don't auto-create the
 * future bookings server-side; the option is captured as metadata on
 * the booking (prepended to `notes`) so the salon team can schedule
 * the recurring series manually with the customer. This keeps the
 * UI promise of "recurring is supported" without committing to an
 * auto-rebill engine that would need card-on-file + scheduling.
 */
export type BookingRecurrence =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom'

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
  recurrence: BookingRecurrence
  recurrenceCustom: string
  onCustomerChange: (field: 'name' | 'email' | 'phone' | 'notes', value: string) => void
  onPaymentMethodChange: (m: 'wallet' | 'paystack') => void
  onVoucherChange: (voucher: AppliedVoucherState | null) => void
  onRecurrenceChange: (r: BookingRecurrence) => void
  onRecurrenceCustomChange: (value: string) => void
  onRemoveService?: (categoryId: string, treatmentId: string) => void
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
  recurrence,
  recurrenceCustom,
  onCustomerChange,
  onPaymentMethodChange,
  onVoucherChange,
  onRecurrenceChange,
  onRecurrenceCustomChange,
  onRemoveService,
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{s.treatmentName}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {s.categoryName} • {s.duration} min
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatNaira(s.priceKobo)}
                </span>
                {onRemoveService && (
                  <button
                    type="button"
                    onClick={() => onRemoveService(s.categoryId, s.treatmentId)}
                    className="group p-1 transition-colors hover:text-red-600"
                    aria-label={`Remove ${s.treatmentName}`}
                    title={`Remove ${s.treatmentName}`}
                  >
                    <X className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                  </button>
                )}
              </div>
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

      {/* Make this a recurring appointment.
          Customers told us they wanted to book the same treatment on
          a regular cadence (a monthly facial, a fortnightly massage,
          or a custom rhythm worked out with their therapist). We
          capture the cadence here as a chip group plus an optional
          free-text note for "Custom" — the salon team uses this when
          scheduling the rest of the series. We don't auto-rebill, so
          the customer only pays for THIS visit; the rest is set up
          by the team. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <Repeat className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Make this recurring
            </p>
            <p className="text-[11.5px] text-gray-500">
              Pick a cadence — we&apos;ll lock the rest of the series in
              at the salon.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: 'none', label: 'One-off' },
              { key: 'weekly', label: 'Weekly' },
              { key: 'biweekly', label: 'Bi-weekly' },
              { key: 'monthly', label: 'Monthly' },
              { key: 'custom', label: 'Custom' },
            ] as Array<{ key: BookingRecurrence; label: string }>
          ).map((opt) => {
            const active = recurrence === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onRecurrenceChange(opt.key)}
                className={[
                  'whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors sm:px-3 sm:text-[12.5px]',
                  active
                    ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5',
                ].join(' ')}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {recurrence === 'custom' && (
          <input
            type="text"
            value={recurrenceCustom}
            onChange={(e) => onRecurrenceCustomChange(e.target.value)}
            placeholder="e.g. Every 3 weeks on Thursday afternoons"
            maxLength={120}
            className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          />
        )}
        {recurrence !== 'none' && (
          <p className="mt-3 text-[11.5px] text-gray-500 leading-relaxed">
            You&apos;ll only be charged for this visit. The team will
            confirm the rest of the schedule with you.
          </p>
        )}
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
