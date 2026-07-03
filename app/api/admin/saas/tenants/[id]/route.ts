import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ensureSaasSchema } from '@/lib/saas-db'

// PATCH /api/admin/saas/tenants/[id] — activate / suspend / renew a
// tenant's ₦35,000/yr subscription. Activation stamps a one-year expiry.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    await ensureSaasSchema()
    const { id } = await params

    let body: { action?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const action = body.action
    if (action === 'activate') {
      const rows = await sql`
        UPDATE derma_saas_tenants
        SET status = 'active',
            activated_at = COALESCE(activated_at, NOW()),
            subscription_expires_at = NOW() + INTERVAL '1 year',
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status, subscription_expires_at
      `
      if (rows.length === 0) return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 })
      return NextResponse.json({ tenant: rows[0] })
    }

    if (action === 'suspend') {
      const rows = await sql`
        UPDATE derma_saas_tenants
        SET status = 'suspended', updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status
      `
      if (rows.length === 0) return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 })
      return NextResponse.json({ tenant: rows[0] })
    }

    if (action === 'renew') {
      const rows = await sql`
        UPDATE derma_saas_tenants
        SET status = 'active',
            subscription_expires_at = GREATEST(subscription_expires_at, NOW()) + INTERVAL '1 year',
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status, subscription_expires_at
      `
      if (rows.length === 0) return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 })
      return NextResponse.json({ tenant: rows[0] })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    console.error('[admin/saas/tenants] patch failed:', err)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}

// DELETE /api/admin/saas/tenants/[id] — permanently remove a tenant and
// all its data (knowledge + conversations cascade via FKs).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    await ensureSaasSchema()
    const { id } = await params
    await sql`DELETE FROM derma_saas_tenants WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/saas/tenants] delete failed:', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
