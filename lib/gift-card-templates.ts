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
  /** Deeper flat hex for SVG medallion / ornament fills. */
  medallionHex?: string
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
  medallionHex: '#3D1048',
  gradient: 'from-[#5A1D6A] to-[#7B2D8E]',
  isSeasonal: true,
}

export const INITIAL_GIFT_CARD_DESIGNS: GiftCardDesign[] = [
  {
    id: 'royal',
    name: 'Royal Purple',
    surfaceHex: '#7B2D8E',
    accentHex: '#9B4DB0',
    medallionHex: '#4A1558',
    gradient: 'from-[#7B2D8E] to-[#9B4DB0]',
  },
  {
    id: 'violet',
    name: 'Deep Velvet',
    surfaceHex: '#4A1558',
    accentHex: '#6E2682',
    medallionHex: '#2E0B38',
    gradient: 'from-[#4A1558] to-[#6E2682]',
  },
  {
    id: 'emerald',
    name: 'Sanctuary Emerald',
    surfaceHex: '#184E3F',
    accentHex: '#2A6F5B',
    medallionHex: '#0E3127',
    gradient: 'from-[#184E3F] to-[#2A6F5B]',
  },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    surfaceHex: '#1D335B',
    accentHex: '#314F85',
    medallionHex: '#101F3A',
    gradient: 'from-[#1D335B] to-[#314F85]',
  },
  {
    id: 'burgundy',
    name: 'Velvet Rose',
    surfaceHex: '#7D2248',
    accentHex: '#A13662',
    medallionHex: '#4B1029',
    gradient: 'from-[#7D2248] to-[#A13662]',
  },
  {
    id: 'espresso',
    name: 'Champagne Bronze',
    surfaceHex: '#6B4C2B',
    accentHex: '#8C653E',
    medallionHex: '#422D17',
    gradient: 'from-[#6B4C2B] to-[#8C653E]',
  },
  {
    id: 'onyx',
    name: 'Charcoal Onyx',
    surfaceHex: '#242029',
    accentHex: '#3D3744',
    medallionHex: '#141118',
    gradient: 'from-[#242029] to-[#3D3744]',
  },
]

const LEGACY_GIFT_CARD_DESIGNS: GiftCardDesign[] = [
  {
    id: 'lavender',
    name: 'Lavender',
    surfaceHex: '#8E44AD',
    accentHex: '#A569BD',
    medallionHex: '#5B2673',
    gradient: 'from-[#9B4DB0] to-[#B76CC8]',
  },
  {
    id: 'plum',
    name: 'Plum',
    surfaceHex: '#6B2D7B',
    accentHex: '#8B4DA0',
    medallionHex: '#42194D',
    gradient: 'from-[#6B2D7B] to-[#8B4DA0]',
  },
  {
    id: 'mauve',
    name: 'Mauve',
    surfaceHex: '#7D4E88',
    accentHex: '#9B6AA6',
    medallionHex: '#4D2C55',
    gradient: 'from-[#8B5A96] to-[#A87BB0]',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    surfaceHex: '#8630A8',
    accentHex: '#A34EC4',
    medallionHex: '#521A68',
    gradient: 'from-[#9932CC] to-[#BA55D3]',
  },
]

export function getDesignMedallionHex(design: GiftCardDesign): string {
  return design.medallionHex || design.surfaceHex
}

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

