import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ensureSaasSchema } from '@/lib/saas-db'

// GET /api/admin/saas/tenants — platform admin view of all licensed
// companies, with training + conversation counts.
export async function GET() {
  try {
    await requireAdmin()
    await ensureSaasSchema()

    const rows = await sql`
      SELECT
        t.id, t.company_name, t.contact_name, t.contact_email, t.public_key,
        t.status, t.plan_price_kobo, t.subscription_expires_at,
        t.created_at, t.activated_at,
        (SELECT COUNT(*)::int FROM derma_saas_knowledge k WHERE k.tenant_id = t.id) AS knowledge_count,
        (SELECT COUNT(*)::int FROM derma_saas_conversations c WHERE c.tenant_id = t.id) AS conversation_count
      FROM derma_saas_tenants t
      ORDER BY t.created_at DESC
    `
    return NextResponse.json({ tenants: rows })
  } catch (err) {
    console.error('[admin/saas/tenants] list failed:', err)
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 })
  }
}
