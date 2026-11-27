'use client'

/**
 * TransactionDetailContent — compact single-color (#7B2D8E) patterned
 * receipt view for /dashboard/transactions/[reference].
 * Supports PNG image export, PDF download, print, and native share.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  Clock,
  Copy,
  CreditCard,
  Landmark,
  LifeBuoy,
  MapPin,
  RefreshCw,
  RotateCcw,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionDetail } from '@/components/wallet/transaction-detail-sheet'
import {
  downloadTransactionReceiptImage,
  downloadTransactionReceiptPdf,
  resolveTransactionGiftCard,
} from '@/lib/receipt-pdf'
import {
  RECEIPT_MASTHEAD_PATTERN_STYLE,
  RECEIPT_TOTAL_PATTERN_STYLE,
  ReceiptActionButtons,
  ReceiptCornerMarks,
  ReceiptCrownBand,
  ReceiptTearDivider,
} from '@/components/receipt/receipt-chrome'
import { GiftCardPreview } from '@/components/gift-cards/gift-card-preview'
import {
  findGiftCardDesignById,
  findGiftCardFontById,
  getGiftCardOccasionMeta,
} from '@/lib/gift-card-templates'

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
  if (res.status === 401) {
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
  return data as {
    success: boolean
    viewerIsTeam?: boolean
    transaction: TransactionDetail
  }
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
    hour12: true,
  })
}

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
  pending: {
    label: 'Pending',
    chip: 'bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/20',
  },
  confirmed: { label: 'Confirmed', chip: 'bg-[#7B2D8E] text-white' },
  completed: { label: 'Completed', chip: 'bg-[#7B2D8E] text-white' },
  cancelled: { label: 'Cancelled', chip: 'bg-gray-100 text-gray-600' },
  no_show: { label: 'No show', chip: 'bg-gray-100 text-gray-600' },
}

const STATUS_META: Record<
  TransactionDetail['status'],
  { label: string; pillCls: string; Icon: typeof Check; note?: string }
> = {
  completed: {
    label: 'Successful',
    pillCls: 'bg-[#7B2D8E] text-white',
    Icon: Check,
  },
  pending: {
    label: 'Pending',
    pillCls: 'bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/25',
    Icon: Clock,
    note: 'Waiting for confirmation from your bank. Your wallet will be credited automatically once it clears.',
  },
  failed: {
    label: 'Failed',
    pillCls: 'bg-gray-200 text-gray-800',
    Icon: X,
  },
  cancelled: {
    label: 'Cancelled',
    pillCls: 'bg-gray-100 text-gray-700',
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
  if (resolveTransactionGiftCard(tx)) return 'Gift Card'
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
  const cls = className || 'h-3.5 w-3.5'
  if (method === 'bank_transfer') return <Landmark className={cls} />
  if (method === 'cash') return <Banknote className={cls} />
  if (method === 'wallet') return <Wallet className={cls} />
  return <CreditCard className={cls} />
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-xs text-gray-900 min-w-0 text-right">{children}</div>
    </div>
  )
}

export default function TransactionDetailContent({
  reference,
}: {
  reference: string
}) {
  const searchParams = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState(false)
  const reconcileTried = useRef(false)
  const autoPrintTriggered = useRef(false)

  const { data, error, isLoading, mutate } = useSWR(
    `/api/wallet/transactions/${encodeURIComponent(reference)}`,
    fetcher,
  )

  const loadedTransactionId =
    data && 'transaction' in data && data.transaction ? data.transaction.id : null

  useEffect(() => {
    if (autoPrint && loadedTransactionId && !autoPrintTriggered.current) {
      autoPrintTriggered.current = true
      const timer = setTimeout(() => {
        window.print()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [autoPrint, loadedTransactionId])

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
      // clipboard unavailable
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 animate-spin text-[#7B2D8E]" />
          <span className="sr-only">Loading transaction</span>
        </div>
      </main>
    )
  }

  if (data && 'unauthenticated' in data) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-[#7B2D8E]/20 bg-white overflow-hidden text-center">
          <ReceiptCrownBand />
          <div className="p-6">
            <p className="text-sm font-semibold text-gray-900">
              Sign in to view this receipt
            </p>
            <p className="mt-1 text-xs text-gray-500 text-pretty">
              Transaction details are private to your account.
            </p>
            <Link
              href={`/signin?next=/dashboard/transactions/${encodeURIComponent(reference)}`}
              className="mt-4 inline-flex items-center justify-center px-4 h-8 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const loadedTx =
    data && 'transaction' in data && data.transaction ? data.transaction : null
  const viewerIsTeam = Boolean(
    data && 'viewerIsTeam' in data && data.viewerIsTeam,
  )

  if (error || !loadedTx) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-[#7B2D8E]/20 bg-white overflow-hidden text-center">
          <ReceiptCrownBand />
          <div className="p-6">
            <p className="text-sm font-semibold text-gray-900">
              Transaction not found
            </p>
            <p className="mt-1 text-xs text-gray-500 text-pretty">
              We couldn&apos;t find a transaction with this reference on your
              account. If you just paid, give it a moment and check again.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  reconcileTried.current = false
                  mutate()
                }}
                className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Check again
              </button>
              <Link
                href="/dashboard/transactions"
                className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Transactions
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const tx = loadedTx
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
      ...(tx.invoice?.invoice_number ? [`Invoice: ${tx.invoice.invoice_number}`] : []),
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
      // dismissed
    }
  }

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

  return (
    <div className="min-h-screen bg-[#F7F5F9] print:bg-white">
      <main className="mx-auto w-full max-w-md px-4 py-5 md:py-7 print:max-w-lg print:py-2">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 print:hidden">
          <Link
            href={viewerIsTeam ? '/staff/money' : '/dashboard/transactions'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {viewerIsTeam ? 'Back to Staff' : 'Transactions'}
          </Link>
          <ReceiptActionButtons
            onDownloadPdf={handleDownloadPdf}
            onDownloadImage={handleDownloadImage}
            onPrint={() => window.print()}
            onShare={shareReceipt}
            downloadingPdf={downloadingPdf}
            downloadingImage={downloadingImage}
            shared={shared}
            shareMode="copy"
          />
        </div>

        {/* ---- Unified Single-Color Patterned Receipt Card ---- */}
        <article
          className="relative overflow-hidden rounded-2xl bg-white border border-[#7B2D8E]/20 print:border-gray-300 print:rounded-none"
          aria-label="Transaction receipt"
        >
          <ReceiptCrownBand />

          {/* Patterned Masthead */}
          <header
            className="relative px-5 pt-4 pb-3.5 bg-[#F7F2FA] border-b border-[#7B2D8E]/15"
            style={RECEIPT_MASTHEAD_PATTERN_STYLE}
          >
            <ReceiptCornerMarks inset="inset-2" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <Image
                  src="/images/dermaspace-logo.png"
                  alt="Dermaspace Esthetic & Wellness Centre"
                  width={120}
                  height={32}
                  priority
                  className="h-7 w-auto object-contain"
                />
                <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Esthetic &amp; Wellness · Lagos
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
                  Official Receipt
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-900">
                  {categoryLabel(tx)}
                </p>
                <p className="mt-0.5 text-[10.5px] text-gray-500 tabular-nums">
                  {formatDateTime(tx.created_at)}
                </p>
              </div>
            </div>
          </header>

          {/* Reference & Status Strip */}
          <div className="px-5 pt-3.5 pb-0.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Reference
              </p>
              <button
                type="button"
                onClick={() => txReference && copy(txReference, 'ref-top')}
                className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#7B2D8E] hover:underline"
                aria-label="Copy transaction reference"
              >
                <span className="truncate max-w-[200px]">{txReference}</span>
                {copiedField === 'ref-top' ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0 text-[#7B2D8E]/60" />
                )}
              </button>
            </div>

            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                status.pillCls,
              )}
            >
              <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
              {status.label}
            </span>
          </div>

          <ReceiptTearDivider notchBgClass="bg-[#F7F5F9]" />

          {/* Summary Hero */}
          <div className="px-5 pb-3 text-center">
            <h1 className="text-sm font-semibold text-gray-900 text-balance leading-snug">
              {title}
            </h1>
            <p
              className={cn(
                'mt-1.5 text-[28px] font-bold tracking-tight leading-none tabular-nums',
                tx.status === 'failed' || tx.status === 'cancelled'
                  ? 'text-gray-400 line-through'
                  : 'text-[#7B2D8E]',
              )}
            >
              {tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}
            </p>
          </div>

          {(tx.status === 'pending' || tx.status === 'cancelled') && (
            <p className="mx-5 mb-3 rounded-lg bg-[#F7F2FA] border border-[#7B2D8E]/15 px-3 py-2 text-[11px] text-gray-700 leading-relaxed">
              {tx.status === 'pending' && tx.type === 'debit'
                ? 'Waiting for confirmation from Paystack. Your order will finalize automatically once payment clears.'
                : status.note}
            </p>
          )}
          {tx.status === 'failed' && tx.error_message && (
            <p className="mx-5 mb-3 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-[11px] text-gray-700 leading-relaxed">
              {tx.error_message}
            </p>
          )}

          {/* Transaction Details Section */}
          <div className="mx-5 rounded-xl border border-[#7B2D8E]/15 overflow-hidden">
            <div className="px-3.5 py-2 bg-[#F7F2FA] border-b border-[#7B2D8E]/15 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
              <span>Transaction Details</span>
              <span>Ledger</span>
            </div>
            <div className="px-3.5 divide-y divide-gray-100">
              {tx.customer && (
                <DetailRow label="Client">
                  <span className="font-medium">
                    {tx.customer.name}
                    {tx.customer.email ? ` · ${tx.customer.email}` : ''}
                  </span>
                </DetailRow>
              )}
              <DetailRow
                label={
                  isIncoming
                    ? 'Credited to'
                    : tx.payment_method === 'wallet'
                      ? 'Paid from'
                      : 'Paid via'
                }
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {isIncoming || tx.payment_method === 'wallet' ? (
                    <>
                      <Wallet className="h-3.5 w-3.5 text-[#7B2D8E]" />
                      Wallet Balance
                    </>
                  ) : (
                    <>
                      <MethodIcon
                        method={tx.payment_method}
                        className="h-3.5 w-3.5 text-[#7B2D8E]"
                      />
                      {methodLabel(tx.payment_method)}
                    </>
                  )}
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

              <DetailRow label="Type">
                <span className="font-medium">
                  {tx.type === 'credit'
                    ? 'Deposit'
                    : tx.type === 'refund'
                      ? 'Refund'
                      : 'Payment'}
                </span>
              </DetailRow>

              {tx.paystack_reference && tx.paystack_reference !== txReference && (
                <DetailRow label="Session ID">
                  <button
                    type="button"
                    onClick={() => copy(tx.paystack_reference as string, 'psref')}
                    className="inline-flex items-center gap-1 font-mono text-[11px] hover:text-[#7B2D8E]"
                    aria-label="Copy processor reference"
                  >
                    <span className="truncate max-w-[150px]">{tx.paystack_reference}</span>
                    {copiedField === 'psref' ? (
                      <Check className="h-3 w-3 text-[#7B2D8E]" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                </DetailRow>
              )}

              {tx.invoice?.invoice_number && (
                <DetailRow label="Invoice no.">
                  <button
                    type="button"
                    onClick={() => copy(tx.invoice!.invoice_number, 'inv')}
                    className="inline-flex items-center gap-1 font-mono text-[11px] hover:text-[#7B2D8E]"
                    aria-label="Copy invoice number"
                  >
                    <span>{tx.invoice.invoice_number}</span>
                    {copiedField === 'inv' ? (
                      <Check className="h-3 w-3 text-[#7B2D8E]" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                </DetailRow>
              )}

              {tx.description && (
                <DetailRow label="Remark">
                  <span className="leading-relaxed">{tx.description}</span>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Gift Card block if present */}
          {effectiveGiftCard && resolvedGiftCardDesign && resolvedGiftCardFont && (
            <div className="mx-5 mt-3 rounded-xl border border-[#7B2D8E]/15 overflow-hidden">
              <div className="px-3.5 py-2 bg-[#F7F2FA] border-b border-[#7B2D8E]/15 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                  Gift Card
                </span>
                <span className="text-[10px] font-semibold uppercase text-[#7B2D8E]">
                  {effectiveGiftCard.status || 'Confirmed'}
                </span>
              </div>
              <div className="p-3.5 bg-[#FBF9FC] border-b border-[#7B2D8E]/10">
                <GiftCardPreview
                  design={resolvedGiftCardDesign}
                  amountText={
                    tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)
                  }
                  recipientName={effectiveGiftCard.recipient_name}
                  senderName={
                    effectiveGiftCard.sender_name || tx.customer?.name || null
                  }
                  occasion={effectiveGiftCard.occasion}
                  fontClassName={resolvedGiftCardFont.className}
                  showStack={false}
                />
              </div>
              <div className="px-3.5 divide-y divide-gray-100">
                {effectiveGiftCard.recipient_name && (
                  <DetailRow label="Recipient">
                    <span className="font-medium">
                      {effectiveGiftCard.recipient_name}
                    </span>
                  </DetailRow>
                )}
                {effectiveGiftCard.recipient_email && (
                  <DetailRow label="Recipient email">
                    <span className="break-all">
                      {effectiveGiftCard.recipient_email}
                    </span>
                  </DetailRow>
                )}
                {effectiveGiftCard.sender_name && (
                  <DetailRow label="From">
                    <span className="font-medium">
                      {effectiveGiftCard.sender_name}
                    </span>
                  </DetailRow>
                )}
                {effectiveGiftCard.occasion && (
                  <DetailRow label="Occasion">
                    <span>
                      {effectiveGiftCard.occasion} (
                      {getGiftCardOccasionMeta(effectiveGiftCard.occasion).editionLabel})
                    </span>
                  </DetailRow>
                )}
                <DetailRow label="Card style">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full border border-black/15 shrink-0"
                      style={{
                        backgroundColor: resolvedGiftCardDesign.surfaceHex,
                      }}
                    />
                    <span>
                      {[
                        effectiveGiftCard.design_name ||
                          resolvedGiftCardDesign.name,
                        `${effectiveGiftCard.font_name || resolvedGiftCardFont.name} font`,
                      ].join(' · ')}
                    </span>
                  </span>
                </DetailRow>
                {effectiveGiftCard.delivery_method && (
                  <DetailRow label="Delivery">
                    <span className="capitalize">
                      {effectiveGiftCard.delivery_date
                        ? `${effectiveGiftCard.delivery_method} (${effectiveGiftCard.delivery_date})`
                        : effectiveGiftCard.delivery_method}
                    </span>
                  </DetailRow>
                )}
                {effectiveGiftCard.personal_message && (
                  <DetailRow label="Message">
                    <span className="italic text-gray-600">
                      &ldquo;{effectiveGiftCard.personal_message}&rdquo;
                    </span>
                  </DetailRow>
                )}
              </div>
            </div>
          )}

          {/* Appointment block if present */}
          {tx.booking && (
            <div className="mx-5 mt-3 rounded-xl border border-[#7B2D8E]/15 overflow-hidden">
              <div className="px-3.5 py-2 bg-[#F7F2FA] border-b border-[#7B2D8E]/15 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]">
                  Appointment
                </span>
                {(() => {
                  const meta =
                    BOOKING_STATUS_META[tx.booking.status] ??
                    BOOKING_STATUS_META.pending
                  return (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        meta.chip,
                      )}
                    >
                      {meta.label}
                    </span>
                  )
                })()}
              </div>
              <div className="px-3.5 divide-y divide-gray-100">
                {tx.booking.services && tx.booking.services.length > 0 && (
                  <DetailRow
                    label={tx.booking.services.length > 1 ? 'Services' : 'Service'}
                  >
                    <span className="font-medium leading-relaxed">
                      {tx.booking.services.map((s) => s.treatment_name).join(', ')}
                    </span>
                  </DetailRow>
                )}
                <DetailRow label="Date & Time">
                  <span className="font-medium tabular-nums">
                    {formatAppointmentDate(tx.booking.appointment_date)} ·{' '}
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
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 text-[#7B2D8E] shrink-0" />
                    {tx.booking.location_name}
                  </span>
                </DetailRow>
                <DetailRow label="Booking ref">
                  <Link
                    href={`/booking/${encodeURIComponent(tx.booking.booking_reference)}`}
                    className="font-mono text-[11px] font-semibold text-[#7B2D8E] hover:underline"
                  >
                    {tx.booking.booking_reference}
                  </Link>
                </DetailRow>
              </div>
            </div>
          )}

          {/* Solid Single-Color Total Block */}
          <div
            className="mx-5 mt-3.5 rounded-xl bg-[#7B2D8E] text-white px-4 py-3 flex items-center justify-between border border-[#7B2D8E]"
            style={RECEIPT_TOTAL_PATTERN_STYLE}
          >
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/75">
                {tx.status === 'completed'
                  ? isIncoming
                    ? 'Total Credited'
                    : 'Total Paid'
                  : 'Amount'}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">
                {tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-white">
                {methodLabel(tx.payment_method)}
              </p>
              <p className="text-[10px] font-mono text-white/75 mt-0.5">
                {status.label}
              </p>
            </div>
          </div>

          <ReceiptTearDivider notchBgClass="bg-[#F7F5F9]" className="mt-2" />

          <footer className="px-5 pb-4 pt-1 text-center text-[10.5px] text-gray-500 leading-relaxed">
            <p className="font-semibold text-[#7B2D8E]">
              Crafted with care at Dermaspace
            </p>
            <p className="mt-0.5">
              237B Muri Okunola St, VI &middot; 9 Agbeke Rotinwa Cl, Ikoyi &middot; hello@dermaspaceng.com
            </p>
          </footer>
        </article>

        {/* Compact Secondary Actions Below Receipt */}
        <div className="mt-3.5 rounded-xl bg-white px-4 py-3 border border-gray-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
          {!viewerIsTeam && tx.status === 'pending' && (
            <button
              type="button"
              onClick={cancelPayment}
              disabled={cancelling}
              className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#7B2D8E] disabled:opacity-60"
            >
              {cancelling ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {cancelling ? 'Checking…' : 'Cancel pending'}
            </button>
          )}
          {!viewerIsTeam && (tx.status === 'cancelled' || tx.status === 'failed') && (
            <Link
              href={`/dashboard/wallet?fund=${tx.amount}`}
              className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </Link>
          )}
          {!viewerIsTeam && tx.status === 'completed' && isIncoming && (
            <Link
              href="/dashboard/wallet"
              className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] hover:underline"
            >
              <Wallet className="h-3.5 w-3.5" />
              Fund wallet again
            </Link>
          )}
          {tx.booking && (
            <Link
              href={`/booking/${encodeURIComponent(tx.booking.booking_reference)}`}
              className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] hover:underline"
            >
              <Calendar className="h-3.5 w-3.5" />
              Full booking
            </Link>
          )}
          {viewerIsTeam ? (
            <Link
              href="/staff/money"
              className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#7B2D8E] ml-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Staff Console
            </Link>
          ) : (
            <Link
              href="/dashboard/support"
              className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#7B2D8E] ml-auto"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Support
            </Link>
          )}
        </div>
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  )
}
