import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/saas-auth'
import { saasSql } from '@/lib/saas-db'

// GET /api/saas/conversations — recent widget transcripts for the
// signed-in tenant, newest first. Paginated with ?limit= & ?offset=.
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '30', 10) || 30, 1), 100)
  const offset = Math.max(parseInt(params.get('offset') ?? '0', 10) || 0, 0)

  try {
    const rows = await saasSql`
      SELECT id, visitor_id, user_message, ai_reply, created_at
      FROM derma_saas_conversations
      WHERE tenant_id = ${tenant.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const totalRows = await saasSql`
      SELECT COUNT(*)::int AS c FROM derma_saas_conversations WHERE tenant_id = ${tenant.id}
    `
    return NextResponse.json({
      conversations: rows,
      total: totalRows[0]?.c ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[saas/conversations] list failed:', err)
    return NextResponse.json({ error: 'Could not load conversations.' }, { status: 500 })
  }
}
