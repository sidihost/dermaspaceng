// ---------------------------------------------------------------------------
// Dermaspace Plugin System — Catalogue, Validation & Sanitization
//
// Pure, zero-dependency domain module powering `/admin/addons` (Plugins &
// Add-ons), `/api/admin/plugins`, and the public plugin runtime.
//
// Security boundaries enforced here:
//   - Built-in integrations validate vendor IDs with narrow regex patterns
//     (no arbitrary inline JS or HTML injection).
//   - Custom script/widget plugins strictly require public `https://` URLs
//     (blocking `javascript:`, `data:`, `http:`, localhost, and private IPs).
//   - Public serializer strips sensitive/internal fields (like webhook URLs
//     and admin metadata) before sending active plugins to browser clients.
// ---------------------------------------------------------------------------

export type PluginCategory =
  | 'analytics'
  | 'marketing'
  | 'customer'
  | 'booking'
  | 'integrations'

export type PluginKind = 'builtin' | 'script' | 'widget'

export interface PluginConfigField {
  key: string
  label: string
  placeholder: string
  help?: string
  type: 'text' | 'url' | 'tel' | 'textarea'
  required?: boolean
  /** Optional regex pattern string for validation. */
  pattern?: string
  patternMessage?: string
  /** If true, value is kept server-side and never sent to public clients. */
  secret?: boolean
}

export interface PluginCatalogEntry {
  slug: string
  name: string
  version: string
  author: string
  description: string
  category: PluginCategory
  kind: PluginKind
  iconKey:
    | 'whatsapp'
    | 'google-analytics'
    | 'google-tag-manager'
    | 'meta'
    | 'tiktok'
    | 'microsoft'
    | 'tawk'
    | 'calendar-clock'
    | 'message-circle'
    | 'bar-chart'
    | 'megaphone'
    | 'globe'
    | 'activity'
    | 'bell'
    | 'code'
    | 'layers'
    | 'webhook'
    | 'plug'
  fields: PluginConfigField[]
  defaultConfig: Record<string, string>
}

export interface InstalledPlugin {
  slug: string
  name: string
  version: string
  author: string
  description: string
  category: PluginCategory
  kind: PluginKind
  iconKey: PluginCatalogEntry['iconKey']
  enabled: boolean
  isCustom: boolean
  scriptUrl?: string | null
  widgetLabel?: string | null
  widgetUrl?: string | null
  config: Record<string, string>
  installedAt: string
  updatedAt: string
}

export interface PublicActivePlugin {
  slug: string
  name: string
  kind: PluginKind
  scriptUrl?: string | null
  widgetLabel?: string | null
  widgetUrl?: string | null
  config: Record<string, string>
}

