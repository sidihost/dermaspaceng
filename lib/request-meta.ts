import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// lib/request-meta
//
// Small, dependency-free helpers for extracting respondent context from an
// incoming request: the client IP, an approximate location from Vercel's
// edge geo headers, and a lightweight user-agent parse (browser / OS /
// device class). Used by the public survey endpoint so the admin can see
// who/how a response was submitted without pulling in a heavy UA library.
// ---------------------------------------------------------------------------

export interface ParsedUserAgent {
  browser: string | null
  os: string | null
  device: string | null
}

export interface RequestGeo {
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
}

/** Best-effort client IP from the standard proxy headers. */
export function getClientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') || null
}

/**
 * Approximate location from Vercel's edge geo headers. These are present
 * on every Vercel deployment with no extra config; locally they're absent
 * so every field comes back null (which the UI renders as "Unknown").
 */
export function getRequestGeo(req: NextRequest): RequestGeo {
  const dec = (v: string | null) => {
    if (!v) return null
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }
  return {
    ip: getClientIp(req),
    city: dec(req.headers.get('x-vercel-ip-city')),
    region: dec(req.headers.get('x-vercel-ip-country-region')),
    country: req.headers.get('x-vercel-ip-country'),
  }
}

/**
 * Lightweight user-agent parse. Intentionally covers the common cases
 * (the browsers/OSes real spa customers use) rather than every exotic
 * bot string — good enough to render "Chrome on Android" in the admin.
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { browser: null, os: null, device: null }

  // --- OS ---------------------------------------------------------------
  let os: string | null = null
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const m = ua.match(/OS (\d+)[_.](\d+)/i)
    os = m ? `iOS ${m[1]}.${m[2]}` : 'iOS'
  } else if (/android/i.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/i)
    os = m ? `Android ${m[1]}` : 'Android'
  } else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/cros/i.test(ua)) os = 'ChromeOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  // --- Browser (order matters: Edge/Opera spoof Chrome, etc.) -----------
  let browser: string | null = null
  const ver = (re: RegExp) => {
    const m = ua.match(re)
    return m ? m[1] : null
  }
  if (/edg\//i.test(ua)) browser = `Edge ${ver(/edg\/(\d+)/i) ?? ''}`.trim()
  else if (/opr\/|opera/i.test(ua)) browser = `Opera ${ver(/opr\/(\d+)/i) ?? ''}`.trim()
  else if (/samsungbrowser/i.test(ua)) browser = `Samsung Internet ${ver(/samsungbrowser\/(\d+)/i) ?? ''}`.trim()
  else if (/firefox\//i.test(ua)) browser = `Firefox ${ver(/firefox\/(\d+)/i) ?? ''}`.trim()
  else if (/chrome\//i.test(ua)) browser = `Chrome ${ver(/chrome\/(\d+)/i) ?? ''}`.trim()
  else if (/version\/.*safari/i.test(ua)) browser = `Safari ${ver(/version\/(\d+)/i) ?? ''}`.trim()
  else if (/safari/i.test(ua)) browser = 'Safari'

  // --- Device class -----------------------------------------------------
  let device: string | null = null
  if (/ipad|tablet/i.test(ua)) device = 'Tablet'
  else if (/iphone|android.*mobile|mobile/i.test(ua)) device = 'Mobile'
  else if (os) device = 'Desktop'

  return { browser: browser || null, os, device }
}
