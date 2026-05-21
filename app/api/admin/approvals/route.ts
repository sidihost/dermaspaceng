import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const status = request.nextUrl.searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(request.nextUrl.searchParams.get('offset') || '0'), 0)

    // Fetch approval requests, ordered by recency (pending first, then by created_at desc).
    const requests = await sql`
      SELECT
        id,
        action_type,
        target_user_id,
        payload,
        status,
        requested_by,
        requested_reason,
        reviewed_by,
        reviewed_at,
        review_note,
        created_at,
        updated_at,
        (SELECT first_name || ' ' || last_name FROM users WHERE id = requested_by) AS requester_name,
        (SELECT email FROM users WHERE id = requested_by) AS requester_email,
        (SELECT first_name || ' ' || last_name FROM users WHERE id = target_user_id) AS target_name,
        (SELECT email FROM users WHERE id = target_user_id) AS target_email
      FROM admin_approval_requests
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const total = await sql`
      SELECT COUNT(*)::int AS count FROM admin_approval_requests WHERE status = ${status}
    `

    return NextResponse.json({
      requests: requests || [],
      total: total[0]?.count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[v0] GET /api/admin/approvals failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch approvals'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
