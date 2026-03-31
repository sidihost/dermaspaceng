import { NextRequest, NextResponse } from 'next/server'

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

export function middleware(request: NextRequest) {
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
