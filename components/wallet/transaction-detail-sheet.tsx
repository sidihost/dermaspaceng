'use client'

/**
 * TransactionDetailSheet — bottom sheet that opens when a customer
 * taps any transaction row (wallet page + transactions history).
 *
 * Shows the full story of the payment: amount, status, channel,
 * timestamps, copyable references and — for failed / cancelled
 * payments — the human-readable reason plus a "Try again" path.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Wallet,
  Gift,
  Calendar,
  CreditCard,
  Landmark,
  Banknote,
  Check,
  Copy,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TransactionDetail {
  id: number | string
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference?: string | null
  reference?: string | null
  paystack_reference?: string | null
  description: string | null
  error_message?: string | null
  created_at: string
  updated_at?: string
  formattedAmount?: string
}

interface TransactionDetailSheetProps {
  transaction: TransactionDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function TransactionDetailSheet({
  transaction: tx,
  open,
  onOpenChange,
}: TransactionDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!tx) return null

  const reference = tx.payment_reference || tx.reference || ''
  const status = STATUS_META[tx.status]
  const isIncoming = tx.type === 'credit' || tx.type === 'refund'
  const sign = isIncoming ? '+' : '\u2212'
  const canRetry =
    tx.type === 'credit' &&
    (tx.status === 'failed' || tx.status === 'cancelled')

  const copy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0 pt-2 pb-0 text-center">
            {/* Icon */}
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

            <DrawerTitle className="mt-3 text-base font-semibold text-gray-900 text-balance">
              {tx.description ||
                (tx.type === 'credit'
                  ? 'Wallet funding'
                  : tx.type === 'refund'
                    ? 'Refund'
                    : 'Payment')}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Transaction details
            </DrawerDescription>

            {/* Amount */}
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

            {/* Status chip */}
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
          </DrawerHeader>

          {/* Contextual note for pending / cancelled */}
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

          {/* Details */}
          <div className="mt-4 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
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
            {reference && (
              <Row label="Reference">
                <button
                  type="button"
                  onClick={() => copy(reference, 'ref')}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-900 hover:text-[#7B2D8E] transition-colors min-w-0"
                  aria-label="Copy reference"
                >
                  <span className="truncate max-w-[150px]">{reference}</span>
                  {copiedField === 'ref' ? (
                    <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                </button>
              </Row>
            )}
            {tx.paystack_reference && tx.paystack_reference !== reference && (
              <Row label="Processor ref">
                <button
                  type="button"
                  onClick={() => copy(tx.paystack_reference!, 'psref')}
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

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            {tx.status === 'pending' && reference && (
              <Link
                href={`/dashboard/wallet/payment-status?reference=${encodeURIComponent(reference)}`}
                onClick={() => onOpenChange(false)}
              >
                <Button className="w-full gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A]">
                  <RefreshCw className="h-4 w-4" />
                  Check payment status
                </Button>
              </Link>
            )}
            {canRetry && (
              <Link
                href={`/dashboard/wallet?fund=${tx.amount}`}
                onClick={() => onOpenChange(false)}
              >
                <Button className="w-full gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A]">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
              </Link>
            )}
            {tx.status === 'completed' && (
              <Link
                href="/dashboard/transactions"
                onClick={() => onOpenChange(false)}
              >
                <Button variant="outline" className="w-full gap-2 border-gray-200">
                  View all transactions
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-gray-400">
            Need help with this transaction? Contact support and quote the
            reference above.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}
