/**
 * Canonical origin and preview-deployment guards for Web Push (VAPID) and
 * Service Workers.
 *
 * Browsers bind Web Push subscriptions to a Service Worker origin and display
 * that origin in every OS notification ("from dermaspaceng.com"). Letting a
 * Vercel preview URL (`*.vercel.app`) register a Service Worker, subscribe to
 * push notifications, or dispatch notifications from a preview environment
 * causes phones to receive notifications "from <preview>.vercel.app".
 *
 * Pure module — safe to import in both browser ('use client') and server
 * modules without pulling in database or Node-only dependencies.
 */

export const CANONICAL_PRODUCTION_HOSTS = new Set<string>([
  'dermaspaceng.com',
  'www.dermaspaceng.com',
])

export const DEFAULT_CANONICAL_ORIGIN = 'https://dermaspaceng.com'
export const DEFAULT_VAPID_SUBJECT = 'mailto:info@dermaspaceng.com'

const PREVIEW_HOST_SUFFIXES = [
  '.vercel.app',
  '.vercel.dev',
  '.netlify.app',
  '.pages.dev',
  '.ngrok-free.app',
  '.ngrok.io',
] as const

/** Extract a normalized lowercase hostname (without port) from a URL or Host header. */
export function extractHostname(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.toLowerCase().replace(/\.$/, '')
    }
    // Strip path/query/port if passed a Host / X-Forwarded-Host value.
    return new URL(`https://${trimmed}`).hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return null
  }
}

/** True for Vercel preview / ephemeral deployment hostnames. */
export function isPreviewOrVercelDeploymentHost(
  hostOrOrigin: string | null | undefined,
): boolean {
  const host = extractHostname(hostOrOrigin)
  if (!host) return false
  if (host === 'vercel.app' || host === 'vercel.dev') return true
  return PREVIEW_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

export function isLocalhostHost(hostOrOrigin: string | null | undefined): boolean {
  const host = extractHostname(hostOrOrigin)
  if (!host) return false
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local')
  )
}

export interface CanonicalOriginOptions {
  configuredAppUrl?: string | null
  allowLocalhost?: boolean
}

/**
 * Returns true strictly when `originOrUrl` is a canonical domain where
 * Web Push & Service Worker registrations are allowed.
 *
 * Always returns false for empty/null values and for `*.vercel.app` or
 * other preview deployment hosts — even if `configuredAppUrl` itself was
 * accidentally set to a preview URL.
 */
export function isCanonicalPushOrigin(
  originOrUrl: string | null | undefined,
  options?: CanonicalOriginOptions,
): boolean {
  if (!originOrUrl || typeof originOrUrl !== 'string') return false
  const trimmed = originOrUrl.trim()
  if (!trimmed) return false

  let parsed: URL
  try {
    parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '')
  if (!host) return false

  if (isPreviewOrVercelDeploymentHost(host)) return false

  if (isLocalhostHost(host)) {
    return Boolean(options?.allowLocalhost)
  }

  // Non-localhost origins must be HTTPS when a protocol was explicitly supplied.
  if (trimmed.includes('://') && parsed.protocol !== 'https:') {
    return false
  }

  if (CANONICAL_PRODUCTION_HOSTS.has(host)) {
    return true
  }

  const configuredHost = extractHostname(options?.configuredAppUrl)
  if (
    configuredHost &&
    !isPreviewOrVercelDeploymentHost(configuredHost) &&
    !isLocalhostHost(configuredHost) &&
    configuredHost === host
  ) {
    return true
  }

  return false
}

/**
 * Returns true when the current origin is eligible to register the offline
 * Service Worker. Blocks Vercel/ephemeral preview deployments while allowing
 * canonical production domains, localhost (including `next start`), and
 * hosted HTTPS app origins.
 */
export function isServiceWorkerAllowedOrigin(
  originOrUrl: string | null | undefined,
  options?: CanonicalOriginOptions,
): boolean {
  const allowLocalhost = options?.allowLocalhost ?? true
  if (isCanonicalPushOrigin(originOrUrl, { ...options, allowLocalhost })) {
    return true
  }
  if (!originOrUrl || typeof originOrUrl !== 'string') return false
  const trimmed = originOrUrl.trim()
  if (!trimmed) return false

  let parsed: URL
  try {
    parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '')
  if (!host || isPreviewOrVercelDeploymentHost(host)) return false
  if (isLocalhostHost(host)) return Boolean(allowLocalhost)
  return parsed.protocol === 'https:'
}