export const PLUGIN_CATALOG: readonly PluginCatalogEntry[] = [
  {
    slug: 'whatsapp-float',
    name: 'WhatsApp Direct Chat',
    version: '1.2.0',
    author: 'Dermaspace',
    description:
      'Adds a clean, floating WhatsApp booking button on public pages so visitors can message your front desk in one tap.',
    category: 'customer',
    kind: 'builtin',
    iconKey: 'whatsapp',
    fields: [
      {
        key: 'phone',
        label: 'WhatsApp number (international format)',
        placeholder: '2349061836625',
        help: 'Digits only with country code, no + or spaces.',
        type: 'tel',
        required: true,
        pattern: '^[0-9]{8,15}$',
        patternMessage: 'Enter 8–15 digits with country code (e.g. 2349061836625).',
      },
      {
        key: 'message',
        label: 'Prefilled greeting message',
        placeholder: 'Hello Dermaspace, I would like to book a treatment.',
        type: 'text',
      },
      {
        key: 'label',
        label: 'Button label',
        placeholder: 'Chat on WhatsApp',
        type: 'text',
      },
    ],
    defaultConfig: {
      phone: '2349061836625',
      message: 'Hello Dermaspace, I would like to enquire about a treatment.',
      label: 'WhatsApp Us',
    },
  },
  {
    slug: 'google-analytics',
    name: 'Google Analytics 4',
    version: '1.0.0',
    author: 'Google',
    description:
      'Measure site traffic, service page engagement, and booking conversions using your GA4 Measurement ID.',
    category: 'analytics',
    kind: 'builtin',
    iconKey: 'google-analytics',
    fields: [
      {
        key: 'measurementId',
        label: 'GA4 Measurement ID',
        placeholder: 'G-XXXXXXXXXX',
        help: 'Found in Google Analytics → Admin → Data Streams.',
        type: 'text',
        required: true,
        pattern: '^G-[A-Z0-9]{6,16}$',
        patternMessage: 'Must match a valid GA4 Measurement ID (e.g. G-AB12CD34EF).',
      },
    ],
    defaultConfig: { measurementId: '' },
  },
  {
    slug: 'google-tag-manager',
    name: 'Google Tag Manager',
    version: '1.0.0',
    author: 'Google',
    description:
      'Connect your GTM container to manage marketing and analytics tags centrally without code deployments.',
    category: 'analytics',
    kind: 'builtin',
    iconKey: 'google-tag-manager',
    fields: [
      {
        key: 'containerId',
        label: 'GTM Container ID',
        placeholder: 'GTM-XXXXXXX',
        type: 'text',
        required: true,
        pattern: '^GTM-[A-Z0-9]{4,14}$',
        patternMessage: 'Must match a valid GTM Container ID (e.g. GTM-ABC1234).',
      },
    ],
    defaultConfig: { containerId: '' },
  },
  {
    slug: 'meta-pixel',
    name: 'Meta (Facebook) Pixel',
    version: '1.1.0',
    author: 'Meta',
    description:
      'Track Instagram & Facebook ad conversions, optimize campaigns, and build retargeting audiences.',
    category: 'marketing',
    kind: 'builtin',
    iconKey: 'meta',
    fields: [
      {
        key: 'pixelId',
        label: 'Meta Pixel ID',
        placeholder: '123456789012345',
        help: 'Numeric Pixel ID from Meta Events Manager.',
        type: 'text',
        required: true,
        pattern: '^[0-9]{8,20}$',
        patternMessage: 'Pixel ID must be 8–20 digits.',
      },
    ],
    defaultConfig: { pixelId: '' },
  },
  {
    slug: 'tiktok-pixel',
    name: 'TikTok Pixel',
    version: '1.0.0',
    author: 'TikTok',
    description:
      'Attribute bookings and consultations driven by your TikTok campaigns with lightweight conversion tracking.',
    category: 'marketing',
    kind: 'builtin',
    iconKey: 'tiktok',
    fields: [
      {
        key: 'pixelId',
        label: 'TikTok Pixel ID',
        placeholder: 'C1234567890ABCDEF',
        type: 'text',
        required: true,
        pattern: '^[A-Z0-9]{8,32}$',
        patternMessage: 'Must be 8–32 uppercase letters or digits.',
      },
    ],
    defaultConfig: { pixelId: '' },
  },
  {
    slug: 'microsoft-clarity',
    name: 'Microsoft Clarity',
    version: '1.0.0',
    author: 'Microsoft',
    description:
      'Privacy-friendly session heatmaps and scroll insights to see how clients navigate services and booking.',
    category: 'analytics',
    kind: 'builtin',
    iconKey: 'microsoft',
    fields: [
      {
        key: 'projectId',
        label: 'Clarity Project ID',
        placeholder: 'abc123def4',
        type: 'text',
        required: true,
        pattern: '^[a-zA-Z0-9]{6,20}$',
        patternMessage: 'Project ID must be 6–20 alphanumeric characters.',
      },
    ],
    defaultConfig: { projectId: '' },
  },
  {
    slug: 'tawk-chat',
    name: 'Tawk.to Live Chat',
    version: '1.0.0',
    author: 'Tawk.to',
    description:
      'Embed an external Tawk.to customer messaging widget alongside or instead of built-in chat.',
    category: 'customer',
    kind: 'builtin',
    iconKey: 'tawk',
    fields: [
      {
        key: 'propertyId',
        label: 'Property ID',
        placeholder: '65a1b2c3d4e5f6a7b8c9d0e1',
        type: 'text',
        required: true,
        pattern: '^[a-zA-Z0-9]{12,40}$',
        patternMessage: 'Property ID must be 12–40 alphanumeric characters.',
      },
      {
        key: 'widgetId',
        label: 'Widget ID',
        placeholder: '1h2i3j4k5',
        type: 'text',
        required: true,
        pattern: '^[a-zA-Z0-9_-]{4,32}$',
        patternMessage: 'Widget ID must be 4–32 alphanumeric characters.',
      },
    ],
    defaultConfig: { propertyId: '', widgetId: 'default' },
  },
  {
    slug: 'promo-bar',
    name: 'Top Promo Strip',
    version: '1.1.0',
    author: 'Dermaspace',
    description:
      'Displays a slim, brand-purple promotional strip above public pages with a customizable call-to-action link.',
    category: 'marketing',
    kind: 'builtin',
    iconKey: 'megaphone',
    fields: [
      {
        key: 'message',
        label: 'Announcement text',
        placeholder: 'Complimentary skin consultation available Wed–Sat in VI & Ikoyi.',
        type: 'text',
        required: true,
      },
      {
        key: 'ctaLabel',
        label: 'Action button text (optional)',
        placeholder: 'Book now',
        type: 'text',
      },
      {
        key: 'ctaUrl',
        label: 'Action link (/path or https://...)',
        placeholder: '/consultation',
        type: 'text',
      },
    ],
    defaultConfig: {
      message: 'Complimentary skin consultations available Wed–Sat in VI & Ikoyi.',
      ctaLabel: 'Book free visit',
      ctaUrl: '/consultation',
    },
  },
  {
    slug: 'booking-waitlist',
    name: 'Slot Waitlist Plugin',
    version: '1.0.0',
    author: 'Dermaspace',
    description:
      'Allow clients to register interest for fully booked dates and notify your team automatically when a slot opens.',
    category: 'booking',
    kind: 'builtin',
    iconKey: 'calendar-clock',
    fields: [
      {
        key: 'noticeText',
        label: 'Waitlist confirmation note',
        placeholder: 'We will notify you by email as soon as an earlier slot opens.',
        type: 'text',
      },
    ],
    defaultConfig: {
      noticeText: 'We will notify you by email as soon as an earlier slot opens.',
    },
  },
  {
    slug: 'webhook-automations',
    name: 'Webhook Automations',
    version: '1.0.0',
    author: 'Dermaspace',
    description:
      'Connect Zapier, Make, or your own CRM by registering an HTTPS webhook endpoint for Dermaspace events.',
    category: 'integrations',
    kind: 'builtin',
    iconKey: 'webhook',
    fields: [
      {
        key: 'endpointUrl',
        label: 'HTTPS Webhook URL',
        placeholder: 'https://hooks.zapier.com/hooks/catch/...',
        help: 'Stored server-side only; never exposed to visitors.',
        type: 'url',
        required: true,
        secret: true,
      },
      {
        key: 'events',
        label: 'Subscribed events (comma-separated)',
        placeholder: 'booking.created, consultation.created',
        type: 'text',
        secret: true,
      },
    ],
    defaultConfig: {
      endpointUrl: '',
      events: 'booking.created, consultation.created',
    },
  },
] as const

