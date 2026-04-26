import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Supported countries with their currencies
const SUPPORTED_COUNTRIES: Record<string, { currency: string; symbol: string; name: string }> = {
  NG: { currency: 'NGN', symbol: '₦', name: 'Nigeria' },
  GB: { currency: 'GBP', symbol: '£', name: 'United Kingdom' },
  US: { currency: 'USD', symbol: '$', name: 'United States' },
  AE: { currency: 'AED', symbol: 'د.إ', name: 'UAE' },
  GH: { currency: 'GHS', symbol: '₵', name: 'Ghana' },
  ZA: { currency: 'ZAR', symbol: 'R', name: 'South Africa' },
}

// Blocked countries
const BLOCKED_COUNTRIES = ['IN']

// ---------------------------------------------------------------------------
// Maintenance-mode gate
//
// On every navigation request we ask the database whether the
// `maintenance.enabled` flag is set. The DB query is cached at module
// scope for 5s so we don't hammer Neon on every page load — even on a
// busy day this is a single round-trip every few seconds per edge
// instance. When the flag is off, the cache returns false instantly.
//
// Admins are exempt: they can keep working through the dashboard and
// the admin console while the public site is locked. We identify
// admins by reading their `session_id` cookie and joining sessions →
// users in one query.
// ---------------------------------------------------------------------------

interface MaintenanceCacheEntry {
  enabled: boolean
  expiresAt: number
}
let maintenanceCache: MaintenanceCacheEntry | null = null
const MAINTENANCE_CACHE_TTL_MS = 5_000

async function isMaintenanceEnabled(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  if (maintenanceCache && maintenanceCache.expiresAt > Date.now()) {
    return maintenanceCache.enabled
  }
  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT value FROM app_settings WHERE key = 'maintenance' LIMIT 1`
    const value = rows[0]?.value as { enabled?: boolean } | undefined
    const enabled = value?.enabled === true
    maintenanceCache = {
      enabled,
      expiresAt: Date.now() + MAINTENANCE_CACHE_TTL_MS,
    }
    return enabled
  } catch (err) {
    console.warn('[middleware] maintenance lookup failed:', err)
    return false
  }
}

// Cache the role lookup briefly per session id so a logged-in admin
// browsing pages while maintenance is active doesn't trigger a DB
// round-trip per page. 30s is plenty — the cost of a stale "admin"
// label for half a minute is acceptable; if we cared, we could
// invalidate on logout, but session deletion is rare and the worst
// case is "an admin who just logged out can still see the site for
// 30s after logout", which is fine.
interface RoleCacheEntry {
  role: string
  expiresAt: number
}
const roleCache = new Map<string, RoleCacheEntry>()
const ROLE_CACHE_TTL_MS = 30_000

async function getSessionRole(sessionId: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null
  const cached = roleCache.get(sessionId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role
  }
  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      SELECT u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      LIMIT 1
    `
    const role = (rows[0]?.role as string | undefined) ?? null
    if (role) {
      roleCache.set(sessionId, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS })
    }
    return role
  } catch (err) {
    console.warn('[middleware] role lookup failed:', err)
    return null
  }
}

// Routes that stay reachable even while maintenance is enabled. We
// keep the admin surface open (so admins can flip the flag back off
// from a phone) and the public auth screens (so an admin who isn't
// signed in yet can still log in and toggle).
function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname === '/maintenance' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/blocked') ||
    // Static + framework — already excluded by the matcher below, but
    // listing them here makes the intent explicit and protects us if
    // the matcher ever loosens.
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and already locale-prefixed paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/blocked') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Get country from Vercel's geo headers (works on Vercel deployment)
  const country = request.geo?.country || request.headers.get('x-vercel-ip-country') || 'NG'

  // Block India
  if (BLOCKED_COUNTRIES.includes(country) && !pathname.startsWith('/blocked')) {
    return NextResponse.redirect(new URL('/blocked', request.url))
  }

  // Maintenance gate — runs after geo-blocking so an admin in a
  // blocked country still hits /blocked first (which is the policy
  // we want — geo block is unconditional).
  if (!isMaintenanceExempt(pathname) && (await isMaintenanceEnabled())) {
    const sessionId = request.cookies.get('session_id')?.value
    const role = sessionId ? await getSessionRole(sessionId) : null
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }

  // Set geo cookies for client-side access
  const response = NextResponse.next()

  const countryData = SUPPORTED_COUNTRIES[country] || SUPPORTED_COUNTRIES['NG']

  response.cookies.set('geo_country', country, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  response.cookies.set('geo_currency', countryData.currency, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  response.cookies.set('geo_country_name', countryData.name, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
