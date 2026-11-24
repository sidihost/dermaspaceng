// ---------------------------------------------------------------------------
// Dermaspace International Country Storefronts & Accurate Local Pricing
//
// Pure, zero-dependency domain module powering `/UK`, `/US`, `/AE`, `/GH`,
// `/ZA`, automatic country routing in `middleware.ts`, and waitlist validation.
//
// Pricing is derived directly from Dermaspace's canonical May 2026 VAT-
// inclusive catalog (`SERVICES_CATALOG`) using calibrated mid-market FX
// benchmarks and clean boutique rounding so international visitors see
// transparent, realistic prices in their home currency.
// ---------------------------------------------------------------------------

import { SERVICES_CATALOG, type CatalogCategory } from './services-catalog'

export type InternationalRegionSlug = 'UK' | 'US' | 'AE' | 'GH' | 'ZA'
export type InternationalIsoCode = 'GB' | 'US' | 'AE' | 'GH' | 'ZA'

export interface InternationalRegionConfig {
  slug: InternationalRegionSlug
  isoCode: InternationalIsoCode
  name: string
  shortLabel: string
  cities: string
  currency: 'GBP' | 'USD' | 'AED' | 'GHS' | 'ZAR'
  symbol: string
  symbolPosition: 'prefix' | 'prefix-space'
  locale: string
  /** Calibrated NGN per 1 unit of local currency (mid-market 2026 benchmark). */
  ngnPerUnit: number
  /** Clean rounding increment in local currency units (e.g. £1, $1, AED 5). */
  roundStep: number
  taxLabel: string
  /** Country-specific editorial architectural hero photograph served from `/public/images/regions/`. */
  heroImage: string
  heroAlt: string
  heroTitleLine1: string
  heroTitleItalic: string
  suiteCaption: string
  editorialHeadline: string
  editorialSubhead: string
  aboutNote: string
  waitlistTitle: string
  waitlistDescription: string
  cityPlaceholder: string
}

export interface RegionalCollectionCard {
  slug: string
  title: string
  tag: string
  summary: string
  image: string
  imagePosition: string
}

export const REGIONAL_COLLECTION_CARDS: readonly RegionalCollectionCard[] = [
  {
    slug: 'facial-treatments',
    title: 'Facial Treatments',
    tag: 'Skin Health',
    summary: 'Deep cleansing, barrier care, and peels tailored to your skin.',
    image: '/images/regions/collection-facial.jpg',
    imagePosition: 'object-[center_22%]',
  },
  {
    slug: 'body-treatments',
    title: 'Body Treatments',
    tag: 'Relax & Restore',
    summary: 'Massages, body scrubs, and restorative treatments in a quiet room.',
    image: '/images/regions/collection-body.jpg',
    imagePosition: 'object-center',
  },
  {
    slug: 'laser-hair-removal',
    title: 'Laser Hair Removal',
    tag: 'Precision Care',
    summary: 'Safe, calibrated laser sessions suitable for all skin tones.',
    image: '/images/regions/collection-laser.jpg',
    imagePosition: 'object-[center_20%]',
  },
  {
    slug: 'nail-care',
    title: 'Nail Care',
    tag: 'Hands & Feet',
    summary: 'Manicures, pedicures, gel care, and gentle nail restoration.',
    image: '/images/regions/collection-nails.jpg',
    imagePosition: 'object-center',
  },
]

export const INTERNATIONAL_REGIONS: Record<
  InternationalRegionSlug,
  InternationalRegionConfig
