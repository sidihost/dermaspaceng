'use client'

/**
 * TransactionDetailContent — full-page deep link for a single
 * transaction (/dashboard/transactions/[reference]).
 *
 * Receipt-style layout (inspired by leading Nigerian fintech apps,
 * re-skinned in Dermaspace purple):
 *
 *   1. Hero card — icon, title, big amount, status pill.
 *   2. "Transaction Details" card — labelled rows (credited to,
 *      remark, type, reference, date) with copy buttons.
 *   3. "More Actions" card — category + contextual actions
 *      (fund again / cancel a stuck pending / get help).
 *   4. Sticky "Share Receipt" button pinned to the bottom.
 *
 * Fetches from /api/wallet/transactions/[reference] (scoped to the
 * signed-in user). On a 404 we nudge /api/wallet/reconcile once and
 * retry — a transaction created moments ago can race the first fetch.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  Check,
  Clock,
  Copy,
  CreditCard,
  Gift,
  Landmark,
  LifeBuoy,
  MapPin,
  RefreshCw,
  RotateCcw,
  Share2,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionDetail } from '@/components/wallet/transaction-detail-sheet'

const BRAND = '#7B2D8E'

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
  if (res.status === 401) {
    // Signed out — distinguish from "not found" so a customer
    // following an emailed receipt link is told to sign in rather
    // than that their money is missing.
    return { unauthenticated: true } as const
  }
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data?.error || 'Failed to load transaction') as Error & {
      status?: number
    }
    err.status = res.status
    throw err
  }
  return data as { success: boolean; transaction: TransactionDetail }
}

function formatCurrency(value: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Booking dates arrive as plain 'YYYY-MM-DD' (no timezone). Parse the
// parts manually so the displayed day never shifts across timezones.
function formatAppointmentDate(dateString: string) {
  const [y, m, d] = dateString.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return dateString
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// '14:30' -> '2:30 PM'
function formatAppointmentTime(time: string) {
  const [h, min] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(min)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(min).padStart(2, '0')} ${period}`
}

function formatDuration(minutes: number) {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${h} hr${h > 1 ? 's' : ''} ${m} min`
}

const BOOKING_STATUS_META: Record<string, { label: string; chip: string }> = {
  pending: { label: 'Pending', chip: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmed', chip: 'bg-[#F3E8F7] text-[#7B2D8E]' },
  completed: { label: 'Completed', chip: 'bg-[#F3E8F7] text-[#7B2D8E]' },
  cancelled: { label: 'Cancelled', chip: 'bg-gray-100 text-gray-600' },
  no_show: { label: 'No show', chip: 'bg-gray-100 text-gray-600' },
}

const STATUS_META: Record<
  TransactionDetail['status'],
  { label: string; chip: string; Icon: typeof Check; note?: string }
> = {
  completed: {
    label: 'Successful',
    chip: 'text-[#7B2D8E]',
    Icon: Check,
  },
  pending: {
    label: 'Pending',
    chip: 'text-amber-600',
    Icon: Clock,
    note: 'Waiting for confirmation from your bank. Your wallet will be credited automatically once it clears.',
  },
  failed: {
    label: 'Failed',
    chip: 'text-red-600',
    Icon: X,
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'text-gray-600',
    Icon: X,
    note: 'This payment was cancelled before it completed. No money left your account.',
  },
}

function methodLabel(method: TransactionDetail['payment_method']) {
  switch (method) {
    case 'paystack':
      return 'Card / Paystack'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'wallet':
      return 'Wallet'
    case 'cash':
      return 'Cash'
  }
}

function categoryLabel(tx: TransactionDetail) {
  if (tx.booking) return 'Booking'
  const desc = (tx.description ?? '').toLowerCase()
  if (desc.includes('wallet funding')) return 'Deposit'
  if (desc.includes('gift card')) return 'Gift Card'
  if (desc.includes('booking') || desc.includes('appointment')) return 'Booking'
  if (tx.type === 'refund') return 'Refund'
  if (tx.type === 'credit') return 'Deposit'
  return 'Payment'
}

function MethodIcon({
  method,
  className,
}: {
  method: TransactionDetail['payment_method']
  className?: string
}) {
  const cls = className || 'h-4 w-4'
  if (method === 'bank_transfer') return <Landmark className={cls} />
  if (method === 'cash') return <Banknote className={cls} />
  if (method === 'wallet') return <Wallet className={cls} />
  return <CreditCard className={cls} />
}

function TypeIcon({ tx }: { tx: TransactionDetail }) {
  if (tx.booking) return <Calendar className="h-6 w-6" />
  const desc = (tx.description ?? '').toLowerCase()
  if (desc.includes('wallet funding')) return <Wallet className="h-6 w-6" />
  if (desc.includes('gift card')) return <Gift className="h-6 w-6" />
  if (desc.includes('booking') || desc.includes('appointment'))
    return <Calendar className="h-6 w-6" />
  if (tx.type === 'credit') return <ArrowDownLeft className="h-6 w-6" />
  if (tx.type === 'debit') return <ArrowUpRight className="h-6 w-6" />
  return <RotateCcw className="h-6 w-6" />
}

function DetailRow({
  label,
  children,
  align = 'right',
}: {
  label: string
  children: React.ReactNode
  align?: 'right' | 'left'
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <span className="text-[13px] text-gray-400 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div
        className={cn(
          'text-[13px] text-gray-800 min-w-0',
          align === 'right' ? 'text-right' : 'text-left',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default function TransactionDetailContent({
  reference,
}: {
  reference: string
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const reconcileTried = useRef(false)

  const { data, error, isLoading, mutate } = useSWR(
    `/api/wallet/transactions/${encodeURIComponent(reference)}`,
    fetcher,
  )

  // A 404 right after checkout can be a race (row created moments ago,
  // or a webhook mid-flight). Nudge server-side reconciliation once,
  // then retry the fetch before settling on "not found".
  useEffect(() => {
    const status = (error as (Error & { status?: number }) | undefined)?.status
    if (status === 404 && !reconcileTried.current) {
      reconcileTried.current = true
      fetch('/api/wallet/reconcile', { credentials: 'include' })
        .catch(() => {})
        .finally(() => {
          mutate()
        })
    }
  }, [error, mutate])

  const copy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          <span className="sr-only">Loading transaction</span>
        </div>
      </main>
    )
  }

  if (data && 'unauthenticated' in data) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
          <p className="text-sm font-medium text-gray-900">
            Sign in to view this transaction
          </p>
          <p className="mt-1 text-xs text-gray-500 text-pretty">
            Transaction details are private to your account.
          </p>
          <Link
            href={`/signin?next=/dashboard/transactions/${encodeURIComponent(reference)}`}
            className="mt-4 inline-flex items-center justify-center px-5 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    )
  }

  const loadedTx =
    data && 'transaction' in data && data.transaction ? data.transaction : null

  if (error || !loadedTx) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
          <p className="text-sm font-medium text-gray-900">
            Transaction not found
          </p>
          <p className="mt-1 text-xs text-gray-500 text-pretty">
            We couldn&apos;t find a transaction with this reference on your
            account. If you just paid, give it a few seconds and refresh —
            we may still be confirming it with Paystack.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                reconcileTried.current = false
                mutate()
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              Check again
            </button>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to transactions
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const tx = loadedTx
  const txReference = tx.payment_reference || tx.reference || ''
  const status = STATUS_META[tx.status] ?? STATUS_META.pending
  const StatusIcon = status.Icon
  const isIncoming = tx.type === 'credit' || tx.type === 'refund'
  const title =
    tx.description ||
    (tx.type === 'credit'
      ? 'Wallet funding'
      : tx.type === 'refund'
        ? 'Refund'
        : 'Payment')

  const shareReceipt = async () => {
    const summary = [
      'Dermaspace Receipt',
      title,
      `Amount: ${tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}`,
      `Status: ${status.label}`,
      `Reference: ${txReference}`,
      `Date: ${formatDateTime(tx.created_at)}`,
    ].join('\n')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Dermaspace Receipt', text: summary })
      } else {
        await navigator.clipboard.writeText(summary)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      // user dismissed the share sheet — ignore
    }
  }

  // Manual cancel for a stuck pending row. The endpoint re-verifies
  // with Paystack first, so real money is always credited instead.
  const cancelPayment = async () => {
    if (cancelling || !txReference) return
    setCancelling(true)
    try {
      await fetch(
        `/api/wallet/transactions/${encodeURIComponent(txReference)}/cancel`,
        { method: 'POST', credentials: 'include' },
      )
      await mutate()
    } catch {
      // best effort
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4F8]">
      <main className="mx-auto w-full max-w-md px-4 pt-4 pb-32">
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Transaction Details
        </Link>

        {/* ---- Hero card ---- */}
        <div className="relative mt-8">
          {/* Floating type icon overlapping the card edge */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#F6F4F8]',
                isIncoming
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-white text-[#7B2D8E]',
              )}
            >
              <TypeIcon tx={tx} />
            </div>
          </div>

          <div className="rounded-2xl bg-white px-5 pt-11 pb-6 text-center border border-gray-100">
            <h1 className="text-[15px] font-semibold text-gray-900 text-balance leading-snug">
              {title}
            </h1>

            <p
              className={cn(
                'mt-2 text-[34px] font-bold tracking-tight leading-none tabular-nums',
                tx.status === 'failed' || tx.status === 'cancelled'
                  ? 'text-gray-400'
                  : 'text-gray-900',
              )}
            >
              {tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}
            </p>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full',
                  tx.status === 'completed'
                    ? 'bg-[#7B2D8E] text-white'
                    : tx.status === 'pending'
                      ? 'bg-amber-100 text-amber-600'
                      : tx.status === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-200 text-gray-600',
                )}
              >
                <StatusIcon className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className={cn('text-sm font-semibold', status.chip)}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {status.note && (
          <p className="mt-3 rounded-xl bg-white px-4 py-3 text-xs text-gray-500 leading-relaxed text-pretty border border-gray-100">
            {status.note}
          </p>
        )}
        {tx.status === 'failed' && tx.error_message && (
          <p className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700 leading-relaxed text-pretty">
            {tx.error_message}
          </p>
        )}

        {/* ---- Transaction Details card ---- */}
        <div className="mt-3 rounded-2xl bg-white px-5 py-4 border border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900">
            Transaction Details
          </h2>

          <div className="mt-1 divide-y divide-gray-50">
            <DetailRow label={isIncoming ? 'Credited to' : 'Paid from'}>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Wallet className="h-3.5 w-3.5 text-[#7B2D8E]" />
                Wallet Balance
              </span>
            </DetailRow>

            <DetailRow label="Payment method">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <MethodIcon
                  method={tx.payment_method}
                  className="h-3.5 w-3.5 text-[#7B2D8E]"
                />
                {methodLabel(tx.payment_method)}
              </span>
            </DetailRow>

            {tx.description && (
              <DetailRow label="Remark">
                <span className="leading-relaxed">{tx.description}</span>
              </DetailRow>
            )}

            <DetailRow label="Transaction type">
              <span className="capitalize font-medium">
                {tx.type === 'credit'
                  ? 'Deposit'
                  : tx.type === 'refund'
                    ? 'Refund'
                    : 'Payment'}
              </span>
            </DetailRow>

            {txReference && (
              <DetailRow label="Transaction no.">
                <button
                  type="button"
                  onClick={() => copy(txReference, 'ref')}
                  className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-[#7B2D8E] transition-colors min-w-0"
                  aria-label="Copy reference"
                >
                  <span className="truncate max-w-[160px]">{txReference}</span>
                  {copiedField === 'ref' ? (
                    <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
              </DetailRow>
            )}

            {tx.paystack_reference && tx.paystack_reference !== txReference && (
              <DetailRow label="Session ID">
                <button
                  type="button"
                  onClick={() => copy(tx.paystack_reference as string, 'psref')}
                  className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-[#7B2D8E] transition-colors min-w-0"
                  aria-label="Copy processor reference"
                >
                  <span className="truncate max-w-[160px]">
                    {tx.paystack_reference}
                  </span>
                  {copiedField === 'psref' ? (
                    <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
              </DetailRow>
            )}

            <DetailRow label="Transaction date">
              <span className="tabular-nums">{formatDateTime(tx.created_at)}</span>
            </DetailRow>
          </div>
        </div>

        {/* ---- Appointment card (only when this payment funded a booking) ---- */}
        {tx.booking && (
          <div className="mt-3 rounded-2xl bg-white px-5 py-4 border border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-gray-900">Appointment</h2>
              {(() => {
                const meta =
                  BOOKING_STATUS_META[tx.booking.status] ??
                  BOOKING_STATUS_META.pending
                return (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      meta.chip,
                    )}
                  >
                    {meta.label}
                  </span>
                )
              })()}
            </div>

            <div className="mt-1 divide-y divide-gray-50">
              {tx.booking.services && tx.booking.services.length > 0 && (
                <DetailRow
                  label={tx.booking.services.length > 1 ? 'Services' : 'Service'}
                >
                  <span className="font-medium leading-relaxed">
                    {tx.booking.services.map((s) => s.treatment_name).join(', ')}
                  </span>
                </DetailRow>
              )}

              <DetailRow label="Date">
                <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                  <Calendar className="h-3.5 w-3.5 text-[#7B2D8E]" />
                  {formatAppointmentDate(tx.booking.appointment_date)}
                </span>
              </DetailRow>

              <DetailRow label="Time">
                <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-[#7B2D8E]" />
                  {formatAppointmentTime(tx.booking.appointment_time)}
                </span>
              </DetailRow>

              {formatDuration(tx.booking.total_duration) && (
                <DetailRow label="Duration">
                  <span className="font-medium">
                    {formatDuration(tx.booking.total_duration)}
                  </span>
                </DetailRow>
              )}

              <DetailRow label="Location">
                <span className="inline-flex items-start gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">
                    {tx.booking.location_name}
                    {tx.booking.location_address && (
                      <span className="block text-xs font-normal text-gray-400">
                        {tx.booking.location_address}
                      </span>
                    )}
                  </span>
                </span>
              </DetailRow>

              <DetailRow label="Booking ref">
                <span className="font-mono text-xs">
                  {tx.booking.booking_reference}
                </span>
              </DetailRow>
            </div>

            <div
              className="my-2 border-t border-dashed border-gray-200"
              aria-hidden="true"
            />

            <Link
              href={`/booking/${encodeURIComponent(tx.booking.booking_reference)}`}
              className="inline-flex items-center gap-2 py-2.5 text-sm font-semibold text-[#7B2D8E] hover:text-[#6B2278] transition-colors"
            >
              <Calendar className="h-4 w-4" />
              View full booking
            </Link>
          </div>
        )}

        {/* ---- More Actions card ---- */}
        <div className="mt-3 rounded-2xl bg-white px-5 py-4 border border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900">More Actions</h2>

          <div className="mt-1">
            <DetailRow label="Category">
              <span className="font-medium">{categoryLabel(tx)}</span>
            </DetailRow>
          </div>

          <div
            className="my-2 border-t border-dashed border-gray-200"
            aria-hidden="true"
          />

          <div className="flex flex-col">
            {tx.status === 'pending' && (
              <button
                type="button"
                onClick={cancelPayment}
                disabled={cancelling}
                className="inline-flex items-center gap-2 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-60"
              >
                {cancelling ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {cancelling
                  ? 'Checking with Paystack…'
                  : 'I cancelled this payment'}
              </button>
            )}
            {(tx.status === 'cancelled' || tx.status === 'failed') && (
              <Link
                href={`/dashboard/wallet?fund=${tx.amount}`}
                className="inline-flex items-center gap-2 py-2.5 text-sm font-semibold text-[#7B2D8E] hover:text-[#6B2278] transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Try this payment again
              </Link>
            )}
            {tx.status === 'completed' && isIncoming && (
              <Link
                href="/dashboard/wallet"
                className="inline-flex items-center gap-2 py-2.5 text-sm font-semibold text-[#7B2D8E] hover:text-[#6B2278] transition-colors"
              >
                <Wallet className="h-4 w-4" />
                Fund again
              </Link>
            )}
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-2 py-2.5 text-sm font-semibold text-[#7B2D8E] hover:text-[#6B2278] transition-colors"
            >
              <LifeBuoy className="h-4 w-4" />
              Get help with this transaction
            </Link>
          </div>
        </div>
      </main>

      {/* ---- Sticky Share Receipt ---- */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-[#F6F4F8] border-t border-gray-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={shareReceipt}
            className="flex w-full items-center justify-center gap-2 h-13 rounded-full py-3.5 text-[15px] font-semibold text-white transition-colors"
            style={{ backgroundColor: BRAND }}
          >
            {shared ? (
              <>
                <Check className="h-4 w-4" />
                Receipt copied
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
