import test from 'node:test'
import assert from 'node:assert/strict'
import { isDatabaseConfigured } from './db'

test('isDatabaseConfigured rejects missing, empty, whitespace, and invalid URLs', () => {
  assert.equal(isDatabaseConfigured(undefined), false)
  assert.equal(isDatabaseConfigured(''), false)
  assert.equal(isDatabaseConfigured('   '), false)
  assert.equal(isDatabaseConfigured('not-a-url'), false)
  assert.equal(isDatabaseConfigured('http://localhost:5432/db'), false)
  assert.equal(isDatabaseConfigured('postgres://'), false)
})

test('isDatabaseConfigured accepts valid postgres:// and postgresql:// URLs', () => {
  assert.equal(isDatabaseConfigured('postgres://user:pass@ep-123.neon.tech/neondb?sslmode=require'), true)
  assert.equal(isDatabaseConfigured('  postgresql://user:pass@localhost:5432/dermaspace  '), true)
})
