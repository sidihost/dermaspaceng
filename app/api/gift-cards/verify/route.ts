import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseConfigured, query } from '@/lib/db'
import { ensureGiftCardSchema, type GiftCardRequestRecord } from '@/lib/gift-cards'
import {
  evaluateGiftCardRedemptionState,
  formatGiftCardSerial,
  maskEmailForVerification,
  verifyGiftCardCodeSignature,
} from '@/lib/gift-card-verification'

export async function GET(req: NextRequest) {
  try {
    const rawCode = req.nextUrl.searchParams.get('code') || ''
    if (!rawCode.trim()) {
      return NextResponse.json(
        {
          valid: false,
          state: 'invalid_code',
          headline: 'No Gift Card Code Provided',
          summary: 'Enter or scan a Dermaspace gift card code (for example DSGC-00012-XXXXXXXXXX).',
        },
        { status: 400 },
      )
    }

    const sigCheck = verifyGiftCardCodeSignature(rawCode)
    if (!sigCheck.validSyntax || !sigCheck.validSignature || !sigCheck.id) {
      return NextResponse.json(
        {
          valid: false,
          state: 'invalid_code',
          code: sigCheck.normalized || rawCode.trim().toUpperCase(),
          headline: 'Unverified Gift Card Code',
          summary:
            'This code does not match a valid Dermaspace gift card security signature. Check the code on the back of the card or contact reception.',
        },
        { status: 400 },
      )
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          valid: false,
          state: 'not_found',
          code: sigCheck.normalized,
          headline: 'Verification Service Unavailable',
          summary:
            'Live gift card verification database is not connected in this preview environment.',
        },
        { status: 503 },
      )
    }

    await ensureGiftCardSchema()
    const result = await query<GiftCardRequestRecord>(
      `SELECT id, amount, design, design_name, occasion, font, font_name,
              recipient_name, recipient_email, sender_name,
              status, payment_status, invoice_number, created_at
         FROM gift_card_requests
        WHERE id = $1
        LIMIT 1`,
      [sigCheck.id],
    )

    const record = result.rows[0]
    if (!record) {
      return NextResponse.json(
        {
          valid: false,
          state: 'not_found',
          code: sigCheck.normalized,
          headline: 'Gift Card Not Found',
          summary:
            'No active gift card order was found matching this code. Please confirm with Dermaspace reception.',
        },
        { status: 404 },
      )
    }

    const evaluation = evaluateGiftCardRedemptionState({
      status: record.status,
      paymentStatus: record.payment_status,
    })

    return NextResponse.json({
      valid: evaluation.isValidForRedemption,
      state: evaluation.state,
      headline: evaluation.headline,
      summary: evaluation.summary,
      card: {
        id: record.id,
        serial: formatGiftCardSerial(record.id),
        verificationCode: sigCheck.normalized,
        amount: Number(record.amount) || 0,
        recipientName: record.recipient_name,
        recipientEmailMasked: maskEmailForVerification(record.recipient_email),
        senderName: record.sender_name || null,
        occasion: record.occasion || 'Gift Card',
        design: record.design || 'royal',
        designName: record.design_name || 'Royal Purple',
        font: record.font || 'elegant',
        fontName: record.font_name || 'Elegant',
        status: record.status || 'pending',
        paymentStatus: record.payment_status || 'unpaid',
        invoiceNumber: record.invoice_number || null,
        issuedAt: record.created_at,
        validLocations: [
          'Victoria Island — 237B Muri Okunola Street',
          'Ikoyi — 9 Agbeke Rotinwa Close',
        ],
      },
    })
  } catch (error) {
    console.error('[GET /api/gift-cards/verify] error:', error)
    return NextResponse.json(
      {
        valid: false,
        state: 'not_found',
        headline: 'Verification Error',
        summary: 'Unable to verify this gift card right now. Please try again in a moment.',
      },
      { status: 500 },
    )
  }
}
