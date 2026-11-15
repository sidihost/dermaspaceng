/**
 * Pure URL & response eligibility helpers for Service Worker offline caching.
 * Mirrors the exact logic in `public/sw.js` so cache matching and safety
 * guards can be regression-tested directly in `node:test`.
 */

export function isRscRequestInfo(
  rscHeader: string | null | undefined,
  urlString: string,
): boolean {
  if (rscHeader === '1') return true
  try {
    const u = new URL(urlString, 'https://dermaspaceng.com')
    return u.searchParams.has('_rsc')
  } catch {
    return false
  }
}

/**
 * Strips Next.js ephemeral `_rsc` cache-buster tokens from a URL while
 * preserving meaningful search parameters (e.g. `/blog?category=skincare`).
 */
export function normalizeRscCacheUrl(
  urlString: string,
  origin = 'https://dermaspaceng.com',
): string {
  const u = new URL(urlString, origin)
  u.searchParams.delete('_rsc')
  u.hash = ''
  return u.toString()
}

export function isCacheablePageResponse(input: {
  ok: boolean
  status: number
  redirected: boolean
  contentType: string | null | undefined
  expectedKind: 'html' | 'rsc'
}): boolean {
  if (!input.ok || input.status !== 200 || input.redirected) return false
  const ct = (input.contentType ?? '').toLowerCase()
  if (input.expectedKind === 'html') {
    return ct.includes('text/html')
  }
  // Next.js App Router serves RSC payloads as `text/x-component`.
  return ct.includes('text/x-component')
}

/**
 * Extracts unique same-origin `/_next/static/...` `.js` and `.css` asset URLs
 * referenced in an HTML document or RSC payload so offline navigation has its
 * script and stylesheet bundles ready in `STATIC_CACHE`.
 */
export function extractStaticAssetUrls(
  bodyText: string,
  origin = 'https://dermaspaceng.com',
): string[] {
  if (!bodyText) return []
  const matches = bodyText.match(
    /\/_next\/static\/[^\s"'<>\\)]+\.(?:js|css)(?:\?[^\s"'<>\\)]*)?/g,
  )
  if (!matches) return []
  const unique = new Set<string>()
  for (const rawPath of matches) {
    try {
      const resolved = new URL(rawPath, origin)
      if (resolved.origin === new URL(origin).origin) {
        unique.add(resolved.toString())
      }
    } catch {
      /* ignore malformed path */
    }
  }
  return Array.from(unique)
}
