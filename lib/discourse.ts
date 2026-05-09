// ---------------------------------------------------------------------------
// Discourse integration (lib/discourse.ts)
// ---------------------------------------------------------------------------
// Server-only helpers that wrap two Discourse surfaces:
//
//   1. DiscourseConnect (formerly "Discourse SSO")
//      - Single sign-on so a Dermaspace account is the one identity that
//        also logs the user into our community forum. The handshake is
//        a base64+HMAC-SHA256 dance described at
//        https://meta.discourse.org/t/discourse-connect-official-single-sign-on-for-discourse/13045
//
//   2. The Discourse read-only HTTP API
//      - We fetch latest topics, categories, and forum stats so the
//        /community page on dermaspaceng.com can render live counts and
//        a recent-topics feed without iframing the whole forum.
//
// Configuration (env vars, set in Vercel):
//   DISCOURSE_URL            e.g. https://community.dermaspaceng.com
//   DISCOURSE_SSO_SECRET     shared secret matching `discourse connect secret`
//   DISCOURSE_API_KEY        all-users read API key
//   DISCOURSE_API_USERNAME   defaults to "system"
//
// All public functions are safe to call when env vars are missing — they
// return `null`/`[]` and surface a clear `configured` flag so the UI can
// show a "coming soon" state without crashing the page.
// ---------------------------------------------------------------------------

import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DISCOURSE_URL = (process.env.DISCOURSE_URL || '').replace(/\/$/, '')
const DISCOURSE_SSO_SECRET = process.env.DISCOURSE_SSO_SECRET || ''
const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY || ''
const DISCOURSE_API_USERNAME = process.env.DISCOURSE_API_USERNAME || 'system'

/** True when we have enough config to read from the public API. */
export function discourseReadConfigured(): boolean {
  return Boolean(DISCOURSE_URL)
}

/** True when we can sign DiscourseConnect SSO payloads. */
export function discourseSsoConfigured(): boolean {
  return Boolean(DISCOURSE_URL && DISCOURSE_SSO_SECRET)
}

/** Public base URL of the forum, never with a trailing slash. */
export function discourseBaseUrl(): string {
  return DISCOURSE_URL
}

// ---------------------------------------------------------------------------
// SSO helpers (DiscourseConnect)
// ---------------------------------------------------------------------------
// Discourse expects:
//   payload  = base64(URLSearchParams string with at least { nonce, ... }))
//   sig      = hex( HMAC_SHA256(secret, payload) )
//
// On INBOUND (Discourse redirects the user to /api/community/sso?sso=...&sig=...)
// we verify sig, decode the payload, extract the nonce + return_sso_url, then
// re-sign a NEW payload that contains the logged-in Dermaspace user's
// identity and redirect the browser back to Discourse.
// ---------------------------------------------------------------------------

