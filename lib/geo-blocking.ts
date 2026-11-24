// ---------------------------------------------------------------------------
// Geo-blocking policy for Dermaspace
//
// Pure, zero-dependency helper used by Next.js edge middleware so visitors
// from high-spam / non-supported regions are redirected to `/blocked`
// ("Not Available in Your Region") and public API endpoints reject automated
// form-spam submissions early.
// ---------------------------------------------------------------------------

/**
 * ISO 3166-1 alpha-2 country codes that Dermaspace actively serves or where
 * legitimate diaspora clients commonly book from. Maintained as a guard list
 * so unit tests guarantee none of these markets are ever accidentally blocked.
 */
export const SUPPORTED_COUNTRY_CODES = [
  'NG', // Nigeria (primary market — Victoria Island & Ikoyi, Lagos)
  'GB', // United Kingdom
  'US', // United States
  'AE', // United Arab Emirates
  'GH', // Ghana
  'ZA', // South Africa
  'CA', // Canada
  'KE', // Kenya
  'IE', // Ireland
  'FR', // France
  'DE', // Germany
  'NL', // Netherlands
  'AU', // Australia
] as const

/**
 * ISO 3166-1 alpha-2 country codes blocked from accessing Dermaspace due to
 * high volumes of automated form/SEO spam and non-availability of services.
 *
 * Includes Bangladesh (BD), India (IN), Pakistan (PK), and other common
 * high-spam / botnet origin countries outside Dermaspace's service regions.
 */
export const BLOCKED_COUNTRY_CODES = [
  // Explicitly requested high-spam regions
  'BD', // Bangladesh
  'IN', // India
  'PK', // Pakistan

  // Additional high-volume web-form spam, scraping & botnet origin countries
  'NP', // Nepal
  'LK', // Sri Lanka
  'VN', // Vietnam
  'ID', // Indonesia
  'PH', // Philippines
  'KH', // Cambodia
  'MM', // Myanmar
  'RU', // Russia
  'BY', // Belarus
  'CN', // China
  'KP', // North Korea
  'IR', // Iran
  'SY', // Syria
  'UA', // Ukraine
  'RO', // Romania
  'BG', // Bulgaria
  'MD', // Moldova
  'KZ', // Kazakhstan
  'UZ', // Uzbekistan
] as const

export type BlockedCountryCode = (typeof BLOCKED_COUNTRY_CODES)[number]

const BLOCKED_SET: ReadonlySet<string> = new Set(BLOCKED_COUNTRY_CODES)

const INVALID_GEO_VALUES = new Set(['', 'XX', 'T1', 'UNKNOWN', 'NULL', 'UNDEFINED'])

/**
 * Normalizes a raw ISO country header value into a 2-letter uppercase code,
 * or returns `null` if the header is missing or a sentinel like `XX`/`T1`.
 */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.trim().toUpperCase()
  if (INVALID_GEO_VALUES.has(cleaned)) return null
  if (!/^[A-Z]{2}$/.test(cleaned)) return null
  return cleaned
}

/**
 * Resolves the visitor's country code from edge/CDN headers.
 * Checks Next.js `request.geo?.country`, Vercel (`x-vercel-ip-country`),
 * Cloudflare (`cf-ipcountry`), and generic proxy headers (`x-country-code`,
 * `x-appengine-country`).
 */
export function resolveRequestCountry(
  headers: Pick<Headers, 'get'>,
  geoCountry?: string | null,
): string | null {
  const candidates = [
    geoCountry,
    headers.get('x-vercel-ip-country'),
    headers.get('cf-ipcountry'),
    headers.get('x-country-code'),
    headers.get('x-appengine-country'),
  ]
  for (const candidate of candidates) {
    const code = normalizeCountryCode(candidate)
    if (code) return code
  }
  return null
}

/**
 * Returns true if the given ISO alpha-2 country code is geo-blocked.
 */
export function isCountryBlocked(countryCode: string | null | undefined): boolean {
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized) return false
  return BLOCKED_SET.has(normalized)
}

/**
 * Server-to-server API paths (payment webhooks, scheduled cron jobs,
 * internal dispatchers, inbound email hooks) must never be geo-blocked
 * regardless of where the upstream provider's infrastructure routes from.
 */
const GEO_EXEMPT_API_PREFIXES = [
  '/api/webhooks/',
  '/api/cron/',
  '/api/internal/',
  '/api/inbound/',
  '/api/regional-waitlist',
] as const

export function isGeoBlockExemptApiPath(pathname: string): boolean {
  return GEO_EXEMPT_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}`),
  )
}
