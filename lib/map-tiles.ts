export interface MapTileLayerConfig {
  url: string
  attribution: string
  subdomains?: string
  maxZoom: number
  usingCarto: boolean
}

const DEFAULT_OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const DEFAULT_OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'

/**
 * Resolve the Leaflet raster tile layer configuration.
 *
 * CARTO requires `?key=...` on all basemaps.cartocdn.com raster requests.
 * When `NEXT_PUBLIC_CARTO_API_KEY` is provided, we use CARTO Voyager tiles
 * with the encoded API key. When unconfigured or blank (for example before
 * the key is added in local/preview environments), we fall back cleanly to
 * standard OpenStreetMap tiles instead of rendering CARTO's "API KEY REQUIRED"
 * error tiles.
 */
export function getMapTileLayerConfig(cartoApiKey?: string | null): MapTileLayerConfig {
  const raw = typeof cartoApiKey === 'string' ? cartoApiKey.trim() : ''
  const unquoted = raw.replace(/^['"]+|['"]+$/g, '').trim()
  const normalized =
    unquoted && unquoted.toLowerCase() !== 'undefined' && unquoted.toLowerCase() !== 'null'
      ? unquoted
      : ''

  if (normalized) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(normalized)}`,
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: CARTO_ATTRIBUTION,
      usingCarto: true,
    }
  }

  return {
    url: DEFAULT_OSM_URL,
    maxZoom: 19,
    attribution: DEFAULT_OSM_ATTRIBUTION,
    usingCarto: false,
  }
}
