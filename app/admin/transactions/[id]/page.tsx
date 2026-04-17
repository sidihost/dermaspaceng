'use client'

/**
 * Admin transaction detail page.
 *
 * Replaces the previous modal overlay — admins land on a real page
 * that is deep-linkable, works with browser back, and shows all
 * transaction details without obscuring the list behind it.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle, Clock, XCircle,
  AlertCircle as AlertIcon,
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

const typeStyles: Record<string, { color: string; prefix: string }> = {
  credit: { color: 'text-[#7B2D8E]', prefix: '+' },
  debit: { color: 'text-gray-900', prefix: '-' },
  refund: { color: 'text-gray-600', prefix: '+' },
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [tx, setTx] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !tx) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
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
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to transactions
      </Link>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Transaction</p>
              <h1 className="text-lg font-semibold text-gray-900 font-mono">#{tx.id}</h1>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
                statusStyles[tx.status] || statusStyles.pending
              )}
            >
              {statusIcon(tx.status)}
              {tx.status}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Row label="Date" value={tx.formattedDate} />
            <Row label="Type" value={<span className="capitalize">{tx.type}</span>} />
            <Row
              label="Amount"
              value={
                <span className={cn('font-semibold', typeStyles[tx.type]?.color)}>
                  {typeStyles[tx.type]?.prefix || ''}
                  {tx.formattedAmount}
                </span>
              }
            />
            <Row label="Payment method" value={<span className="capitalize">{tx.payment_method.replace('_', ' ')}</span>} />
            <Row label="User" value={tx.user?.name || 'Unknown'} />
            <Row label="Email" value={tx.user?.email || '—'} />
            {tx.payment_reference && (
              <Row label="Reference" value={<span className="font-mono text-xs">{tx.payment_reference}</span>} />
            )}
            {tx.paystack_reference && (
              <Row label="Paystack ref" value={<span className="font-mono text-xs">{tx.paystack_reference}</span>} />
            )}
          </div>

          {tx.description && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-800">{tx.description}</p>
            </div>
          )}

          {tx.error_message && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
              <p className="text-xs font-semibold text-rose-700 uppercase">Error</p>
              <p className="text-sm text-rose-700 mt-1">{tx.error_message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right min-w-0 truncate">{value}</span>
    </div>
  )
}
