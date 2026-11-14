import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyProfileSegment } from '../lib/profile-route-guard'

test('reserved pages and common unknown site paths resolve to not_found', () => {
  for (const slug of [
    'pricing',
    'help',
    'support',
    'shop',
    'cart',
    'promotions',
    'reviews',
    'faq',
    'appointments',
    'bookings',
    'admin',
    'api',
    'birthday',
    'changelog',
    'derma-ai',
    'derma-ai-saas',
  ]) {
    const decision = classifyProfileSegment(slug)
    assert.deepEqual(decision, { kind: 'not_found', reason: 'reserved' })
  }
})

test('known route aliases redirect to canonical destination', () => {
  assert.deepEqual(classifyProfileSegment('register'), {
    kind: 'redirect',
    to: '/signup',
  })
  assert.deepEqual(classifyProfileSegment('LOGIN'), {
    kind: 'redirect',
    to: '/signin',
  })
  assert.deepEqual(classifyProfileSegment('download'), {
    kind: 'redirect',
    to: '/desktop',
  })
  assert.deepEqual(classifyProfileSegment('settings'), {
    kind: 'redirect',
    to: '/dashboard/settings',
  })
})

test('invalid handle shapes and empty segments resolve to not_found', () => {
  assert.deepEqual(classifyProfileSegment(''), {
    kind: 'not_found',
    reason: 'empty',
  })
  assert.deepEqual(classifyProfileSegment(null), {
    kind: 'not_found',
    reason: 'empty',
  })
  for (const slug of ['ab', 'some-missing-page', 'file.php', 'a@b']) {
    assert.deepEqual(classifyProfileSegment(slug), {
      kind: 'not_found',
      reason: 'invalid_format',
    })
  }
})

test('valid usernames and UUIDs resolve to lookup', () => {
  assert.deepEqual(classifyProfileSegment('Adaeze_Spa'), {
    kind: 'lookup',
    cleanHandle: 'adaeze_spa',
    isUuid: false,
  })
  assert.deepEqual(
    classifyProfileSegment('550e8400-e29b-41d4-a716-446655440000'),
    {
      kind: 'lookup',
      cleanHandle: '550e8400-e29b-41d4-a716-446655440000',
      isUuid: true,
    },
  )
})
