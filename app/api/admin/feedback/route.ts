import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'

/**
 * Admin feedback inbox. Mirrors the shape of /api/admin/complaints so
 * the frontend list / filter / status update patterns can be reused.
 *
 *   GET  /api/admin/feedback    – paginated list with filters
 *   PUT  /api/admin/feedback    – update status (new | in_review | actioned | closed)
 *
 * Filters: ?status=…&category=…&experience=…&q=…&page=1&limit=20
 */

const ALLOWED_STATUS = ['new', 'in_review', 'actioned', 'closed']

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const params = request.nextUrl.searchParams
    const status = params.get('status') || ''
    const category = params.get('category') || ''
    const experience = params.get('experience') || ''
    const q = params.get('q')?.trim() || ''
    const page = Math.max(1, parseInt(params.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20')))
    const offset = (page - 1) * limit

    // We use the optional-filter trick (`'' OR col = val`) so the
    // same prepared statement covers every filter combination — no
    // string-concatenated SQL, no injection risk.
    const rows = await sql`
      SELECT
        f.id,
        f.user_id,
        f.name,
        f.email,
        f.category,
        f.experience,
        f.rating,
        f.message,
        f.status,
        f.source,
        f.created_at,
        f.reviewed_at,
        u.first_name AS account_first_name,
        u.last_name  AS account_last_name,
        u.avatar_url AS account_avatar_url,
        u.email      AS account_email
      FROM feedback_submissions f
      LEFT JOIN users u ON u.id = f.user_id
      WHERE
        (${status}     = '' OR f.status     = ${status})
        AND (${category}   = '' OR f.category   = ${category})
        AND (${experience} = '' OR f.experience = ${experience})
        AND (
          ${q} = ''
          OR f.message ILIKE ${'%' + q + '%'}
          OR f.email   ILIKE ${'%' + q + '%'}
          OR f.name    ILIKE ${'%' + q + '%'}
        )
      ORDER BY f.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const totalRow = await sql`
      SELECT COUNT(*)::int AS total
      FROM feedback_submissions f
      WHERE
        (${status}     = '' OR f.status     = ${status})
        AND (${category}   = '' OR f.category   = ${category})
        AND (${experience} = '' OR f.experience = ${experience})
        AND (
          ${q} = ''
          OR f.message ILIKE ${'%' + q + '%'}
          OR f.email   ILIKE ${'%' + q + '%'}
          OR f.name    ILIKE ${'%' + q + '%'}
        )
    `
    const total = (totalRow[0]?.total as number) ?? 0

    // Aggregate counts so the admin can see a per-status badge.
    const counts = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM feedback_submissions
      GROUP BY status
    `
    const statusCounts: Record<string, number> = {}
    for (const r of counts) {
      statusCounts[r.status as string] = r.count as number
    }

    // Average rating + experience breakdown — useful for the admin
    // dashboard widget.
    const aggRow = await sql`
      SELECT
        AVG(rating)::float AS avg_rating,
        SUM(CASE WHEN experience = 'positive' THEN 1 ELSE 0 END)::int AS positive,
        SUM(CASE WHEN experience = 'neutral'  THEN 1 ELSE 0 END)::int AS neutral,
        SUM(CASE WHEN experience = 'negative' THEN 1 ELSE 0 END)::int AS negative
      FROM feedback_submissions
    `
    const agg = aggRow[0] ?? { avg_rating: null, positive: 0, neutral: 0, negative: 0 }

    return NextResponse.json({
      submissions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      statusCounts,
      stats: {
        avgRating: agg.avg_rating ? Number(agg.avg_rating) : null,
        positive: agg.positive ?? 0,
        neutral: agg.neutral ?? 0,
        negative: agg.negative ?? 0,
      },
    })
  } catch (error) {
    console.error('[v0] Admin feedback GET failed:', error)
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminOrStaff()
    const body = (await request.json()) as { id?: number; status?: string }

    const id = Number(body.id)
    const status = String(body.status ?? '')

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const reviewedAt = status === 'new' ? null : new Date().toISOString()

    const updated = await sql`
      UPDATE feedback_submissions
      SET status = ${status},
          reviewed_at = ${reviewedAt}
      WHERE id = ${id}
      RETURNING id, status, reviewed_at
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, ...updated[0] })
  } catch (error) {
    console.error('[v0] Admin feedback PUT failed:', error)
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
  }
}
