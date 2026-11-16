'use client'

/**
 * /dashboard/wallet/payment-status?reference=WF_...
 *
 * The single landing screen for every Paystack checkout outcome —
 * success, failed, cancelled, or still pending. The page reads the
 * transaction's state from OUR database (not from URL params a user
 * could tamper with), so what the customer sees always matches the
 * ledger.
 *
 * Pending transactions are actively reconciled: we nudge
 * /api/wallet/reconcile (which asks Paystack for the real status) and
 * re-poll a few times so a slow webhook never strands the customer on
 * a spinner.
 */

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check,
  X,
  Clock,
  Copy,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Wallet,
  CreditCard,
  Landmark,
  Banknote,
  Receipt,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import PageLoader from '@/components/shared/page-loader'
import { Button } from '@/components/ui/button'
import type { TransactionDetail } from '@/components/wallet/transaction-detail-sheet'
import {
  downloadTransactionReceiptImage,
  downloadTransactionReceiptPdf,
} from '@/lib/receipt-pdf'
import {
  ReceiptActionButtons,
  ReceiptCrownBand,
} from '@/components/receipt/receipt-chrome'

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 8

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

function MethodIcon({ method }: { method: TransactionDetail['payment_method'] }) {
  if (method === 'bank_transfer') return <Landmark className="h-4 w-4" />
  if (method === 'cash') return <Banknote className="h-4 w-4" />
  if (method === 'wallet') return <Wallet className="h-4 w-4" />
  return <CreditCard className="h-4 w-4" />
}