export function getGiftCardDesigns(_opts?: {
  festiveEnabled?: boolean
  userRemovedChristmas?: boolean
}): GiftCardDesign[] {
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

export function getDefaultGiftCardDesign(_opts?: {
  festiveEnabled?: boolean
  userRemovedChristmas?: boolean
}): GiftCardDesign {
  return INITIAL_GIFT_CARD_DESIGNS[0]
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
  const normalized = typeof id === 'string' ? id.trim().toLowerCase() : ''
  if (!normalized) return INITIAL_GIFT_CARD_DESIGNS[0]
  if (
    normalized === CHRISTMAS_GIFT_CARD_DESIGN.id ||
    normalized === CHRISTMAS_GIFT_CARD_DESIGN.name.toLowerCase()
  ) {
    return CHRISTMAS_GIFT_CARD_DESIGN
  }
  const all = [...INITIAL_GIFT_CARD_DESIGNS, ...LEGACY_GIFT_CARD_DESIGNS]
  return (
    all.find(
      (d) =>
        d.id.toLowerCase() === normalized ||
        d.name.toLowerCase() === normalized,
    ) ?? INITIAL_GIFT_CARD_DESIGNS[0]
  )
}

export function findGiftCardFontById(id?: string | null): GiftCardFont {
  const normalized = typeof id === 'string' ? id.trim().toLowerCase() : ''
  return (
    GIFT_CARD_FONTS.find((f) => f.id === normalized) ?? GIFT_CARD_FONTS[0]
  )
}

export type GiftCardOccasionMotif =
  | 'christmas'
  | 'birthday'
  | 'anniversary'
  | 'thank-you'
  | 'self-care'
  | 'wedding'
  | 'mothers-day'
  | 'valentines'
  | 'just-because'
  | 'classic'

export interface GiftCardOccasionMeta {
  id: GiftCardOccasionMotif
  occasion: string
  editionLabel: string
  tagline: string
  suggestedDesignId: string
}

export const GIFT_CARD_OCCASION_META_LIST: GiftCardOccasionMeta[] = [
  {
    id: 'christmas',
    occasion: CHRISTMAS_OCCASION,
    editionLabel: 'Christmas Edition',
    tagline: 'Winter Sanctuary Gift',
    suggestedDesignId: 'emerald',
  },
  {
    id: 'birthday',
    occasion: 'Birthday',
    editionLabel: 'Birthday Celebration',
    tagline: 'Make a Glow Wish',
    suggestedDesignId: 'royal',
  },
  {
    id: 'anniversary',
    occasion: 'Anniversary',
    editionLabel: 'Anniversary Edition',
    tagline: 'Years of Shared Calm',
    suggestedDesignId: 'sapphire',
  },
  {
    id: 'thank-you',
    occasion: 'Thank You',
    editionLabel: 'Gratitude Edition',
    tagline: 'With Sincere Appreciation',
    suggestedDesignId: 'espresso',
  },
  {
    id: 'self-care',
    occasion: 'Self-Care',
    editionLabel: 'Self-Care Ritual',
    tagline: 'Rest, Restore, Glow',
    suggestedDesignId: 'emerald',
  },
  {
    id: 'wedding',
    occasion: 'Wedding',
    editionLabel: 'Bridal & Wedding',
    tagline: 'Forever Radiance',
    suggestedDesignId: 'burgundy',
  },
  {
    id: 'mothers-day',
    occasion: "Mother's Day",
    editionLabel: "Mother's Day Tribute",
    tagline: 'Cherished Care & Bloom',
    suggestedDesignId: 'burgundy',
  },
  {
    id: 'valentines',
    occasion: "Valentine's",
    editionLabel: "Valentine's Edition",
    tagline: 'A Gift From the Heart',
    suggestedDesignId: 'burgundy',
  },
  {
    id: 'just-because',
    occasion: 'Just Because',
    editionLabel: 'Thoughtful Surprise',
    tagline: 'Wrapped Just For You',
    suggestedDesignId: 'violet',
  },
]

const CLASSIC_OCCASION_META: GiftCardOccasionMeta = {
  id: 'classic',
  occasion: 'Gift Card',
  editionLabel: 'Signature Sanctuary',
  tagline: 'Timeless Spa Wellness',
  suggestedDesignId: 'royal',
}

export function getGiftCardOccasionMeta(
  occasion?: string | null,
): GiftCardOccasionMeta {
  const cleaned = typeof occasion === 'string' ? occasion.trim() : ''
  if (!cleaned) return CLASSIC_OCCASION_META

  const lower = cleaned.toLowerCase()
  const exact = GIFT_CARD_OCCASION_META_LIST.find(
    (item) => item.occasion.toLowerCase() === lower || item.id === lower,
  )
  if (exact) return exact

  if (lower.includes('christ') || lower.includes('xmas') || lower.includes('holiday')) {
    return GIFT_CARD_OCCASION_META_LIST[0]
  }
  if (lower.includes('birth')) return GIFT_CARD_OCCASION_META_LIST[1]
  if (lower.includes('anniv')) return GIFT_CARD_OCCASION_META_LIST[2]
  if (lower.includes('thank') || lower.includes('gratitude')) {
    return GIFT_CARD_OCCASION_META_LIST[3]
  }
  if (lower.includes('self') || lower.includes('spa') || lower.includes('care')) {
    return GIFT_CARD_OCCASION_META_LIST[4]
  }
  if (lower.includes('wed') || lower.includes('bridal')) {
    return GIFT_CARD_OCCASION_META_LIST[5]
  }
  if (lower.includes('mother') || lower.includes('mum') || lower.includes('mom')) {
    return GIFT_CARD_OCCASION_META_LIST[6]
  }
  if (lower.includes('valentin') || lower.includes('love')) {
    return GIFT_CARD_OCCASION_META_LIST[7]
  }
  if (lower.includes('just because') || lower.includes('surprise')) {
    return GIFT_CARD_OCCASION_META_LIST[8]
  }

  return {
    ...CLASSIC_OCCASION_META,
    occasion: cleaned,
    editionLabel: cleaned,
  }
}

export function resolveOccasionMotif(
  occasion?: string | null,
  designId?: string | null,
): GiftCardOccasionMotif {
  const meta = getGiftCardOccasionMeta(occasion)
  if (meta.id !== 'classic') return meta.id
  if (designId === CHRISTMAS_GIFT_CARD_DESIGN.id) return 'christmas'
  return 'classic'
}

export function syncDesignForOccasion(
  nextOccasion: string,
  currentDesign: GiftCardDesign,
  opts: {
    festiveEnabled: boolean
    userRemovedChristmas: boolean
    preserveCustomColor?: boolean
  },
): GiftCardDesign {
  const meta = getGiftCardOccasionMeta(nextOccasion)
  if (
    currentDesign.id === CHRISTMAS_GIFT_CARD_DESIGN.id ||
    !opts.preserveCustomColor
  ) {
    return findGiftCardDesignById(meta.suggestedDesignId)
  }
  return currentDesign
}

export function syncOccasionForDesign(
  _nextDesign: GiftCardDesign,
  currentOccasion: string,
  _opts?: {
    festiveEnabled: boolean
    userRemovedChristmas: boolean
  },
): string {
  return currentOccasion
}

