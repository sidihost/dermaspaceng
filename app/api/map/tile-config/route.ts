import { NextResponse } from 'next/server'
import {
  buildCartoProbeCandidates,
  getFallbackTileLayerConfig,
  getMapTileLayerConfig,
  isCartoWatermarkHeaders,
  normalizeCartoApiKey,
  type MapTileLayerConfig,
} from '@/lib/map-tiles'

export const dynamic = 'force-dynamic'

interface CachedTileResolution {
  keyHash: string
  expiresAt: number
  primary: MapTileLayerConfig
  backup: MapTileLayerConfig
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cachedResolution: CachedTileResolution | null = null

/**
 * Runtime tile provider resolver.
 *
 * 1. Reads CARTO API keys at runtime (`NEXT_PUBLIC_CARTO_API_KEY` or `CARTO_API_KEY`)
 *    so keys added after build time still take effect.
 * 2. Probes a single CARTO Voyager tile to verify that CARTO accepts the key
 *    instead of serving an HTTP 200 "API KEY REQUIRED" watermark (`etag: wm-*`).
 * 3. Falls back cleanly to OpenStreetMap + Esri World Street Map whenever no
 *    key is configured or CARTO returns a watermark/error tile.
 */
export async function GET() {
  const cartoKey = normalizeCartoApiKey(
    process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY,
  )
  const backup = getFallbackTileLayerConfig('esri')

  if (!cartoKey) {
    return NextResponse.json(
      {
        primary: getFallbackTileLayerConfig('osm'),
        backup,
      },
      { headers: { 'Cache-Control': 'private, max-age=120' } },
    )
  }

  const now = Date.now()
  if (
    cachedResolution &&
    cachedResolution.keyHash === cartoKey &&
    cachedResolution.expiresAt > now
  ) {
    return NextResponse.json(
      {
        primary: cachedResolution.primary,
        backup: cachedResolution.backup,
      },
      { headers: { 'Cache-Control': 'private, max-age=120' } },
    )
  }

  let verifiedPrimary: MapTileLayerConfig | null = null

  for (const candidate of buildCartoProbeCandidates(cartoKey)) {
    try {
      const res = await fetch(candidate.probeUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
        cache: 'no-store',
      })
      if (!isCartoWatermarkHeaders(res.status, res.headers)) {
        verifiedPrimary = getMapTileLayerConfig(cartoKey, candidate.paramName)
        break
      }
    } catch {
      // Probe timed out or failed — try next candidate or fall back cleanly.
    }
  }

  const primary = verifiedPrimary ?? getFallbackTileLayerConfig('osm')
  cachedResolution = {
    keyHash: cartoKey,
    expiresAt: now + CACHE_TTL_MS,
    primary,
    backup,
  }

  return NextResponse.json(
    { primary, backup },
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
