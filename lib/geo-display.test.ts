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

test('first-time visitors and crawlers from US/international IPs default to NGN (Nigeria)', () => {
  const googlebotUs = computeEffectiveCountry({
    detectedCode: 'US',
    lastDetectedCode: null,
    savedManualCode: null,
    bannerDismissed: false,
  })
  assert.equal(googlebotUs.country.code, 'NG')
  assert.equal(googlebotUs.country.currency, 'NGN')
  assert.equal(googlebotUs.country.symbol, '₦')
  assert.equal(googlebotUs.showBanner, true)
  assert.equal(googlebotUs.shouldClearManualOverride, false)

  const ukVisitor = computeEffectiveCountry({
    detectedCode: 'GB',
    lastDetectedCode: 'NG',
    savedManualCode: null,
    bannerDismissed: true,
  })
  assert.equal(ukVisitor.country.code, 'NG')
  assert.equal(ukVisitor.country.currency, 'NGN')
  assert.equal(ukVisitor.showBanner, false)
})

test('explicit manual currency selection is respected regardless of detected IP country', () => {
  const manualUsd = computeEffectiveCountry({
    detectedCode: 'NG',
    lastDetectedCode: 'NG',
    savedManualCode: 'US',
    bannerDismissed: true,
  })
  assert.equal(manualUsd.country.code, 'US')
  assert.equal(manualUsd.country.currency, 'USD')
  assert.equal(manualUsd.showBanner, false)
  assert.equal(manualUsd.shouldClearManualOverride, false)

  const manualGbpOnNewIp = computeEffectiveCountry({
    detectedCode: 'US',
    lastDetectedCode: 'NG',
    savedManualCode: 'GB',
    bannerDismissed: false,
  })
  assert.equal(manualGbpOnNewIp.country.code, 'GB')
  assert.equal(manualGbpOnNewIp.country.currency, 'GBP')
  assert.equal(manualGbpOnNewIp.showBanner, false)
  assert.equal(manualGbpOnNewIp.shouldClearManualOverride, false)
})

test('Nigeria visitors stay in NGN without showing the currency banner', () => {
  const ng = computeEffectiveCountry({
    detectedCode: 'NG',
    lastDetectedCode: null,
    savedManualCode: null,
    bannerDismissed: false,
  })
  assert.equal(ng.country.code, 'NG')
  assert.equal(ng.country.currency, 'NGN')
  assert.equal(ng.showBanner, false)
})