function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') || ''

  const [tx, setTx] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState(false)

  const fetchTransaction = useCallback(async () => {
    if (!reference) return null
    const res = await fetch(
      `/api/wallet/transactions/${encodeURIComponent(reference)}`,
      { credentials: 'include' },
    )
    if (res.status === 404) {
      setNotFound(true)
      return null
    }
    if (!res.ok) return null
    const data = await res.json()
    return (data.transaction as TransactionDetail) || null
  }, [reference])

  // Initial load
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const t = await fetchTransaction()
      if (!cancelled) {
        setTx(t)
        setLoading(false)
      }
    }
    if (reference) {
      load()
    } else {
      setNotFound(true)
      setLoading(false)
    }
    return () => {
      cancelled = true
    }
  }, [reference, fetchTransaction])

  // While pending: immediately nudge single-reference reconciliation on first
  // mount (pollCount === 0) so cancelled/completed payments settle without lag,
  // then continue polling at POLL_INTERVAL_MS up to MAX_POLLS.
  useEffect(() => {
    if (!tx || tx.status !== 'pending' || pollCount >= MAX_POLLS || !reference) return
    const delayMs = pollCount === 0 ? 0 : POLL_INTERVAL_MS
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        await fetch(
          `/api/wallet/reconcile?reference=${encodeURIComponent(reference)}`,
          { credentials: 'include' },
        )
      } catch {
        // best effort — the re-fetch below still runs
      }
      if (cancelled) return
      const fresh = await fetchTransaction()
      if (!cancelled && fresh) setTx(fresh)
      if (!cancelled) setPollCount((c) => c + 1)
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tx, pollCount, reference, fetchTransaction])

  // "I cancelled on Paystack — stop showing this as pending." The
  // endpoint re-verifies with Paystack first, so if the charge actually
  // went through the wallet is credited instead of cancelled.
  const cancelPayment = async () => {
    if (!reference || cancelling) return
    setCancelling(true)
    try {
      const res = await fetch(
        `/api/wallet/transactions/${encodeURIComponent(reference)}/cancel`,
        { method: 'POST', credentials: 'include' },
      )
      if (res.ok) {
        const fresh = await fetchTransaction()
        if (fresh) setTx(fresh)
      }
    } catch {
      // best effort — the polling loop will keep the page honest
    } finally {
      setCancelling(false)
    }
  }

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  if (loading) return <PageLoader label="Checking your payment…" />

  if (notFound || !tx) {
    return (
      <StatusShell>
        <StatusBadge tone="neutral">
          <X className="h-8 w-8" />
        </StatusBadge>
        <h1 className="mt-5 text-xl sm:text-2xl font-bold text-gray-900 text-balance">
          We couldn&apos;t find that payment
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
          The payment reference is missing or doesn&apos;t belong to your
          account. If you were charged, your money is safe — contact support
          with your bank statement and we&apos;ll trace it.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/dashboard/wallet">
            <Button size="sm" className="w-full sm:w-auto h-8 px-3 text-xs gap-1.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to wallet
            </Button>
          </Link>
        </div>
      </StatusShell>
    )
  }

  const isPending = tx.status === 'pending'
  const stillChecking = isPending && pollCount < MAX_POLLS

  const headline =
    tx.status === 'completed'
      ? 'Payment successful'
      : tx.status === 'cancelled'
        ? 'Payment cancelled'
        : tx.status === 'failed'
          ? 'Payment failed'
          : stillChecking
            ? 'Confirming your payment…'
            : 'Payment still processing'

  const subcopy =
    tx.status === 'completed'
      ? tx.type === 'debit'
        ? `Your payment of ${formatCurrency(tx.amount, tx.currency)} is confirmed. A receipt has been sent to your email.`
        : `${formatCurrency(tx.amount, tx.currency)} has been added to your wallet. A receipt has been sent to your email.`
      : tx.status === 'cancelled'
        ? 'You cancelled this payment before it completed. No money left your account.'
        : tx.status === 'failed'
          ? tx.error_message ||
            'Your payment could not be processed. You have not been charged.'
          : stillChecking
            ? "This usually takes a few seconds. We're confirming with your bank — please don't close this page."
            : "Your bank hasn't confirmed this payment yet. If you completed it, your payment will be finalized automatically — no action needed."

  return (
    <StatusShell>
      {/* Status badge */}
      {tx.status === 'completed' && (
        <StatusBadge tone="success">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.span>
        </StatusBadge>
      )}
      {tx.status === 'cancelled' && (
        <StatusBadge tone="neutral">
          <X className="h-8 w-8" strokeWidth={2.5} />
        </StatusBadge>
      )}
      {tx.status === 'failed' && (
        <StatusBadge tone="error">
          <X className="h-8 w-8" strokeWidth={2.5} />
        </StatusBadge>
      )}
      {isPending && (
        <StatusBadge tone="pending">
          {stillChecking ? (
            <RefreshCw className="h-7 w-7 animate-spin" />
          ) : (
            <Clock className="h-8 w-8" />
          )}
        </StatusBadge>
      )}

      <h1 className="mt-5 text-xl sm:text-2xl font-bold text-gray-900 text-balance">
        {headline}
      </h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
        {subcopy}
      </p>

      {tx.status === 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.25 }}
          className="mt-5 rounded-2xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/5 px-4 py-3.5 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#7B2D8E] ring-1 ring-[#7B2D8E]/10">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Your wallet balance is unchanged
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                No payment was completed. You can return to your wallet and
                try again whenever you&apos;re ready.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Amount */}
      <p
        className={`mt-6 text-4xl sm:text-5xl font-bold tracking-tight ${
          tx.status === 'completed'
            ? 'text-[#7B2D8E]'
            : tx.status === 'failed'
              ? 'text-gray-400 line-through decoration-2'
              : 'text-gray-900'
        }`}
      >
        {formatCurrency(tx.amount, tx.currency)}
      </p>

      {/* Details card */}
      <div className="mt-7 rounded-2xl border border-gray-100 bg-gray-50/60 text-left divide-y divide-gray-100 overflow-hidden">
        <DetailRow label="Status">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
              tx.status === 'completed'
                ? 'bg-[#7B2D8E] text-white'
                : tx.status === 'pending'
                  ? 'bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/20'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {tx.status}
          </span>
        </DetailRow>
        <DetailRow label="Payment method">
          <span className="inline-flex items-center gap-1.5 text-gray-900">
            <MethodIcon method={tx.payment_method} />
            {methodLabel(tx.payment_method)}
          </span>
        </DetailRow>
        <DetailRow label="Date">
          <span className="text-gray-900">{formatDateTime(tx.created_at)}</span>
        </DetailRow>
        <DetailRow label="Reference">
          <button
            type="button"
            onClick={copyReference}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-900 hover:text-[#7B2D8E] transition-colors"
            aria-label="Copy payment reference"
          >
            <span className="truncate max-w-[160px] sm:max-w-none">{reference}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
            ) : (
              <Copy className="h-3.5 w-3.5 flex-shrink-0" />
            )}
          </button>
        </DetailRow>
        {tx.status === 'failed' && tx.error_message && (
          <DetailRow label="Reason">
            <span className="text-gray-700 text-xs">{tx.error_message}</span>
          </DetailRow>
        )}
      </div>

      {/* Pending escape hatch: the customer knows they cancelled even
          when Paystack is still reporting the charge as pending. */}
      {isPending && (
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left">
          <p className="text-xs text-gray-600 leading-relaxed">
            Cancelled this payment on the Paystack page? You can mark it as
            cancelled now — we&apos;ll double-check with Paystack first, so a
            payment that actually went through is always credited.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelPayment}
            disabled={cancelling}
            className="mt-2.5 gap-1.5 border-gray-200 text-gray-700 bg-transparent"
          >
            {cancelling ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {cancelling ? 'Checking with Paystack…' : 'I cancelled this payment'}
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2.5">
        {tx.status === 'completed' && reference && (
          <ReceiptActionButtons
            className="justify-center"
            downloadingPdf={downloadingPdf}
            downloadingImage={downloadingImage}
            onDownloadImage={async () => {
              if (downloadingImage) return
              setDownloadingImage(true)
              try {
                await downloadTransactionReceiptImage(tx)
              } catch {
                // best effort
              } finally {
                setDownloadingImage(false)
              }
            }}
            onDownloadPdf={async () => {
              if (downloadingPdf) return
              setDownloadingPdf(true)
              try {
                await downloadTransactionReceiptPdf(tx)
              } catch {
                // best effort
              } finally {
                setDownloadingPdf(false)
              }
            }}
            onPrint={() => {
              window.location.href = `/dashboard/transactions/${encodeURIComponent(reference)}?print=1`
            }}
          />
        )}
        <div className="flex flex-wrap gap-2 justify-center">
          {tx.status === 'completed' && reference && (
            <Link href={`/dashboard/transactions/${encodeURIComponent(reference)}`}>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg gap-1.5 border-gray-200 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]">
                <Receipt className="h-3.5 w-3.5" />
                View Receipt
              </Button>
            </Link>
          )}
          {(tx.status === 'cancelled' || tx.status === 'failed') && (
            <Link href={`/dashboard/wallet?fund=${tx.amount}`}>
              <Button size="sm" className="h-8 px-3 text-xs rounded-lg gap-1.5 bg-[#7B2D8E] hover:bg-[#5A1D6A]">
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </Link>
          )}
          <Link href="/dashboard/wallet">
            <Button
              size="sm"
              variant={isPending ? 'default' : 'outline'}
              className={`h-8 px-3 text-xs rounded-lg gap-1.5 ${
                isPending
                  ? 'bg-[#7B2D8E] hover:bg-[#5A1D6A]'
                  : 'border-gray-200 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              Back to wallet
            </Button>
          </Link>
          <Link href="/dashboard/transactions">
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs rounded-lg gap-1.5 border-gray-200 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]">
              Transactions
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Trust note */}
      <p className="mt-6 text-[11px] text-gray-400 leading-relaxed">
        Payments are processed securely by Paystack. Dermaspace never sees or
        stores your card details.
      </p>
    </StatusShell>
  )
}

function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7F5F9] flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md rounded-2xl bg-white border border-[#7B2D8E]/20 overflow-hidden text-center"
        >
          <ReceiptCrownBand />
          <div className="p-6 sm:p-8">{children}</div>
        </motion.div>
      </div>
      <Footer />
    </main>
  )
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'neutral' | 'pending'
  children: React.ReactNode
}) {
  const tones: Record<typeof tone, string> = {
    success: 'bg-[#7B2D8E] text-white',
    error: 'bg-gray-100 text-gray-800 border border-gray-200',
    neutral: 'bg-gray-100 text-gray-600',
    pending: 'bg-[#F7F2FA] text-[#7B2D8E] border border-[#7B2D8E]/25',
  }
  return (
    <div className="flex justify-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${tones[tone]}`}
      >
        {children}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<PageLoader label="Checking your payment…" />}>
      <PaymentStatusContent />
    </Suspense>
  )
}
