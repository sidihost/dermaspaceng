'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCw, AlertCircle, TrendingDown } from 'lucide-react'
import { naira } from '@/lib/format'

interface PaymentRecord {
  id: string
  type: 'wallet_credit' | 'wallet_debit' | 'booking_charge' | 'refund'
  amount: number // in kobo
  description: string
  reference?: string
  created_at: string
  // For Paystack charges
  paystack_reference?: string
  paystack_status?: string
}

interface ClientPaymentsTabProps {
  clientId: string
  clientName: string
}

export function ClientPaymentsTab({ clientId, clientName }: ClientPaymentsTabProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refunding, setRefunding] = useState<string | null>(null)

  useEffect(() => {
    loadPayments()
  }, [clientId])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/staff/clients/${clientId}/payments`)
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading payments')
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (
    paymentId: string,
    amount: number,
    paystackRef?: string,
  ) => {
    if (!confirm('Are you sure you want to refund this payment?')) return

    try {
      setRefunding(paymentId)
      const res = await fetch('/api/staff/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          paymentId,
          amount,
          paystackReference: paystackRef,
          reason: `Manual refund by staff for ${clientName}`,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Refund failed')
      }

      await loadPayments()
      alert('Refund processed successfully')
    } catch (err) {
      alert(`Refund failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setRefunding(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-900">{error}</p>
            <button
              onClick={loadPayments}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!payments.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">No payment records found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Payment history</h3>
        <button
          onClick={loadPayments}
          disabled={loading}
          className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
        >
          <RotateCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="rounded-lg border border-gray-100 p-3 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {payment.description}
                  </p>
                  {payment.type === 'refund' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <TrendingDown className="h-3 w-3" />
                      Refund
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(payment.created_at).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {payment.reference && (
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Ref: {payment.reference}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    payment.type === 'refund' || payment.type === 'wallet_debit'
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {payment.type === 'refund' || payment.type === 'wallet_debit'
                    ? '−'
                    : '+'}
                  {naira(payment.amount / 100)}
                </p>

                {/* Show refund button only for Paystack charges that aren't already refunded */}
                {payment.type === 'booking_charge' &&
                  payment.paystack_reference &&
                  payment.paystack_status !== 'refunded' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleRefund(
                          payment.id,
                          payment.amount,
                          payment.paystack_reference,
                        )
                      }
                      disabled={refunding === payment.id}
                      className="mt-2 h-7 text-xs"
                    >
                      {refunding === payment.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processing
                        </>
                      ) : (
                        'Refund'
                      )}
                    </Button>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
