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
  Download,
  Image as ImageIcon,
  Printer,
  Loader2,
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
import {
  downloadTransactionReceiptImage,
  downloadTransactionReceiptPdf,
  resolveTransactionGiftCard,
} from '@/lib/receipt-pdf'
import { ReceiptCrownBand } from '@/components/receipt/receipt-chrome'
import { GiftCardPreview } from '@/components/gift-cards/gift-card-preview'
import {
  findGiftCardDesignById,
  findGiftCardFontById,
} from '@/lib/gift-card-templates'

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
  metadata?: Record<string, unknown> | null
  invoice?: {
    id: number | string
    invoice_number: string
    amount?: number
    status: string
  } | null
  giftCard?: {
    recipient_name?: string
    recipient_email?: string | null
    sender_name?: string | null
    occasion?: string | null
    design?: string | null
    design_name?: string | null
    font?: string | null
    font_name?: string | null
    personal_message?: string | null
    delivery_method?: string | null
    delivery_date?: string | null
    status?: string | null
    payment_status?: string | null
    invoice_number?: string | null
    recipient_notified_at?: string | null
  } | null
  /** Present when this payment funded an appointment (matched by
   *  the shared DS_ payment reference). Lets receipt surfaces show
   *  the real service, date, and time. */
  booking?: TransactionBooking | null
  customer?: {
    id: string
    name: string
    email: string
  } | null
}

export interface TransactionBooking {
  id: string
  booking_reference: string
  location_name: string
  location_address?: string | null
  /** 'YYYY-MM-DD' */
  appointment_date: string
  /** 'HH:MM' 24-hour */
  appointment_time: string
  /** minutes */
  total_duration: number
  status: string
  services?: { treatment_name: string; duration: number }[]
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
    chip: 'bg-[#7B2D8E] text-white',
  },
  pending: {
    label: 'Pending',
    chip: 'bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/25',
    note: 'Waiting for confirmation from your bank. Your wallet will be credited automatically once it clears.',
  },
  failed: {
    label: 'Failed',
    chip: 'bg-gray-100 text-gray-700 border border-gray-200',
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
  if (resolveTransactionGiftCard(tx) || desc.includes('gift card'))
    return <Gift className="h-5 w-5" />
  if (desc.includes('wallet funding')) return <Wallet className="h-5 w-5" />
  if (desc.includes('booking') || desc.includes('appointment'))
    return <Calendar className="h-5 w-5" />
  if (tx.type === 'credit') return <ArrowDownLeft className="h-5 w-5" />
  if (tx.type === 'debit') return <ArrowUpRight className="h-5 w-5" />
  return <RotateCcw className="h-5 w-5" />
}

