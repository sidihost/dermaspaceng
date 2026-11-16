export const IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const PAGE_WARM_FRESH_MS = 10 * 60 * 1000

/**
 * Pure decision helper mirrored by `public/sw.js` image caching.
 * Returns `true` when an image entry in Cache Storage should be returned
 * directly without spawning a redundant background network fetch.
 */
export function shouldServeCachedImageDirectly(
  hasCached: boolean,
  cachedAtMs: number | null,
  nowMs: number,
  ttlMs = IMAGE_CACHE_TTL_MS,
): boolean {
  if (!hasCached) return false
  if (cachedAtMs === null || !Number.isFinite(cachedAtMs)) {
    // Opaque or unstamped cached responses are still served cache-first
    // to prevent duplicate network requests on every page navigation.
    return true
  }
  return nowMs - cachedAtMs >= 0 && nowMs - cachedAtMs < ttlMs
}

/**
 * Determines whether a pre-warmed page cache entry is still fresh enough
 * to skip issuing another `cache: 'reload'` SSR request.
 */
export function shouldSkipPageWarm(
  cachedAtMs: number | null,
  nowMs: number,
  freshWindowMs = PAGE_WARM_FRESH_MS,
): boolean {
  if (cachedAtMs === null || !Number.isFinite(cachedAtMs)) return false
  const age = nowMs - cachedAtMs
  return age >= 0 && age < freshWindowMs
}

/**
 * Filters a list of URLs to valid same-origin page paths (excluding API and
 * Next internal build paths) and deduplicates while preserving order.
 */
export function filterWarmablePageUrls(urls: unknown[], origin: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of urls) {
    if (typeof raw !== 'string' || !raw.trim()) continue
    try {
      const parsed = new URL(raw, origin)
      if (parsed.origin !== origin) continue
      if (parsed.pathname.startsWith('/api/') || parsed.pathname.startsWith('/_next/')) {
        continue
      }
      parsed.searchParams.delete('_rsc')
      const normalized = parsed.toString()
      if (!seen.has(normalized)) {
        seen.add(normalized)
        out.push(normalized)
      }
    } catch {
      // Ignore malformed URLs
    }
  }
  return out
}