> = {
  UK: {
    slug: 'UK',
    isoCode: 'GB',
    name: 'United Kingdom',
    shortLabel: 'United Kingdom',
    cities: 'London · Manchester · Birmingham',
    currency: 'GBP',
    symbol: '£',
    symbolPosition: 'prefix',
    locale: 'en-GB',
    ngnPerUnit: 1950,
    roundStep: 1,
    taxLabel: 'VAT inclusive',
    heroImage: '/images/regions/uk-hero.jpg',
    heroAlt:
      'Sunlit London skincare and wellness room with Georgian sash windows and pale limestone walls',
    heroTitleLine1: 'Skin that feels',
    heroTitleItalic: 'like yours',
    suiteCaption: 'Dermaspace United Kingdom · Private treatment rooms',
    editorialHeadline: 'Skin that feels like yours.',
    editorialSubhead:
      'Facials, chemical peels, laser hair removal, and restorative body treatments crafted for melanin-rich and sensitive skin — with clear GBP pricing and early waitlist access across the UK.',
    aboutNote:
      'Clean rooms, skilled therapists, and treatments that actually work. No upsells, no gimmicks — just honest care you can see and feel.',
    waitlistTitle: 'Join the UK Waitlist',
    waitlistDescription:
      'Be the first to know when Dermaspace opens bookings in the United Kingdom, with early access to appointments and skin consultations.',
    cityPlaceholder: 'e.g. London, Manchester, Birmingham',
  },
  US: {
    slug: 'US',
    isoCode: 'US',
    name: 'United States',
    shortLabel: 'United States',
    cities: 'New York · Houston · Atlanta',
    currency: 'USD',
    symbol: '$',
    symbolPosition: 'prefix',
    locale: 'en-US',
    ngnPerUnit: 1550,
    roundStep: 1,
    taxLabel: 'All taxes included',
    heroImage: '/images/regions/us-hero.jpg',
    heroAlt:
      'Sunlit New York skincare and spa studio with arched plaster walls and a travertine stone vanity',
    heroTitleLine1: 'Honest skin care,',
    heroTitleItalic: 'real results',
    suiteCaption: 'Dermaspace United States · Private treatment rooms',
    editorialHeadline: 'Honest skin care, real results.',
    editorialSubhead:
      'Facials, corrective peels, laser hair removal, and restorative spa care designed for every skin tone — with clear USD pricing and early waitlist access.',
    aboutNote:
      'We listen first, recommend second, and use proven skincare formulas that respect your skin barrier. Straightforward pricing and unhurried sessions.',
    waitlistTitle: 'Join the US Waitlist',
    waitlistDescription:
      'Leave your details to hear first when Dermaspace opens bookings in the United States, with early access to appointments.',
    cityPlaceholder: 'e.g. New York, Houston, Atlanta',
  },
  AE: {
    slug: 'AE',
    isoCode: 'AE',
    name: 'United Arab Emirates',
    shortLabel: 'UAE',
    cities: 'Dubai · Abu Dhabi',
    currency: 'AED',
    symbol: 'AED',
    symbolPosition: 'prefix-space',
    locale: 'en-AE',
    ngnPerUnit: 422,
    roundStep: 5,
    taxLabel: 'VAT inclusive',
    heroImage: '/images/regions/ae-hero.jpg',
    heroAlt:
      'Serene Dubai skincare and wellness room crafted in warm sand travertine with recessed arches',
    heroTitleLine1: 'Calm skin care,',
    heroTitleItalic: 'designed around you',
    suiteCaption: 'Dermaspace UAE · Private treatment rooms',
    editorialHeadline: 'Calm skin care, designed around you.',
    editorialSubhead:
      'Advanced facials, restorative body treatments, and gentle laser care crafted for warm climates and sensitive skin — presented clearly in UAE Dirhams.',
    aboutNote:
      'Unhurried private rooms, attentive therapists, and thoughtful treatments focused on hydration, clarity, and lasting skin health.',
    waitlistTitle: 'Join the UAE Waitlist',
    waitlistDescription:
      'Register your interest to hear first when Dermaspace opens bookings in Dubai and Abu Dhabi, including early appointment access.',
    cityPlaceholder: 'e.g. Dubai, Abu Dhabi, Sharjah',
  },
  GH: {
    slug: 'GH',
    isoCode: 'GH',
    name: 'Ghana',
    shortLabel: 'Ghana',
    cities: 'Accra · Kumasi',
    currency: 'GHS',
    symbol: '₵',
    symbolPosition: 'prefix',
    locale: 'en-GH',
    ngnPerUnit: 105,
    roundStep: 5,
    taxLabel: 'VAT inclusive',
    heroImage: '/images/regions/gh-hero.jpg',
    heroAlt:
      'Contemporary Accra skincare and spa room with sunlit timber screens and a handcrafted teakwood console',
    heroTitleLine1: 'Skin care and wellness,',
    heroTitleItalic: 'done properly',
    suiteCaption: 'Dermaspace Ghana · Private treatment rooms',
    editorialHeadline: 'Skin care and wellness, done properly.',
    editorialSubhead:
      'Targeted facials, chemical peels, laser hair removal, and restorative spa treatments crafted for West African skin — with transparent pricing in Ghana Cedis.',
    aboutNote:
      'Clean rooms, experienced therapists, and treatments formulated specifically for melanin-rich skin. Clear pricing from the start, with no gimmicks.',
    waitlistTitle: 'Join the Ghana Waitlist',
    waitlistDescription:
      'Be first to receive updates when Dermaspace opens in Accra, along with early booking access and skin consultation availability.',
    cityPlaceholder: 'e.g. Accra, East Legon, Kumasi',
  },
  ZA: {
    slug: 'ZA',
    isoCode: 'ZA',
    name: 'South Africa',
    shortLabel: 'South Africa',
    cities: 'Johannesburg · Cape Town',
    currency: 'ZAR',
    symbol: 'R',
    symbolPosition: 'prefix',
    locale: 'en-ZA',
    ngnPerUnit: 86,
    roundStep: 10,
    taxLabel: 'VAT inclusive',
    heroImage: '/images/regions/za-hero.jpg',
    heroAlt:
      'Tranquil Cape Town skincare and spa pavilion with natural coastal light and honed limestone walls',
    heroTitleLine1: 'Thoughtful skin care,',
    heroTitleItalic: 'visible results',
    suiteCaption: 'Dermaspace South Africa · Private treatment rooms',
    editorialHeadline: 'Thoughtful skin care, visible results.',
    editorialSubhead:
      'Targeted facials, corrective peels, laser treatments, and restorative body care for melanin-rich and sensitive skin — presented clearly in South African Rand.',
    aboutNote:
      'From routine skin maintenance to corrective treatments, every session starts with listening to your skin and building a plan that fits your life.',
    waitlistTitle: 'Join the South Africa Waitlist',
    waitlistDescription:
      'Join our list to hear first when Dermaspace launches in Johannesburg and Cape Town, with early access to appointments.',
    cityPlaceholder: 'e.g. Johannesburg, Sandton, Cape Town',
  },
}

