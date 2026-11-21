'use client'

/**
 * Admin transaction detail page.
 *
 * Replaces the previous modal overlay — admins land on a real page
 * that is deep-linkable, works with browser back, and shows all
 * transaction details without obscuring the list behind it.
 *
 * Design: a brand-purple amount hero up top (the single most
 * important fact), a status pill, then a clean two-column detail
 * grid. Everything stays on the Dermaspace palette and reflows to a
 * single column on phones. Long references get their own copyable
 * rows so the giant Paystack/UUID strings never blow out the layout.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle, Clock, XCircle,
  AlertCircle as AlertIcon, Copy, Check, Mail, User as UserIcon,
  CreditCard, Calendar, Hash, RefreshCw, ArrowDownLeft, ArrowUpRight,
  RotateCcw, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/shared/notify'

interface Transaction {
  id: string | number
  user_id: string | number
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference: string | null
  paystack_reference: string | null
  description: string | null
  error_message: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  formattedAmount: string
  formattedDate: string
  invoice?: { invoice_number: string; status: string } | null
  user: { id: string | number; name: string; email: string } | null
}

const statusStyles: Record<string, string> = {
  completed: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4" />
    case 'pending': return <Clock className="w-4 h-4" />
    case 'failed': return <XCircle className="w-4 h-4" />
    default: return <AlertIcon className="w-4 h-4" />
  }
}

const typeMeta: Record<string, { color: string; prefix: string; Icon: typeof ArrowDownLeft; label: string }> = {
  credit: { color: 'text-[#7B2D8E]', prefix: '+', Icon: ArrowDownLeft, label: 'Credit' },
  debit: { color: 'text-gray-900', prefix: '-', Icon: ArrowUpRight, label: 'Debit' },
  refund: { color: 'text-[#7B2D8E]', prefix: '+', Icon: RotateCcw, label: 'Refund' },
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const notify = useNotify()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [rechecking, setRechecking] = useState(false)
  const [recheckMsg, setRecheckMsg] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setTx(data.transaction)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/transactions/${id}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) setTx(data.transaction)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard not available — no-op */
    }
  }

  // Admin-triggered reconciliation: re-check this pending charge with
  // Paystack right now instead of waiting for the cron sweep.
  const recheck = async () => {
    setRechecking(true)
    setRecheckMsg(null)
    try {
      const res = await fetch('/api/admin/transactions/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Re-check failed')
      setRecheckMsg(
        data.outcome === 'credited'
          ? data.txType === 'gift_card' || tx?.type === 'debit'
            ? 'Payment confirmed and finalized.'
            : 'Payment confirmed and wallet credited.'
          : data.outcome === 'failed'
            ? 'Paystack reports this payment failed.'
            : data.outcome === 'cancelled'
              ? 'Paystack reports this payment was abandoned.'
              : 'Still pending on Paystack. Try again shortly.',
      )
      await load()
    } catch (e) {
      setRecheckMsg(e instanceof Error ? e.message : 'Re-check failed')
    } finally {
      setRechecking(false)
    }
  }

  const handleCancelPayment = async () => {
    if (!id) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/transactions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not cancel payment')

      setCancelOpen(false)
      setCancelReason('')
      await load()

      if (data.credited) {
        notify.success(
          'Payment completed',
          data.message || 'Paystack reported success so the payment was finalized instead of cancelled.',
        )
      } else {
        notify.success(
          'Payment cancelled',
          'The pending transaction has been cancelled and the customer notified.',
        )
      }
    } catch (e) {
      notify.error('Cancel failed', e instanceof Error ? e.message : 'Could not cancel payment')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !tx) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-12 px-6 text-center space-y-3 max-w-md mx-auto">
        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Unable to load transaction</h2>
          <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
        </div>
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to transactions
        </Link>
      </div>
    )
  }

  const tMeta = typeMeta[tx.type] || typeMeta.credit
  const TypeIcon = tMeta.Icon
  const bookingReference =
    typeof tx.metadata?.booking_reference === 'string' && tx.metadata.booking_reference
      ? tx.metadata.booking_reference
      : typeof tx.metadata?.bookingReference === 'string' && tx.metadata.bookingReference
        ? tx.metadata.bookingReference
        : null

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to transactions
      </Link>

      {/* Hero — amount + status, brand purple */}
      <div className="relative overflow-hidden rounded-2xl bg-[#7B2D8E] text-white p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -right-2 bottom-0 h-24 w-24 rounded-full bg-white/5"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
              <TypeIcon className="w-3.5 h-3.5" />
            </span>
            {tMeta.label}
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
              'bg-white/15 text-white border-white/25',
            )}
          >
            {statusIcon(tx.status)}
            {tx.status}
          </span>
        </div>
        <div className="relative mt-5">
          <p className="text-3xl sm:text-4xl font-bold tracking-tight">
            {tMeta.prefix}{tx.formattedAmount}
          </p>
          <p className="mt-1.5 text-sm text-white/80">
            {tx.description || 'Transaction'}
          </p>
        </div>
      </div>

      {/* Pending triage actions */}
      {tx.status === 'pending' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">This payment is still pending</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {tx.payment_method === 'paystack' || tx.payment_method === 'bank_transfer'
                  ? 'Re-check it directly with Paystack or cancel it cleanly if the customer abandoned checkout.'
                  : 'Cancel this pending payment if it will no longer be completed.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {(tx.payment_method === 'paystack' || tx.payment_method === 'bank_transfer') && (
              <button
                type="button"
                onClick={recheck}
                disabled={rechecking || cancelling}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] disabled:opacity-60 whitespace-nowrap"
              >
                {rechecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {rechecking ? 'Checking…' : 'Re-check with Paystack'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCancelReason('')
                setCancelOpen(true)
              }}
              disabled={rechecking || cancelling}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg border border-rose-200 bg-white text-rose-700 text-sm font-medium hover:bg-rose-50 disabled:opacity-60 whitespace-nowrap"
            >
              <XCircle className="w-4 h-4" />
              Cancel payment
            </button>
          </div>
        </div>
      )}
      {recheckMsg && (
        <p className="text-sm text-gray-600 -mt-1 px-1">{recheckMsg}</p>
      )}

      {/* Detail grid */}
      <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100">
        <CopyRow
          icon={Hash}
          label="Transaction ID"
          value={String(tx.id)}
          copied={copied === 'id'}
          onCopy={() => copy(String(tx.id), 'id')}
          mono
        />
        <DetailRow icon={Calendar} label="Date" value={tx.formattedDate} />
        <DetailRow icon={CreditCard} label="Payment method" value={<span className="capitalize">{tx.payment_method.replace('_', ' ')}</span>} />
        <DetailRow
          icon={UserIcon}
          label="User"
          value={
            tx.user ? (
              <Link href={`/admin/users/${tx.user.id}`} className="text-[#7B2D8E] hover:underline font-medium">
                {tx.user.name}
              </Link>
            ) : (
              'Unknown'
            )
          }
        />
        {tx.user?.email ? (
          <CopyRow
            icon={Mail}
            label="Email"
            value={tx.user.email}
            copied={copied === 'email'}
            onCopy={() => copy(tx.user!.email, 'email')}
          />
        ) : (
          <DetailRow icon={Mail} label="Email" value="—" />
        )}
        {tx.payment_reference && (
          <CopyRow
            icon={Hash}
            label="Reference"
            value={tx.payment_reference}
            copied={copied === 'ref'}
            onCopy={() => copy(tx.payment_reference!, 'ref')}
            mono
          />
        )}
        {tx.paystack_reference && (
          <CopyRow
            icon={CreditCard}
            label="Paystack ref"
            value={tx.paystack_reference}
            copied={copied === 'pref'}
            onCopy={() => copy(tx.paystack_reference!, 'pref')}
            mono
          />
        )}
        {tx.invoice?.invoice_number && (
          <CopyRow
            icon={FileText}
            label="Invoice no."
            value={tx.invoice.invoice_number}
            copied={copied === 'inv'}
            onCopy={() => copy(tx.invoice!.invoice_number, 'inv')}
            mono
          />
        )}
        {bookingReference && (
          <CopyRow
            icon={Calendar}
            label="Booking ref"
            value={bookingReference}
            copied={copied === 'bref'}
            onCopy={() => copy(bookingReference, 'bref')}
            mono
          />
        )}
      </div>

      {tx.description && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Description</p>
          <p className="text-sm text-gray-800 leading-relaxed">{tx.description}</p>
        </div>
      )}

      {tx.error_message && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Error</p>
          <p className="text-sm text-rose-700 mt-1 leading-relaxed">{tx.error_message}</p>
        </div>
      )}

      {cancelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-tx-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-600 flex-shrink-0">
                <XCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 id="cancel-tx-title" className="text-base font-semibold text-gray-900">
                  Cancel pending payment?
                </h2>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  {(tx.payment_method === 'paystack' || tx.payment_method === 'bank_transfer')
                    ? 'We will verify with Paystack first. If the payment succeeded, it will be completed instead; otherwise this pending charge will be marked cancelled and the client will be emailed.'
                    : 'This pending payment will be marked cancelled and the customer will receive a confirmation notice.'}
                </p>
              </div>
            </div>

            <label className="block mt-4">
              <span className="text-xs font-medium text-gray-600">Reason (optional)</span>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={300}
                placeholder="e.g. Abandoned checkout / customer paid in cash"
                className="mt-1 w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] focus:outline-none"
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep pending
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelPayment}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] disabled:opacity-60 cursor-pointer"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5">
      <span className="inline-flex items-center gap-2 text-sm text-gray-500 flex-shrink-0 pt-0.5">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </span>
      <span className="text-sm text-gray-900 text-right min-w-0 break-words">{value}</span>
    </div>
  )
}

function CopyRow({
  icon: Icon,
  label,
  value,
  copied,
  onCopy,
  mono = false,
}: {
  icon?: typeof Hash
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  mono?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-5 py-3.5">
      <span className="inline-flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
      </span>
      <div className="flex items-center justify-between sm:justify-end gap-2.5 min-w-0">
        <span
          className={cn(
            'text-gray-900 break-all sm:text-right min-w-0 select-all',
            mono ? 'font-mono text-xs' : 'text-sm',
          )}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors flex-shrink-0',
            copied
              ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#7B2D8E]'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]',
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

