import { NextResponse } from 'next/server'
import { getCurrentTenant, isTenantActive } from '@/lib/saas-auth'
import { saasSql } from '@/lib/saas-db'

// GET /api/saas/me — current tenant profile + light usage stats for the
// dashboard header.
export async function GET() {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let knowledgeCount = 0
  let conversationCount = 0
  try {
    const k = await saasSql`SELECT COUNT(*)::int AS c FROM derma_saas_knowledge WHERE tenant_id = ${tenant.id}`
    knowledgeCount = k[0]?.c ?? 0
    const c = await saasSql`SELECT COUNT(*)::int AS c FROM derma_saas_conversations WHERE tenant_id = ${tenant.id}`
    conversationCount = c[0]?.c ?? 0
  } catch {
    /* stats are best-effort */
  }

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      companyName: tenant.company_name,
      contactName: tenant.contact_name,
      contactEmail: tenant.contact_email,
      publicKey: tenant.public_key,
      status: tenant.status,
      active: isTenantActive(tenant),
      subscriptionExpiresAt: tenant.subscription_expires_at,
      brandName: tenant.brand_name,
      assistantName: tenant.assistant_name,
      brandColor: tenant.brand_color,
      welcomeMessage: tenant.welcome_message,
      logoUrl: tenant.logo_url,
      businessContext: tenant.business_context,
      launcherLabel: tenant.launcher_label,
      allowedDomains: tenant.allowed_domains,
      createdAt: tenant.created_at,
    },
    stats: { knowledgeCount, conversationCount },
  })
}
