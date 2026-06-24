// ---------------------------------------------------------------------------
// Device / submission metadata helper
// ---------------------------------------------------------------------------
// Parses the User-Agent string and request headers into a compact, human
// readable shape so the admin UI can answer: "who submitted this, on what
// device, from which browser/OS, and from where?". Pure string parsing —
// no external deps. Combined with geolocation for city-level detail.
// ---------------------------------------------------------------------------

import { getGeoFromRequest } from '@/lib/geolocation'

export interface DeviceInfo {
  userAgent: string | null
  browser: string | null
  os: string | null
  /** 'mobile' | 'tablet' | 'desktop' | 'bot' */
  deviceType: string | null
  ipAddress: string | null
  geoCountry: string | null
  geoCity: string | null
  geoRegion: string | null
}

/** Extract the best-guess client IP from proxy headers. */
function extractIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return headers.get('x-real-ip') || null
}

/** Best-effort browser name from the UA string. Order matters — Edge and
 *  Chrome both contain "Chrome", Opera contains "Chrome" too, etc. */
function parseBrowser(ua: string): string | null {
  if (!ua) return null
  if (/Edg(?:e|A|iOS)?\//i.test(ua)) return 'Microsoft Edge'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet'
  if (/Firefox\/|FxiOS/i.test(ua)) return 'Firefox'
  // CriOS = Chrome on iOS
  if (/CriOS\/|Chrome\//i.test(ua)) return 'Chrome'
  // Safari must come after Chrome since Chrome UA also contains "Safari"
  if (/Safari\//i.test(ua)) return 'Safari'
  if (/MSIE|Trident/i.test(ua)) return 'Internet Explorer'
  return 'Unknown browser'
}

/** Best-effort OS name from the UA string. */
function parseOS(ua: string): string | null {
  if (!ua) return null
  if (/Windows NT 10/i.test(ua)) return 'Windows 10/11'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/CrOS/i.test(ua)) return 'ChromeOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Unknown OS'
}

/** Coarse device class from the UA string. */
function parseDeviceType(ua: string): string | null {
  if (!ua) return null
  if (/bot|crawler|spider|crawling/i.test(ua)) return 'bot'
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'tablet'
  }
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Build a full DeviceInfo from an incoming Request. Combines UA parsing
 * with IP-based geolocation. Never throws — every field is nullable.
 */
export async function getDeviceInfo(req: Request): Promise<DeviceInfo> {
  const ua = req.headers.get('user-agent') || ''
  let geo = { country: null, city: null, region: null } as Awaited<
    ReturnType<typeof getGeoFromRequest>
  >
  try {
    geo = await getGeoFromRequest(req)
  } catch {
    /* geo is best-effort */
  }

  return {
    userAgent: ua || null,
    browser: parseBrowser(ua),
    os: parseOS(ua),
    deviceType: parseDeviceType(ua),
    ipAddress: extractIp(req.headers),
    geoCountry: geo.country,
    geoCity: geo.city,
    geoRegion: geo.region,
  }
}

/** Human-readable one-liner, e.g. "Chrome on Android (mobile)". */
export function formatDevice(info: {
  browser: string | null
  os: string | null
  deviceType: string | null
}): string | null {
  const parts: string[] = []
  if (info.browser) parts.push(info.browser)
  if (info.os) parts.push(`on ${info.os}`)
  let line = parts.join(' ')
  if (info.deviceType) line += `${line ? ' ' : ''}(${info.deviceType})`
  return line || null
}
