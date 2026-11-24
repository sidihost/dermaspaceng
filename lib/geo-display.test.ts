import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COUNTRIES,
  computeEffectiveCountry,
  countryCodeToFlag,
  resolveCountryInfo,
} from './geo-display'

test('resolves known markets and arbitrary VPN countries with accurate currency and flag', () => {
  assert.deepEqual(resolveCountryInfo('GB'), COUNTRIES.GB)
  assert.deepEqual(resolveCountryInfo('UK'), COUNTRIES.GB)
  assert.deepEqual(resolveCountryInfo('US'), COUNTRIES.US)
  assert.deepEqual(resolveCountryInfo('NG'), COUNTRIES.NG)

  const nl = resolveCountryInfo('NL')
  assert.equal(nl.code, 'NL')
  assert.equal(nl.currency, 'EUR')
  assert.equal(nl.symbol, '€')
  assert.equal(nl.flag, '🇳🇱')
  assert.equal(nl.name, 'Netherlands')

  const ca = resolveCountryInfo('CA')
  assert.equal(ca.code, 'CA')
  assert.equal(ca.currency, 'USD')
  assert.equal(ca.symbol, '$')
  assert.equal(ca.flag, '🇨🇦')
  assert.equal(ca.name, 'Canada')

  assert.equal(countryCodeToFlag('DE'), '🇩🇪')
})

test('VPN country change immediately overrides stale manual selection and shows banner', () => {
  const switchedToUk = computeEffectiveCountry({
    detectedCode: 'GB',
    lastDetectedCode: 'NG',
    savedManualCode: 'NG',
    bannerDismissed: true,
  })
  assert.equal(switchedToUk.country.code, 'GB')
  assert.equal(switchedToUk.country.currency, 'GBP')
  assert.equal(switchedToUk.showBanner, true)
  assert.equal(switchedToUk.shouldClearManualOverride, true)
})

test('manual currency selection is respected while staying in the same detected country', () => {
  const keptManual = computeEffectiveCountry({
    detectedCode: 'GB',
    lastDetectedCode: 'GB',
    savedManualCode: 'NG',
    bannerDismissed: true,
  })
  assert.equal(keptManual.country.code, 'NG')
  assert.equal(keptManual.showBanner, false)
  assert.equal(keptManual.shouldClearManualOverride, false)
})

test('Nigeria visitors stay in NGN without showing the international banner', () => {
  const ng = computeEffectiveCountry({
    detectedCode: 'NG',
    lastDetectedCode: null,
    savedManualCode: null,
    bannerDismissed: false,
  })
  assert.equal(ng.country.code, 'NG')
  assert.equal(ng.showBanner, false)
})
