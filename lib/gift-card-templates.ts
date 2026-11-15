/**
 * Shared Dermaspace Gift Card design templates & seasonal Christmas controls.
 *
 * Modular removal:
 *   - Flip `CHRISTMAS_GIFT_CARD_DESIGN_ENABLED` to `false` or disable the
 *     `festive` flag in /admin/features to revert cleanly to the original
 *     initial gift card templates everywhere.
 */

export const CHRISTMAS_GIFT_CARD_DESIGN_ENABLED = true

export interface GiftCardDesign {
  id: string
  name: string
  /** Flat hex fill for the card surface (no CSS gradients). */
  surfaceHex: string
  /** Complementary flat accent hex for secondary layers / borders. */
  accentHex: string
  /** Legacy Tailwind gradient string kept strictly for persisted DB metadata compatibility. */
  gradient: string
  isSeasonal?: boolean
  badgeLabel?: string
}

export interface GiftCardFont {
  id: string
  name: string
  className: string
}

export const CHRISTMAS_GIFT_CARD_DESIGN: GiftCardDesign = {
  id: 'christmas',
  name: 'Christmas Edition',
  surfaceHex: '#5A1D6A',
  accentHex: '#7B2D8E',
  gradient: 'from-[#5A1D6A] to-[#7B2D8E]',
  isSeasonal: true,
}

export const INITIAL_GIFT_CARD_DESIGNS: GiftCardDesign[] = [
  {
    id: 'royal',
    name: 'Royal Purple',
    surfaceHex: '#7B2D8E',
    accentHex: '#9B4DB0',
    gradient: 'from-[#7B2D8E] to-[#9B4DB0]',
  },
  {
    id: 'violet',
    name: 'Deep Violet',
    surfaceHex: '#5A1D6A',
    accentHex: '#7B2D8E',
    gradient: 'from-[#5A1D6A] to-[#7B2D8E]',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    surfaceHex: '#8E44AD',
    accentHex: '#A569BD',
    gradient: 'from-[#9B4DB0] to-[#B76CC8]',
  },
  {
    id: 'plum',
    name: 'Plum',
    surfaceHex: '#6B2D7B',
    accentHex: '#8B4DA0',
    gradient: 'from-[#6B2D7B] to-[#8B4DA0]',
  },
  {
    id: 'mauve',
    name: 'Mauve',
    surfaceHex: '#7D4E88',
    accentHex: '#9B6AA6',
    gradient: 'from-[#8B5A96] to-[#A87BB0]',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    surfaceHex: '#8630A8',
    accentHex: '#A34EC4',
    gradient: 'from-[#9932CC] to-[#BA55D3]',
  },
]

export const CHRISTMAS_OCCASION = 'Christmas'

export const INITIAL_GIFT_CARD_OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Thank You',
  'Self-Care',
  'Wedding',
  "Mother's Day",
  "Valentine's",
  'Just Because',
]

export const GIFT_CARD_FONTS: GiftCardFont[] = [
  { id: 'elegant', name: 'Elegant', className: 'font-serif' },
  { id: 'modern', name: 'Modern', className: 'font-sans' },
  { id: 'playful', name: 'Playful', className: 'font-mono' },
]

export const GIFT_CARD_AMOUNTS = [
  { amount: 5000, label: 'Basic Facial' },
  { amount: 8000, label: 'Manicure' },
  { amount: 12000, label: 'Pedicure' },
  { amount: 15000, label: 'Body Massage' },
  { amount: 25000, label: 'Full Spa Day' },
  { amount: 50000, label: 'Premium Package' },
]

export function isChristmasTemplateAvailable({
  festiveEnabled,
  userRemovedChristmas,
}: {
  festiveEnabled: boolean
  userRemovedChristmas: boolean
}): boolean {
  return (
    CHRISTMAS_GIFT_CARD_DESIGN_ENABLED &&
    festiveEnabled &&
    !userRemovedChristmas
  )
}

export function getGiftCardDesigns({
  festiveEnabled,
  userRemovedChristmas,
}: {
  festiveEnabled: boolean
  userRemovedChristmas: boolean
}): GiftCardDesign[] {
  if (isChristmasTemplateAvailable({ festiveEnabled, userRemovedChristmas })) {
    return [CHRISTMAS_GIFT_CARD_DESIGN, ...INITIAL_GIFT_CARD_DESIGNS]
  }
  return [...INITIAL_GIFT_CARD_DESIGNS]
}

export function getGiftCardOccasions({
  festiveEnabled,
  userRemovedChristmas,
}: {
  festiveEnabled: boolean
  userRemovedChristmas: boolean
}): string[] {
  if (isChristmasTemplateAvailable({ festiveEnabled, userRemovedChristmas })) {
    return [CHRISTMAS_OCCASION, ...INITIAL_GIFT_CARD_OCCASIONS]
  }
  return [...INITIAL_GIFT_CARD_OCCASIONS]
}

export function getDefaultGiftCardDesign({
  festiveEnabled,
  userRemovedChristmas,
}: {
  festiveEnabled: boolean
  userRemovedChristmas: boolean
}): GiftCardDesign {
  return isChristmasTemplateAvailable({ festiveEnabled, userRemovedChristmas })
    ? CHRISTMAS_GIFT_CARD_DESIGN
    : INITIAL_GIFT_CARD_DESIGNS[0]
}

export function getDefaultGiftCardOccasion({
  festiveEnabled,
  userRemovedChristmas,
}: {
  festiveEnabled: boolean
  userRemovedChristmas: boolean
}): string {
  return isChristmasTemplateAvailable({ festiveEnabled, userRemovedChristmas })
    ? CHRISTMAS_OCCASION
    : INITIAL_GIFT_CARD_OCCASIONS[0]
}

export function findGiftCardDesignById(id?: string | null): GiftCardDesign {
  if (id === CHRISTMAS_GIFT_CARD_DESIGN.id) {
    return CHRISTMAS_GIFT_CARD_DESIGN
  }
  return (
    INITIAL_GIFT_CARD_DESIGNS.find((d) => d.id === id) ??
    INITIAL_GIFT_CARD_DESIGNS[0]
  )
}
