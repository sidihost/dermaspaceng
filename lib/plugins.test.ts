import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PLUGIN_CATALOG,
  getCatalogPlugin,
  isSafeHref,
  isSafePublicHttpsUrl,
  parsePluginManifestJson,
  toPublicActivePlugins,
  validateCustomPluginInput,
  validatePluginConfig,
  type InstalledPlugin,
} from './plugins'

test('public HTTPS URL validator blocks XSS schemes, HTTP, localhost, and private IPs', () => {
  assert.equal(isSafePublicHttpsUrl('https://cdn.example.com/widget.js'), true)
  assert.equal(isSafePublicHttpsUrl('http://cdn.example.com/widget.js'), false)
  assert.equal(isSafePublicHttpsUrl('javascript:alert(1)'), false)
  assert.equal(isSafePublicHttpsUrl('data:text/javascript,alert(1)'), false)
  assert.equal(isSafePublicHttpsUrl('https://localhost/script.js'), false)
  assert.equal(isSafePublicHttpsUrl('https://127.0.0.1/script.js'), false)
  assert.equal(isSafePublicHttpsUrl('https://169.254.169.254/latest/meta-data/'), false)
  assert.equal(isSafePublicHttpsUrl('https://192.168.1.1/hook'), false)
  assert.equal(isSafePublicHttpsUrl('https://user:pass@cdn.example.com/x.js'), false)
})

test('safe href validator allows clean relative paths and public https URLs only', () => {
  assert.equal(isSafeHref('/booking'), true)
  assert.equal(isSafeHref('/consultation?branch=vi'), true)
  assert.equal(isSafeHref('https://instagram.com/dermaspace'), true)
  assert.equal(isSafeHref('//evil.com/phish'), false)
  assert.equal(isSafeHref('javascript:alert(1)'), false)
  assert.equal(isSafeHref('http://insecure.example.com'), false)
})

test('built-in plugin config validation enforces strict vendor ID formats', () => {
  const ga4 = getCatalogPlugin('google-analytics')!
  assert.equal(validatePluginConfig(ga4, { measurementId: 'G-ABC1234567' }, true).ok, true)
  assert.equal(validatePluginConfig(ga4, { measurementId: '<script>alert(1)</script>' }, true).ok, false)
  assert.equal(validatePluginConfig(ga4, { measurementId: '' }, true).ok, false)

  const meta = getCatalogPlugin('meta-pixel')!
  assert.equal(validatePluginConfig(meta, { pixelId: '123456789012' }, true).ok, true)
  assert.equal(validatePluginConfig(meta, { pixelId: 'abc-not-digits' }, true).ok, false)
})

test('custom plugin manifest parser accepts valid manifests and rejects reserved or unsafe ones', () => {
  const valid = parsePluginManifestJson(
    JSON.stringify({
      name: 'Hotjar Feedback',
      version: '1.2.0',
      author: 'Hotjar',
      description: 'Collect visitor feedback polls across service pages.',
      category: 'analytics',
      kind: 'script',
      scriptUrl: 'https://static.hotjar.com/c/hotjar-12345.js',
    }),
  )
  assert.equal(valid.ok, true)
  if (valid.ok) {
    assert.equal(valid.plugin.slug, 'hotjar-feedback')
    assert.equal(valid.plugin.isCustom, true)
  }

  const badUrl = validateCustomPluginInput({
    name: 'Unsafe Script',
    description: 'Attempts javascript scheme injection.',
    kind: 'script',
    scriptUrl: 'javascript:alert(1)',
  })
  assert.equal(badUrl.ok, false)

  const reservedSlug = validateCustomPluginInput({
    slug: 'google-analytics',
    name: 'Spoof GA4',
    description: 'Tries to overwrite built-in slug.',
    kind: 'script',
    scriptUrl: 'https://cdn.example.com/spoof.js',
  })
  assert.equal(reservedSlug.ok, false)
})

test('public active serializer strips disabled plugins, unconfigured plugins, and server-only secrets', () => {
  const now = new Date().toISOString()
  const installed: InstalledPlugin[] = [
    {
      slug: 'whatsapp-float',
      name: 'WhatsApp Direct Chat',
      version: '1.2.0',
      author: 'Dermaspace',
      description: 'Floating WhatsApp button',
      category: 'customer',
      kind: 'builtin',
      iconKey: 'message-circle',
      enabled: true,
      isCustom: false,
      config: { phone: '2349061836625', message: 'Hi', label: 'WhatsApp' },
      installedAt: now,
      updatedAt: now,
    },
    {
      slug: 'webhook-automations',
      name: 'Webhook Automations',
      version: '1.0.0',
      author: 'Dermaspace',
      description: 'Server webhooks',
      category: 'integrations',
      kind: 'builtin',
      iconKey: 'webhook',
      enabled: true,
      isCustom: false,
      config: { endpointUrl: 'https://hooks.zapier.com/secret/123', events: 'booking.created' },
      installedAt: now,
      updatedAt: now,
    },
    {
      slug: 'google-analytics',
      name: 'Google Analytics 4',
      version: '1.0.0',
      author: 'Google',
      description: 'GA4',
      category: 'analytics',
      kind: 'builtin',
      iconKey: 'bar-chart',
      enabled: true,
      isCustom: false,
      config: { measurementId: '' }, // missing required ID
      installedAt: now,
      updatedAt: now,
    },
    {
      slug: 'meta-pixel',
      name: 'Meta Pixel',
      version: '1.1.0',
      author: 'Meta',
      description: 'Disabled pixel',
      category: 'marketing',
      kind: 'builtin',
      iconKey: 'megaphone',
      enabled: false,
      isCustom: false,
      config: { pixelId: '123456789012' },
      installedAt: now,
      updatedAt: now,
    },
  ]

  const publicList = toPublicActivePlugins(installed)
  assert.equal(publicList.length, 1)
  assert.equal(publicList[0].slug, 'whatsapp-float')
  assert.equal(publicList[0].config.phone, '2349061836625')
  assert.ok(PLUGIN_CATALOG.length >= 8)
})

test('plugin catalog contains zero concierge wording', () => {
  for (const entry of PLUGIN_CATALOG) {
    const combined = [
      entry.slug,
      entry.name,
      entry.description,
      ...Object.values(entry.defaultConfig),
    ].join(' ')
    assert.equal(
      /concierge/i.test(combined),
      false,
      `Plugin "${entry.slug}" unexpectedly contains concierge wording`,
    )
  }
})
