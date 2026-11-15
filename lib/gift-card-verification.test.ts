import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGiftCardVerificationCode,
  buildGiftCardVerificationUrl,
  canRoleVerifyGiftCard,
  evaluateGiftCardRedemptionState,
  extractGiftCardCodeFromScan,
  formatGiftCardSerial,
  maskEmailForVerification,
  parseGiftCardVerificationCode,
  verifyGiftCardCodeSignature,
} from './gift-card-verification'

const TEST_SECRET = 'unit-test-secret-key'

test('formats deterministic padded serial numbers', () => {
  assert.equal(formatGiftCardSerial(1), 'DSGC-00001')
  assert.equal(formatGiftCardSerial(42), 'DSGC-00042')
  assert.equal(formatGiftCardSerial(123456), 'DSGC-123456')
})

test('generates and verifies authentic HMAC verification codes regardless of casing/whitespace', () => {
  const code = buildGiftCardVerificationCode(18, TEST_SECRET)
  assert.match(code, /^DSGC-00018-[0-9A-F]{10}$/)

  const exact = verifyGiftCardCodeSignature(code, TEST_SECRET)
  assert.equal(exact.validSyntax, true)
  assert.equal(exact.validSignature, true)
  assert.equal(exact.id, 18)

  const lowercaseSpaced = verifyGiftCardCodeSignature(`  ${code.toLowerCase()} `, TEST_SECRET)
  assert.equal(lowercaseSpaced.validSyntax, true)
  assert.equal(lowercaseSpaced.validSignature, true)
  assert.equal(lowercaseSpaced.id, 18)
})

test('rejects tampered IDs, tampered tags, and malformed strings', () => {
  const code = buildGiftCardVerificationCode(18, TEST_SECRET)
  const [, serial, tag] = code.split('-')

  const tamperedId = `DSGC-00019-${tag}`
  const checkTamperedId = verifyGiftCardCodeSignature(tamperedId, TEST_SECRET)
  assert.equal(checkTamperedId.validSyntax, true)
  assert.equal(checkTamperedId.validSignature, false)

  const flippedChar = tag[0] === 'A' ? 'B' : 'A'
  const tamperedTag = `DSGC-${serial}-${flippedChar}${tag.slice(1)}`
  const checkTamperedTag = verifyGiftCardCodeSignature(tamperedTag, TEST_SECRET)
  assert.equal(checkTamperedTag.validSyntax, true)
  assert.equal(checkTamperedTag.validSignature, false)

  assert.equal(parseGiftCardVerificationCode('GC-123'), null)
  assert.equal(parseGiftCardVerificationCode('DSGC-00000-ABCDEF1234'), null)
  assert.equal(verifyGiftCardCodeSignature('invalid', TEST_SECRET).validSyntax, false)
})

test('builds clean encoded verification URL for QR codes', () => {
  const code = buildGiftCardVerificationCode(7, TEST_SECRET)
  const url = buildGiftCardVerificationUrl('https://dermaspaceng.com/', code)
  assert.equal(
    url,
    `https://dermaspaceng.com/gift-cards/verify?code=${encodeURIComponent(code)}`,
  )
})

test('extracts verification code cleanly from QR URLs, relative paths, and raw codes', () => {
  const code = buildGiftCardVerificationCode(12, TEST_SECRET)
  const fullUrl = buildGiftCardVerificationUrl('https://dermaspaceng.com', code)

  assert.equal(extractGiftCardCodeFromScan(fullUrl), code)
  assert.equal(
    extractGiftCardCodeFromScan(`/gift-cards/verify?code=${encodeURIComponent(code.toLowerCase())}`),
    code,
  )
  assert.equal(extractGiftCardCodeFromScan(`  ${code.toLowerCase()}  `), code)
  assert.equal(extractGiftCardCodeFromScan(`Card Serial: ${code} (VI)`), code)
  assert.equal(extractGiftCardCodeFromScan('   '), '')
})

test('enforces admin and staff only verification access control', () => {
  assert.equal(canRoleVerifyGiftCard('admin', true), true)
  assert.equal(canRoleVerifyGiftCard('staff', true), true)
  assert.equal(canRoleVerifyGiftCard('ADMIN', undefined), true)
  assert.equal(canRoleVerifyGiftCard('admin', false), false)
  assert.equal(canRoleVerifyGiftCard('staff', false), false)
  assert.equal(canRoleVerifyGiftCard('user', true), false)
  assert.equal(canRoleVerifyGiftCard('', true), false)
  assert.equal(canRoleVerifyGiftCard(null, true), false)
})

test('evaluates redemption status accurately for paid/unpaid/cancelled states', () => {
  const valid = evaluateGiftCardRedemptionState({
    status: 'approved',
    paymentStatus: 'paid',
  })
  assert.equal(valid.state, 'valid')
  assert.equal(valid.isValidForRedemption, true)

  const completedValid = evaluateGiftCardRedemptionState({
    status: 'completed',
    paymentStatus: 'paid',
  })
  assert.equal(completedValid.state, 'valid')
  assert.equal(completedValid.isValidForRedemption, true)

  const unpaid = evaluateGiftCardRedemptionState({
    status: 'approved',
    paymentStatus: 'unpaid',
  })
  assert.equal(unpaid.state, 'payment_required')
  assert.equal(unpaid.isValidForRedemption, false)

  const processing = evaluateGiftCardRedemptionState({
    status: 'processing',
    paymentStatus: 'paid',
  })
  assert.equal(processing.state, 'pending_activation')
  assert.equal(processing.isValidForRedemption, false)

  const voided = evaluateGiftCardRedemptionState({
    status: 'rejected',
    paymentStatus: 'paid',
  })
  assert.equal(voided.state, 'cancelled')
  assert.equal(voided.isValidForRedemption, false)
})

test('masks recipient email without exposing full address publicly', () => {
  assert.equal(maskEmailForVerification('amaka.okafor@gmail.com'), 'am**********@gmail.com')
  assert.equal(maskEmailForVerification(null), null)
})
