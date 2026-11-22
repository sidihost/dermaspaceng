// ---------------------------------------------------------------------------
// Geolocation helper
// ---------------------------------------------------------------------------
// Detects visitor / login location accurately from CDN/reverse-proxy headers
// (Vercel, Cloudflare) with resilient multi-provider IP geolocation lookup
// (ip-api.com -> ipwho.is -> ipapi.co) so new-device emails and live chat
// never regress to "Unknown, Unknown".
// ---------------------------------------------------------------------------

export interface GeoLocation {
  country: string | null
  countryCode: string | null
  city: string | null
  region: string | null
}

const COUNTRY_NAMES: Record<string, string> = {
  NG: 'Nigeria',
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  CA: 'Canada',
  GH: 'Ghana',
  ZA: 'South Africa',
  KE: 'Kenya',
  EG: 'Egypt',
  AE: 'United Arab Emirates',
  IN: 'India',
  DE: 'Germany',
  FR: 'France',
  AU: 'Australia',
  NL: 'Netherlands',
  IE: 'Ireland',
  IT: 'Italy',
  ES: 'Spain',
  BR: 'Brazil',
  SG: 'Singapore',
}

export function isPublicIp(rawIp: string | null | undefined): boolean {
  if (!rawIp) return false
  const ip = rawIp.trim()
  if (!ip) return false
  const lower = ip.toLowerCase()
  if (
    lower === 'unknown' ||
    lower === '::1' ||
    lower === '::ffff:127.0.0.1' ||
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
  const m172 = /^172\.(\d+)\./.exec(ip)
  if (m172) {
    const second = Number(m172[1])
    if (second >= 16 && second <= 31) return false
  }
  return true
}

/**
 * Extracts the best client IP address from common proxy / CDN headers.
 */
export function extractClientIpFromHeaders(headers: Headers): string | null {
  const cfIp = headers.get('cf-connecting-ip')?.trim()
  if (cfIp && cfIp.toLowerCase() !== 'unknown') return cfIp

  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp && realIp.toLowerCase() !== 'unknown') return realIp

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p.toLowerCase() !== 'unknown')
    const publicHit = parts.find((p) => isPublicIp(p))
    if (publicHit) return publicHit
    if (parts[0]) return parts[0]
  }

  return null
}

function safeDecodeGeoHeader(val: string | null): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null
  try {
    return decodeURIComponent(trimmed).trim() || null
  } catch {
    return trimmed
  }
}

/**
 * Reads edge-provided location headers (Vercel & Cloudflare) synchronously.
 */
export function extractBestGeoFromHeaders(headers: Headers): GeoLocation {
  const countryCodeRaw =
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry') ||
    null
  const countryCode =
    countryCodeRaw && countryCodeRaw.toUpperCase() !== 'XX' && countryCodeRaw.toUpperCase() !== 'T1'
      ? countryCodeRaw.trim().toUpperCase()
      : null

  const city =
    safeDecodeGeoHeader(headers.get('x-vercel-ip-city')) ||
    safeDecodeGeoHeader(headers.get('cf-ipcity')) ||
    null

  const region =
    safeDecodeGeoHeader(headers.get('x-vercel-ip-country-region')) ||
    safeDecodeGeoHeader(headers.get('cf-region')) ||
    safeDecodeGeoHeader(headers.get('x-region')) ||
    null

  const country = countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : null

  return { country, countryCode, city, region }
}

/**
 * Queries multiple free IP geolocation APIs sequentially (with short timeouts)
 * until one succeeds with non-empty data.
 */
