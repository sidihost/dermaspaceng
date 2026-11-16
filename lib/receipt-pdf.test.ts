import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGiftCardReceiptData,
  buildTransactionReceiptData,
  hexToRgb,
  sanitizeReceiptFilename,
} from './receipt-pdf'

test('sanitizeReceiptFilename produces safe PDF filenames', () => {
  assert.equal(
    sanitizeReceiptFilename('DS-WF/2026 9912'),
    'Dermaspace-Receipt-DS-WF-2026-9912.pdf',
  )
  assert.equal(sanitizeReceiptFilename(null), 'Dermaspace-Receipt-Dermaspace.pdf')
})

test('hexToRgb converts 6-char, 3-char, and fallback hex strings accurately', () => {
  assert.deepEqual(hexToRgb('#184E3F'), [24, 78, 63])
  assert.deepEqual(hexToRgb('7B2D8E'), [123, 45, 142])
  assert.deepEqual(hexToRgb('#abc'), [170, 187, 204])
  assert.deepEqual(hexToRgb('invalid', [1, 2, 3]), [1, 2, 3])
})

test('buildTransactionReceiptData maps gift card style, visual colors, occasion, and invoice metadata cleanly', () => {
  const receipt = buildTransactionReceiptData({
    id: 42,
    type: 'debit',
    amount: 25000,
    currency: 'NGN',
    status: 'completed',
    payment_method: 'wallet',
    payment_reference: 'GC-2026-8841',
    description: 'Dermaspace Gift Card',
    created_at: '2026-11-15T12:00:00Z',
    invoice: { invoice_number: 'INV-2026-0091' },
    giftCard: {
      recipient_name: 'Amaka Okafor',
      recipient_email: 'amaka@example.com',
      sender_name: 'Chidinma',
      occasion: 'Birthday',
      design: 'emerald',
      design_name: 'Deep Emerald',
      font_name: 'Elegant',
      delivery_method: 'email',
      personal_message: 'Enjoy a relaxing spa afternoon!',
    },
  })

  assert.equal(receipt.documentTitle, 'TRANSACTION RECEIPT')
  assert.equal(receipt.statusLabel, 'Successful')
  assert.equal(receipt.amountLabel, 'TOTAL PAID')
  assert.equal(receipt.amountFormatted, 'NGN 25,000')
  assert.equal(receipt.filename, 'Dermaspace-Receipt-GC-2026-8841.pdf')
  assert.equal(receipt.note, 'Enjoy a relaxing spa afternoon!')
  assert.ok(receipt.giftCardVisual)
  assert.equal(receipt.giftCardVisual?.surfaceHex, '#184E3F')
  assert.equal(receipt.giftCardVisual?.accentHex, '#2A6F5B')
  assert.equal(receipt.giftCardVisual?.senderName, 'Chidinma')
  assert.equal(receipt.giftCardVisual?.editionLabel, 'Birthday Celebration')
  assert.ok(
    receipt.summaryRows.some(
      (r) =>
        r.label === 'Occasion & Theme' &&
        r.value === 'Birthday (Birthday Celebration)',
    ),
  )
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Card Style' && r.value === 'Deep Emerald · Elegant font',
    ),
  )
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Invoice Number' && r.value === 'INV-2026-0091',
    ),
  )
  assert.equal(receipt.lineItems?.[0]?.title, 'Dermaspace Gift Card — Birthday Celebration')
})

test('buildGiftCardReceiptData formats gift card confirmation receipt and visual theme consistently', () => {
  const receipt = buildGiftCardReceiptData({
    amount: 50000,
    amountFormatted: '₦50,000',
    recipientName: 'Chidinma',
    senderName: 'Tolu',
    occasion: 'Christmas',
    designId: 'sapphire',
    designName: 'Midnight Sapphire',
    fontName: 'Modern',
    deliveryMethod: 'download',
    paymentMethod: 'Card / Paystack',
    invoiceNumber: 'INV-881',
    receiptRef: 'DS_GIFT_881',
  })

  assert.equal(receipt.documentTitle, 'GIFT CARD RECEIPT')
  assert.equal(receipt.amountFormatted, 'NGN 50,000')
  assert.equal(receipt.filename, 'Dermaspace-Receipt-DS_GIFT_881.pdf')
  assert.ok(receipt.giftCardVisual)
  assert.equal(receipt.giftCardVisual?.surfaceHex, '#1D335B')
  assert.equal(receipt.giftCardVisual?.accentHex, '#314F85')
  assert.equal(receipt.giftCardVisual?.editionLabel, 'Christmas Edition')
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Occasion & Theme' && r.value === 'Christmas (Christmas Edition)',
    ),
  )
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Card Style' && r.value === 'Midnight Sapphire · Modern font',
    ),
  )
})