const CATALOG_MAP = new Map<string, PluginCatalogEntry>(
  PLUGIN_CATALOG.map((entry) => [entry.slug, entry]),
)

export function getCatalogPlugin(slug: string): PluginCatalogEntry | undefined {
  return CATALOG_MAP.get(slug)
}

/**
 * Validates that a URL is a safe public `https://` URL (rejecting `javascript:`,
 * `data:`, `http:`, loopback/localhost, IP literals, and private network ranges
 * to prevent XSS and SSRF).
 */
export function isSafePublicHttpsUrl(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 1000) return false

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false
  if (parsed.username || parsed.password) return false

  const host = parsed.hostname.toLowerCase()
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1'
  ) {
    return false
  }

  // Reject raw IPv4 / IPv6 literals to block private & cloud metadata ranges
  // (127.0.0.0/8, 10.0.0.0/8, 169.254.169.254, 172.16.0.0/12, 192.168.0.0/16).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    return false
  }

  if (!host.includes('.')) return false

  return true
}

/**
 * Validates an internal path (`/booking`) or a safe public `https://` URL.
 */
export function isSafeHref(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 500) return false
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//') && !/[\r\n\0]/.test(trimmed)
  }
  return isSafePublicHttpsUrl(trimmed)
}

export function normalizePluginSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function validatePluginConfig(
  entry: PluginCatalogEntry,
  rawConfig: Record<string, unknown>,
  requireMandatoryFields = false,
): { ok: true; config: Record<string, string> } | { ok: false; error: string } {
  const clean: Record<string, string> = {}

  for (const field of entry.fields) {
    const rawVal = rawConfig[field.key]
    const val = typeof rawVal === 'string' ? rawVal.trim() : ''

    if (!val) {
      if (requireMandatoryFields && field.required) {
        return { ok: false, error: `${field.label} is required.` }
      }
      clean[field.key] = ''
      continue
    }

    if (val.length > 500) {
      return { ok: false, error: `${field.label} is too long (max 500 characters).` }
    }

    if (field.type === 'url' && !isSafePublicHttpsUrl(val)) {
      return {
        ok: false,
        error: `${field.label} must be a valid public https:// URL.`,
      }
    }

    if (field.key === 'ctaUrl' && !isSafeHref(val)) {
      return {
        ok: false,
        error: `${field.label} must start with / or https://.`,
      }
    }

    if (field.pattern) {
      const regex = new RegExp(field.pattern, 'i')
      if (!regex.test(val)) {
        return {
          ok: false,
          error: field.patternMessage || `${field.label} has an invalid format.`,
        }
      }
    }

    clean[field.key] = val
  }

  return { ok: true, config: clean }
}

