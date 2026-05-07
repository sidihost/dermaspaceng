// ---------------------------------------------------------------------------
// Geolocation helper
// ---------------------------------------------------------------------------
// Detects visitor location from request headers (Vercel) with fallback to
// IP geolocation API for city-level detail. Used by live chat to show
// staff where the customer is located.
// ---------------------------------------------------------------------------

interface GeoLocation {
  country: string | null
  countryCode: string | null
  city: string | null
  region: string | null
}

/**
 * Extract geolocation from Vercel headers (edge network provides these)
 * Falls back to IP-based geolocation API for city detail.
 */
export async function getGeoFromRequest(req: Request): Promise<GeoLocation> {
  const headers = req.headers
  
  // Vercel provides these headers on edge/serverless
  const countryCode = headers.get('x-vercel-ip-country') || null
  const city = headers.get('x-vercel-ip-city') || null
  const region = headers.get('x-vercel-ip-country-region') || null
  
  // Map country codes to country names
  const countryNames: Record<string, string> = {
    NG: 'Nigeria',
    US: 'United States',
    GB: 'United Kingdom',
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
  }
  
  const country = countryCode ? (countryNames[countryCode] || countryCode) : null
  
  // If we have Vercel headers, use them
  if (countryCode) {
    return {
      country,
      countryCode,
      city: city ? decodeURIComponent(city) : null,
      region: region ? decodeURIComponent(region) : null,
    }
  }
  
  // Fallback: try IP geolocation API (ip-api.com is free for non-commercial use)
  // Only use if Vercel headers aren't available (local dev, etc.)
  const forwardedFor = headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim()
  
  if (ip && !ip.startsWith('127.') && !ip.startsWith('192.168.') && ip !== '::1') {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`, {
        signal: AbortSignal.timeout(2000), // 2s timeout
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'success') {
          return {
            country: data.country || null,
            countryCode: data.countryCode || null,
            city: data.city || null,
            region: data.regionName || null,
          }
        }
      }
    } catch {
      // Timeout or network error - fall through to default
    }
  }
  
  return {
    country: null,
    countryCode: null,
    city: null,
    region: null,
  }
}

/**
 * Format location for display (e.g., "Lagos, Nigeria" or just "Nigeria")
 */
export function formatLocation(geo: GeoLocation): string | null {
  if (!geo.country && !geo.city) return null
  
  const parts: string[] = []
  if (geo.city) parts.push(geo.city)
  if (geo.region && geo.region !== geo.city) parts.push(geo.region)
  if (geo.country) parts.push(geo.country)
  
  // Remove duplicates and join
  const unique = [...new Set(parts)]
  return unique.length > 0 ? unique.join(', ') : null
}