/**
 * True when server code is executing inside a Vercel preview (or non-production
 * Vercel) deployment.
 */
export function isPreviewDeploymentEnv(
  env?: Record<string, string | undefined>,
): boolean {
  const e = env ?? (typeof process !== 'undefined' ? process.env : {})
  if (e.VERCEL_ENV === 'preview') return true
  if (e.VERCEL_ENV && e.VERCEL_ENV !== 'production') {
    if (e.VERCEL_URL && isPreviewOrVercelDeploymentHost(e.VERCEL_URL)) {
      return true
    }
  }
  return false
}

export interface RequestHostHeaders {
  origin?: string | null
  referer?: string | null
  host?: string | null
  forwardedHost?: string | null
}

/**
 * True if any request header indicates traffic came through a `.vercel.app`
 * or preview deployment URL.
 */
export function isPreviewRequestHost(headers: RequestHostHeaders): boolean {
  const candidates = [
    headers.origin,
    headers.referer,
    headers.forwardedHost?.split(',')[0]?.trim(),
    headers.host,
  ]
  return candidates.some((c) => isPreviewOrVercelDeploymentHost(c))
}

/**
 * Resolve the canonical public app origin (`https://dermaspaceng.com` or a
 * configured custom domain), explicitly ignoring any `*.vercel.app` or preview
 * environment values.
 */
export function getCanonicalAppOrigin(
  env?: Record<string, string | undefined>,
): string {
  const e = env ?? (typeof process !== 'undefined' ? process.env : {})
  const candidates = [
    e.NEXT_PUBLIC_APP_URL,
    e.NEXT_PUBLIC_SITE_URL,
    e.APP_URL,
  ]
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue
    try {
      const parsed = new URL(raw.trim())
      const host = parsed.hostname.toLowerCase()
      if (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        !isPreviewOrVercelDeploymentHost(host) &&
        !isLocalhostHost(host)
      ) {
        return parsed.origin.replace(/\/$/, '')
      }
    } catch {
      // Ignore malformed candidate
    }
  }
  return DEFAULT_CANONICAL_ORIGIN
}

/**
 * Ensure `VAPID_SUBJECT` is a valid `mailto:` or canonical `https:` origin and
 * never embeds a `.vercel.app` or preview deployment domain.
 */
