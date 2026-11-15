import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CR80_SPEC,
  computeA4CutSheetGeometry,
  computeCr80BleedGeometry,
  formatCardAmountForPdf,
  sanitizeGiftCardPrintFilename,
} from './gift-card-print-pdf'

test('computes ISO 7810 CR80 dimensions with 3mm commercial bleed', () => {
  assert.equal(CR80_SPEC.trimWidthMm, 85.6)
  assert.equal(CR80_SPEC.trimHeightMm, 53.98)
  assert.equal(CR80_SPEC.bleedMm, 3)

  const geo = computeCr80BleedGeometry()
  assert.equal(geo.pageWidthMm, 91.6)
  assert.equal(geo.pageHeightMm, 59.98)
  assert.equal(geo.trimX, 3)
  assert.equal(geo.trimY, 3)
  assert.equal(geo.safeX, 8)
  assert.equal(geo.safeY, 8)
  assert.equal(geo.safeWidthMm, 75.6)
  assert.equal(geo.safeHeightMm, 43.98)
})

test('centers both 1:1 front and back CR80 cards cleanly inside A4 sheet without overlap', () => {
  const sheet = computeA4CutSheetGeometry()
  assert.equal(sheet.pageWidthMm, 210)
  assert.equal(sheet.pageHeightMm, 297)

  const rightEdge = sheet.frontBleedX + sheet.bleedWidthMm
  assert.ok(Math.abs(sheet.frontBleedX - (sheet.pageWidthMm - rightEdge)) < 0.05)

  // Back card starts strictly below front card bleed bottom
  assert.ok(sheet.backBleedY > sheet.frontBleedY + sheet.bleedHeightMm + 10)
  // Back card bottom stays well above A4 instructions block
  assert.ok(sheet.backBleedY + sheet.bleedHeightMm < 220)
})

test('formats currency safely for PDF Type1 standard fonts and sanitizes filenames', () => {
  assert.equal(formatCardAmountForPdf(25000), 'NGN 25,000')
  assert.equal(formatCardAmountForPdf(0), 'NGN 0')
  assert.equal(
    sanitizeGiftCardPrintFilename('DSGC-00012-A1B2C3D4E5', 'press-cr80'),
    'Dermaspace-GiftCard-DSGC-00012-A1B2C3D4E5-Print-CR80-Bleed.pdf',
  )
  assert.equal(
    sanitizeGiftCardPrintFilename('DSGC 00012 / test', 'a4-sheet'),
    'Dermaspace-GiftCard-DSGC-00012-test-A4-Cut-Sheet.pdf',
  )
})
