'use client'

/**
 * TransactionDetailContent — full-page deep link for a single
 * transaction (/dashboard/transactions/[reference]).
 *
 * Fetches the transaction from /api/wallet/transactions/[reference]
 * (scoped to the signed-in user) and renders the same story the
 * TransactionDetailSheet tells: amount, status, channel, timestamps
 * and copyable references.
 */

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Gift,
  Landmark,
  RefreshCw,
  RotateCcw,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionDetail } from '@/components/wallet/transaction-detail-sheet'

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
    throw new Error(data?.error || 'Failed to load transaction')
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
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const STATUS_META: Record<
  TransactionDetail['status'],
  { label: string; chip: string; note?: string }
> = {
  completed: {
    label: 'Completed',
    chip: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
  },
  pending: {
    label: 'Pending',
    chip: 'bg-amber-50 text-amber-600',
    note: 'Waiting for confirmation from your bank. Your wallet will be credited automatically once it clears.',
  },
  failed: {
    label: 'Failed',
    chip: 'bg-red-50 text-red-600',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-gray-100 text-gray-600',
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
  const desc = (tx.description ?? '').toLowerCase()
  if (desc.includes('wallet funding')) return <Wallet className="h-6 w-6" />
  if (desc.includes('gift card')) return <Gift className="h-6 w-6" />
  if (desc.includes('booking') || desc.includes('appointment'))
    return <Calendar className="h-6 w-6" />
  if (tx.type === 'credit') return <ArrowDownLeft className="h-6 w-6" />
  if (tx.type === 'debit') return <ArrowUpRight className="h-6 w-6" />
  return <RotateCcw className="h-6 w-6" />
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

export default function TransactionDetailContent({
  reference,
}: {
  reference: string
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { data, error, isLoading } = useSWR(
    `/api/wallet/transactions/${encodeURIComponent(reference)}`,
    fetcher,
  )

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
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-10 min-h-[50vh]">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          <span className="sr-only">Loading transaction</span>
        </div>
      </main>
    )
  }

  if (data && 'unauthenticated' in data) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-10 min-h-[50vh]">
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 text-center">
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

  if (error || !('transaction' in (data ?? {})) || !(data as any)?.transaction) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-10 min-h-[50vh]">
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 text-center">
          <p className="text-sm font-medium text-gray-900">
            Transaction not found
          </p>
          <p className="mt-1 text-xs text-gray-500 text-pretty">
            We couldn&apos;t find a transaction with this reference on your
            account.
          </p>
          <Link
            href="/dashboard/transactions"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to transactions
          </Link>
        </div>
      </main>
    )
  }

  const tx = data.transaction
  const txReference = tx.payment_reference || tx.reference || ''
  const status = STATUS_META[tx.status] ?? STATUS_META.pending
  const isIncoming = tx.type === 'credit' || tx.type === 'refund'
  const sign = isIncoming ? '+' : '\u2212'

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 pb-24">
      <Link
        href="/dashboard/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Transactions
      </Link>

      <div className="mt-6 text-center">
        <div className="flex justify-center">
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl',
              isIncoming
                ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                : 'bg-gray-100 text-gray-700',
            )}
          >
            <TypeIcon tx={tx} />
          </div>
        </div>

        <h1 className="mt-3 text-base font-semibold text-gray-900 text-balance">
          {tx.description ||
            (tx.type === 'credit'
              ? 'Wallet funding'
              : tx.type === 'refund'
                ? 'Refund'
                : 'Payment')}
        </h1>

        <p
          className={cn(
            'mt-1 text-3xl font-bold tracking-tight',
            tx.status === 'failed' || tx.status === 'cancelled'
              ? 'text-gray-400'
              : isIncoming
                ? 'text-[#7B2D8E]'
                : 'text-gray-900',
          )}
        >
          {sign}
          {tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}
        </p>

        <div className="mt-2 flex justify-center">
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
              status.chip,
            )}
          >
            {status.label}
          </span>
        </div>
      </div>

      {status.note && (
        <p className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-600 leading-relaxed text-pretty">
          {status.note}
        </p>
      )}
      {tx.status === 'failed' && tx.error_message && (
        <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700 leading-relaxed text-pretty">
          {tx.error_message}
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100 overflow-hidden">
        <Row label="Payment method">
          <span className="inline-flex items-center gap-1.5 text-gray-900">
            <MethodIcon method={tx.payment_method} />
            {methodLabel(tx.payment_method)}
          </span>
        </Row>
        <Row label="Type">
          <span className="capitalize text-gray-900">{tx.type}</span>
        </Row>
        <Row label="Date">
          <span className="text-gray-900 text-right">
            {formatDateTime(tx.created_at)}
          </span>
        </Row>
        {txReference && (
          <Row label="Reference">
            <button
              type="button"
              onClick={() => copy(txReference, 'ref')}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-900 hover:text-[#7B2D8E] transition-colors min-w-0"
              aria-label="Copy reference"
            >
              <span className="truncate max-w-[150px]">{txReference}</span>
              {copiedField === 'ref' ? (
                <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
              ) : (
                <Copy className="h-3.5 w-3.5 flex-shrink-0" />
              )}
            </button>
          </Row>
        )}
        {tx.paystack_reference && tx.paystack_reference !== txReference && (
          <Row label="Processor ref">
            <button
              type="button"
              onClick={() => copy(tx.paystack_reference as string, 'psref')}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-900 hover:text-[#7B2D8E] transition-colors min-w-0"
              aria-label="Copy processor reference"
            >
              <span className="truncate max-w-[150px]">
                {tx.paystack_reference}
              </span>
              {copiedField === 'psref' ? (
                <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
              ) : (
                <Copy className="h-3.5 w-3.5 flex-shrink-0" />
              )}
            </button>
          </Row>
        )}
      </div>
    </main>
  )
}
