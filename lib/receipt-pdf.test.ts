import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGiftCardReceiptData,
  buildTransactionReceiptData,
  sanitizeReceiptFilename,
} from './receipt-pdf'

test('sanitizeReceiptFilename produces safe PDF filenames', () => {
  assert.equal(
    sanitizeReceiptFilename('DS-WF/2026 9912'),
    'Dermaspace-Receipt-DS-WF-2026-9912.pdf',
  )
  assert.equal(sanitizeReceiptFilename(null), 'Dermaspace-Receipt-Dermaspace.pdf')
})

test('buildTransactionReceiptData maps gift card style, occasion, and invoice metadata cleanly', () => {
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
      occasion: 'Birthday',
      design_name: 'Royal Purple',
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
  assert.ok(
    receipt.summaryRows.some(
      (r) =>
        r.label === 'Occasion & Theme' &&
        r.value === 'Birthday (Birthday Celebration)',
    ),
  )
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Card Style' && r.value === 'Royal Purple · Elegant font',
    ),
  )
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Invoice Number' && r.value === 'INV-2026-0091',
    ),
  )
  assert.equal(receipt.lineItems?.[0]?.title, 'Dermaspace Gift Card — Birthday Celebration')
})

test('buildGiftCardReceiptData formats gift card confirmation receipt consistently', () => {
  const receipt = buildGiftCardReceiptData({
    amount: 50000,
    amountFormatted: '₦50,000',
    recipientName: 'Chidinma',
    senderName: 'Tolu',
    occasion: 'Wedding',
    designName: 'Mauve',
    fontName: 'Modern',
    deliveryMethod: 'download',
    paymentMethod: 'Card / Paystack',
    invoiceNumber: 'INV-881',
    receiptRef: 'DS_GIFT_881',
  })

  assert.equal(receipt.documentTitle, 'GIFT CARD RECEIPT')
  assert.equal(receipt.amountFormatted, 'NGN 50,000')
  assert.equal(receipt.filename, 'Dermaspace-Receipt-DS_GIFT_881.pdf')
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Occasion & Theme' && r.value === 'Wedding (Bridal & Wedding)',
    ),
  )
  assert.ok(
    receipt.summaryRows.some(
      (r) => r.label === 'Card Style' && r.value === 'Mauve · Modern font',
    ),
  )
})
