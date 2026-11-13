import { query } from './db'
import { getUserById } from './auth'
import {
  createInvoice,
  deleteAbandonedPayment,
  type Transaction,
} from './wallet'
import {
  sendGiftCardPaymentReceipt,
  sendGiftCardRequestToAdmin,
} from './email'
import { sendInvoiceEmail } from './wallet-emails'

export interface GiftCardDetailsInput {
  amount: number
  design?: string
  designName?: string
  designGradient?: string
  occasion?: string
  font?: string
  fontName?: string
  recipientName: string
  recipientEmail?: string
  recipientPhone?: string
  senderName?: string
  senderEmail?: string
  personalMessage?: string
  deliveryMethod?: string
  deliveryDate?: string | null
}

export interface GiftCardRequestRecord {
  id: number
  user_id: string | null
  amount: number
  design: string | null
  design_name: string | null
  design_gradient: string | null
  occasion: string | null
  font: string | null
  font_name: string | null
  recipient_name: string
  recipient_email: string | null
  recipient_phone: string | null
  sender_name: string | null
  sender_email: string | null
  personal_message: string | null
  delivery_method: string | null
  delivery_date: string | null
  status: string
  payment_reference: string | null
  payment_method: string | null
  payment_status: string | null
  invoice_number: string | null
  created_at: string
  updated_at: string
}

let schemaReadyPromise: Promise<void> | null = null

/**
 * Ensures `gift_card_requests` and payment-tracking columns exist in
 * live databases where SQL migrations haven't been re-run yet.
 */
