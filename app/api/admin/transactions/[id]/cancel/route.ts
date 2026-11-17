import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { type Transaction } from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { finalizeGiftCardPaystackPayment } from '@/lib/gift-cards'
import { finalizeMembershipPaystackPayment } from '@/lib/membership-activation'
import { finalizePendingTransactionFailureOrCancel } from '@/lib/transaction-failure-notice'
import { notifyUser } from '@/lib/notifications'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import { invalidateAdminStats } from '@/lib/stats-cache'
import { logStaffActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      reason?: unknown
    }
    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim().slice(0, 300)
        : 'Payment cancelled by Dermaspace admin'

    const rows = (await sql`
      SELECT *, reference AS payment_reference
      FROM transactions
      WHERE id = ${id}
      LIMIT 1
    `) as Transaction[]

    const tx = rows[0]
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({
        success: true,
        alreadyFinal: true,
        status: tx.status,
      })
    }

    const ref =
      tx.paystack_reference ||
      tx.payment_reference ||
      (tx as { reference?: string }).reference

    if (
      (tx.payment_method === 'paystack' || tx.payment_method === 'bank_transfer') &&
      ref
    ) {
      try {
        const verification = await verifyPayment(ref)
        const data = verification?.data
        if (data?.status === 'success') {
          const amount = fromKobo(data.amount)
          const txType = (tx.metadata as { type?: string } | null)?.type
          const channelLabel =
            (tx.metadata as { channel?: string } | null)?.channel === 'bank_transfer'
              ? 'Bank Transfer'
              : 'Paystack'

          if (txType === 'membership_subscription') {
            await finalizeMembershipPaystackPayment({
              transaction: tx,
              paystackReference: data.reference,
              amountPaid: amount,
              customerEmail: data.customer?.email,
            })
          } else if (txType === 'gift_card') {
            await finalizeGiftCardPaystackPayment({
              transaction: tx,
              paystackReference: data.reference,
              amount,
              customerEmail: data.customer?.email,
              channelLabel,
            })
          } else {
            await finalizeWalletFunding({
              userId: tx.user_id,
              amount,
              paymentReference:
                tx.payment_reference ||
                (tx as { reference?: string }).reference ||
                data.reference,
              paystackReference: data.reference,
              customerEmail: data.customer?.email,
              channelLabel,
            })
          }

          await invalidateAdminStats()
          return NextResponse.json({
            success: true,
            status: 'completed',
            credited: true,
            message:
              'This payment succeeded on Paystack and has been completed instead of cancelled.',
          })
        }
      } catch (err) {
        console.warn('[admin/transactions/cancel] Paystack check skipped:', err)
      }
    }

    const { transitioned } = await finalizePendingTransactionFailureOrCancel({
      transaction: tx,
      nextStatus: 'cancelled',
      reason,
    })

    if (transitioned && tx.user_id) {
      const displayRef =
        tx.payment_reference ||
        (tx as { reference?: string }).reference ||
        String(tx.id)

      await notifyUser({
        userId: String(tx.user_id),
        title: 'Payment cancelled',
        message: `Your pending payment of ₦${Math.round(Number(tx.amount) || 0).toLocaleString('en-NG')} was cancelled. No funds were charged.`,
        type: 'status_update',
        referenceType: 'transaction',
        referenceId: displayRef,
        actionUrl: `/dashboard/transactions/${displayRef}`,
        priority: 'normal',
      }).catch((err) => {
        console.error('[admin/transactions/cancel] notify failed:', err)
      })
    }

    await invalidateAdminStats()
    await logStaffActivity({
      staffId: String(admin.id),
      userId: tx.user_id ? String(tx.user_id) : null,
      actionType: 'payment_cancelled',
      entityType: 'transaction',
      entityId: String(tx.id),
      description: `Cancelled pending payment of ₦${Math.round(Number(tx.amount) || 0).toLocaleString('en-NG')}${reason ? ` — ${reason}` : ''}`,
    })

    return NextResponse.json({
      success: true,
      status: 'cancelled',
    })
  } catch (error) {
    console.error('[admin/transactions/cancel] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel transaction' },
      { status: 500 },
    )
  }
}
