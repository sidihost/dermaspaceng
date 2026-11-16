import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluatePushPromptEligibility,
  isPushPromptRouteAllowed,
  resolvePushPromptTiming,
  shouldEnablePushPrompt,
  urlBase64ToUint8Array,
} from './push-prompt-helpers'

test('isPushPromptRouteAllowed allows public & customer dashboard routes', () => {
  assert.equal(isPushPromptRouteAllowed('/'), true)
  assert.equal(isPushPromptRouteAllowed('/services'), true)
  assert.equal(isPushPromptRouteAllowed('/dashboard'), true)
  assert.equal(isPushPromptRouteAllowed('/dashboard/bookings?tab=upcoming'), true)
  assert.equal(isPushPromptRouteAllowed('/staffing'), true)
})

test('isPushPromptRouteAllowed blocks admin, staff, auth, and status routes', () => {
  assert.equal(isPushPromptRouteAllowed('/admin'), false)
  assert.equal(isPushPromptRouteAllowed('/admin/broadcast'), false)
  assert.equal(isPushPromptRouteAllowed('/staff'), false)
  assert.equal(isPushPromptRouteAllowed('/staff/queue'), false)
  assert.equal(isPushPromptRouteAllowed('/signin'), false)
  assert.equal(isPushPromptRouteAllowed('/signup'), false)
  assert.equal(isPushPromptRouteAllowed('/offline'), false)
  assert.equal(isPushPromptRouteAllowed('/maintenance'), false)
})

test('shouldEnablePushPrompt respects feature flag, route, and operator role', () => {
  assert.equal(
    shouldEnablePushPrompt({ pathname: '/', role: null, pushFlagEnabled: true }),
    true,
  )
  assert.equal(
    shouldEnablePushPrompt({ pathname: '/services', role: 'user', pushFlagEnabled: true }),
    true,
  )
  assert.equal(
    shouldEnablePushPrompt({ pathname: '/', role: 'admin', pushFlagEnabled: true }),
    false,
  )
  assert.equal(
    shouldEnablePushPrompt({ pathname: '/', role: 'staff', pushFlagEnabled: true }),
    false,
  )
  assert.equal(
    shouldEnablePushPrompt({ pathname: '/admin', role: 'user', pushFlagEnabled: true }),
    false,
  )
  assert.equal(
    shouldEnablePushPrompt({ pathname: '/', role: 'user', pushFlagEnabled: false }),
    false,
  )
})

test('evaluatePushPromptEligibility allows default permission even without VAPID key configured', () => {
  const res = evaluatePushPromptEligibility({
    supported: true,
    originAllowed: true,
    isPreviewHost: false,
    enabled: true,
    cookieSettled: true,
    permission: 'default',
    dismissedInSession: false,
    dismissedInStorage: false,
    previewBlockedByApi: false,
    vapidPublicKey: null,
    hasExistingSubscription: false,
  })
  assert.equal(res.show, true)
  assert.equal(res.reason, 'eligible')
  assert.equal(res.canWebPushSubscribe, false)
})

test('evaluatePushPromptEligibility marks canWebPushSubscribe true when VAPID key is present', () => {
  const res = evaluatePushPromptEligibility({
    supported: true,
    originAllowed: true,
    isPreviewHost: false,
    enabled: true,
    cookieSettled: true,
    permission: 'default',
    dismissedInSession: false,
    dismissedInStorage: false,
    previewBlockedByApi: false,
    vapidPublicKey: 'BEl62iUYgUivxIkv69yViEuiBIa',
    hasExistingSubscription: false,
  })
  assert.equal(res.show, true)
  assert.equal(res.reason, 'eligible')
  assert.equal(res.canWebPushSubscribe, true)
})

test('evaluatePushPromptEligibility blocks dismissed, preview, unsettled cookies, granted, denied, or subscribed', () => {
  const base = {
    supported: true,
    originAllowed: true,
    isPreviewHost: false,
    enabled: true,
    cookieSettled: true,
    permission: 'default' as const,
    dismissedInSession: false,
    dismissedInStorage: false,
    previewBlockedByApi: false,
    vapidPublicKey: 'key',
    hasExistingSubscription: false,
  }

  assert.equal(
    evaluatePushPromptEligibility({ ...base, isPreviewHost: true }).show,
    false,
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, previewBlockedByApi: true }).show,
    false,
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, cookieSettled: false }).reason,
    'waiting-for-cookie-consent',
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, permission: 'granted' }).reason,
    'already-granted',
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, permission: 'denied' }).reason,
    'denied',
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, dismissedInSession: true }).reason,
    'dismissed',
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, dismissedInStorage: true }).reason,
    'dismissed',
  )
  assert.equal(
    evaluatePushPromptEligibility({ ...base, hasExistingSubscription: true }).reason,
    'already-subscribed',
  )
})

test('resolvePushPromptTiming shifts mobile and desktop offsets cleanly when settled', () => {
  const settled = resolvePushPromptTiming(true)
  const unsettled = resolvePushPromptTiming(false)
  assert.equal(settled.mobileBottomClass, 'bottom-[92px]')
  assert.equal(settled.desktopBottomClass, 'md:bottom-[68px]')
  assert.equal(unsettled.mobileBottomClass, 'bottom-[136px]')
  assert.equal(unsettled.desktopBottomClass, 'md:bottom-[104px]')
  assert.ok(settled.delayMs <= unsettled.delayMs)
})

test('urlBase64ToUint8Array decodes URL-safe base64 cleanly', () => {
  const bytes = urlBase64ToUint8Array('SGVsbG8td29ybGRf')
  assert.equal(bytes.length, 12)
  assert.equal(String.fromCharCode(...bytes), 'Hello-world_')
  const urlSafeBytes = urlBase64ToUint8Array('-_8')
  assert.deepEqual(Array.from(urlSafeBytes), [0xfb, 0xff])
})