export async function ensureGiftCardSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return
  if (schemaReadyPromise) return schemaReadyPromise

  schemaReadyPromise = (async () => {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS gift_card_requests (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
          amount INTEGER NOT NULL,
          design VARCHAR(50),
          design_name VARCHAR(100),
          design_gradient VARCHAR(100),
          occasion VARCHAR(50),
          font VARCHAR(50),
          font_name VARCHAR(100),
          recipient_name VARCHAR(255) NOT NULL,
          recipient_email VARCHAR(255),
          recipient_phone VARCHAR(50),
          sender_name VARCHAR(255),
          sender_email VARCHAR(255),
          personal_message TEXT,
          delivery_method VARCHAR(50) DEFAULT 'email',
          delivery_date DATE,
          status VARCHAR(50) DEFAULT 'pending',
          assigned_to VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36)`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS notes TEXT`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120)`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid'`)
      await query(`ALTER TABLE gift_card_requests ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)`)
      await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_card_requests_payment_ref
        ON gift_card_requests(payment_reference)
        WHERE payment_reference IS NOT NULL
      `)
    } catch (err) {
      schemaReadyPromise = null
      throw err
    }
  })()

  return schemaReadyPromise
}

export function normalizeDeliveryDate(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

export async function upsertGiftCardRequest(opts: {
  userId: string
  details: GiftCardDetailsInput
  status?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed'
  paymentReference?: string | null
  paymentMethod?: string | null
  paymentStatus?: 'unpaid' | 'paid'
  invoiceNumber?: string | null
}): Promise<{ request: GiftCardRequestRecord | null; created: boolean }> {
  await ensureGiftCardSchema()

  const {
    userId,
    details,
    status = 'pending',
    paymentReference = null,
    paymentMethod = null,
    paymentStatus = 'unpaid',
    invoiceNumber = null,
  } = opts

  const amountInt = Math.max(1, Math.round(Number(details.amount) || 0))
  const cleanDeliveryDate = normalizeDeliveryDate(details.deliveryDate)

  if (paymentReference) {
    const inserted = await query<GiftCardRequestRecord>(
      `INSERT INTO gift_card_requests (
        user_id, amount, design, design_name, design_gradient, occasion,
        font, font_name, recipient_name, recipient_email, recipient_phone,
        sender_name, sender_email, personal_message, delivery_method,
        delivery_date, status, payment_reference, payment_method,
        payment_status, invoice_number
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21
      )
      ON CONFLICT (payment_reference) WHERE payment_reference IS NOT NULL DO NOTHING
      RETURNING *`,
      [
        userId,
        amountInt,
        details.design || null,
        details.designName || null,
        details.designGradient || null,
        details.occasion || null,
        details.font || null,
        details.fontName || null,
        details.recipientName,
        details.recipientEmail || null,
        details.recipientPhone || null,
        details.senderName || null,
        details.senderEmail || null,
        details.personalMessage || null,
        details.deliveryMethod || 'email',
        cleanDeliveryDate,
        status,
        paymentReference,
        paymentMethod,
        paymentStatus,
        invoiceNumber,
      ],
    )

    if (inserted.rows[0]) {
      return { request: inserted.rows[0], created: true }
    }

    const existing = await query<GiftCardRequestRecord>(
      `SELECT * FROM gift_card_requests WHERE payment_reference = $1 LIMIT 1`,
      [paymentReference],
    )
    return { request: existing.rows[0] ?? null, created: false }
  }

  const inserted = await query<GiftCardRequestRecord>(
    `INSERT INTO gift_card_requests (
      user_id, amount, design, design_name, design_gradient, occasion,
      font, font_name, recipient_name, recipient_email, recipient_phone,
      sender_name, sender_email, personal_message, delivery_method,
      delivery_date, status, payment_method, payment_status, invoice_number
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19, $20
    )
    RETURNING *`,
    [
      userId,
      amountInt,
      details.design || null,
      details.designName || null,
      details.designGradient || null,
      details.occasion || null,
      details.font || null,
      details.fontName || null,
      details.recipientName,
      details.recipientEmail || null,
      details.recipientPhone || null,
      details.senderName || null,
      details.senderEmail || null,
      details.personalMessage || null,
      details.deliveryMethod || 'email',
      cleanDeliveryDate,
      status,
      paymentMethod,
      paymentStatus,
      invoiceNumber,
    ],
  )

  return { request: inserted.rows[0] ?? null, created: true }
}

/**
 * Idempotently finalises a Paystack/card gift card checkout:
 *   1. Atomically claims the pending transaction row (status <> 'completed').
 *   2. Creates the paid invoice.
 *   3. Persists the paid gift_card_requests row.
 *   4. Sends receipt, invoice, admin order alert, and in-app notification.
 *   5. Cleans up any abandoned_payments record.
 */
export async function finalizeGiftCardPaystackPayment({
  transaction,
  paystackReference,
  amount,
  customerEmail,
  channelLabel = 'Paystack',
}: {
  transaction: Transaction
  paystackReference?: string
  amount?: number
  customerEmail?: string
  channelLabel?: string
}): Promise<{
  finalized: boolean
  alreadyProcessed: boolean
  transaction: Transaction
  invoiceNumber?: string | null
  giftCardRequest?: GiftCardRequestRecord | null
}> {
  const claim = await query<Transaction>(
    `UPDATE transactions
        SET status = 'completed',
            paystack_reference = COALESCE(paystack_reference, $2),
            updated_at = NOW()
      WHERE id = $1
        AND status <> 'completed'
     RETURNING *, reference AS payment_reference`,
    [transaction.id, paystackReference || null],
  )

  if (claim.rows.length === 0) {
    return {
      finalized: false,
      alreadyProcessed: true,
      transaction,
    }
  }

  const claimedTx = claim.rows[0]
  const paymentReference =
    claimedTx.payment_reference || paystackReference || String(claimedTx.id)
  const finalAmount = Math.round(Number(amount ?? claimedTx.amount) || 0)

  const meta = (claimedTx.metadata || {}) as {
    itemDetails?: Record<string, unknown>
  }
  const rawDetails = meta.itemDetails || {}

  const user = await getUserById(String(claimedTx.user_id))
  const fullSenderName =
    String(rawDetails.senderName || '').trim() ||
    (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '') ||
    'Customer'
  const senderEmail = user?.email || customerEmail || ''
  const recipientName = String(rawDetails.recipientName || 'Recipient')
  const occasion = String(rawDetails.occasion || 'Gift Card')
  const designName = String(rawDetails.designName || rawDetails.design || 'Custom Design')

  // 1. Create invoice (best effort)
  let invoiceNumber: string | null = null
  try {
    const invoice = await createInvoice(
      claimedTx.user_id,
      claimedTx.id,
      finalAmount,
      [
        {
          description: `Gift Card for ${recipientName} (${occasion})`,
          amount: finalAmount,
          quantity: 1,
        },
      ],
      {
        name: fullSenderName,
        email: senderEmail,
        payment_method: channelLabel,
        payment_reference: paymentReference,
        item_type: 'gift_card',
      },
    )
    invoiceNumber = invoice?.invoice_number ?? null
  } catch (err) {
    console.error('[finalizeGiftCardPaystackPayment] invoice failed:', err)
  }

  // 2. Persist gift card request row (idempotent by payment_reference)
  let giftCardRequest: GiftCardRequestRecord | null = null
  try {
    const details: GiftCardDetailsInput = {
      amount: finalAmount,
      design: rawDetails.design ? String(rawDetails.design) : undefined,
      designName,
      designGradient: rawDetails.designGradient ? String(rawDetails.designGradient) : undefined,
      occasion,
      font: rawDetails.font ? String(rawDetails.font) : undefined,
      fontName: rawDetails.fontName ? String(rawDetails.fontName) : undefined,
      recipientName,
      recipientEmail: rawDetails.recipientEmail ? String(rawDetails.recipientEmail) : undefined,
      recipientPhone: rawDetails.recipientPhone ? String(rawDetails.recipientPhone) : undefined,
      senderName: fullSenderName,
      senderEmail,
      personalMessage: rawDetails.personalMessage ? String(rawDetails.personalMessage) : undefined,
      deliveryMethod: rawDetails.deliveryMethod ? String(rawDetails.deliveryMethod) : 'email',
      deliveryDate: rawDetails.deliveryDate ? String(rawDetails.deliveryDate) : null,
    }

    const upserted = await upsertGiftCardRequest({
      userId: String(claimedTx.user_id),
      details,
      status: 'processing',
      paymentReference,
      paymentMethod: claimedTx.payment_method || 'paystack',
      paymentStatus: 'paid',
      invoiceNumber,
    })
    giftCardRequest = upserted.request
  } catch (err) {
    console.error('[finalizeGiftCardPaystackPayment] upsert gift card failed:', err)
  }

  // 3. Emails (best effort)
  const paymentDate = new Date().toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  try {
    if (senderEmail) {
      await sendGiftCardPaymentReceipt({
        userEmail: senderEmail,
        userName: fullSenderName,
        amount: finalAmount,
        recipientName,
        occasion,
        designName,
        transactionRef: paymentReference,
        paymentDate,
      })

      if (invoiceNumber) {
        await sendInvoiceEmail({
          email: senderEmail,
          firstName: user?.first_name || fullSenderName,
          invoiceNumber,
          amount: finalAmount,
          items: [
            {
              description: `Gift Card for ${recipientName} (${occasion})`,
              amount: finalAmount,
              quantity: 1,
            },
          ],
          paymentMethod: channelLabel,
          paymentReference,
        })
      }
    }

    await sendGiftCardRequestToAdmin({
      amount: finalAmount,
      design: String(rawDetails.design || ''),
      designName,
      designGradient: rawDetails.designGradient ? String(rawDetails.designGradient) : undefined,
      occasion,
      font: String(rawDetails.font || ''),
      fontName: rawDetails.fontName ? String(rawDetails.fontName) : undefined,
      recipientName,
      recipientEmail: String(rawDetails.recipientEmail || ''),
      recipientPhone: String(rawDetails.recipientPhone || ''),
      senderName: fullSenderName,
      senderEmail,
      personalMessage: String(rawDetails.personalMessage || ''),
      deliveryMethod: String(rawDetails.deliveryMethod || 'email'),
      deliveryDate: normalizeDeliveryDate(
        rawDetails.deliveryDate ? String(rawDetails.deliveryDate) : null,
      ) || '',
      isPaid: true,
      paymentMethod: channelLabel,
      paymentReference,
    })
  } catch (err) {
    console.error('[finalizeGiftCardPaystackPayment] emails failed:', err)
  }

  // 4. In-app notification
  try {
    const { notifyUser } = await import('./notifications')
    await notifyUser({
      userId: String(claimedTx.user_id),
      title: 'Gift card order confirmed',
      message: `Your ₦${finalAmount.toLocaleString('en-NG')} gift card for ${recipientName} is confirmed and being prepared.`,
      type: 'status_update',
      referenceType: 'transaction',
      referenceId: paymentReference,
      actionUrl: `/dashboard/transactions/${encodeURIComponent(paymentReference)}`,
      priority: 'normal',
    })
  } catch (err) {
    console.error('[finalizeGiftCardPaystackPayment] notify failed:', err)
  }

  // 5. Cleanup abandoned_payments
  try {
    const abandoned = await query<{ id: number }>(
      `SELECT id FROM abandoned_payments
        WHERE user_id = $1 AND payment_type = 'gift_card'
        ORDER BY created_at DESC LIMIT 1`,
      [claimedTx.user_id],
    )
    if (abandoned.rows[0]) {
      await deleteAbandonedPayment(abandoned.rows[0].id)
    }
  } catch (err) {
    console.error('[finalizeGiftCardPaystackPayment] abandoned cleanup failed:', err)
  }

  return {
    finalized: true,
    alreadyProcessed: false,
    transaction: claimedTx,
    invoiceNumber,
    giftCardRequest,
  }
}

/**
 * Records a gift card request paid directly from the customer's wallet
 * (after /api/wallet/pay debited their balance). Idempotent by
 * payment_reference so double-submits never send duplicate emails or rows.
 */
export async function recordWalletPaidGiftCard({
  user,
  transaction,
  itemDetails,
  invoiceNumber,
}: {
  user: { id: string; email: string; first_name?: string; last_name?: string }
  transaction: Transaction
  itemDetails: GiftCardDetailsInput
  invoiceNumber?: string | null
}): Promise<{ request: GiftCardRequestRecord | null; created: boolean }> {
  const paymentReference =
    transaction.payment_reference ||
    (transaction as { reference?: string }).reference ||
    String(transaction.id)

  const fullSenderName =
    itemDetails.senderName?.trim() ||
    `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
    'Customer'

  const { request, created } = await upsertGiftCardRequest({
    userId: String(user.id),
    details: {
      ...itemDetails,
      senderName: fullSenderName,
      senderEmail: user.email,
    },
    status: 'processing',
    paymentReference,
    paymentMethod: 'wallet',
    paymentStatus: 'paid',
    invoiceNumber: invoiceNumber || null,
  })

  if (created) {
    const paymentDate = new Date().toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    try {
      await sendGiftCardPaymentReceipt({
        userEmail: user.email,
        userName: fullSenderName,
        amount: Math.round(Number(itemDetails.amount) || Number(transaction.amount) || 0),
        recipientName: itemDetails.recipientName,
        occasion: itemDetails.occasion || 'Special Occasion',
        designName: itemDetails.designName || itemDetails.design || 'Custom Design',
        transactionRef: paymentReference,
        paymentDate,
      })

      await sendGiftCardRequestToAdmin({
        amount: Math.round(Number(itemDetails.amount) || Number(transaction.amount) || 0),
        design: itemDetails.design || '',
        designName: itemDetails.designName,
        designGradient: itemDetails.designGradient,
        occasion: itemDetails.occasion || 'Special Occasion',
        font: itemDetails.font || '',
        fontName: itemDetails.fontName,
        recipientName: itemDetails.recipientName,
        recipientEmail: itemDetails.recipientEmail || '',
        recipientPhone: itemDetails.recipientPhone || '',
        senderName: fullSenderName,
        senderEmail: user.email,
        personalMessage: itemDetails.personalMessage || '',
        deliveryMethod: itemDetails.deliveryMethod || 'email',
        deliveryDate: normalizeDeliveryDate(itemDetails.deliveryDate) || '',
        isPaid: true,
        paymentMethod: 'Wallet',
        paymentReference,
      })
    } catch (err) {
      console.error('[recordWalletPaidGiftCard] email failed:', err)
    }

    try {
      const { notifyUser } = await import('./notifications')
      await notifyUser({
        userId: String(user.id),
        title: 'Gift card order confirmed',
        message: `Your ₦${Number(itemDetails.amount || transaction.amount).toLocaleString('en-NG')} gift card for ${itemDetails.recipientName} has been paid from your wallet.`,
        type: 'status_update',
        referenceType: 'transaction',
        referenceId: paymentReference,
        actionUrl: `/dashboard/transactions/${encodeURIComponent(paymentReference)}`,
        priority: 'normal',
      })
    } catch (err) {
      console.error('[recordWalletPaidGiftCard] notify failed:', err)
    }
  }

  return { request, created }
}
