// ---------------------------------------------------------------------------
// /lib/api-guard.ts
//
// Per-route security primitives that complement the global
// firewall (`lib/firewall.ts`) and rate limiter (`lib/redis.rateLimit`).
//
// Why the split?
//   * The firewall blocks _obvious_ junk (scanners, traversal, SQL probes)
//     for every request before any handler runs. It's fast and signature-
//     based.
//   * This module is what individual route handlers call to enforce the
//     per-endpoint contract:
//        – CSRF / cross-site origin lockout for state-changing requests
//        – JSON body-size caps so a 10 MB blob can't DoS a route
//        – Honeypot field check for public forms (catches bots that
//          fill every input, without nagging real humans with extra
//          captchas)
//        – A small `withRateLimit()` wrapper so any route can opt in
//          with one line.
//
// Everything here is fail-soft on infrastructure errors (Redis down,
// malformed headers, etc.) — security must never break the site for
// real users. Attackers, on the other hand, only ever see the success
// branch of these checks if they've actually solved the puzzle.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/redis'

// ---------------------------------------------------------------------------
// Same-origin / CSRF guard
// ---------------------------------------------------------------------------
//
// We don't use cookie-bound CSRF tokens because every state-changing
// API on this site already rides cookies with `SameSite=Lax`, which
// blocks the cross-site form POST attack vector. The remaining gap
// is forged fetch() calls from a malicious page in the SAME browser
// (e.g. a phishing site embedded in an iframe). Modern browsers send
// `Origin` on every cross-site fetch, so verifying that the Origin
// header matches our deploy host is the simplest, most reliable
// guard — and it's exactly what GitHub, Stripe and Slack do.
//
// We accept:
//   * Same origin as the request itself (computed from the Host header)
//   * `https://dermaspace.ng` and `https://www.dermaspace.ng` (canonical)
//   * Anything matching `*.vercel.app` for preview deployments
//   * Localhost during development
//
// If `Origin` is absent (some legitimate non-browser tools, e.g. mobile
// apps or curl), we fall back to checking `Referer`. If BOTH are absent
// we allow the request — denying would break server-to-server callers
// like webhooks. This is consistent with OWASP guidance.

const ALLOWED_ORIGIN_HOSTS = [
  'dermaspace.ng',
  'www.dermaspace.ng',
  'localhost',
  '127.0.0.1',
]

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

function isAllowedHost(host: string): boolean {
  if (ALLOWED_ORIGIN_HOSTS.includes(host)) return true
  // Strip port for localhost dev tunnels.
  const bareHost = host.replace(/:\d+$/, '')
  if (ALLOWED_ORIGIN_HOSTS.includes(bareHost)) return true
  // Vercel preview deployments and the production alias.
  if (host.endsWith('.vercel.app')) return true
  return false
}

/**
 * Reject cross-site state-changing requests.
 * Returns null on success, or a 403 NextResponse to send back.
 */
export function requireSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const requestHost = request.headers.get('host')?.toLowerCase() ?? null

  // No browser context → likely a server-to-server caller (webhooks,
  // QStash, mobile app). Let it through; those callers authenticate
  // with their own headers/secrets, not Origin.
  if (!origin && !referer) return null

  const candidate = origin
    ? hostOf(origin)
    : referer
      ? hostOf(referer)
      : null

  if (!candidate) {
    return NextResponse.json(
      { error: 'Cross-site request blocked.' },
      { status: 403 },
    )
  }

  if (isAllowedHost(candidate)) return null
  // Same host as the incoming request also OK (covers Vercel preview
  // aliases we haven't enumerated, and rewrites where Host == Origin).
  if (requestHost && candidate === requestHost) return null

  return NextResponse.json(
    { error: 'Cross-site request blocked.' },
    { status: 403 },
  )
}

// ---------------------------------------------------------------------------
// JSON body parsing with a hard size cap
// ---------------------------------------------------------------------------
//
// Next.js' default body parser will happily buffer a multi-megabyte
// JSON blob. For text-only public endpoints (contact, feedback,
// newsletter, surveys) that's a free DoS lever — an attacker can pin
// a serverless container by streaming junk. We cap at 16 KB by default,
// which is ~10× larger than the biggest legit payload any of those
// forms ever sends.

