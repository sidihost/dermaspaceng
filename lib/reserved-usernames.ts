// ---------------------------------------------------------------------------
// lib/reserved-usernames.ts
//
// Single source of truth for "things that look like a username but aren't".
//
// Why this exists
// ---------------
// `app/[username]/page.tsx` is a catch-all dynamic route — every top-level
// path that doesn't match a real page (signin, services, dashboard, …)
// falls into it and tries to render a public profile. For real usernames
// that's correct. For paths like `/register` or `/login` it surfaces a
// misleading "Profile Not Found" and, worse, Google ends up indexing
// those URLs (we found `/register` ranking from old marketing links).
//
// Two distinct concepts live here:
//
// 1. RESERVED_USERNAMES — words nobody is allowed to claim as a handle,
//    even if there's no real route at that path. Username validation
//    (`/api/user/username`, `/api/auth/set-username`) and any "click
//    the byline" logic (e.g. blog post authors) reject these.
//
// 2. ROUTE_ALIASES — common synonyms / typos that *should* redirect
//    to a real page. Visiting `/register` or `/login` shouldn't show
//    "profile not found"; it should send the user to `/signup` or
//    `/signin`. The middleware does this with 308 redirects so search
//    engines update their indexes too.
//
// Both lists are intentionally generous: it's much cheaper to disallow
// a few extra handles than to ship another routing footgun.
// ---------------------------------------------------------------------------

/**
 * Lowercased path segments that are NEVER allowed as a username.
 *
 * Includes:
 *   - every real top-level route in the app (so they keep working)
 *   - obvious admin/auth/system words
 *   - brand identifiers ("dermaspace", "dermaspaceng")
 *   - aliases listed in ROUTE_ALIASES (so e.g. nobody can register the
 *     handle "register" and break the alias redirect we ship below)
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Real top-level routes (keep this in sync with app/*/page.tsx).
  'about',
  'accept-invite',
  'admin',
  'api',
  'blocked',
  'blog',
  'booking',
  'complete-profile',
  'consultation',
  'contact',
  'continue-payment',
  'dashboard',
  'derma-ai',
  'derma-ai-terms',
  'feedback',
  'forgot-password',
  'free-consultation',
  'gallery',
  'gift-cards',
  'laser-tech',
  'locations',
  'maintenance',
  'membership',
  'offline',
  'packages',
  'privacy',
  'reset-password',
  'services',
  'service',
  'signin',
  'signup',
  'staff',
  'survey',
  'terms',
  'verify-email',

  // Common auth/account synonyms — also handled as redirects below,
  // but reserved here so they can't be claimed as handles.
  'login',
  'log-in',
  'log_in',
  'logout',
  'log-out',
  'log_out',
  'register',
  'sign-in',
  'sign_in',
  'sign-up',
  'sign_up',
  'sign-out',
  'sign_out',
  'auth',
  'account',
  'settings',
  'profile',
  'user',
  'users',
  'home',

  // Help / marketing words people often try.
  'help',
  'support',
  'pricing',
  'app',

  // Brand identifiers.
  'dermaspace',
  'dermaspaceng',
])

/**
 * Path segments that should permanently redirect to a real route.
 * Keys are lowercased, values are absolute paths.
 *
 * Used by `middleware.ts` to issue a 308 redirect BEFORE the request
 * ever reaches `[username]/page.tsx`. 308 (rather than 302) is
 * deliberate — it tells Google "this is the canonical URL, update
 * your index" so old indexed links like `/register` eventually
 * disappear from search results.
 */
export const ROUTE_ALIASES: Readonly<Record<string, string>> = {
  // Sign up
  register: '/signup',
  'sign-up': '/signup',
  sign_up: '/signup',

  // Sign in
  login: '/signin',
  'log-in': '/signin',
  log_in: '/signin',
  'sign-in': '/signin',
  sign_in: '/signin',

  // Sign out → bounce back to sign-in (the actual logout flow is at
  // `/api/auth/signout`, but a user who lands on `/logout` directly
  // expects to end up on the sign-in page, not a 404).
  logout: '/signin',
  'log-out': '/signin',
  log_out: '/signin',
  'sign-out': '/signin',
  sign_out: '/signin',

  // Misc convenience
  home: '/',
  account: '/dashboard',
  profile: '/dashboard',
  settings: '/dashboard/settings',
}

/**
 * Returns true if the given handle is reserved (case-insensitive).
 * Use this in any place that previously inlined a hand-written list.
 */
export function isReservedUsername(value: string | null | undefined): boolean {
  if (!value) return false
  return RESERVED_USERNAMES.has(value.toLowerCase())
}

/**
 * Returns the canonical path for a known alias, or `null` if the
 * segment isn't an alias. Designed so middleware can do:
 *
 *   const target = aliasFor(firstSegment)
 *   if (target) return NextResponse.redirect(...)
 */
export function aliasFor(segment: string | null | undefined): string | null {
  if (!segment) return null
  const key = segment.toLowerCase()
  return Object.prototype.hasOwnProperty.call(ROUTE_ALIASES, key)
    ? ROUTE_ALIASES[key]
    : null
}
