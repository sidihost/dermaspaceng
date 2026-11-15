import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHRISTMAS_GIFT_CARD_DESIGN,
  CHRISTMAS_GIFT_CARD_DESIGN_ENABLED,
  CHRISTMAS_OCCASION,
  INITIAL_GIFT_CARD_DESIGNS,
  INITIAL_GIFT_CARD_OCCASIONS,
  findGiftCardDesignById,
  findGiftCardFontById,
  getDefaultGiftCardDesign,
  getDefaultGiftCardOccasion,
  getGiftCardDesigns,
  getGiftCardOccasionMeta,
  getGiftCardOccasions,
  isChristmasTemplateAvailable,
  resolveOccasionMotif,
  syncDesignForOccasion,
  syncOccasionForDesign,
} from './gift-card-templates'

test('Christmas template is enabled by default while preserving all initial templates', () => {
  assert.equal(CHRISTMAS_GIFT_CARD_DESIGN_ENABLED, true)
  assert.equal(CHRISTMAS_GIFT_CARD_DESIGN.badgeLabel, undefined)
  const opts = { festiveEnabled: true, userRemovedChristmas: false }

  assert.equal(isChristmasTemplateAvailable(opts), true)

  const designs = getGiftCardDesigns(opts)
  assert.equal(designs[0].id, CHRISTMAS_GIFT_CARD_DESIGN.id)
  assert.equal(designs.length, INITIAL_GIFT_CARD_DESIGNS.length + 1)
  for (const initial of INITIAL_GIFT_CARD_DESIGNS) {
    assert.ok(designs.some((d) => d.id === initial.id))
  }

  assert.equal(getDefaultGiftCardDesign(opts).id, 'christmas')
  assert.equal(getDefaultGiftCardOccasion(opts), CHRISTMAS_OCCASION)

  const occasions = getGiftCardOccasions(opts)
  assert.equal(occasions[0], CHRISTMAS_OCCASION)
  for (const initial of INITIAL_GIFT_CARD_OCCASIONS) {
    assert.ok(occasions.includes(initial))
  }
})

test('removing Christmas template cleanly reverts to initial designs and default Royal Purple', () => {
  const removedByUser = { festiveEnabled: true, userRemovedChristmas: true }
  assert.equal(isChristmasTemplateAvailable(removedByUser), false)

  const designs = getGiftCardDesigns(removedByUser)
  assert.equal(designs.length, INITIAL_GIFT_CARD_DESIGNS.length)
  assert.equal(designs.some((d) => d.id === 'christmas'), false)
  assert.equal(getDefaultGiftCardDesign(removedByUser).id, 'royal')
  assert.equal(getDefaultGiftCardOccasion(removedByUser), 'Birthday')
  assert.equal(getGiftCardOccasions(removedByUser).includes(CHRISTMAS_OCCASION), false)

  const disabledByAdmin = { festiveEnabled: false, userRemovedChristmas: false }
  assert.equal(isChristmasTemplateAvailable(disabledByAdmin), false)
  assert.equal(getDefaultGiftCardDesign(disabledByAdmin).id, 'royal')
})

test('findGiftCardDesignById resolves both Christmas and initial templates cleanly', () => {
  assert.equal(findGiftCardDesignById('christmas').name, 'Christmas Edition')
  assert.equal(findGiftCardDesignById('plum').name, 'Plum')
  assert.equal(findGiftCardDesignById('unknown-id').id, 'royal')
})

test('every gift card occasion resolves bespoke motif, edition label, and font lookup', () => {
  assert.equal(getGiftCardOccasionMeta('Birthday').id, 'birthday')
  assert.equal(getGiftCardOccasionMeta('Birthday').editionLabel, 'Birthday Celebration')
  assert.equal(getGiftCardOccasionMeta('Wedding').id, 'wedding')
  assert.equal(getGiftCardOccasionMeta("Mother's Day").id, 'mothers-day')
  assert.equal(getGiftCardOccasionMeta("Valentine's").id, 'valentines')
  assert.equal(getGiftCardOccasionMeta('Self-Care').id, 'self-care')
  assert.equal(getGiftCardOccasionMeta('Thank You').id, 'thank-you')
  assert.equal(getGiftCardOccasionMeta('Anniversary').id, 'anniversary')
  assert.equal(getGiftCardOccasionMeta('Just Because').id, 'just-because')

  assert.equal(resolveOccasionMotif('Birthday', 'christmas'), 'birthday')
  assert.equal(resolveOccasionMotif(undefined, 'christmas'), 'christmas')
  assert.equal(resolveOccasionMotif('', 'royal'), 'classic')

  assert.equal(findGiftCardFontById('modern').className, 'font-sans')
  assert.equal(findGiftCardFontById('playful').className, 'font-mono')
  assert.equal(findGiftCardFontById(null).id, 'elegant')
})

test('occasion and design color selections stay harmonized without trapping non-Christmas occasions on Christmas art', () => {
  const opts = { festiveEnabled: true, userRemovedChristmas: false }

  // Switching from Christmas to Birthday replaces the seasonal design with Birthday's palette
  const birthdayDesign = syncDesignForOccasion('Birthday', CHRISTMAS_GIFT_CARD_DESIGN, {
    ...opts,
    preserveCustomColor: true,
  })
  assert.equal(birthdayDesign.id, 'royal')

  // Switching between non-Christmas occasions automatically applies suggested palette unless user locked a custom color
  const selfCareAuto = syncDesignForOccasion('Self-Care', birthdayDesign, {
    ...opts,
    preserveCustomColor: false,
  })
  assert.equal(selfCareAuto.id, 'lavender')

  const customPlum = findGiftCardDesignById('plum')
  const weddingLocked = syncDesignForOccasion('Wedding', customPlum, {
    ...opts,
    preserveCustomColor: true,
  })
  assert.equal(weddingLocked.id, 'plum')

  // Selecting Christmas occasion brings back Christmas Edition when active
  const backToChristmas = syncDesignForOccasion('Christmas', customPlum, {
    ...opts,
    preserveCustomColor: true,
  })
  assert.equal(backToChristmas.id, 'christmas')

  // Selecting a non-Christmas color swatch moves Christmas occasion to Birthday
  assert.equal(syncOccasionForDesign(customPlum, 'Christmas', opts), 'Birthday')
  assert.equal(syncOccasionForDesign(CHRISTMAS_GIFT_CARD_DESIGN, 'Birthday', opts), 'Christmas')
})