export interface ParsedBody<T> {
  ok: true
  data: T
}
export interface ParseError {
  ok: false
  response: NextResponse
}

/**
 * Read + parse a JSON request body with a maximum byte length.
 * Caller pattern:
 *   const parsed = await parseJsonBody<MyShape>(request)
 *   if (!parsed.ok) return parsed.response
 *   const body = parsed.data
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<ParsedBody<T> | ParseError> {
  // Cheap pre-check: trust the Content-Length header to short-circuit
  // before we even read the body. An attacker can lie here, but the
  // post-read length check below catches that case too.
  const declaredLen = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLen) && declaredLen > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 },
      ),
    }
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unable to read request body.' },
        { status: 400 },
      ),
    }
  }

  if (raw.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 },
      ),
    }
  }

  if (!raw) {
    // Some browsers send an empty body for fetch({ method: 'POST' })
    // without a body. Treat as empty object so handlers can still
    // run their validation paths.
    return { ok: true, data: {} as T }
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid JSON.' },
        { status: 400 },
      ),
    }
  }
}

// ---------------------------------------------------------------------------
// Honeypot
// ---------------------------------------------------------------------------
//
// A hidden form input that a real user will never see (display:none /
// aria-hidden / off-screen). Bots that auto-fill every input on the
// page tick the field and out themselves. We pair this with the
// existing rate limit + hCaptcha so we have layered defence:
//   layer 1: honeypot (zero friction for humans)
//   layer 2: rate limit (blocks volume)
//   layer 3: captcha (last resort, only fires on auth + signup)
//
// The CONVENTION is that any client form that wants to opt in posts
// `_hp` — leave empty for humans, populated for bots. We also look at
// `website` because that's a popular WordPress honeypot name and bots
// have learned to fill it.

const HONEYPOT_FIELDS = ['_hp', 'website', 'phone_number_alt'] as const

export function isHoneypotTripped(body: Record<string, unknown> | null | undefined): boolean {
  if (!body || typeof body !== 'object') return false
  for (const key of HONEYPOT_FIELDS) {
    const v = (body as Record<string, unknown>)[key]
    if (typeof v === 'string' && v.trim().length > 0) return true
    if (typeof v === 'number' && v !== 0) return true
    if (typeof v === 'boolean' && v === true) return true
  }
  return false
}

/**
 * Convenience wrapper. Returns a NextResponse to send if the bot
 * tripped the trap, or null to continue.
 *
 * We deliberately return a 200 with `{ success: true }` (NOT a 4xx)
 * so the bot can't tell whether its submission worked. Bot operators
 * tune their scripts off error responses; a quiet 200 means they
 * happily move on and keep us off their radar.
 */
export function honeypotResponse(body: Record<string, unknown> | null | undefined): NextResponse | null {
  if (!isHoneypotTripped(body)) return null
  return NextResponse.json({ success: true })
}

// ---------------------------------------------------------------------------
// withRateLimit — single-line opt-in for any handler
// ---------------------------------------------------------------------------
//
// Rate limiter routes already exist (auth, contact, survey, …) but
// each one rolls its own bucket name and IP extraction. This helper
// centralises that so new routes get the same behaviour for free:
//
//   const rl = await withRateLimit(request, { bucket: 'tickets:reply', limit: 20, windowSec: 60 })
//   if (rl) return rl
//
// `identifier` defaults to the caller's IP. Pass an explicit value
// (e.g. user id, email) when the limit is logically per-user not
// per-network.

export interface RateLimitOptions {
  bucket: string
  limit: number
  windowSec: number
  identifier?: string
}

export async function withRateLimit(
  request: Request,
  opts: RateLimitOptions,
): Promise<NextResponse | null> {
  const ident =
    opts.identifier ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const result = await rateLimit(opts.bucket, ident, opts.limit, opts.windowSec)
  if (result.ok) return null

  const reset = Math.max(0, result.resetAt - Math.floor(Date.now() / 1000))
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(reset),
        'X-RateLimit-Limit': String(opts.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
      },
    },
  )
}
