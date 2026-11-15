import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DISMISS_COOLDOWN_MS,
  SHOW_COOLDOWN_MS,
  isNewsletterPopupSuppressedPath,
  parseStoredTimestamp,
  shouldShowNewsletterPopup,
} from './newsletter-popup'

const BASE_NOW = 1_800_000_000_000

const baseInput = () => ({
  pathname: '/',
  isFeatureEnabled: true,
  userRole: null,
  subscribed: false,
  shownInSession: false,
  dismissedAt: null,
  lastShownAt: null,
  now: BASE_NOW,
})

test('suppresses popup on admin, staff, auth, and booking paths', () => {
  for (const path of [
    '/admin',
    '/admin/newsletter',
    '/staff/queue',
    '/signin',
    '/signup',
    '/booking',
    '/dashboard',
    '/maintenance',
  ]) {
    assert.equal(isNewsletterPopupSuppressedPath(path), true, path)
    assert.equal(
      shouldShowNewsletterPopup({ ...baseInput(), pathname: path }),
      false,
      path,
    )
  }

  for (const path of ['/', '/gallery', '/services', '/packages', '/about', '/blog']) {
    assert.equal(isNewsletterPopupSuppressedPath(path), false, path)
    assert.equal(
      shouldShowNewsletterPopup({ ...baseInput(), pathname: path }),
      true,
      path,
    )
  }
})

test('never shows again once subscribed or to admin/staff accounts', () => {
  assert.equal(
    shouldShowNewsletterPopup({ ...baseInput(), subscribed: true }),
    false,
  )
  assert.equal(
    shouldShowNewsletterPopup({ ...baseInput(), userRole: 'admin' }),
    false,
  )
  assert.equal(
    shouldShowNewsletterPopup({ ...baseInput(), userRole: 'staff' }),
    false,
  )
  assert.equal(
    shouldShowNewsletterPopup({ ...baseInput(), userRole: 'user' }),
    true,
  )
})

test('enforces session cap and cooldown windows so popup does not show all the time', () => {
  assert.equal(
    shouldShowNewsletterPopup({ ...baseInput(), shownInSession: true }),
    false,
  )

  assert.equal(
    shouldShowNewsletterPopup({
      ...baseInput(),
      dismissedAt: BASE_NOW - DISMISS_COOLDOWN_MS + 60_000,
    }),
    false,
  )
  assert.equal(
    shouldShowNewsletterPopup({
      ...baseInput(),
      dismissedAt: BASE_NOW - DISMISS_COOLDOWN_MS - 1,
    }),
    true,
  )

  assert.equal(
    shouldShowNewsletterPopup({
      ...baseInput(),
      lastShownAt: BASE_NOW - SHOW_COOLDOWN_MS + 60_000,
    }),
    false,
  )
  assert.equal(
    shouldShowNewsletterPopup({
      ...baseInput(),
      lastShownAt: BASE_NOW - SHOW_COOLDOWN_MS - 1,
    }),
    true,
  )
})

test('respects feature flag disabled state and parses timestamps safely', () => {
  assert.equal(
    shouldShowNewsletterPopup({ ...baseInput(), isFeatureEnabled: false }),
    false,
  )
  assert.equal(parseStoredTimestamp(null), null)
  assert.equal(parseStoredTimestamp('bad'), null)
  assert.equal(parseStoredTimestamp('0'), null)
  assert.equal(parseStoredTimestamp(String(BASE_NOW)), BASE_NOW)
})