export async function lookupIpGeo(ip: string): Promise<GeoLocation | null> {
  if (!isPublicIp(ip)) return null

  const cleanIp = ip.replace(/^::ffff:/i, '').trim()

  // 1) ip-api.com (no key, 45 req/min, very reliable for African / NG IPs)
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,country,countryCode,regionName,city`,
      { signal: AbortSignal.timeout(2200) },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        status?: string
        country?: string
        countryCode?: string
        regionName?: string
        city?: string
      }
      if (data.status === 'success' && (data.country || data.city)) {
        return {
          country: data.country || (data.countryCode ? COUNTRY_NAMES[data.countryCode] || data.countryCode : null),
          countryCode: data.countryCode || null,
          city: data.city || null,
          region: data.regionName || null,
        }
      }
    }
  } catch {
    // fall through to next provider
  }

  // 2) ipwho.is (HTTPS, zero rate-limit issues at normal traffic)
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(2200),
    })
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean
        country?: string
        country_code?: string
        region?: string
        city?: string
      }
      if (data.success !== false && (data.country || data.city)) {
        return {
          country:
            data.country ||
            (data.country_code ? COUNTRY_NAMES[data.country_code] || data.country_code : null),
          countryCode: data.country_code || null,
          city: data.city || null,
          region: data.region || null,
        }
      }
    }
  } catch {
    // fall through
  }

  // 3) ipapi.co fallback
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(cleanIp)}/json/`, {
      signal: AbortSignal.timeout(2200),
    })
    if (res.ok) {
      const data = (await res.json()) as {
        error?: boolean
        city?: string
        region?: string
        country_name?: string
        country_code?: string
      }
      if (!data.error && (data.country_name || data.city)) {
        return {
          country:
            data.country_name ||
            (data.country_code ? COUNTRY_NAMES[data.country_code] || data.country_code : null),
          countryCode: data.country_code || null,
          city: data.city || null,
          region: data.region || null,
        }
      }
    }
  } catch {
    // give up
  }

  return null
}

/**
 * Extract geolocation from edge headers with fallback to multi-provider IP lookup.
 */
export async function getGeoFromHeaders(
  headers: Headers,
  fallbackIp?: string | null,
): Promise<GeoLocation> {
  const headerGeo = extractBestGeoFromHeaders(headers)
  // If edge headers already gave us both country and city, return immediately.
  if (headerGeo.country && headerGeo.city) {
    return headerGeo
  }

  const ip = extractClientIpFromHeaders(headers) ?? fallbackIp ?? null
  if (ip) {
    const ipGeo = await lookupIpGeo(ip)
    if (ipGeo) {
      return {
        country: headerGeo.country || ipGeo.country,
        countryCode: headerGeo.countryCode || ipGeo.countryCode,
        city: headerGeo.city || ipGeo.city,
        region: headerGeo.region || ipGeo.region,
      }
    }
  }

  return headerGeo
}

export async function getGeoFromRequest(req: Request): Promise<GeoLocation> {
  return getGeoFromHeaders(req.headers)
}

/**
 * Format location for display (e.g., "Ibadan, Oyo, Nigeria" or "Nigeria")
 */
export function formatLocation(geo: GeoLocation): string | null {
  if (!geo.country && !geo.city && !geo.region) return null

  const parts: string[] = []
  if (geo.city && geo.city.toLowerCase() !== 'unknown') parts.push(geo.city)
  if (
    geo.region &&
    geo.region.toLowerCase() !== 'unknown' &&
    geo.region.toLowerCase() !== geo.city?.toLowerCase()
  ) {
    parts.push(geo.region)
  }
  if (geo.country && geo.country.toLowerCase() !== 'unknown') {
    parts.push(geo.country)
  }

  const unique = [...new Set(parts)]
  return unique.length > 0 ? unique.join(', ') : null
}

/**
 * Resolves a human-readable login location string for security alerts and session
 * auditing, preferring CDN headers and falling back to multi-provider IP lookup.
 */
export async function resolveLoginLocation(
  headers: Headers,
  fallbackIp?: string | null,
): Promise<string> {
  const geo = await getGeoFromHeaders(headers, fallbackIp)
  const formatted = formatLocation(geo)
  if (formatted) return formatted
  const ip = extractClientIpFromHeaders(headers) ?? fallbackIp ?? null
  if (ip && !isPublicIp(ip)) return 'Local network'
  return 'Unknown location'
}
