import { NextRequest, NextResponse } from 'next/server'
import {
  extractPublicClientIp,
  isCountryBlocked,
  lookupCountryByIp,
  resolveRequestCountry,
} from '@/lib/geo-blocking'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestGeoCountry = (request as NextRequest & { geo?: { country?: string } }).geo?.country
  let country = resolveRequestCountry(request.headers, requestGeoCountry)
  let source: 'header' | 'ip' | 'none' = country ? 'header' : 'none'

  if (!country) {
    const clientIp = extractPublicClientIp(request.headers)
    if (clientIp) {
      country = await lookupCountryByIp(clientIp)
      if (country) {
        source = 'ip'
      }
    }
  }

  const blocked = isCountryBlocked(country)

  return NextResponse.json(
    {
      country,
      detected: Boolean(country),
      blocked,
      source,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  )
}
