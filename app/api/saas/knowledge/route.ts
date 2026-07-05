import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/saas-auth'
import { saasSql } from '@/lib/saas-db'
import { upsertTenantKnowledge } from '@/lib/vector'

// GET /api/saas/knowledge — list this tenant's training entries.
export async function GET() {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const rows = await saasSql`
      SELECT id, question, answer, created_at, updated_at
      FROM derma_saas_knowledge
      WHERE tenant_id = ${tenant.id}
      ORDER BY created_at DESC
    `
    return NextResponse.json({ entries: rows })
  } catch (err) {
    console.error('[saas/knowledge] list failed:', err)
    return NextResponse.json({ entries: [] })
  }
}

// POST /api/saas/knowledge — add a Q&A training entry. Persists to
// Postgres AND indexes it into the tenant's private vector namespace so
// the widget can retrieve it immediately.
export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const rows = await saasSql`
      INSERT INTO derma_saas_knowledge (tenant_id, question, answer)
      VALUES (${tenant.id}, ${question}, ${answer})
      RETURNING id, question, answer, created_at, updated_at
    `
    const entry = rows[0]
    await upsertTenantKnowledge(tenant.id, {
      id: entry.id as string,
      question,
      answer,
    })
    return NextResponse.json({ entry })
  } catch (err) {
    console.error('[saas/knowledge] create failed:', err)
    return NextResponse.json({ error: 'Could not save this entry.' }, { status: 500 })
  }
}
