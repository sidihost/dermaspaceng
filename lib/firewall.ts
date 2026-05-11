// ---------------------------------------------------------------------------
// Application-level firewall.
//
// Every request (page navigation OR API call) is screened against a
// small set of well-known attack signatures BEFORE any of our route
// handlers run. A hit returns a 403 immediately, so the offending
// request never gets to touch the database, our auth code, or any of
// the business logic.
//
// We deliberately stay conservative — only patterns that have no
// plausible reason to appear in a legitimate Dermaspace request are
// blocked. False positives on a real customer would be worse than a
// missed exotic attack; Vercel's edge WAF + Cloudflare-style
// upstream defences catch the broad strokes, and our per-route rate
// limits + parameterised SQL + cookie-signed sessions cover the
// rest. This file is the "obvious junk goes here" layer.
//
// References for the patterns below:
//   - OWASP ModSecurity Core Rule Set (CRS) v3.x baseline
//   - PortSwigger's well-known scanner UA list
//   - Common WordPress / phpMyAdmin / Git probes hitting Vercel logs
// ---------------------------------------------------------------------------

import type { NextRequest } from 'next/server'

// Paths that scanners hammer looking for misconfigured servers.
// None of these exist in a Next.js app, so anyone asking for them
// is up to no good. We match anywhere in the pathname (case
// insensitive) so a probe like `/wp-admin/install.php` is still
// caught even though it isn't a prefix of `/`.
const BAD_PATH_PATTERNS: RegExp[] = [
  // Env / secret files
  /\/\.env(\.|\/|$)/i,
  /\/\.git(\/|$)/i,
  /\/\.aws(\/|$)/i,
  /\/\.ssh(\/|$)/i,
  /\/\.htaccess$/i,
  /\/\.htpasswd$/i,
  /\/composer\.(json|lock)$/i,
  /\/Dockerfile$/i,
  /\/docker-compose\.ya?ml$/i,
  // PHP / WordPress / phpMyAdmin / Joomla — none of which exist here
  /\/wp-(admin|login|content|includes|json|config)(\/|$|\.)/i,
  /\/xmlrpc\.php$/i,
  /\/phpmyadmin(\/|$)/i,
  /\/pma(\/|$)/i,
  /\/myadmin(\/|$)/i,
  /\.php$/i,
  /\.asp[x]?$/i,
  /\.jsp$/i,
  /\.cgi$/i,
  // Common backup file names left by sloppy deploys
  /\.(bak|backup|old|swp|tmp|sql|sql\.gz|tar|tar\.gz|zip)$/i,
  // Server-status / debug surfaces from other stacks
  /\/server-status$/i,
  /\/actuator(\/|$)/i,
  /\/jmx-console(\/|$)/i,
]

// Patterns that look like a path-traversal or LFI attempt anywhere
// in the URL (pathname or query string). `../`, encoded variants,
// and null-byte tricks all map here.
const TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e[\/\\]/i,
  /%252e%252e/i,
  // Null byte injection
  /%00/,
  // Windows drive letter / UNC tricks
  /[a-z]:\\/i,
  /\\\\[^\\]+\\/, // \\host\share
]

