import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureAccountAppealsTable } from '@/lib/suspension-appeals-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await ensureAccountAppealsTable()

    const statusParam = request.nextUrl.searchParams.get('status') || 'pending'
    const userIdParam = request.nextUrl.searchParams.get('userId') || ''
    const search = (request.nextUrl.searchParams.get('search') || '').trim()

    const statusFilter =
      statusParam === 'pending' || statusParam === 'approved' || statusParam === 'rejected'
        ? statusParam
        : ''

    const appeals = (await sql`
      SELECT
        a.id,
        a.user_id,
        a.user_email,
        a.user_name,
        a.user_role,
        a.suspension_reason,
        a.appeal_message,
        a.contact_email,
        a.status,
        a.reviewed_by,
        a.review_note,
        a.reviewed_at,
        a.created_at,
        a.updated_at,
        u.first_name,
        u.last_name,
        u.avatar_url,
        COALESCE(u.is_active, TRUE) AS user_is_active,
        u.role AS current_user_role,
        TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) AS reviewer_name
      FROM account_appeals a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN users r ON r.id = a.reviewed_by
      WHERE
        (${statusFilter} = '' OR a.status = ${statusFilter})
        AND (${userIdParam} = '' OR a.user_id = ${userIdParam})
        AND (
          ${search} = ''
          OR LOWER(COALESCE(a.user_name, '')) LIKE LOWER(${'%' + search + '%'})
          OR LOWER(COALESCE(a.user_email, '')) LIKE LOWER(${'%' + search + '%'})
          OR LOWER(a.id) LIKE LOWER(${'%' + search + '%'})
        )
      ORDER BY
        CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END,
        a.created_at DESC
      LIMIT 100
    `) as Array<Record<string, unknown>>

    const countRows = (await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM account_appeals
    `) as Array<{ total: number; pending: number; approved: number; rejected: number }>

    const counts = countRows[0] ?? { total: 0, pending: 0, approved: 0, rejected: 0 }

    return NextResponse.json({
      appeals,
      counts: {
        total: Number(counts.total ?? 0),
        pending: Number(counts.pending ?? 0),
        approved: Number(counts.approved ?? 0),
        rejected: Number(counts.rejected ?? 0),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized:')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[api/admin/appeals] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load appeals' },
      { status: 500 },
    )
  }
}
