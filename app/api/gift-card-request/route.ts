import { NextResponse } from 'next/server'
import { sendGiftCardRequestToAdmin, sendGiftCardConfirmation } from '@/lib/email'
import { cookies } from 'next/headers'
import { sql, query } from '@/lib/db'
import { getTransactionByReference } from '@/lib/wallet'
import {
  recordWalletPaidGiftCard,
  upsertGiftCardRequest,
} from '@/lib/gift-cards'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify session
    const sessions = await sql`
      SELECT s.*, u.email as user_email, u.first_name, u.last_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = sessions[0]
    const data = await request.json()

    const {
      amount,
      design,
      designName,
      designGradient,
      occasion,
      font,
      fontName,
      recipientName,
      recipientEmail,
      recipientPhone,
      senderName,
      personalMessage,
      deliveryMethod,
      deliveryDate,
      isPaid,
      transactionReference,
    } = data

    const numericAmount = Math.round(Number(amount) || 0)
    if (numericAmount <= 0 || !recipientName) {
      return NextResponse.json(
        { error: 'Gift card amount and recipient name are required' },
        { status: 400 },
      )
    }

    const fullSenderName =
      senderName ||
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      'Customer'

    if (isPaid || transactionReference) {
      if (!transactionReference || typeof transactionReference !== 'string') {
        return NextResponse.json(
          { error: 'A verified payment reference is required' },
          { status: 400 },
        )
      }

      const tx = await getTransactionByReference(transactionReference)
      if (!tx || String(tx.user_id) !== String(user.user_id)) {
        return NextResponse.json(
          { error: 'Payment transaction not found' },
          { status: 404 },
        )
      }

      if (tx.status !== 'completed') {
        return NextResponse.json(
          { error: 'Payment has not completed yet' },
          { status: 400 },
        )
      }

      if (Number(tx.amount) < numericAmount) {
        return NextResponse.json(
          { error: 'Payment amount does not match gift card value' },
          { status: 400 },
        )
      }

      let invoiceNumber: string | null = null
      try {
        const invRes = await query<{ invoice_number: string }>(
          `SELECT invoice_number FROM invoices WHERE transaction_id = $1 LIMIT 1`,
          [tx.id],
        )
        invoiceNumber = invRes.rows[0]?.invoice_number ?? null
      } catch {
        // non-blocking
      }

      const { request: saved } = await recordWalletPaidGiftCard({
        user: {
          id: String(user.user_id),
          email: user.user_email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        transaction: tx,
        itemDetails: {
          amount: numericAmount,
          design,
          designName,
          designGradient,
          occasion,
          font,
          fontName,
          recipientName,
          recipientEmail,
          recipientPhone,
          senderName: fullSenderName,
          senderEmail: user.user_email,
          personalMessage,
          deliveryMethod,
          deliveryDate,
        },
        invoiceNumber,
      })

      return NextResponse.json({
        success: true,
        message: 'Gift card order confirmed',
        request: saved,
        transactionReference,
        invoiceNumber,
      })
    }

    // Unpaid manual request fallback
    const { request: saved } = await upsertGiftCardRequest({
      userId: String(user.user_id),
      details: {
        amount: numericAmount,
        design,
        designName,
        designGradient,
        occasion,
        font,
        fontName,
        recipientName,
        recipientEmail,
        recipientPhone,
        senderName: fullSenderName,
        senderEmail: user.user_email,
        personalMessage,
        deliveryMethod,
        deliveryDate,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
    })

    try {
      await sendGiftCardRequestToAdmin({
        amount: numericAmount,
        design,
        designName,
        designGradient,
        occasion,
        font,
        fontName,
        recipientName,
        recipientEmail,
        recipientPhone,
        senderName: fullSenderName,
        senderEmail: user.user_email,
        personalMessage,
        deliveryMethod,
        deliveryDate,
      })

      await sendGiftCardConfirmation({
        userEmail: user.user_email,
        userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Valued Customer',
        amount: numericAmount,
        recipientName,
        occasion,
        designName,
      })
    } catch (emailErr) {
      console.error('Gift card confirmation email error:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Gift card request submitted successfully',
      request: saved,
    })
  } catch (error) {
    console.error('Gift card request error:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