export const INTERNATIONAL_REGION_LIST: readonly InternationalRegionConfig[] = [
  INTERNATIONAL_REGIONS.UK,
  INTERNATIONAL_REGIONS.US,
  INTERNATIONAL_REGIONS.AE,
  INTERNATIONAL_REGIONS.GH,
  INTERNATIONAL_REGIONS.ZA,
]

const SLUG_ALIAS_MAP: Record<string, InternationalRegionSlug> = {
  uk: 'UK',
  gb: 'UK',
  us: 'US',
  usa: 'US',
  ae: 'AE',
  uae: 'AE',
  gh: 'GH',
  za: 'ZA',
}

const ISO_TO_SLUG_MAP: Record<string, InternationalRegionSlug> = {
  GB: 'UK',
  UK: 'UK',
  US: 'US',
  AE: 'AE',
  GH: 'GH',
  ZA: 'ZA',
}

/**
 * Resolves any case variant or common country alias (`uk`, `gb`, `UK`, `uae`)
 * to its canonical `InternationalRegionConfig`, or `null` if unknown.
 */
export function getInternationalRegionBySlug(
  rawSlug: string | null | undefined,
): InternationalRegionConfig | null {
  if (!rawSlug || typeof rawSlug !== 'string') return null
  const normalized = rawSlug.trim().toLowerCase()
  const canonical = SLUG_ALIAS_MAP[normalized]
  if (!canonical) return null
  return INTERNATIONAL_REGIONS[canonical]
}

/**
 * Maps an ISO 3166-1 alpha-2 country code (`GB`, `US`, `AE`, `GH`, `ZA`)
 * to its international storefront config. Returns `null` for `NG` and any
 * non-storefront country so the primary Nigeria site stays unaffected.
 */
export function getInternationalRegionByIso(
  isoCode: string | null | undefined,
): InternationalRegionConfig | null {
  if (!isoCode || typeof isoCode !== 'string') return null
  const canonical = ISO_TO_SLUG_MAP[isoCode.trim().toUpperCase()]
  if (!canonical) return null
  return INTERNATIONAL_REGIONS[canonical]
}

/**
 * Converts a canonical NGN treatment price to an accurate, cleanly rounded
 * local currency amount for the target region.
 */
export function convertNgnToRegionPrice(
  priceInNgn: number,
  region: Pick<InternationalRegionConfig, 'ngnPerUnit' | 'roundStep'>,
): number {
  if (!Number.isFinite(priceInNgn) || priceInNgn <= 0) return 0
  const raw = priceInNgn / region.ngnPerUnit
  const step = Math.max(1, region.roundStep)
  const rounded = Math.round(raw / step) * step
  return Math.max(step, rounded)
}

/**
 * Formats a local numeric amount with the region's currency symbol and
 * standard thousands separators (no messy fractional pence/cents).
 */
