'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotify } from '@/components/shared/notify'
import { Loader2, RotateCw, AlertCircle, TrendingDown, XCircle } from 'lucide-react'
import { naira } from '@/lib/format'

interface PaymentRecord {
  id: string
  type: 'wallet_credit' | 'wallet_debit' | 'booking_charge' | 'refund'
  amount: number // in kobo
  description: string
  reference?: string
  created_at: string
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | string
  payment_method?: string
  // For Paystack charges
  paystack_reference?: string
  paystack_status?: string
}

interface ClientPaymentsTabProps {
  clientId: string
  clientName: string
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  refunded: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function ClientPaymentsTab({ clientId, clientName }: ClientPaymentsTabProps) {
  const notify = useNotify()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refundTarget, setRefundTarget] = useState<PaymentRecord | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<PaymentRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/staff/clients/${clientId}/payments`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading payments')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRefund = async () => {
    if (!refundTarget) return
    try {
      setRefunding(true)
      const res = await fetch('/api/staff/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          paymentId: refundTarget.id,
          amount: refundTarget.amount,
          paystackReference: refundTarget.paystack_reference,
          reason: `Manual refund by staff for ${clientName}`,
        }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(j.error || 'Refund failed')
      }

      setRefundTarget(null)
      await loadPayments()
      notify.success('Refund processed', `${naira(refundTarget.amount / 100)} returned to ${clientName}'s wallet.`)
    } catch (err) {
      notify.error('Refund failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRefunding(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    try {
      setCancelling(true)
      const res = await fetch(`/api/staff/clients/${clientId}/payments/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: cancelTarget.id,
          reference: cancelTarget.reference,
          reason: cancelReason.trim() || undefined,
        }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(j.error || 'Could not cancel payment')
      }

      setCancelTarget(null)
      setCancelReason('')
      await loadPayments()

      if (j.credited) {
        notify.success(
          'Payment completed',
          j.message || 'This payment had succeeded on Paystack and was finalized instead of cancelled.',
        )
      } else {
        notify.success(
          'Pending payment cancelled',
          'The payment has been marked cancelled and the client has been notified.',
        )
      }
    } catch (err) {
      notify.error('Cancel failed', err instanceof Error ? err.message : 'Could not cancel payment')
    } finally {
      setCancelling(false)
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
          aria-label="Refresh payments"
          className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
        >
          <RotateCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {payments.map((payment) => {
          const status = (payment.status || 'completed').toLowerCase()
          const badgeTone = STATUS_BADGE[status] || STATUS_BADGE.cancelled
          const isPending = status === 'pending'

          return (
            <div
              key={payment.id}
              className="rounded-lg border border-gray-100 p-3 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {payment.description}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${badgeTone}`}
                    >
                      {status}
                    </span>
                    {payment.type === 'refund' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
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
                    {payment.payment_method ? ` · ${payment.payment_method.replace('_', ' ')}` : ''}
                  </p>
                  {payment.reference && (
                    <p className="text-xs text-gray-400 font-mono mt-1 truncate">
                      Ref: {payment.reference}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      status === 'cancelled' || status === 'failed'
                        ? 'text-gray-400 line-through'
                        : isPending
                          ? 'text-amber-700'
                          : payment.type === 'refund' || payment.type === 'wallet_debit'
                            ? 'text-rose-600'
                            : 'text-[#7B2D8E]'
                    }`}
                  >
                    {payment.type === 'refund' || payment.type === 'wallet_debit'
                      ? '−'
                      : '+'}
                    {naira(payment.amount / 100)}
                  </p>

                  {isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCancelReason('')
                        setCancelTarget(payment)
                      }}
                      className="mt-2 h-7 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancel
                    </Button>
                  )}

                  {!isPending &&
                    payment.type === 'booking_charge' &&
                    payment.paystack_reference &&
                    payment.paystack_status !== 'refunded' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRefundTarget(payment)}
                        className="mt-2 h-7 text-xs text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                      >
                        Refund
                      </Button>
                    )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Refund confirmation dialog */}
      <Dialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => {
          if (!open && !refunding) setRefundTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refund to wallet?</DialogTitle>
            <DialogDescription>
              This will credit{' '}
              <span className="font-semibold text-gray-900">
                {refundTarget ? naira(refundTarget.amount / 100) : ''}
              </span>{' '}
              back to {clientName}&apos;s Dermaspace wallet and mark the original payment as refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundTarget(null)}
              disabled={refunding}
            >
              Keep payment
            </Button>
            <Button
              onClick={handleConfirmRefund}
              disabled={refunding}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] gap-1.5"
            >
              {refunding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel pending payment dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open && !cancelling) setCancelTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel pending payment?</DialogTitle>
            <DialogDescription>
              We will verify with Paystack first. If the charge actually succeeded, it will be completed instead; otherwise the pending payment of{' '}
              <span className="font-semibold text-gray-900">
                {cancelTarget ? naira(cancelTarget.amount / 100) : ''}
              </span>{' '}
              will be cancelled cleanly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="staff-cancel-reason">Reason (optional)</Label>
            <Input
              id="staff-cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Client chose to pay in person"
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              Keep pending
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              {cancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Cancel payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
