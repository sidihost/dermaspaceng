import { NextRequest, NextResponse } from 'next/server'
import { getTenantByPublicKey, isTenantActive } from '@/lib/saas-auth'

// Public endpoint. The embed script fetches branding by public key so it
// can render the launcher + panel in the tenant's colors before any
// message is sent. CORS-open because it runs on third-party origins.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') ?? ''
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400, headers: CORS })
  }

  const tenant = await getTenantByPublicKey(key)
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown key' }, { status: 404, headers: CORS })
  }

  return NextResponse.json(
    {
      brandName: tenant.brand_name,
      assistantName: tenant.assistant_name,
      brandColor: tenant.brand_color,
      welcomeMessage: tenant.welcome_message,
      logoUrl: tenant.logo_url,
      launcherLabel: tenant.launcher_label,
      active: isTenantActive(tenant),
    },
    { headers: CORS },
  )
}
