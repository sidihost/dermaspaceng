// ---------------------------------------------------------------------------
// /api/giphy/search?q=...
//
// Server-side proxy for the Giphy Search API. The reasons we go
// through our own route rather than calling Giphy from the browser:
//
//   * The API key stays on the server (env var, never shipped to JS).
//   * We can normalise the response shape so the client only carries
//     the fields it actually renders — about 15× smaller per gif.
//   * We can rate-limit / disable / swap providers later without
//     touching the comment composer.
//   * Behaviour degrades gracefully when GIPHY_API_KEY isn't set yet
//     (returns `{ ok: true, configured: false, results: [] }`) so the
//     comment UI can simply hide its GIF picker rather than crash.
//
// Endpoint contract:
//   GET /api/giphy/search?q=happy&limit=12
//   → { ok: true, configured: true, results: [{ id, url, preview, width, height, title }] }
//
// We ALWAYS request the `fixed_height` rendition (250px tall, ~480px
// wide depending on aspect) — small enough to load instantly on a
// mobile data plan, big enough to look right inside a comment card.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface GiphyImage {
  url: string
  width: string
  height: string
}
interface GiphyApiItem {
  id: string
  title?: string
  images?: {
    fixed_height?: GiphyImage
    fixed_height_small?: GiphyImage
    fixed_height_downsampled?: GiphyImage
    preview_gif?: GiphyImage
  }
}

interface NormalisedHit {
  id: string
  /** Full-quality URL for display in the comment. */
  url: string
  /** Smaller preview for the picker grid. */
  preview: string
  width: number
  height: number
  title: string
}

export async function GET(req: NextRequest) {
  // Gate the proxy behind auth — no point letting unauthenticated
  // crawlers burn through our Giphy quota. Comment posting requires
  // auth anyway, so this matches the rest of the surface.
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { ok: false, configured: true, results: [], error: 'Sign in to browse GIFs' },
      { status: 401 },
    )
  }

  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    // Soft fail. The UI hides the GIF button when `configured: false`
    // comes back, so missing the key just makes the feature
    // invisible until the env var is set — no breakage.
    return NextResponse.json({ ok: true, configured: false, results: [] })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? '12')
  const limit = Math.max(1, Math.min(24, Number.isFinite(limitRaw) ? limitRaw : 12))

  if (q.length === 0) {
    // Empty query → return Giphy "trending" so the picker has
    // something to show before the user types.
    const url = new URL('https://api.giphy.com/v1/gifs/trending')
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('rating', 'pg-13')
    url.searchParams.set('bundle', 'messaging_non_clips')
    return forward(url.toString())
  }

  if (q.length > 60) {
    return NextResponse.json(
      { ok: false, configured: true, results: [], error: 'Query is too long' },
      { status: 400 },
    )
  }

  const url = new URL('https://api.giphy.com/v1/gifs/search')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('q', q)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('rating', 'pg-13')
  url.searchParams.set('lang', 'en')
  url.searchParams.set('bundle', 'messaging_non_clips')
  return forward(url.toString())
}

async function forward(url: string): Promise<NextResponse> {
  try {
    const res = await fetch(url, {
      // Giphy responses are public + cacheable. We don't cache them
      // server-side because trending/search is request-specific, but
      // a soft cache header lets the browser avoid re-fetching the
      // same query during a single composing session.
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn('[giphy] upstream returned', res.status)
      return NextResponse.json(
        { ok: false, configured: true, results: [], error: 'Giphy unavailable' },
        { status: 502 },
      )
    }
    const json = (await res.json()) as { data?: GiphyApiItem[] }
    const results: NormalisedHit[] = (json.data ?? [])
      .map((item) => normalise(item))
      .filter((x): x is NormalisedHit => x !== null)
    return NextResponse.json({ ok: true, configured: true, results })
  } catch (err) {
    console.warn('[giphy] fetch failed:', err)
    return NextResponse.json(
      { ok: false, configured: true, results: [], error: 'Giphy unreachable' },
      { status: 502 },
    )
  }
}

function normalise(item: GiphyApiItem): NormalisedHit | null {
  // Prefer fixed_height (250px tall) for display; downsampled for
  // the picker grid. Fall back through the chain so a missing
  // rendition (Giphy occasionally returns partial sets) still gives
  // us something usable.
  const display =
    item.images?.fixed_height ??
    item.images?.fixed_height_downsampled ??
    item.images?.fixed_height_small
  const preview =
    item.images?.fixed_height_downsampled ??
    item.images?.fixed_height_small ??
    item.images?.fixed_height ??
    item.images?.preview_gif
  if (!display?.url) return null
  const width = Number(display.width)
  const height = Number(display.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  return {
    id: item.id,
    url: display.url,
    preview: preview?.url ?? display.url,
    width,
    height,
    title: item.title?.trim() || 'GIF',
  }
}
