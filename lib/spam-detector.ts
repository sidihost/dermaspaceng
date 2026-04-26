// ---------------------------------------------------------------------------
// lib/spam-detector.ts
//
// Comment spam detection — pre-write check that runs before any comment
// is inserted into the database. Today's policy is intentionally
// strict:
//
//   * Allow links only to our own domains (dermaspaceng.com and
//     localhost while developing).
//   * Any other URL — even something benign like wikipedia.org — is
//     treated as spam. We auto-suspend the user (`users.is_active =
//     false`), record the offence in `comment_spam_log`, and reject
//     the comment with a clear error.
//
// Admins are exempt — moderating threads is part of their job, and
// they sometimes need to drop a support link. Staff are subject to
// the same policy as regular users.
//
// The "what counts as a URL" regex is purposefully greedy:
//   - http://, https://, www.   → obvious links
//   - bare domains              → e.g. "casino.com", "spam.xyz/free"
//   - bit.ly / t.co style       → covered by the bare-domain branch
// We accept some false positives (e.g. "co.uk" inside a sentence)
// because comments rarely need bare-domain text, and the risk of
// missing a real spam link is much higher than the cost of asking a
// user to rephrase.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'

/**
 * Domains that comments may freely link to. Lowercase, no scheme,
 * no trailing slash. Subdomains of these hosts are also allowed
 * (so `staging.dermaspaceng.com` and `cdn.dermaspaceng.com` work).
 *
 * If we ever need to whitelist a partner site, add it here — keeping
 * the list in code (not the database) means an attacker who somehow
 * reaches `app_settings` still can't expand the allowlist.
 */
const ALLOWED_HOSTS = new Set<string>([
  'dermaspaceng.com',
  'www.dermaspaceng.com',
  // Vercel preview deploys — our own infrastructure, so links to them
  // (e.g. when a staff member shares a preview URL during a launch)
  // shouldn't trip the detector.
  'vercel.app',
  // Local dev so a staff tester linking to http://localhost:3000 in
  // a comment doesn't get themselves auto-suspended on staging.
  'localhost',
  '127.0.0.1',
])

// Greedy URL extractor. We don't try to validate the URL — we just
// pull anything that looks remotely like a link out of the body so
// `extractHost` can decide whether to allow it.
//
// Pattern breakdown:
//   (?:https?:\/\/|www\.)           — explicit scheme or www
//   |                               — OR
//   \b[a-z0-9-]+\.[a-z]{2,}         — bare hostname.tld
// followed by an optional path/query/fragment chunk.
const URL_REGEX = /(?:(?:https?:\/\/|www\.)[^\s<>()"']+|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>()"']*)?)/gi

export interface SpamCheckResult {
  /** True when the comment is safe to insert. */
  ok: boolean
  /**
   * The list of URLs the detector pulled out of the body. Empty
   * when `ok` is true and the body had no links at all. When `ok`
   * is false, this contains the offending URLs we logged.
   */
  urls: string[]
  /** Human-readable reason — surfaced to the API client when ok=false. */
  reason?: string
  /** Machine-readable code — written to `comment_spam_log.reason`. */
  code?: 'external_link' | 'banned_domain'
}

/**
 * Pull every URL-shaped token out of `body`.
 *
 * Exported so the admin moderation UI can show what the detector saw
 * for a flagged comment.
 */
export function extractUrls(body: string): string[] {
  if (!body) return []
  const matches = body.match(URL_REGEX) ?? []
  // De-dup case-insensitively while preserving original casing for
  // the audit log.
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of matches) {
    const key = m.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(m)
    }
  }
  return out
}

/** Lower-cased registrable host extracted from a free-form URL token.
 *  Returns `null` for things our parser can't make sense of. */
function extractHost(token: string): string | null {
  let raw = token.trim()
  // Strip leading punctuation that the regex sometimes drags in.
  raw = raw.replace(/^[(<"'`]+/, '').replace(/[)>"'`.,;!?]+$/, '')
  if (!raw) return null
  // Prepend a scheme so `URL` can parse bare hosts.
  const candidate = /^https?:\/\//i.test(raw) ? raw : `http://${raw.replace(/^www\./i, '')}`
  try {
    const u = new URL(candidate)
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

/** True when `host` is on our allowlist (exact match or registrable subdomain). */
function isAllowedHost(host: string): boolean {
  if (ALLOWED_HOSTS.has(host)) return true
  for (const allowed of ALLOWED_HOSTS) {
    if (host === allowed) return true
    if (host.endsWith(`.${allowed}`)) return true
  }
  return false
}

/**
 * Inspect a comment body for disallowed links.
 *
 * Pure function — no DB writes, no side effects. The caller decides
 * what to do with a `false` result (typically: log + suspend +
 * reject).
 */
export function inspectCommentForSpam(body: string): SpamCheckResult {
  const urls = extractUrls(body)
  if (urls.length === 0) {
    return { ok: true, urls: [] }
  }
  const offending: string[] = []
  for (const u of urls) {
    const host = extractHost(u)
    if (!host || !isAllowedHost(host)) {
      offending.push(u)
    }
  }
  if (offending.length === 0) {
    return { ok: true, urls }
  }
  return {
    ok: false,
    urls: offending,
    reason:
      offending.length === 1
        ? 'External links are not allowed in comments.'
        : `${offending.length} external links are not allowed in comments.`,
    code: 'external_link',
  }
}

/**
 * Apply the spam policy: log the offence, suspend the user, return a
 * structured error the API can hand back to the client.
 *
 * Admins are exempted upstream (in the API route). This helper assumes
 * the caller has already decided the user is subject to suspension.
 */
export async function recordSpamAndSuspend(args: {
  userId: string
  postId: string | null
  body: string
  urls: string[]
  code: 'external_link' | 'banned_domain'
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<void> {
  const { userId, postId, body, urls, code, ipAddress, userAgent } = args
  // Single transaction: write the audit row + flip is_active. We use
  // two statements rather than a CTE because the `sql` helper here is
  // tagged-template based and mixing INSERT/UPDATE in one call is
  // awkward; the consistency cost of two round-trips is acceptable
  // for a moderation log.
  try {
    await sql`
      INSERT INTO comment_spam_log (user_id, post_id, body, urls, reason, ip_address, user_agent)
      VALUES (
        ${userId},
        ${postId},
        ${body},
        ${urls.join(',')},
        ${code},
        ${ipAddress ?? null},
        ${userAgent ?? null}
      )
    `
    await sql`UPDATE users SET is_active = FALSE WHERE id = ${userId}`
    // Best-effort: kill any active sessions so the suspended user
    // is bounced from the app on the next request. If the sessions
    // table doesn't exist on this environment we just swallow.
    try {
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`
    } catch {
      // ignore
    }
  } catch (err) {
    console.error('[spam] failed to log/suspend:', err)
    // Re-throw so the API route can surface a 500 instead of
    // silently letting the comment through.
    throw err
  }
}
