// ---------------------------------------------------------------------------
// Geo-blocking & Country Detection Policy for Dermaspace
//
// Pure, edge-safe helper used by Next.js middleware, `/api/geo`, and client
// geo-detection so visitors' real country is detected accurately across
// Vercel, Cloudflare, CloudFront, Google Cloud Run, reverse proxies, and
// VPN connections.
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

const INVALID_GEO_VALUES = new Set(['', 'XX', 'T1', 'ZZ', 'UNKNOWN', 'NULL', 'UNDEFINED'])

/**
 * Normalizes a raw ISO country header value into a 2-letter uppercase code,
 * mapping non-standard `UK` → `GB`, or returns `null` if missing / sentinel.
 */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.trim().toUpperCase()
  if (INVALID_GEO_VALUES.has(cleaned)) return null
  if (cleaned === 'UK') return 'GB'
  if (!/^[A-Z]{2}$/.test(cleaned)) return null
  return cleaned
}

/**
 * Resolves the visitor's country code synchronously from edge/CDN headers.
 * Checks Next.js `request.geo?.country`, Vercel (`x-vercel-ip-country`),
 * Cloudflare (`cf-ipcountry`), AWS CloudFront (`cloudfront-viewer-country`),
 * Google Cloud (`x-appengine-country`, `x-client-geo-country`), Fastly,
 * and generic reverse-proxy headers.
 */
export function resolveRequestCountry(
  headers: Pick<Headers, 'get'>,
  geoCountry?: string | null,
): string | null {
  const candidates = [
    geoCountry,
    headers.get('x-vercel-ip-country'),
    headers.get('cf-ipcountry'),
    headers.get('cloudfront-viewer-country'),
    headers.get('x-client-geo-country'),
    headers.get('x-appengine-country'),
    headers.get('fastly-geo-country'),
    headers.get('x-geo-country'),
    headers.get('x-country-code'),
  ]
  for (const candidate of candidates) {
    const code = normalizeCountryCode(candidate)
    if (code) return code
  }
  return null
}

/**
 * Returns true if an IP string is a publicly routable IPv4 or IPv6 address
 * (rejecting loopback, RFC1918, link-local, carrier-grade NAT, and ULA).
 */
export function isPublicClientIp(rawIp: string | null | undefined): boolean {
  if (!rawIp || typeof rawIp !== 'string') return false
  const cleaned = rawIp.trim().replace(/^::ffff:/i, '')
  if (!cleaned) return false
  const lower = cleaned.toLowerCase()
  if (
    lower === 'unknown' ||
    lower === 'localhost' ||
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('127.') ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('169.254.') ||
    lower.startsWith('0.') ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  ) {
    return false
  }
  const m172 = /^172\.(\d+)\./.exec(cleaned)
  if (m172) {
    const second = Number(m172[1])
    if (second >= 16 && second <= 31) return false
  }
  const m100 = /^100\.(\d+)\./.exec(cleaned)
  if (m100) {
    const second = Number(m100[1])
    if (second >= 64 && second <= 127) return false
  }
  // Must look like an IPv4 or IPv6 literal
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(cleaned) || cleaned.includes(':')
}

/**
 * Extracts the visitor's first public IP address from reverse-proxy / CDN headers.
 */
export function extractPublicClientIp(headers: Pick<Headers, 'get'>): string | null {
  const singleHeaders = [
    headers.get('cf-connecting-ip'),
    headers.get('true-client-ip'),
    headers.get('fastly-client-ip'),
    headers.get('x-real-ip'),
  ]
  for (const raw of singleHeaders) {
    if (raw && isPublicClientIp(raw)) {
      return raw.trim().replace(/^::ffff:/i, '')
    }
  }

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim())
    for (const part of parts) {
      if (isPublicClientIp(part)) {
        return part.replace(/^::ffff:/i, '')
      }
    }
  }

  return null
}

// Short in-memory per-IP cache so repeat requests from the same IP incur
// zero latency while switching VPNs (new IP) triggers an immediate lookup.
interface IpCountryCacheEntry {
  country: string | null
  expiresAt: number
}
const ipCountryCache = new Map<string, IpCountryCacheEntry>()
const IP_CACHE_TTL_MS = 10 * 60 * 1000
const IP_CACHE_MAX_SIZE = 2000

/**
 * Resolves an ISO alpha-2 country code from a public client IP address using
 * fast HTTPS geo-IP providers with short timeouts. Edge-runtime safe.
 */
export async function lookupCountryByIp(ip: string): Promise<string | null> {
  if (!isPublicClientIp(ip)) return null
  const cleanIp = ip.trim().replace(/^::ffff:/i, '')

  const cached = ipCountryCache.get(cleanIp)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.country
  }

  const recordCache = (country: string | null) => {
    if (ipCountryCache.size >= IP_CACHE_MAX_SIZE) {
      const oldestKey = ipCountryCache.keys().next().value
      if (oldestKey) ipCountryCache.delete(oldestKey)
    }
    ipCountryCache.set(cleanIp, {
      country,
      expiresAt: Date.now() + (country ? IP_CACHE_TTL_MS : 60_000),
    })
  }

  // 1) api.country.is (Cloudflare Workers edge — ~100ms, HTTPS, high rate limit)
  try {
    const res = await fetch(`https://api.country.is/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { country?: string }
      const code = normalizeCountryCode(data.country)
      if (code) {
        recordCache(code)
        return code
      }
    }
  } catch {
    // fall through to next provider
  }

  // 2) get.geojs.io (HTTPS, fast JSON country endpoint)
  try {
    const res = await fetch(
      `https://get.geojs.io/v1/ip/country/${encodeURIComponent(cleanIp)}.json`,
      {
        signal: AbortSignal.timeout(1500),
        cache: 'no-store',
      },
    )
    if (res.ok) {
      const data = (await res.json()) as { country?: string }
      const code = normalizeCountryCode(data.country)
      if (code) {
        recordCache(code)
        return code
      }
    }
  } catch {
    // fall through to next provider
  }

  // 3) ipwho.is fallback
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { success?: boolean; country_code?: string }
      const code = data.success !== false ? normalizeCountryCode(data.country_code) : null
      if (code) {
        recordCache(code)
        return code
      }
    }
  } catch {
    // give up
  }

  recordCache(null)
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
 * Server-to-server & geo-detection API paths that must never be geo-blocked.
 */
const GEO_EXEMPT_API_PREFIXES = [
  '/api/webhooks/',
  '/api/cron/',
  '/api/internal/',
  '/api/inbound/',
  '/api/regional-waitlist',
  '/api/geo',
] as const

export function isGeoBlockExemptApiPath(pathname: string): boolean {
  return GEO_EXEMPT_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}`),
  )
}