export interface CustomPluginInput {
  slug?: string
  name: string
  version?: string
  author?: string
  description: string
  category?: PluginCategory
  kind: 'script' | 'widget'
  scriptUrl?: string
  widgetLabel?: string
  widgetUrl?: string
}

const ALLOWED_CATEGORIES = new Set<PluginCategory>([
  'analytics',
  'marketing',
  'customer',
  'booking',
  'integrations',
])

export function validateCustomPluginInput(
  input: unknown,
): { ok: true; plugin: Omit<InstalledPlugin, 'installedAt' | 'updatedAt'> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Plugin payload must be an object.' }
  }
  const obj = input as Record<string, unknown>

  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: 'Plugin name must be between 2 and 60 characters.' }
  }

  const rawSlug = typeof obj.slug === 'string' && obj.slug.trim() ? obj.slug : name
  const slug = normalizePluginSlug(rawSlug)
  if (slug.length < 2) {
    return { ok: false, error: 'Plugin slug must contain at least 2 letters or digits.' }
  }
  if (CATALOG_MAP.has(slug)) {
    return {
      ok: false,
      error: `Slug "${slug}" is reserved by a built-in plugin. Choose a unique slug.`,
    }
  }

  const description = typeof obj.description === 'string' ? obj.description.trim() : ''
  if (description.length < 6 || description.length > 260) {
    return { ok: false, error: 'Description must be between 6 and 260 characters.' }
  }

  const version =
    typeof obj.version === 'string' && /^[0-9]+\.[0-9]+(\.[0-9]+)?$/.test(obj.version.trim())
      ? obj.version.trim()
      : '1.0.0'

  const author =
    typeof obj.author === 'string' && obj.author.trim()
      ? obj.author.trim().slice(0, 60)
      : 'Custom'

  const rawCat = typeof obj.category === 'string' ? obj.category.trim().toLowerCase() : 'integrations'
  const category: PluginCategory = ALLOWED_CATEGORIES.has(rawCat as PluginCategory)
    ? (rawCat as PluginCategory)
    : 'integrations'

  const kind = obj.kind === 'widget' ? 'widget' : obj.kind === 'script' ? 'script' : null
  if (!kind) {
    return { ok: false, error: 'Plugin kind must be "script" or "widget".' }
  }

  if (kind === 'script') {
    const scriptUrl = typeof obj.scriptUrl === 'string' ? obj.scriptUrl.trim() : ''
    if (!isSafePublicHttpsUrl(scriptUrl)) {
      return {
        ok: false,
        error: 'Script plugins require a valid public https:// script URL.',
      }
    }
    return {
      ok: true,
      plugin: {
        slug,
        name,
        version,
        author,
        description,
        category,
        kind: 'script',
        iconKey: 'code',
        enabled: true,
        isCustom: true,
        scriptUrl,
        widgetLabel: null,
        widgetUrl: null,
        config: {},
      },
    }
  }

  // kind === 'widget'
  const widgetLabel = typeof obj.widgetLabel === 'string' ? obj.widgetLabel.trim() : ''
  const widgetUrl = typeof obj.widgetUrl === 'string' ? obj.widgetUrl.trim() : ''
  if (widgetLabel.length < 2 || widgetLabel.length > 40) {
    return { ok: false, error: 'Widget button label must be 2–40 characters.' }
  }
  if (!isSafeHref(widgetUrl)) {
    return {
      ok: false,
      error: 'Widget destination must be an internal /path or public https:// URL.',
    }
  }

  return {
    ok: true,
    plugin: {
      slug,
      name,
      version,
      author,
      description,
      category,
      kind: 'widget',
      iconKey: 'plug',
      enabled: true,
      isCustom: true,
      scriptUrl: null,
      widgetLabel,
      widgetUrl,
      config: {},
    },
  }
}

