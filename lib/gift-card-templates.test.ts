import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHRISTMAS_GIFT_CARD_DESIGN,
  CHRISTMAS_GIFT_CARD_DESIGN_ENABLED,
  CHRISTMAS_OCCASION,
  INITIAL_GIFT_CARD_DESIGNS,
  INITIAL_GIFT_CARD_OCCASIONS,
  findGiftCardDesignById,
  getDefaultGiftCardDesign,
  getDefaultGiftCardOccasion,
  getGiftCardDesigns,
  getGiftCardOccasions,
  isChristmasTemplateAvailable,
} from './gift-card-templates'

test('Christmas template is enabled by default while preserving all initial templates', () => {
  assert.equal(CHRISTMAS_GIFT_CARD_DESIGN_ENABLED, true)
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
