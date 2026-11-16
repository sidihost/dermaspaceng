import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RECEIPT_PALETTE,
  buildBookingReceiptData,
  buildGiftCardReceiptData,
  buildMembershipReceiptData,
  buildTransactionReceiptData,
  hexToRgb,
  sanitizeReceiptFilename,
  sanitizeReceiptImageFilename,
} from './receipt-pdf'

test('sanitizeReceiptFilename and sanitizeReceiptImageFilename produce safe filenames', () => {
  assert.equal(
    sanitizeReceiptFilename('DS-WF/2026 9912'),
    'Dermaspace-Receipt-DS-WF-2026-9912.pdf',
  )
  assert.equal(sanitizeReceiptFilename(null), 'Dermaspace-Receipt-Dermaspace.pdf')
  assert.equal(
    sanitizeReceiptImageFilename('DS-WF/2026 9912'),
    'Dermaspace-Receipt-DS-WF-2026-9912.png',
  )
  assert.equal(
    sanitizeReceiptImageFilename(null),
    'Dermaspace-Receipt-Dermaspace.png',
  )
})

test('RECEIPT_PALETTE enforces single brand color #7B2D8E without secondary gold accent', () => {
  assert.equal(RECEIPT_PALETTE.brandHex, '#7B2D8E')
  assert.deepEqual(RECEIPT_PALETTE.brandRgb, [123, 45, 142])
  assert.equal('champagneGold' in RECEIPT_PALETTE, false)
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
  assert.equal(receipt.imageFilename, 'Dermaspace-Receipt-GC-2026-8841.png')
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
  assert.equal(receipt.imageFilename, 'Dermaspace-Receipt-DS_GIFT_881.png')
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

test('buildBookingReceiptData formats booking treatments, voucher discount, and filenames', () => {
  const receipt = buildBookingReceiptData({
    booking_reference: 'DS-BK-2026-77',
    location_name: 'Victoria Island',
    appointment_date: '2026-12-01',
    appointment_time: '14:00',
    total_duration: 60,
    subtotal_kobo: 5000000,
    discount_kobo: 500000,
    voucher_code: 'GLOW10',
    total_price_kobo: 4500000,
    customer_name: 'Itunu Lawal',
    customer_email: 'itunu@example.com',
    customer_phone: '08012345678',
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'paystack',
    payment_reference: 'PAY-7788',
    notes: 'Sensitive skin',
    services: [
      {
        treatmentName: 'Deep Cleansing Facial',
        categoryName: 'Facial Treatments',
        duration: 60,
        priceKobo: 5000000,
      },
    ],
  })

  assert.equal(receipt.documentTitle, 'BOOKING RECEIPT')
  assert.equal(receipt.statusLabel, 'Confirmed')
  assert.equal(receipt.amountLabel, 'TOTAL PAID')
  assert.equal(receipt.amountFormatted, 'NGN 45,000')
  assert.equal(receipt.subtotalFormatted, 'NGN 50,000')
  assert.equal(receipt.discountLabel, 'Voucher · GLOW10')
  assert.equal(receipt.discountFormatted, '- NGN 5,000')
  assert.equal(receipt.filename, 'Dermaspace-Receipt-DS-BK-2026-77.pdf')
  assert.equal(receipt.imageFilename, 'Dermaspace-Receipt-DS-BK-2026-77.png')
  assert.equal(receipt.note, 'Sensitive skin')
})

test('buildMembershipReceiptData maps both site-wide tiers and Platinum wallet credit', () => {
  const gold = buildMembershipReceiptData({
    reference: 'MS_GOLD_101',
    txCreatedAt: '2026-11-15T10:00:00Z',
    txStatus: 'completed',
    planName: 'Gold',
    validityMonths: 12,
    glowPointsOnSignup: 1500,
    siteWideOnly: true,
    planPrice: 50000,
    walletCredit: 0,
    buyerFirstName: 'Ada',
    buyerLastName: 'Obi',
    buyerEmail: 'ada@example.com',
    membershipStartedAt: '2026-11-15T10:00:00Z',
    membershipExpiresAt: '2027-11-15T10:00:00Z',
    paymentMethod: 'Paystack',
    invoiceNumber: 'INV-M-101',
  })

  assert.equal(gold.documentTitle, 'MEMBERSHIP RECEIPT')
  assert.equal(gold.statusLabel, 'Paid')
  assert.equal(gold.lineItems?.length, 2)
  assert.equal(gold.imageFilename, 'Dermaspace-Receipt-MS_GOLD_101.png')

  const platinum = buildMembershipReceiptData({
    reference: 'MS_PLAT_202',
    txCreatedAt: '2026-11-15T10:00:00Z',
    txStatus: 'completed',
    planName: 'Platinum',
    validityMonths: 12,
    glowPointsOnSignup: 5000,
    siteWideOnly: false,
    planPrice: 500000,
    walletCredit: 500000,
    buyerFirstName: 'Ada',
    buyerLastName: 'Obi',
    buyerEmail: 'ada@example.com',
    membershipStartedAt: '2026-11-15T10:00:00Z',
    membershipExpiresAt: '2027-11-15T10:00:00Z',
    paymentMethod: 'Wallet',
    invoiceNumber: null,
  })

  assert.equal(platinum.lineItems?.length, 3)
  assert.equal(platinum.lineItems?.[2]?.title, 'Credited to Wallet')
  assert.equal(platinum.amountFormatted, 'NGN 500,000')
})