/**
 * Parses and validates a JSON plugin manifest uploaded or pasted by an admin.
 */
export function parsePluginManifestJson(
  rawJson: string,
): { ok: true; plugin: Omit<InstalledPlugin, 'installedAt' | 'updatedAt'> } | { ok: false; error: string } {
  if (!rawJson || typeof rawJson !== 'string' || rawJson.length > 16_000) {
    return { ok: false, error: 'Manifest JSON is empty or exceeds 16 KB.' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return { ok: false, error: 'Invalid JSON syntax in plugin manifest.' }
  }
  return validateCustomPluginInput(parsed)
}

/**
 * Projects installed plugins into the minimal, sanitized public payload
 * returned by `/api/plugins/active`. Disabled plugins and secret fields
 * (like server-side webhook URLs) are stripped.
 */
export function toPublicActivePlugins(installed: InstalledPlugin[]): PublicActivePlugin[] {
  const out: PublicActivePlugin[] = []

  for (const plugin of installed) {
    if (!plugin.enabled) continue

    if (plugin.isCustom) {
      if (plugin.kind === 'script' && !isSafePublicHttpsUrl(plugin.scriptUrl)) {
        continue
      }
      if (plugin.kind === 'widget' && (!plugin.widgetLabel || !isSafeHref(plugin.widgetUrl))) {
        continue
      }
      out.push({
        slug: plugin.slug,
        name: plugin.name,
        kind: plugin.kind,
        scriptUrl: plugin.scriptUrl ?? null,
        widgetLabel: plugin.widgetLabel ?? null,
        widgetUrl: plugin.widgetUrl ?? null,
        config: {},
      })
      continue
    }

    const catalog = getCatalogPlugin(plugin.slug)
    if (!catalog) continue

    // Strip any fields marked `secret: true` (e.g. webhook endpoint URLs)
    const publicConfig: Record<string, string> = {}
    let hasAllRequiredPublic = true
    for (const field of catalog.fields) {
      if (field.secret) continue
      const val = (plugin.config?.[field.key] ?? '').trim()
      if (field.required && !val) {
        hasAllRequiredPublic = false
      }
      if (val) publicConfig[field.key] = val
    }

    // Don't ship server-only plugins (all fields secret) or unconfigured required plugins
    const hasPublicFields = catalog.fields.some((f) => !f.secret)
    if (!hasPublicFields || !hasAllRequiredPublic) continue

    out.push({
      slug: plugin.slug,
      name: plugin.name,
      kind: plugin.kind,
      config: publicConfig,
    })
  }

  return out
}