export function sanitizeVapidSubject(subject?: string | null): string {
  if (!subject || typeof subject !== 'string') return DEFAULT_VAPID_SUBJECT
  const trimmed = subject.trim()
  if (!trimmed) return DEFAULT_VAPID_SUBJECT

  if (trimmed.toLowerCase().startsWith('mailto:')) {
    const addr = trimmed.slice('mailto:'.length).trim()
    const at = addr.lastIndexOf('@')
    if (at <= 0) return DEFAULT_VAPID_SUBJECT
    const domain = addr.slice(at + 1).toLowerCase()
    if (!domain || isPreviewOrVercelDeploymentHost(domain) || isLocalhostHost(domain)) {
      return DEFAULT_VAPID_SUBJECT
    }
    return `mailto:${addr}`
  }

  try {
    const parsed = new URL(trimmed)
    if (
      parsed.protocol === 'https:' &&
      !isPreviewOrVercelDeploymentHost(parsed.hostname) &&
      !isLocalhostHost(parsed.hostname)
    ) {
      return parsed.origin
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_VAPID_SUBJECT
}

/**
 * Normalize notification click URLs so a push payload never sends the user to
 * a `.vercel.app` preview origin or an untrusted external origin.
 */
export function sanitizePushActionUrl(
  rawUrl: string | null | undefined,
  canonicalOrigin?: string,
): string {
  const base = (canonicalOrigin || getCanonicalAppOrigin()).replace(/\/$/, '')
  if (!rawUrl || typeof rawUrl !== 'string') {
    return `${base}/dashboard/notifications`
  }
  const trimmed = rawUrl.trim()
  if (!trimmed) return `${base}/dashboard/notifications`

  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return `${base}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return `${base}/dashboard/notifications`
    }
    const baseUrl = new URL(base)
    if (
      parsed.origin === baseUrl.origin ||
      CANONICAL_PRODUCTION_HOSTS.has(parsed.hostname.toLowerCase())
    ) {
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    if (isPreviewOrVercelDeploymentHost(parsed.hostname)) {
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return `${base}/dashboard/notifications`
  } catch {
    return `${base}/dashboard/notifications`
  }
}

function isPrivateOrDisallowedIpOrHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (!host) return true
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa')
  ) {
    return true
  }

  // IPv6 literals (loopback ::1, ULA fc00::/7, link-local fe80::/10, IPv4-mapped)
  if (host.includes(':')) {
    return true
  }

  // Dotted IPv4 literal check (reject all raw IPv4 addresses for Web Push endpoints)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return true
  }

  // Numeric/hex/single-label hostnames (e.g. 2130706433, 0x7f000001, intranet)
  if (!host.includes('.')) {
    return true
  }

  return false
}

/**
 * Validate that a Web Push subscription endpoint is a public HTTPS push-service
 * URL (never http://, localhost, private/loopback/metadata IPs, or embedded
 * credentials) to prevent SSRF when dispatching Web Push notifications.
 */
export function isValidWebPushEndpoint(rawEndpoint: unknown): boolean {
  if (typeof rawEndpoint !== 'string') return false
  const trimmed = rawEndpoint.trim()
  if (!trimmed || trimmed.length > 2048) return false

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false
  if (parsed.username || parsed.password) return false
  if (isPrivateOrDisallowedIpOrHost(parsed.hostname)) return false
  return true
}

const BASE64URL_KEY_RE = /^[A-Za-z0-9_-]+=*$/

export type ValidatedPushSubscription =
  | { ok: true; endpoint: string; p256dh: string; auth: string }
  | { ok: false; error: string }

/**
 * Validate incoming Web Push subscription payloads before storing in Postgres.
 */
export function validatePushSubscriptionPayload(
  raw: unknown,
): ValidatedPushSubscription {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid subscription' }
  }
  const obj = raw as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown } | null
  }
  const endpoint = typeof obj.endpoint === 'string' ? obj.endpoint.trim() : ''
  const p256dh = typeof obj.keys?.p256dh === 'string' ? obj.keys.p256dh.trim() : ''
  const auth = typeof obj.keys?.auth === 'string' ? obj.keys.auth.trim() : ''

  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: 'Invalid subscription' }
  }
  if (!isValidWebPushEndpoint(endpoint)) {
    return { ok: false, error: 'Invalid push endpoint URL' }
  }
  if (
    p256dh.length < 20 ||
    p256dh.length > 256 ||
    !BASE64URL_KEY_RE.test(p256dh) ||
    auth.length < 12 ||
    auth.length > 128 ||
    !BASE64URL_KEY_RE.test(auth)
  ) {
    return { ok: false, error: 'Invalid push encryption keys' }
  }
  return { ok: true, endpoint, p256dh, auth }
}

/**
 * Partition stored push subscriptions into canonical subscriptions we can send
 * to vs legacy/preview/`NULL`-origin subscriptions that must be removed.
 */
export function filterCanonicalPushSubscriptions<
  T extends { origin?: string | null },
>(
  subs: T[],
  options?: CanonicalOriginOptions,
): { valid: T[]; stale: T[] } {
  const valid: T[] = []
  const stale: T[] = []
  for (const sub of subs) {
    if (isCanonicalPushOrigin(sub.origin, options)) {
      valid.push(sub)
    } else {
      stale.push(sub)
    }
  }
  return { valid, stale }
}

/**
 * Partition stored push subscriptions into valid non-preview subscriptions vs
 * legacy/preview/`NULL`-origin subscriptions that must be removed.
 */
export function filterValidPushSubscriptions<
  T extends { origin?: string | null },
>(
  subs: T[],
  options?: CanonicalOriginOptions,
): { valid: T[]; stale: T[] } {
  const valid: T[] = []
  const stale: T[] = []
  for (const sub of subs) {
    if (isServiceWorkerAllowedOrigin(sub.origin, options)) {
      valid.push(sub)
    } else {
      stale.push(sub)
    }
  }
  return { valid, stale }
}
