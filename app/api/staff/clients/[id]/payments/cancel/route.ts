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
import {
  invalidateAdminStats,
  invalidateAfterBookingChange,
} from '@/lib/stats-cache'
import { logStaffActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (me.role !== 'admin' && me.role !== 'staff') {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { id: clientId } = await params
    if (!clientId) {
      return NextResponse.json({ error: 'Missing client id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      paymentId?: unknown
      reference?: unknown
      reason?: unknown
    }

    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim().slice(0, 300)
        : 'Payment cancelled by Dermaspace staff'

    if (!paymentId && !reference) {
      return NextResponse.json(
        { error: 'Missing payment identifier' },
        { status: 400 },
      )
    }

    const targetRows = (await sql`
      SELECT id, role, email, first_name, last_name
      FROM users
      WHERE id = ${clientId}
      LIMIT 1
    `) as Array<{
      id: string
      role: string | null
      email: string | null
      first_name: string | null
      last_name: string | null
    }>

    const target = targetRows[0]
    if (!target) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (target.role === 'admin' || target.role === 'staff') {
      return NextResponse.json(
        { error: 'Cannot modify payments for operator accounts' },
        { status: 403 },
      )
    }

    // Handle pending booking charges surfaced directly from `bookings`
    if (paymentId.startsWith('booking_')) {
      const bookingId = paymentId.slice('booking_'.length)
      const bRows = (await sql`
        SELECT id, user_id, booking_reference, payment_reference, payment_method,
               payment_status, total_price_kobo
        FROM bookings
        WHERE id = ${bookingId}
          AND user_id = ${clientId}
        LIMIT 1
      `) as Array<{
        id: string
        user_id: string
        booking_reference: string | null
        payment_reference: string | null
        payment_method: string | null
        payment_status: string | null
        total_price_kobo: number | null
      }>

      const booking = bRows[0]
      if (!booking) {
        return NextResponse.json({ error: 'Pending booking payment not found' }, { status: 404 })
      }
      if (booking.payment_status !== 'pending') {
        return NextResponse.json({
          success: true,
          alreadyFinal: true,
          status: booking.payment_status,
        })
      }

      if (
        (booking.payment_method === 'paystack' || booking.payment_method === 'bank_transfer') &&
        booking.payment_reference
      ) {
        try {
          const verification = await verifyPayment(booking.payment_reference)
          if (verification?.data?.status === 'success') {
            return NextResponse.json(
              {
                error:
                  'This booking payment succeeded on Paystack. Please reconcile the booking instead of cancelling.',
              },
              { status: 409 },
            )
          }
        } catch (err) {
          console.warn('[staff/clients/payments/cancel] Paystack booking check skipped:', err)
        }
      }

      await sql`
        UPDATE bookings
        SET payment_status = 'cancelled', updated_at = NOW()
        WHERE id = ${booking.id}
          AND user_id = ${clientId}
          AND payment_status = 'pending'
      `

      const amountNaira = Math.round(Number(booking.total_price_kobo ?? 0) / 100)
      await notifyUser({
        userId: clientId,
        title: 'Pending booking payment cancelled',
        message: `Your pending payment of ₦${amountNaira.toLocaleString('en-NG')} for booking ${booking.booking_reference || booking.id} was cancelled.`,
        type: 'status_update',
        referenceType: 'booking',
        referenceId: booking.booking_reference || String(booking.id),
        actionUrl: `/dashboard/bookings`,
        priority: 'normal',
      }).catch((err) => {
        console.error('[staff/clients/payments/cancel] booking notify failed:', err)
      })

      await invalidateAfterBookingChange({
        customerUserId: clientId,
        staffUserId: String(me.id),
      })

      await logStaffActivity({
        staffId: String(me.id),
        userId: clientId,
        actionType: 'payment_cancelled',
        entityType: 'booking',
        entityId: String(booking.id),
        description: `Cancelled pending booking payment ${booking.booking_reference || booking.id} (₦${amountNaira.toLocaleString('en-NG')})`,
      })

      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    // Standard `transactions` ledger row
    let tx: Transaction | undefined
    if (paymentId) {
      const byId = (await sql`
        SELECT *, reference AS payment_reference
        FROM transactions
        WHERE id = ${paymentId}
          AND user_id = ${clientId}
        LIMIT 1
      `) as Transaction[]
      tx = byId[0]
    }
    if (!tx && reference) {
      const byRef = (await sql`
        SELECT *, reference AS payment_reference
        FROM transactions
        WHERE (reference = ${reference} OR paystack_reference = ${reference})
          AND user_id = ${clientId}
        ORDER BY created_at DESC
        LIMIT 1
      `) as Transaction[]
      tx = byRef[0]
    }

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
      (tx as { reference?: string }).reference ||
      reference

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
              customerEmail: data.customer?.email || target.email || undefined,
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
              'Payment had already succeeded on Paystack and has been completed instead of cancelled.',
          })
        }
      } catch (err) {
        console.warn('[staff/clients/payments/cancel] Paystack check skipped:', err)
      }
    }

    const { transitioned } = await finalizePendingTransactionFailureOrCancel({
      transaction: tx,
      nextStatus: 'cancelled',
      reason,
      customerEmail: target.email,
    })

    if (transitioned) {
      const displayRef =
        tx.payment_reference ||
        (tx as { reference?: string }).reference ||
        String(tx.id)
      await notifyUser({
        userId: clientId,
        title: 'Payment cancelled',
        message: `Your pending payment of ₦${Math.round(Number(tx.amount) || 0).toLocaleString('en-NG')} was cancelled. No funds were charged.`,
        type: 'status_update',
        referenceType: 'transaction',
        referenceId: displayRef,
        actionUrl: `/dashboard/transactions/${displayRef}`,
        priority: 'normal',
      }).catch((err) => {
        console.error('[staff/clients/payments/cancel] notify failed:', err)
      })
    }

    await invalidateAdminStats()
    await logStaffActivity({
      staffId: String(me.id),
      userId: clientId,
      actionType: 'payment_cancelled',
      entityType: 'transaction',
      entityId: String(tx.id),
      description: `Cancelled pending payment of ₦${Math.round(Number(tx.amount) || 0).toLocaleString('en-NG')}${reason ? ` — ${reason}` : ''}`,
    })

    return NextResponse.json({ success: true, status: 'cancelled' })
  } catch (error) {
    console.error('[staff/clients/payments/cancel] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel payment' },
      { status: 500 },
    )
  }
}