export function TransactionDetailSheet({
  transaction: tx,
  open,
  onOpenChange,
}: TransactionDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState(false)

  if (!tx) return null

  const effectiveGiftCard = resolveTransactionGiftCard(tx)
  const resolvedGiftCardDesign = effectiveGiftCard
    ? findGiftCardDesignById(
        effectiveGiftCard.design || effectiveGiftCard.design_name,
      )
    : null
  const resolvedGiftCardFont = effectiveGiftCard
    ? findGiftCardFontById(
        effectiveGiftCard.font || effectiveGiftCard.font_name,
      )
    : null
  const reference = tx.payment_reference || tx.reference || ''
  const status = STATUS_META[tx.status]
  const isIncoming = tx.type === 'credit' || tx.type === 'refund'
  const canRetry =
    tx.type === 'credit' &&
    (tx.status === 'failed' || tx.status === 'cancelled')

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return
    setDownloadingPdf(true)
    try {
      await downloadTransactionReceiptPdf(tx)
    } catch {
      // best effort
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadImage = async () => {
    if (downloadingImage) return
    setDownloadingImage(true)
    try {
      await downloadTransactionReceiptImage(tx)
    } catch {
      // best effort
    } finally {
      setDownloadingImage(false)
    }
  }

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
          <div className="mt-2 overflow-hidden rounded-xl border border-[#7B2D8E]/20 bg-white">
            <ReceiptCrownBand />
            <DrawerHeader className="px-4 pt-4 pb-4 text-center bg-[#F7F2FA]/60 border-b border-dashed border-[#7B2D8E]/20">
              <div className="flex justify-center">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl border border-[#7B2D8E]/20',
                    isIncoming
                      ? 'bg-[#7B2D8E] text-white'
                      : 'bg-white text-[#7B2D8E]',
                  )}
                >
                  <TypeIcon tx={tx} />
                </div>
              </div>

              <DrawerTitle className="mt-2.5 text-sm font-semibold text-gray-900 text-balance break-words [overflow-wrap:anywhere]">
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

              <p
                className={cn(
                  'mt-1 text-2xl font-bold tracking-tight tabular-nums',
                  tx.status === 'failed' || tx.status === 'cancelled'
                    ? 'text-gray-400'
                    : 'text-[#7B2D8E]',
                )}
              >
                {isIncoming ? '+' : '\u2212'}
                {tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}
              </p>

              <div className="mt-2 flex justify-center">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                    status.chip,
                  )}
                >
                  {status.label}
                </span>
              </div>
            </DrawerHeader>

            {effectiveGiftCard &&
              resolvedGiftCardDesign &&
              resolvedGiftCardFont && (
                <div className="p-3.5 bg-[#FBF9FC] border-b border-gray-100">
                  <GiftCardPreview
                    design={resolvedGiftCardDesign}
                    amountText={
                      tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)
                    }
                    recipientName={effectiveGiftCard.recipient_name}
                    senderName={effectiveGiftCard.sender_name}
                    occasion={effectiveGiftCard.occasion}
                    fontClassName={resolvedGiftCardFont.className}
                    showStack={false}
                  />
                </div>
              )}

            {/* Details */}
            <div className="divide-y divide-gray-100">
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
                <span className="text-gray-900 text-right tabular-nums">
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
              {tx.invoice?.invoice_number && (
                <Row label="Invoice no.">
                  <button
                    type="button"
                    onClick={() => copy(tx.invoice!.invoice_number, 'inv')}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-900 hover:text-[#7B2D8E] transition-colors min-w-0"
                    aria-label="Copy invoice number"
                  >
                    <span className="truncate max-w-[150px]">
                      {tx.invoice.invoice_number}
                    </span>
                    {copiedField === 'inv' ? (
                      <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                  </button>
                </Row>
              )}
              {effectiveGiftCard?.recipient_name && (
                <Row label="Recipient">
                  <span className="text-gray-900 text-right truncate max-w-[180px]">
                    {effectiveGiftCard.recipient_name}
                    {effectiveGiftCard.occasion
                      ? ` · ${effectiveGiftCard.occasion}`
                      : ''}
                  </span>
                </Row>
              )}
            </div>
          </div>

          {/* Contextual note for pending / cancelled / failed */}
          {(tx.status === 'pending' || tx.status === 'cancelled') && (
            <p className="mt-3 rounded-xl bg-[#F7F2FA] border border-[#7B2D8E]/15 px-3.5 py-2.5 text-xs text-gray-600 leading-relaxed text-pretty">
              {tx.status === 'pending' && tx.type === 'debit'
                ? 'Waiting for confirmation from Paystack. Your order will be finalized automatically once payment clears.'
                : status.note}
            </p>
          )}
          {tx.status === 'failed' && tx.error_message && (
            <p className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-xs text-gray-700 leading-relaxed text-pretty">
              {tx.error_message}
            </p>
          )}

          {/* Actions (compact h-8 download/print controls) */}
          <div className="mt-4 flex flex-col gap-2">
            {tx.status === 'pending' && reference && (
              <Link
                href={`/dashboard/wallet/payment-status?reference=${encodeURIComponent(reference)}`}
                onClick={() => onOpenChange(false)}
              >
                <Button size="sm" className="w-full h-8 gap-1.5 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-xs">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check payment status
                </Button>
              </Link>
            )}
            {canRetry && (
              <Link
                href={`/dashboard/wallet?fund=${tx.amount}`}
                onClick={() => onOpenChange(false)}
              >
                <Button size="sm" className="w-full h-8 gap-1.5 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-xs">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </Link>
            )}
            {tx.status === 'completed' && reference && (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloadingImage}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#7B2D8E]/30 bg-white px-2.5 text-xs font-semibold text-[#7B2D8E] hover:bg-[#F7F2FA] disabled:opacity-60 cursor-pointer"
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
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#7B2D8E] px-2.5 text-xs font-semibold text-white hover:bg-[#5A1D6A] disabled:opacity-60 cursor-pointer"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>{downloadingPdf ? 'Saving…' : 'PDF'}</span>
                  </button>
                  <Link
                    href={`/dashboard/transactions/${encodeURIComponent(reference)}?print=1`}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </Link>
                </div>
                <Link
                  href={`/dashboard/transactions/${encodeURIComponent(reference)}`}
                  onClick={() => onOpenChange(false)}
                >
                  <Button variant="outline" size="sm" className="w-full h-8 gap-1.5 border-gray-200 text-xs">
                    View full receipt &amp; invoice
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
            {tx.status === 'completed' && (
              <Link
                href="/dashboard/transactions"
                onClick={() => onOpenChange(false)}
              >
                <Button variant="outline" size="sm" className="w-full h-8 gap-1.5 border-gray-200 text-xs">
                  View all transactions
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] text-gray-400">
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
