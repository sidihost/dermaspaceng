import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INTERNATIONAL_REGIONS,
  buildRegionalMenu,
  convertNgnToRegionPrice,
  formatRegionPriceFromNgn,
  getInternationalRegionByIso,
  getInternationalRegionBySlug,
  validateWaitlistSubmission,
} from './international-regions'

test('maps ISO country codes and URL aliases to canonical international regions', () => {
  assert.equal(getInternationalRegionByIso('GB')?.slug, 'UK')
  assert.equal(getInternationalRegionByIso('gb')?.slug, 'UK')
  assert.equal(getInternationalRegionByIso('US')?.slug, 'US')
  assert.equal(getInternationalRegionByIso('AE')?.slug, 'AE')
  assert.equal(getInternationalRegionByIso('GH')?.slug, 'GH')
  assert.equal(getInternationalRegionByIso('ZA')?.slug, 'ZA')
  // Nigeria stays on the main site (never redirected to an international storefront)
  assert.equal(getInternationalRegionByIso('NG'), null)
  assert.equal(getInternationalRegionByIso('XX'), null)

  assert.equal(getInternationalRegionBySlug('uk')?.slug, 'UK')
  assert.equal(getInternationalRegionBySlug('gb')?.slug, 'UK')
  assert.equal(getInternationalRegionBySlug('UK')?.slug, 'UK')
  assert.equal(getInternationalRegionBySlug('uae')?.slug, 'AE')
  assert.equal(getInternationalRegionBySlug('unknown'), null)
})

test('converts and formats NGN prices accurately per region without fractional clutter', () => {
  const uk = INTERNATIONAL_REGIONS.UK
  const us = INTERNATIONAL_REGIONS.US
  const ae = INTERNATIONAL_REGIONS.AE

  // ₦45,000 Deep Cleansing Facial -> £23 (at ₦1,950/GBP), $29 (at ₦1,550/USD), AED 105 (at ₦422/AED rounded to 5)
  assert.equal(convertNgnToRegionPrice(45000, uk), 23)
  assert.equal(formatRegionPriceFromNgn(45000, uk), '£23')

  assert.equal(convertNgnToRegionPrice(45000, us), 29)
  assert.equal(formatRegionPriceFromNgn(45000, us), '$29')

  assert.equal(convertNgnToRegionPrice(45000, ae), 105)
  assert.equal(formatRegionPriceFromNgn(45000, ae), 'AED 105')

  // Guard against zero/invalid inputs
  assert.equal(convertNgnToRegionPrice(0, uk), 0)
  assert.equal(convertNgnToRegionPrice(-100, uk), 0)
})

test('builds complete regional menu from canonical services catalog', () => {
  const menu = buildRegionalMenu(INTERNATIONAL_REGIONS.UK)
  assert.ok(menu.length >= 6)
  const facials = menu.find((c) => c.slug === 'facial-treatments')
  assert.ok(facials)
  assert.ok(facials.treatments.length > 5)
  const deepCleansing = facials.treatments.find((t) => t.name === 'Deep Cleansing Facial')
  assert.ok(deepCleansing)
  assert.equal(deepCleansing.priceLocalFormatted, '£23')
  assert.equal(deepCleansing.priceNgnFormatted, '₦45,000')
})

test('validates regional waitlist submissions cleanly', () => {
  const bad = validateWaitlistSubmission({ email: 'not-an-email' })
  assert.equal(bad.ok, false)

  const empty = validateWaitlistSubmission(null)
  assert.equal(empty.ok, false)

  const good = validateWaitlistSubmission({
    email: '  Ada.Okafor@Example.com ',
    name: 'Ada Okafor',
    city: 'London',
    region: 'uk',
    source: 'regional-storefront',
  })
  assert.equal(good.ok, true)
  if (good.ok) {
    assert.equal(good.data.email, 'ada.okafor@example.com')
    assert.equal(good.data.region, 'UK')
    assert.equal(good.data.city, 'London')
    assert.equal(good.data.source, 'regional-storefront')
  }
})

test('every international region provides a unique country-specific hero image and clean professional copy', () => {
  const regions = Object.values(INTERNATIONAL_REGIONS)
  const heroImages = new Set(regions.map((r) => r.heroImage))
  assert.equal(heroImages.size, regions.length)
  for (const r of regions) {
    assert.ok(r.heroImage.startsWith('/images/regions/'))
    assert.ok(r.heroAlt.length > 20)
    assert.ok(r.heroTitleLine1.length > 5)
    assert.ok(r.heroTitleItalic.length > 5)
    assert.ok(r.aboutNote.length > 20)
    const allCopy = [
      r.heroAlt,
      r.suiteCaption,
      r.editorialHeadline,
      r.editorialSubhead,
      r.aboutNote,
      r.waitlistTitle,
      r.waitlistDescription,
    ].join(' ')
    assert.equal(/concierge/i.test(allCopy), false)
    assert.equal(/clinical/i.test(allCopy), false)
  }
})

test('localizes inline NGN price mentions inside treatment descriptions for all regions', () => {
  for (const region of Object.values(INTERNATIONAL_REGIONS)) {
    const menu = buildRegionalMenu(region)
    for (const cat of menu) {
      assert.equal(cat.description.includes('₦'), false)
      for (const t of cat.treatments) {
        assert.equal(
          t.description.includes('₦'),
          false,
          `Found unlocalized NGN symbol in ${region.slug} -> ${t.name}: ${t.description}`,
        )
      }
    }
  }
  const ukFacials = buildRegionalMenu(INTERNATIONAL_REGIONS.UK).find(
    (c) => c.slug === 'facial-treatments',
  )
  const deepCleansing = ukFacials?.treatments.find(
    (t) => t.name === 'Deep Cleansing Facial',
  )
  assert.ok(deepCleansing?.description.includes('£44'))
})



