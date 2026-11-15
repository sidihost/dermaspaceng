import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCartoProbeCandidates,
  getFallbackTileLayerConfig,
  getMapTileLayerConfig,
  isCartoWatermarkHeaders,
  normalizeCartoApiKey,
} from './map-tiles'

describe('map-tiles key & watermark resolution', () => {
  it('normalizes empty, quoted, and placeholder API keys', () => {
    assert.equal(normalizeCartoApiKey(undefined), '')
    assert.equal(normalizeCartoApiKey(null), '')
    assert.equal(normalizeCartoApiKey('  "undefined" '), '')
    assert.equal(normalizeCartoApiKey("'null'"), '')
    assert.equal(normalizeCartoApiKey('your_carto_api_key'), '')
    assert.equal(normalizeCartoApiKey(' "my-carto-key_123" '), 'my-carto-key_123')
  })

  it('detects CARTO "API KEY REQUIRED" wm-* watermark responses', () => {
    assert.equal(
      isCartoWatermarkHeaders(200, {
        'content-type': 'image/png',
        etag: '"wm-da89c20e77c1-light"',
      }),
      true,
    )
    assert.equal(
      isCartoWatermarkHeaders(200, new Headers({ 'content-type': 'image/png', etag: 'W/"wm-abc"' })),
      true,
    )
    assert.equal(
      isCartoWatermarkHeaders(403, { 'content-type': 'image/png', etag: '"ok"' }),
      true,
    )
    assert.equal(
      isCartoWatermarkHeaders(200, {
        'content-type': 'image/png',
        etag: '"6a8e910f23b4c567"',
      }),
      false,
    )
  })

  it('builds CARTO probe URLs for both key and api_key query parameters', () => {
    const candidates = buildCartoProbeCandidates('secret/token')
    assert.equal(candidates.length, 2)
    assert.equal(candidates[0].paramName, 'key')
    assert.match(candidates[0].probeUrl, /\?key=secret%2Ftoken$/)
    assert.equal(candidates[1].paramName, 'api_key')
    assert.match(candidates[1].probeUrl, /\?api_key=secret%2Ftoken$/)
  })

  it('resolves clean OSM fallback when API key is missing and Esri backup layer', () => {
    const osm = getMapTileLayerConfig(undefined)
    assert.equal(osm.provider, 'osm')
    assert.equal(osm.usingCarto, false)
    assert.equal(osm.url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')

    const esri = getFallbackTileLayerConfig('esri')
    assert.equal(esri.provider, 'esri')
    assert.equal(esri.usingCarto, false)
    assert.match(esri.url, /arcgisonline\.com/)

    const carto = getMapTileLayerConfig('valid-key-99', 'api_key')
    assert.equal(carto.provider, 'carto')
    assert.equal(carto.usingCarto, true)
    assert.match(carto.url, /\?api_key=valid-key-99$/)
  })
})
