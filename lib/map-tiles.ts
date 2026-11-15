export type MapTileProvider = 'carto' | 'osm' | 'esri'

export interface MapTileLayerConfig {
  provider: MapTileProvider
  url: string
  attribution: string
  subdomains?: string
  maxZoom: number
  usingCarto: boolean
}

const DEFAULT_OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const DEFAULT_OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const ESRI_WORLD_STREET_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, OpenStreetMap contributors'
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'

/** Normalize an env-supplied CARTO API key, stripping quotes and placeholders. */
export function normalizeCartoApiKey(cartoApiKey?: string | null): string {
  const raw = typeof cartoApiKey === 'string' ? cartoApiKey.trim() : ''
  const unquoted = raw.replace(/^['"]+|['"]+$/g, '').trim()
  if (!unquoted) return ''
  const lower = unquoted.toLowerCase()
  if (
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'your_carto_api_key' ||
    lower === 'changeme'
  ) {
    return ''
  }
  return unquoted
}

/**
 * CARTO returns HTTP 200 with a 2KB "API KEY REQUIRED" PNG tile whose ETag
 * begins with `wm-` (watermark) whenever a raster request lacks a valid
 * legacy `basemaps.cartocdn.com` key. Detecting this prevents rendering
 * "API KEY REQUIRED" watermarks even when an API key is configured.
 */
export function isCartoWatermarkHeaders(
  status: number,
  headers: { get?: (name: string) => string | null } | Record<string, string | undefined>,
): boolean {
  if (status !== 200) return true
  const readHeader = (name: string): string => {
    if (typeof (headers as { get?: (n: string) => string | null }).get === 'function') {
      return ((headers as { get: (n: string) => string | null }).get(name) || '').trim()
    }
    const record = headers as Record<string, string | undefined>
    return (record[name] || record[name.toLowerCase()] || '').trim()
  }
  const contentType = readHeader('content-type').toLowerCase()
  if (contentType && !contentType.startsWith('image/')) return true
  const etag = readHeader('etag').replace(/^W\//i, '').replace(/^"+|"+$/g, '').toLowerCase()
  if (etag.startsWith('wm-')) return true
  return false
}

/** Build candidate CARTO probe & template URLs supporting `?key=` and `?api_key=`. */
export function buildCartoProbeCandidates(apiKey: string): Array<{
  paramName: 'key' | 'api_key'
  probeUrl: string
}> {
  const encoded = encodeURIComponent(apiKey)
  return [
    {
      paramName: 'key',
      probeUrl: `https://a.basemaps.cartocdn.com/rastertiles/voyager/15/16702/15800.png?key=${encoded}`,
    },
    {
      paramName: 'api_key',
      probeUrl: `https://a.basemaps.cartocdn.com/rastertiles/voyager/15/16702/15800.png?api_key=${encoded}`,
    },
  ]
}

export function getFallbackTileLayerConfig(
  provider: 'osm' | 'esri' = 'osm',
): MapTileLayerConfig {
  if (provider === 'esri') {
    return {
      provider: 'esri',
      url: ESRI_WORLD_STREET_URL,
      maxZoom: 19,
      attribution: ESRI_ATTRIBUTION,
      usingCarto: false,
    }
  }
  return {
    provider: 'osm',
    url: DEFAULT_OSM_URL,
    maxZoom: 19,
    attribution: DEFAULT_OSM_ATTRIBUTION,
    usingCarto: false,
  }
}

/**
 * Resolve the Leaflet raster tile layer configuration.
 *
 * When a verified CARTO API key is provided, returns CARTO Voyager tiles
 * using `?key=` or `?api_key=`. When unconfigured or invalid, falls back
 * cleanly to OpenStreetMap (with Esri World Street Map as secondary backup)
 * instead of rendering CARTO's "API KEY REQUIRED" watermark tiles.
 */
export function getMapTileLayerConfig(
  cartoApiKey?: string | null,
  queryParam: 'key' | 'api_key' = 'key',
): MapTileLayerConfig {
  const normalized = normalizeCartoApiKey(cartoApiKey)

  if (normalized) {
    return {
      provider: 'carto',
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?${queryParam}=${encodeURIComponent(normalized)}`,
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: CARTO_ATTRIBUTION,
      usingCarto: true,
    }
  }

  return getFallbackTileLayerConfig('osm')
}
