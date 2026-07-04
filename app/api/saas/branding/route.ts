import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/saas-auth'
import { sql } from '@/lib/db'

// PUT /api/saas/branding — update the tenant's rebranding + AI context.
export async function PUT(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const str = (v: unknown, max: number, fallback = '') =>
    typeof v === 'string' ? v.trim().slice(0, max) : fallback

  const brandName = str(body.brandName, 120) || tenant.brand_name
  const assistantName = str(body.assistantName, 120) || tenant.assistant_name
  const welcomeMessage = str(body.welcomeMessage, 500) || tenant.welcome_message
  const launcherLabel = str(body.launcherLabel, 60) || tenant.launcher_label
  const businessContext = str(body.businessContext, 4000)
  const logoUrl = str(body.logoUrl, 1000)
  const allowedDomains = str(body.allowedDomains, 1000)

  // Validate hex color; fall back to the current value if malformed.
  const rawColor = str(body.brandColor, 9)
  const brandColor = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(rawColor)
    ? rawColor
    : tenant.brand_color

  try {
    await sql`
      UPDATE derma_saas_tenants SET
        brand_name = ${brandName},
        assistant_name = ${assistantName},
        brand_color = ${brandColor},
        welcome_message = ${welcomeMessage},
        launcher_label = ${launcherLabel},
        business_context = ${businessContext || null},
        logo_url = ${logoUrl || null},
        allowed_domains = ${allowedDomains || null},
        updated_at = NOW()
      WHERE id = ${tenant.id}
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[saas/branding] update failed:', err)
    return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 })
  }
}
