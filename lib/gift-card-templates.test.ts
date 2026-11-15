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

test('color themes never include Christmas Edition while seasonal Christmas occasion toggles cleanly', () => {
  assert.equal(CHRISTMAS_GIFT_CARD_DESIGN_ENABLED, true)
  assert.equal(CHRISTMAS_GIFT_CARD_DESIGN.badgeLabel, undefined)
  const opts = { festiveEnabled: true, userRemovedChristmas: false }

  assert.equal(isChristmasTemplateAvailable(opts), true)

  const designs = getGiftCardDesigns(opts)
  assert.equal(designs.length, INITIAL_GIFT_CARD_DESIGNS.length)
  assert.equal(designs.some((d) => d.id === 'christmas'), false)
  for (const initial of INITIAL_GIFT_CARD_DESIGNS) {
    assert.ok(designs.some((d) => d.id === initial.id))
    assert.ok(initial.surfaceHex.startsWith('#'))
    assert.ok(initial.accentHex.startsWith('#'))
    assert.ok(initial.medallionHex?.startsWith('#'))
  }

  // Distinct surface hexes across every selectable color theme
  const uniqueSurfaces = new Set(designs.map((d) => d.surfaceHex.toLowerCase()))
  assert.equal(uniqueSurfaces.size, designs.length)

  // Default color is always a real color theme (Royal Purple), while occasion defaults to Christmas when festive
  assert.equal(getDefaultGiftCardDesign(opts).id, 'royal')
  assert.equal(getDefaultGiftCardOccasion(opts), CHRISTMAS_OCCASION)

  const occasions = getGiftCardOccasions(opts)
  assert.equal(occasions[0], CHRISTMAS_OCCASION)
  for (const initial of INITIAL_GIFT_CARD_OCCASIONS) {
    assert.ok(occasions.includes(initial))
  }
})

test('disabling festive flag removes Christmas occasion while keeping all color themes intact', () => {
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

test('findGiftCardDesignById resolves current, legacy, and named templates cleanly', () => {
  assert.equal(findGiftCardDesignById('christmas').name, 'Christmas Edition')
  assert.equal(findGiftCardDesignById('emerald').name, 'Sanctuary Emerald')
  assert.equal(findGiftCardDesignById('Sanctuary Emerald').id, 'emerald')
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
  assert.equal(resolveOccasionMotif('Christmas', 'emerald'), 'christmas')
  assert.equal(resolveOccasionMotif(undefined, 'christmas'), 'christmas')
  assert.equal(resolveOccasionMotif('', 'royal'), 'classic')

  assert.equal(findGiftCardFontById('modern').className, 'font-sans')
  assert.equal(findGiftCardFontById('playful').className, 'font-mono')
  assert.equal(findGiftCardFontById(null).id, 'elegant')
})

test('users can pair any color theme with any occasion including Christmas without forced overrides', () => {
  const opts = { festiveEnabled: true, userRemovedChristmas: false }
  const emerald = findGiftCardDesignById('emerald')
  const sapphire = findGiftCardDesignById('sapphire')

  // Switching occasion preserves user-selected color
  assert.equal(
    syncDesignForOccasion('Birthday', emerald, { ...opts, preserveCustomColor: true }).id,
    'emerald',
  )
  assert.equal(
    syncDesignForOccasion('Christmas', sapphire, { ...opts, preserveCustomColor: true }).id,
    'sapphire',
  )

  // Auto-suggestion when user has not locked a custom color picks a real color theme
  assert.equal(
    syncDesignForOccasion('Christmas', findGiftCardDesignById('royal'), {
      ...opts,
      preserveCustomColor: false,
    }).id,
    'emerald',
  )
  assert.equal(
    syncDesignForOccasion('Self-Care', findGiftCardDesignById('royal'), {
      ...opts,
      preserveCustomColor: false,
    }).id,
    'emerald',
  )

  // Picking any color swatch never overwrites Christmas occasion
  assert.equal(syncOccasionForDesign(sapphire, 'Christmas', opts), 'Christmas')
  assert.equal(syncOccasionForDesign(emerald, 'Wedding', opts), 'Wedding')
})