// Heuristic SQL-injection probes. We deliberately keep this list
// SHORT and HIGH-SIGNAL to avoid blocking legitimate URLs (e.g. a
// blog slug containing the word "select" or "from"). Every pattern
// here either:
//   - combines two SQL keywords that have no business appearing in
//     a URL together (`union select`, `waitfor delay`), or
//   - contains a literal quote-and-operator construct that only
//     shows up in injection payloads.
// Body-side SQLi is already blocked by parameterised queries
// everywhere — this layer is purely about GET-style probes.
const SQLI_PATTERNS: RegExp[] = [
  /\bunion\s+(all\s+)?select\b/i,
  /\b(sleep|benchmark|pg_sleep)\s*\(\s*\d/i,
  /\bwaitfor\s+delay\b/i,
  /\bor\s+1\s*=\s*1\b/i,
  /\band\s+1\s*=\s*1\b/i,
  /['"]\s*or\s*['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /['"]\s*;\s*(drop|delete|update|insert)\s+/i,
]

// Reflected-XSS payloads. We allow `<` in normal POST bodies (some
// of our forms accept HTML-ish content via markdown), so this list
// only screens the URL — never request bodies.
const XSS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /\bjavascript:/i,
  /\bon(load|error|click|focus|mouseover)\s*=/i,
  /<iframe[\s>]/i,
  /<svg[^>]*\bon\w+=/i,
  /document\.cookie/i,
  /eval\s*\(/i,
]

// User-Agent substrings that belong to penetration-testing tools
// and mass-vulnerability scanners. We don't block "Headless" or
// "PhantomJS" because those are common in legitimate uptime checks.
const BAD_USER_AGENTS: RegExp[] = [
  /\bsqlmap\b/i,
  /\bnikto\b/i,
  /\bacunetix\b/i,
  /\bnessus\b/i,
  /\bnmap\b/i,
  /\bmasscan\b/i,
  /\bzgrab\b/i,
  /\bwhatweb\b/i,
  /\bwpscan\b/i,
  /\bdirbuster\b/i,
  /\bdirb\b/i,
  /\bgobuster\b/i,
  /\bferoxbuster\b/i,
  /\bnuclei\b/i,
  /\bburp\s*suite/i,
  /\bsemrushbot\b/i, // aggressive, often abused for content scraping
]

export type FirewallVerdict =
  | { allow: true }
  | { allow: false; reason: string; status: number }

/**
 * Inspect a request URL + headers and decide whether to let it
 * through. Pure / sync so it adds essentially zero overhead — we
 * don't touch the DB, network, or cookies.
 */
export function inspectRequest(request: NextRequest): FirewallVerdict {
  const url = request.nextUrl
  const pathname = url.pathname
  // Decode once so encoded payloads (`%27`, `%2e%2e`) get matched
  // alongside their plain-text counterparts. If decoding throws on
  // a malformed sequence, that itself is suspicious — block.
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname + url.search)
  } catch {
    return { allow: false, reason: 'malformed-encoding', status: 400 }
  }

  // 1. Bad paths — quick path-only check first.
  for (const re of BAD_PATH_PATTERNS) {
    if (re.test(pathname)) {
      return { allow: false, reason: 'bad-path', status: 403 }
    }
  }

  // 2. Path traversal / LFI in path OR query
  for (const re of TRAVERSAL_PATTERNS) {
    if (re.test(decoded)) {
      return { allow: false, reason: 'traversal', status: 403 }
    }
  }

  // 3. SQL injection probes in the URL. Body-side SQLi is already
  //    blocked by parameterised queries everywhere — this layer is
  //    a defence-in-depth net for GET-style probes.
  for (const re of SQLI_PATTERNS) {
    if (re.test(decoded)) {
      return { allow: false, reason: 'sqli', status: 403 }
    }
  }

  // 4. Reflected-XSS probes in the URL.
  for (const re of XSS_PATTERNS) {
    if (re.test(decoded)) {
      return { allow: false, reason: 'xss', status: 403 }
    }
  }

  // 5. Scanner / pen-test user agents. Empty UA is fine (many
  //    legitimate server-to-server clients send none).
  const ua = request.headers.get('user-agent') ?? ''
  if (ua) {
    for (const re of BAD_USER_AGENTS) {
      if (re.test(ua)) {
        return { allow: false, reason: 'bad-ua', status: 403 }
      }
    }
  }

  // 6. Sanity cap on URL length. RFC 7230 doesn't fix a limit but
  //    real users top out under ~2k characters. Anything north of
  //    8 KB is a buffer-overflow / log-spam attempt.
  if (pathname.length + url.search.length > 8192) {
    return { allow: false, reason: 'oversize-url', status: 414 }
  }

  return { allow: true }
}