function hmacHex(payload: string): string {
  return createHmac('sha256', DISCOURSE_SSO_SECRET).update(payload).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

/** Verify an inbound `?sso=...&sig=...` from Discourse. */
export function verifySsoRequest(
  sso: string,
  sig: string,
): { ok: true; nonce: string; returnSsoUrl: string } | { ok: false; reason: string } {
  if (!discourseSsoConfigured()) {
    return { ok: false, reason: 'sso_not_configured' }
  }
  if (!sso || !sig) return { ok: false, reason: 'missing_params' }
  const expected = hmacHex(sso)
  if (!safeEqualHex(expected, sig)) {
    return { ok: false, reason: 'bad_signature' }
  }
  let decoded: string
  try {
    decoded = Buffer.from(sso, 'base64').toString('utf-8')
  } catch {
    return { ok: false, reason: 'bad_payload' }
  }
  const params = new URLSearchParams(decoded)
  const nonce = params.get('nonce')
  const returnSsoUrl = params.get('return_sso_url')
  if (!nonce || !returnSsoUrl) {
    return { ok: false, reason: 'missing_nonce' }
  }
  // Defensive: only accept return_sso_url that points back to the same
  // Discourse host we're configured to talk to. Stops a malicious
  // initiator from using us as a generic signing oracle.
  try {
    const u = new URL(returnSsoUrl)
    const expectedHost = new URL(DISCOURSE_URL).host
    if (u.host !== expectedHost) {
      return { ok: false, reason: 'host_mismatch' }
    }
  } catch {
    return { ok: false, reason: 'bad_return_url' }
  }
  return { ok: true, nonce, returnSsoUrl }
}

export interface DiscourseSsoUser {
  /** Stable id for our user (we use `external_id` so Discourse keys to it). */
  externalId: string
  email: string
  username?: string
  name?: string
  avatarUrl?: string
  admin?: boolean
  moderator?: boolean
  /** Optional comma-separated list of group names to add the user to. */
  addGroups?: string[]
}

/** Build the redirect URL back to Discourse with the signed user payload. */
export function buildSsoRedirect(nonce: string, returnSsoUrl: string, user: DiscourseSsoUser): string {
  const params = new URLSearchParams()
  params.set('nonce', nonce)
  params.set('external_id', user.externalId)
  params.set('email', user.email)
  if (user.username) params.set('username', user.username)
  if (user.name) params.set('name', user.name)
  if (user.avatarUrl) params.set('avatar_url', user.avatarUrl)
  // Force avatar refresh so a profile picture change in Dermaspace
  // propagates next time the user hits SSO. Cheap on Discourse's side.
  if (user.avatarUrl) params.set('avatar_force_update', 'true')
  if (user.admin) params.set('admin', 'true')
  if (user.moderator) params.set('moderator', 'true')
  if (user.addGroups && user.addGroups.length) {
    params.set('add_groups', user.addGroups.join(','))
  }

  const payload = Buffer.from(params.toString(), 'utf-8').toString('base64')
  const sig = hmacHex(payload)

  // Discourse can give us either a path-style return URL (`/session/sso_login`)
  // or a fully-qualified one. URLSearchParams handles both because we
  // re-use the URL object.
  const returnUrl = new URL(returnSsoUrl)
  returnUrl.searchParams.set('sso', payload)
  returnUrl.searchParams.set('sig', sig)
  return returnUrl.toString()
}

/**
 * Build an OUTBOUND SSO init URL — i.e. when our website is the one
 * initiating the handshake (e.g. the user clicks "Join discussion" on
 * /community while logged in). We hand Discourse a freshly-signed
 * payload containing a return URL pointing back to our SSO endpoint so
 * the round-trip completes seamlessly.
 *
 * In practice most flows use Discourse-initiated SSO, but this lets us
 * deep-link "Sign in to community" buttons too.
 */
export function buildSsoInitUrl(returnTo: string): string | null {
  if (!discourseSsoConfigured()) return null
  const nonce = randomBytes(16).toString('hex')
  const params = new URLSearchParams({ nonce, return_sso_url: returnTo })
  const payload = Buffer.from(params.toString(), 'utf-8').toString('base64')
  const sig = hmacHex(payload)
  return `${DISCOURSE_URL}/session/sso?sso=${encodeURIComponent(payload)}&sig=${sig}`
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------
// All `fetchX` functions below use Next.js's fetch cache — `revalidate: 60`
// means a fresh hit at most once a minute per route, which is plenty for a
// community feed. They are deliberately fail-soft: any non-2xx response or
// thrown error returns a safe default rather than throwing.
// ---------------------------------------------------------------------------

async function discourseGet<T>(path: string, revalidate = 60): Promise<T | null> {
  if (!DISCOURSE_URL) return null
  try {
    const url = `${DISCOURSE_URL}${path}`
    const res = await fetch(url, {
      headers: DISCOURSE_API_KEY
        ? {
            'Api-Key': DISCOURSE_API_KEY,
            'Api-Username': DISCOURSE_API_USERNAME,
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
      next: { revalidate, tags: ['community'] },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (err) {
    console.error('[discourse] fetch failed:', path, err)
    return null
  }
}

export interface DiscourseLatestTopic {
  id: number
  title: string
  slug: string
  posts_count: number
  reply_count: number
  views: number
  like_count: number
  created_at: string
  last_posted_at: string
  category_id: number
  pinned: boolean
}

export async function fetchLatestTopics(limit = 8): Promise<DiscourseLatestTopic[]> {
  const data = await discourseGet<{ topic_list?: { topics?: DiscourseLatestTopic[] } }>('/latest.json')
  const topics = data?.topic_list?.topics ?? []
  return topics.slice(0, limit)
}

export interface DiscourseCategory {
  id: number
  name: string
  slug: string
  color: string
  text_color: string
  description_excerpt?: string
  topic_count: number
  post_count: number
}

export async function fetchCategories(): Promise<DiscourseCategory[]> {
  const data = await discourseGet<{ category_list?: { categories?: DiscourseCategory[] } }>(
    '/categories.json',
  )
  return data?.category_list?.categories ?? []
}

export interface DiscourseAboutStats {
  user_count: number
  topic_count: number
  post_count: number
  active_users_30_days: number
}

export async function fetchAboutStats(): Promise<DiscourseAboutStats | null> {
  const data = await discourseGet<{ about?: { stats?: DiscourseAboutStats } }>('/about.json')
  return data?.about?.stats ?? null
}

/** Build a public-facing topic URL for the website to link to. */
export function topicUrl(t: { id: number; slug: string }): string {
  return `${DISCOURSE_URL}/t/${t.slug}/${t.id}`
}