export function formatRegionAmount(
  localAmount: number,
  region: Pick<InternationalRegionConfig, 'symbol' | 'symbolPosition' | 'locale'>,
): string {
  const safe = Number.isFinite(localAmount) ? Math.max(0, Math.round(localAmount)) : 0
  const formattedNum = safe.toLocaleString(region.locale)
  return region.symbolPosition === 'prefix-space'
    ? `${region.symbol} ${formattedNum}`
    : `${region.symbol}${formattedNum}`
}

/**
 * Converts and formats a canonical NGN treatment price directly into the
 * target region's currency display string.
 */
export function formatRegionPriceFromNgn(
  priceInNgn: number,
  region: InternationalRegionConfig,
): string {
  const converted = convertNgnToRegionPrice(priceInNgn, region)
  return formatRegionAmount(converted, region)
}

export function formatNgnReference(priceInNgn: number): string {
  const safe = Number.isFinite(priceInNgn) ? Math.max(0, Math.round(priceInNgn)) : 0
  return `₦${safe.toLocaleString('en-NG')}`
}

export interface RegionalTreatmentItem {
  id: string
  categorySlug: string
  categoryTitle: string
  name: string
  duration: string
  description: string
  priceNgn: number
  priceLocal: number
  priceLocalFormatted: string
  priceNgnFormatted: string
  popular: boolean
}

export interface RegionalMenuCategory {
  slug: string
  title: string
  tagline: string
  description: string
  treatments: RegionalTreatmentItem[]
}

/**
 * Curated categories featured in the international storefront menu,
 * computed deterministically from the real Dermaspace catalog.
 */
const FEATURED_CATEGORY_SLUGS = new Set([
  'facial-treatments',
  'dermaspace-peels',
  'body-treatments',
  'laser-hair-removal',
  'hollywood-peel',
  'nail-care',
  'experience-packages',
])

const INLINE_NGN_RE = /₦\s*([\d,]+(?:\.\d+)?)/g

/**
 * Replaces any inline NGN price references inside a catalog treatment
 * description (e.g. "Couple option available from ₦85,000") with the
 * accurately converted local currency amount for the target region.
 */
export function localizeTreatmentDescription(
  description: string,
  region: InternationalRegionConfig,
): string {
  if (!description || !description.includes('₦')) return description
  return description.replace(INLINE_NGN_RE, (_match, rawNum: string) => {
    const ngn = Number(rawNum.replace(/,/g, ''))
    if (!Number.isFinite(ngn) || ngn <= 0) return _match
    return formatRegionPriceFromNgn(ngn, region)
  })
}

export function buildRegionalMenu(
  region: InternationalRegionConfig,
  catalog: readonly CatalogCategory[] = SERVICES_CATALOG,
): RegionalMenuCategory[] {
  return catalog
    .filter((cat) => FEATURED_CATEGORY_SLUGS.has(cat.slug))
    .map((cat) => ({
      slug: cat.slug,
      title: cat.title,
      tagline: cat.tagline,
      description: localizeTreatmentDescription(cat.description, region),
      treatments: cat.treatments.map((t) => {
        const priceLocal = convertNgnToRegionPrice(t.priceFrom, region)
        return {
          id: `${cat.slug}:${t.id}`,
          categorySlug: cat.slug,
          categoryTitle: cat.title,
          name: t.name,
          duration: t.duration,
          description: localizeTreatmentDescription(t.description, region),
          priceNgn: t.priceFrom,
          priceLocal,
          priceLocalFormatted: formatRegionAmount(priceLocal, region),
          priceNgnFormatted: formatNgnReference(t.priceFrom),
          popular: Boolean(t.popular),
        }
      }),
    }))
}

export interface RegionalWaitlistInput {
  email: string
  name: string
  city: string
  region: string
  source: 'blocked' | 'regional-storefront'
}

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateWaitlistSubmission(
  raw: unknown,
): { ok: true; data: RegionalWaitlistInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Please provide your email address to join the waitlist.' }
  }
  const obj = raw as Record<string, unknown>
  const email = typeof obj.email === 'string' ? obj.email.trim().toLowerCase() : ''
  if (!email || email.length > 160 || !SIMPLE_EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }

  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 80) : ''
  const city = typeof obj.city === 'string' ? obj.city.trim().slice(0, 80) : ''
  const regionRaw = typeof obj.region === 'string' ? obj.region.trim().toUpperCase() : ''
  const region = /^[A-Z]{2,12}$/.test(regionRaw) ? regionRaw : 'GLOBAL'
  const source: 'blocked' | 'regional-storefront' =
    obj.source === 'blocked' ? 'blocked' : 'regional-storefront'

  return {
    ok: true,
    data: {
      email,
      name,
      city,
      region,
      source,
    },
  }
}
