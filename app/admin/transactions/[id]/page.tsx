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
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: number
  user_id: number
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference: string | null
  paystack_reference: string | null
  description: string | null
  error_message: string | null
  created_at: string
  formattedAmount: string
  formattedDate: string
  user: { id: number; name: string; email: string } | null
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
  const [tx, setTx] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [rechecking, setRechecking] = useState(false)
  const [recheckMsg, setRecheckMsg] = useState<string | null>(null)

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
          ? 'Payment confirmed and wallet credited.'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !tx) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm py-12 px-6 text-center space-y-3 max-w-md mx-auto">
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

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to transactions
      </Link>

      {/* Hero — amount + status, brand purple */}
      <div className="relative overflow-hidden rounded-2xl bg-[#7B2D8E] text-white p-6 sm:p-8 shadow-sm">
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

      {/* Pending re-check action */}
      {tx.status === 'pending' && (tx.payment_method === 'paystack' || tx.payment_method === 'bank_transfer') && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">This payment is still pending</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Re-check it directly with Paystack to confirm, fail, or cancel it now.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={recheck}
            disabled={rechecking}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] disabled:opacity-60 whitespace-nowrap"
          >
            {rechecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {rechecking ? 'Checking…' : 'Re-check with Paystack'}
          </button>
        </div>
      )}
      {recheckMsg && (
        <p className="text-sm text-gray-600 -mt-1 px-1">{recheckMsg}</p>
      )}

      {/* Detail grid */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
        <DetailRow icon={Hash} label="Transaction ID" value={<span className="font-mono text-xs break-all">{tx.id}</span>} />
        <DetailRow icon={Calendar} label="Date" value={tx.formattedDate} />
        <DetailRow icon={CreditCard} label="Payment method" value={<span className="capitalize">{tx.payment_method.replace('_', ' ')}</span>} />
        <DetailRow
          icon={UserIcon}
          label="User"
          value={
            tx.user ? (
              <Link href={`/admin/users`} className="text-[#7B2D8E] hover:underline">
                {tx.user.name}
              </Link>
            ) : (
              'Unknown'
            )
          }
        />
        <DetailRow icon={Mail} label="Email" value={tx.user?.email || '—'} />
        {tx.payment_reference && (
          <CopyRow
            label="Reference"
            value={tx.payment_reference}
            copied={copied === 'ref'}
            onCopy={() => copy(tx.payment_reference!, 'ref')}
          />
        )}
        {tx.paystack_reference && (
          <CopyRow
            label="Paystack ref"
            value={tx.paystack_reference}
            copied={copied === 'pref'}
            onCopy={() => copy(tx.paystack_reference!, 'pref')}
          />
        )}
      </div>

      {tx.description && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
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
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <span className="inline-flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </span>
      <span className="text-sm text-gray-900 text-right min-w-0 truncate">{value}</span>
    </div>
  )
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-2 min-w-0 text-sm text-gray-900 hover:text-[#7B2D8E] transition-colors group"
        title="Copy to clipboard"
      >
        <span className="font-mono text-xs truncate">{value}</span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#7B2D8E] flex-shrink-0" />
        )}
      </button>
    </div>
  )
}
