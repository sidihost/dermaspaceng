import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNeonTemplate } from '../lib/db-params'
import { normalizeDeliveryDate } from '../lib/gift-cards'
import { fromKobo, toKobo } from '../lib/paystack'

test('buildNeonTemplate maps repeated and out-of-order positional placeholders accurately', () => {
  const { strings, values } = buildNeonTemplate(
    'UPDATE wallets SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING $3',
    [35000, 'wallet-abc', 'ok'],
  )

  assert.deepEqual(
    Array.from(strings),
    [
      'UPDATE wallets SET balance = balance - ',
      ' WHERE id = ',
      ' AND balance >= ',
      ' RETURNING ',
      '',
    ],
  )
  assert.deepEqual(Array.from(strings.raw), Array.from(strings))
  assert.deepEqual(values, [35000, 'wallet-abc', 35000, 'ok'])
})

test('buildNeonTemplate preserves $N inside quoted string literals and handles double-digit params', () => {
  const { strings, values } = buildNeonTemplate(
    "SELECT '$1 is literal', \"col$2\" FROM t WHERE a = $2 AND b = $1 LIMIT $10",
    ['first', 'second', 3, 4, 5, 6, 7, 8, 9, 20],
  )

  assert.deepEqual(Array.from(strings), [
    "SELECT '$1 is literal', \"col$2\" FROM t WHERE a = ",
    ' AND b = ',
    ' LIMIT ',
    '',
  ])
  assert.deepEqual(values, ['second', 'first', 20])
})

test('buildNeonTemplate returns single chunk when there are no parameters', () => {
  const { strings, values } = buildNeonTemplate('SELECT NOW()')
  assert.deepEqual(Array.from(strings), ['SELECT NOW()'])
  assert.deepEqual(values, [])
})

test('normalizeDeliveryDate accepts valid YYYY-MM-DD and rejects empty or invalid values', () => {
  assert.equal(normalizeDeliveryDate('2026-12-25'), '2026-12-25')
  assert.equal(normalizeDeliveryDate(' 2026-01-09 '), '2026-01-09')
  assert.equal(normalizeDeliveryDate(''), null)
  assert.equal(normalizeDeliveryDate('   '), null)
  assert.equal(normalizeDeliveryDate(undefined), null)
  assert.equal(normalizeDeliveryDate(null), null)
  assert.equal(normalizeDeliveryDate('12/25/2026'), null)
})

test('toKobo and fromKobo convert NGN <-> kobo cleanly', () => {
  assert.equal(toKobo(35000), 3500000)
  assert.equal(toKobo(19.99), 1999)
  assert.equal(fromKobo(3500000), 35000)
  assert.equal(fromKobo(1000000), 10000)
})
