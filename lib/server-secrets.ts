import crypto from 'node:crypto'
import net from 'node:net'

const EPHEMERAL_SECRET_KEY = '__dermaspaceEphemeralSigningSecret'

type GlobalWithSecret = typeof globalThis & {
  [EPHEMERAL_SECRET_KEY]?: string
}

function getBaseSigningSecret(): string {
  const configured =
    process.env.JWT_SECRET?.trim() ||
    process.env.AUTH_PEPPER?.trim()

  if (configured) {
    return configured
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET or AUTH_PEPPER must be configured in production',
    )
  }

  // Non-production / test fallback: per-process CSPRNG secret (never
  // DATABASE_URL and never a static guessable string like "your-secret-key").
  const g = globalThis as GlobalWithSecret
  if (!g[EPHEMERAL_SECRET_KEY]) {
    g[EPHEMERAL_SECRET_KEY] = crypto.randomBytes(32).toString('hex')
  }
  return g[EPHEMERAL_SECRET_KEY]
}

/**
 * Returns a domain-separated signing secret for JWT/HMAC operations.
 * Never derives key material from DATABASE_URL and fails closed in
 * production if no runtime signing secret is configured.
 */
export function getSigningSecret(namespace?: string): string {
  const base = getBaseSigningSecret()
  if (!namespace) return base
  return crypto
    .createHash('sha256')
    .update(`dermaspace:signing-secret:v1:${namespace}:`)
    .update(base)
    .digest('hex')
}

/**
 * Constant-time string comparison via SHA-256 digest comparison so input
 * length differences never leak via early return.
 */
export function timingSafeEqualStrings(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length === 0 || b.length === 0) return false
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest()
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest()
  return crypto.timingSafeEqual(digestA, digestB)
}

/**
 * Validates that a client IP header value is a genuine public IPv4 or IPv6
 * literal before interpolating it into an outbound geo lookup URL (prevents
 * SSRF / path-injection via spoofed X-Forwarded-For headers).
 */
export function isValidPublicIpForGeo(rawIp: string | null | undefined): boolean {
  if (!rawIp || typeof rawIp !== 'string') return false
  const ip = rawIp.trim()
  const kind = net.isIP(ip)
  if (kind === 0) return false

  if (kind === 4) {
    const octets = ip.split('.').map(Number)
    if (octets.length !== 4 || octets.some((n) => Number.isNaN(n))) return false
    const [a, b] = octets
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    return true
  }

  const lower = ip.toLowerCase()
  if (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168.')
  ) {
    return false
  }
  return true
}
