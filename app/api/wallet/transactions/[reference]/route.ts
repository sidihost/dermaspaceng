import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionByReference, formatCurrency } from '@/lib/wallet'
import { query } from '@/lib/db'
import { ensureGiftCardSchema } from '@/lib/gift-cards'

export const dynamic = 'force-dynamic'

// GET /api/wallet/transactions/[reference]
// Returns a single transaction (by our reference OR Paystack's),
// strictly scoped to the signed-in user. Powers the payment status
// page, transaction detail sheet, and full receipt page.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference } = await params
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const tx = await getTransactionByReference(reference)

    // Never leak another user's transaction through reference guessing.
    if (!tx || String(tx.user_id) !== String(user.id)) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const amount = Number(tx.amount) || 0
    const refs = [tx.payment_reference, tx.paystack_reference].filter(
      (r): r is string => Boolean(r),
    )
    const uniqueRefs = [...new Set(refs)]

    // Attach invoice record if generated
    let invoice = null
    try {
      const invRes = await query<{
        id: number | string
        invoice_number: string
        amount: number
        status: string
        items: unknown
        created_at: string
      }>(
        `SELECT id, invoice_number, total AS amount, status, items, created_at
           FROM invoices
          WHERE transaction_id = $1
          LIMIT 1`,
        [tx.id],
      )
      if (invRes.rows[0]) {
        invoice = {
          ...invRes.rows[0],
          amount: Number(invRes.rows[0].amount) || amount,
        }
      }
    } catch (invError) {
      console.error('Attach invoice to transaction error:', invError)
    }

    // If this payment funded an appointment, attach the booking so the
    // receipt page can show the real service, date, and time.
    let booking = null
    try {
      if (uniqueRefs.length > 0) {
        const bookingResult = await query<{
          id: string
          booking_reference: string
          location_name: string
          location_address: string | null
          appointment_date: string
          appointment_time: string
          total_duration: number
          status: string
        }>(
          `SELECT id, booking_reference, location_name, location_address,
                  to_char(appointment_date, 'YYYY-MM-DD') AS appointment_date,
                  appointment_time, total_duration, status
             FROM bookings
            WHERE user_id = $1 AND payment_reference = ANY($2)
            ORDER BY created_at DESC
            LIMIT 1`,
          [String(user.id), uniqueRefs],
        )
        const row = bookingResult.rows[0]
        if (row) {
          const servicesResult = await query<{
            treatment_name: string
            duration: number
          }>(
            `SELECT treatment_name, duration
               FROM booking_services
              WHERE booking_id = $1
              ORDER BY created_at ASC`,
            [row.id],
          )
          booking = { ...row, services: servicesResult.rows }
        }
      }
    } catch (bookingError) {
      console.error('Attach booking to transaction error:', bookingError)
    }

    // If this payment was for a gift card, attach the gift_card_requests
    // row (falling back to metadata.itemDetails when newly paid via wallet
    // or before row lookup).
    let giftCard = null
    try {
      if (uniqueRefs.length > 0) {
        await ensureGiftCardSchema()
        const gcResult = await query<{
          id: number
          recipient_name: string
          recipient_email: string | null
          occasion: string | null
          design_name: string | null
          delivery_method: string | null
          delivery_date: string | null
          status: string | null
          payment_status: string | null
          invoice_number: string | null
        }>(
          `SELECT id, recipient_name, recipient_email, occasion, design_name,
                  delivery_method, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date,
                  status, payment_status, invoice_number
             FROM gift_card_requests
            WHERE payment_reference = ANY($1)
            LIMIT 1`,
          [uniqueRefs],
        )
        if (gcResult.rows[0]) {
          giftCard = gcResult.rows[0]
        }
      }
      if (!giftCard) {
        const meta = tx.metadata as {
          type?: string
          itemDetails?: Record<string, unknown>
        } | null
        if (meta?.type === 'gift_card' && meta.itemDetails) {
          giftCard = {
            recipient_name: String(meta.itemDetails.recipientName || 'Recipient'),
            recipient_email: meta.itemDetails.recipientEmail ? String(meta.itemDetails.recipientEmail) : null,
            occasion: meta.itemDetails.occasion ? String(meta.itemDetails.occasion) : null,
            design_name: meta.itemDetails.designName
              ? String(meta.itemDetails.designName)
              : meta.itemDetails.design
                ? String(meta.itemDetails.design)
                : null,
            delivery_method: meta.itemDetails.deliveryMethod ? String(meta.itemDetails.deliveryMethod) : null,
            delivery_date: meta.itemDetails.deliveryDate ? String(meta.itemDetails.deliveryDate) : null,
            status: tx.status === 'completed' ? 'processing' : tx.status,
            payment_status: tx.status === 'completed' ? 'paid' : 'unpaid',
            invoice_number: invoice?.invoice_number ?? null,
          }
        }
      }
    } catch (gcError) {
      console.error('Attach giftCard to transaction error:', gcError)
    }

    return NextResponse.json({
      success: true,
      transaction: {
        ...tx,
        amount,
        formattedAmount: formatCurrency(amount, tx.currency),
        invoice,
        booking,
        giftCard,
      },
    })
  } catch (error) {
    console.error('Get transaction by reference error:', error)
    return NextResponse.json(
      { error: 'Failed to load transaction' },
      { status: 500 },
    )
  }
}
