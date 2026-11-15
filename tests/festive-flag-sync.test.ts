import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getFestiveState,
  isFestiveFlagKey,
  setFeatureEnabled,
  setFeatureVisibility,
} from '../lib/feature-flags'
import { getDefaultGiftCardDesign } from '../lib/gift-card-templates'

test('isFestiveFlagKey recognizes both canonical festive and legacy christmas_animation keys', () => {
  assert.equal(isFestiveFlagKey('festive'), true)
  assert.equal(isFestiveFlagKey('christmas_animation'), true)
  assert.equal(isFestiveFlagKey('gift_cards'), false)
})

test('turning festive feature flag off disables all Christmas state and reverts homepage gift card preview to Royal Purple', async () => {
  await setFeatureVisibility('festive', 'off', null)
  const state = await getFestiveState()
  assert.equal(state.enabled, false)
  assert.equal(state.visibility, 'off')
  assert.equal(
    getDefaultGiftCardDesign({ festiveEnabled: state.enabled }).id,
    'royal',
  )

  await setFeatureEnabled('christmas_animation', true, null)
  const restored = await getFestiveState()
  assert.equal(restored.enabled, true)
  assert.equal(restored.visibility, 'on')
  assert.equal(
    getDefaultGiftCardDesign({ festiveEnabled: restored.enabled }).id,
    'christmas',
  )
})
