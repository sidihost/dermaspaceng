import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DERMASPACE_BRANCHES,
  DERMASPACE_EMAIL,
  OFFLINE_QUICK_LINKS,
  getSystemStatusCopy,
  resolveRetryAction,
} from './system-status'

test('getSystemStatusCopy returns clear, consistent copy for error and offline states', () => {
  const errorCopy = getSystemStatusCopy('error')
  assert.equal(errorCopy.heading, 'Something went wrong')
  assert.equal(errorCopy.retryLabel, 'Try again')
  assert.equal(errorCopy.homeLabel, 'Back to Home')
  assert.ok(errorCopy.description.length > 20)

  const offlineCopy = getSystemStatusCopy('offline')
  assert.equal(offlineCopy.heading, "You're offline")
  assert.equal(offlineCopy.retryLabel, 'Try again')
  assert.equal(offlineCopy.homeLabel, 'Back to Home')
  assert.ok(offlineCopy.description.length > 20)
})

test('resolveRetryAction picks reset when online with handler and reload otherwise', () => {
  assert.equal(resolveRetryAction(true, true), 'reset')
  assert.equal(resolveRetryAction(false, true), 'reload')
  assert.equal(resolveRetryAction(true, false), 'reload')
  assert.equal(resolveRetryAction(false, false), 'reload')
})

test('branch metadata and offline quick links use valid routes and contacts', () => {
  assert.equal(DERMASPACE_BRANCHES.length, 2)
  for (const branch of DERMASPACE_BRANCHES) {
    assert.ok(branch.phoneHref.startsWith('tel:+234'))
    assert.ok(branch.shortAddress.length > 5)
  }
  assert.equal(DERMASPACE_EMAIL, 'info@dermaspaceng.com')
  assert.ok(OFFLINE_QUICK_LINKS.every((item) => item.href.startsWith('/')))
})
