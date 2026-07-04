import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/saas-auth'
import { sql } from '@/lib/db'
import { upsertTenantKnowledge, deleteTenantKnowledge } from '@/lib/vector'

// PUT /api/saas/knowledge/[id] — edit an existing training entry.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { question?: string; answer?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const question = (body.question ?? '').trim().slice(0, 1000)
  const answer = (body.answer ?? '').trim().slice(0, 8000)
  if (!question || !answer) {
    return NextResponse.json({ error: 'Both a question and an answer are required.' }, { status: 400 })
  }

  try {
    const rows = await sql`
      UPDATE derma_saas_knowledge
      SET question = ${question}, answer = ${answer}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenant.id}
      RETURNING id, question, answer, created_at, updated_at
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
    }
    await upsertTenantKnowledge(tenant.id, { id, question, answer })
    return NextResponse.json({ entry: rows[0] })
  } catch (err) {
    console.error('[saas/knowledge] update failed:', err)
    return NextResponse.json({ error: 'Could not update this entry.' }, { status: 500 })
  }
}

// DELETE /api/saas/knowledge/[id] — remove a training entry from both
// Postgres and the tenant's vector namespace.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const rows = await sql`
      DELETE FROM derma_saas_knowledge
      WHERE id = ${id} AND tenant_id = ${tenant.id}
      RETURNING id
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
    }
    await deleteTenantKnowledge(tenant.id, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[saas/knowledge] delete failed:', err)
    return NextResponse.json({ error: 'Could not delete this entry.' }, { status: 500 })
  }
}
