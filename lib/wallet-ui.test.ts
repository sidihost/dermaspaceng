import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeWalletStats,
  formatPaymentChannel,
  formatWalletCurrency,
  formatWalletTransactionDate,
  parseTransactionSummary,
  type WalletTransactionItem,
} from './wallet-ui'

test('formatWalletCurrency formats NGN cleanly and handles invalid values', () => {
  assert.equal(formatWalletCurrency(35000), '₦35,000')
  assert.equal(formatWalletCurrency(0), '₦0')
  assert.equal(formatWalletCurrency(Number.NaN), '₦0')
  assert.equal(formatWalletCurrency(null), '₦0')
})

test('parseTransactionSummary separates verbose offline reference from title', () => {
  const parsed = parseTransactionSummary(
    'Gift Card purchase (fulfilled offline — ref WF_MWC6K1OB_MICXIJ)',
    'debit',
  )
  assert.equal(parsed.title, 'Gift Card purchase')
  assert.equal(parsed.detailNote, 'fulfilled offline')
  assert.equal(parsed.referenceTag, 'WF_MWC6K1OB_MICXIJ')
})

test('parseTransactionSummary preserves plain descriptions and falls back cleanly', () => {
  const plain = parseTransactionSummary('Wallet funding via Paystack', 'credit', 'DS_123')
  assert.equal(plain.title, 'Wallet funding via Paystack')
  assert.equal(plain.detailNote, null)
  assert.equal(plain.referenceTag, 'DS_123')

  const empty = parseTransactionSummary(null, 'refund')
  assert.equal(empty.title, 'Refund')
  assert.equal(empty.detailNote, null)
  assert.equal(empty.referenceTag, null)
})

test('formatPaymentChannel returns user-friendly channel names', () => {
  assert.equal(formatPaymentChannel('paystack'), 'Card / Paystack')
  assert.equal(formatPaymentChannel('bank_transfer'), 'Bank Transfer')
  assert.equal(formatPaymentChannel('wallet'), 'Wallet')
  assert.equal(formatPaymentChannel('cash'), 'Cash')
})

test('formatWalletTransactionDate formats same day, yesterday, weekday, and older dates', () => {
  const now = new Date('2026-11-17T14:30:00Z')
  assert.equal(formatWalletTransactionDate('2026-11-16T10:00:00Z', now), 'Yesterday')
  assert.equal(formatWalletTransactionDate('2026-10-05T10:00:00Z', now), '5 Oct')
  assert.equal(formatWalletTransactionDate('not-a-date', now), '—')
})

test('computeWalletStats totals only completed transactions', () => {
  const rows: WalletTransactionItem[] = [
    {
      id: 1,
      type: 'debit',
      amount: 35000,
      currency: 'NGN',
      status: 'completed',
      payment_method: 'wallet',
      description: 'Gift Card purchase',
      created_at: '2026-11-13T10:00:00Z',
    },
    {
      id: 2,
      type: 'credit',
      amount: 35000,
      currency: 'NGN',
      status: 'completed',
      payment_method: 'paystack',
      description: 'Wallet funding via Paystack',
      created_at: '2026-11-11T10:00:00Z',
    },
    {
      id: 3,
      type: 'credit',
      amount: 10000,
      currency: 'NGN',
      status: 'pending',
      payment_method: 'paystack',
      description: 'Pending funding',
      created_at: '2026-11-17T10:00:00Z',
    },
  ]

  const stats = computeWalletStats(rows)
  assert.deepEqual(stats, {
    totalFunded: 35000,
    totalSpent: 35000,
    fundedCount: 1,
    spentCount: 1,
  })
})
