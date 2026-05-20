import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/admin/activity/logins
 *
 * Returns the user-authentication slice of the audit ledger
 * (`auth_audit_chain`) so admins can see who signed in (or tried to),
 * from where, on which device, and when. Backed by the
 * tamper-evident chain so each row's hash is verifiable.
 *
 * Query params:
 *   ?event=signin|signin_failed|signup|logout|password_change|all (default: all)
 *   ?page=1 (default 1)
 *   ?limit=50 (default 50, max 200)
 *   ?q=<email or substring> — filters event_data->>identifier OR users.email
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const sp = request.nextUrl.searchParams
    const event = (sp.get('event') || 'all').trim()
    const q = (sp.get('q') || '').trim()
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const limitRaw = parseInt(sp.get('limit') || '50')
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200)
    const offset = (page - 1) * limit

    const allowed = new Set([
      'signin',
      'signin_failed',
      'signup',
      'logout',
      'password_change',
      'role_change',
      '2fa_enabled',
      '2fa_disabled',
      'password_reset_requested',
    ])
    const eventFilter = event !== 'all' && allowed.has(event) ? event : null
    const like = q ? `%${q.toLowerCase()}%` : null

    // The audit table is small enough that we can afford to LEFT JOIN
    // users so the UI can render names without a second round-trip.
    const rows = (await sql`
      SELECT
        a.id,
        a.event_type,
        a.event_data,
        a.user_id,
        a.ip_address,
        a.user_agent,
        a.created_at,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM auth_audit_chain a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE (${eventFilter}::text IS NULL OR a.event_type = ${eventFilter})
        AND (
          ${like}::text IS NULL
          OR LOWER(COALESCE(u.email, '')) LIKE ${like}
          OR LOWER(COALESCE(u.first_name, '')) LIKE ${like}
          OR LOWER(COALESCE(u.last_name, '')) LIKE ${like}
          OR LOWER(COALESCE(a.event_data->>'identifier', '')) LIKE ${like}
        )
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as any[]

    const countRow = (await sql`
      SELECT COUNT(*)::int AS total
      FROM auth_audit_chain a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE (${eventFilter}::text IS NULL OR a.event_type = ${eventFilter})
        AND (
          ${like}::text IS NULL
          OR LOWER(COALESCE(u.email, '')) LIKE ${like}
          OR LOWER(COALESCE(u.first_name, '')) LIKE ${like}
          OR LOWER(COALESCE(u.last_name, '')) LIKE ${like}
          OR LOWER(COALESCE(a.event_data->>'identifier', '')) LIKE ${like}
        )
    `) as any[]

    // Quick rolling counts for the header cards.
    const stats = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'signin' AND created_at > NOW() - INTERVAL '24 hours')::int AS signins_24h,
        COUNT(*) FILTER (WHERE event_type = 'signin_failed' AND created_at > NOW() - INTERVAL '24 hours')::int AS failed_24h,
        COUNT(*) FILTER (WHERE event_type = 'signup' AND created_at > NOW() - INTERVAL '7 days')::int AS signups_7d,
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'signin' AND created_at > NOW() - INTERVAL '24 hours')::int AS unique_24h
      FROM auth_audit_chain
    `) as any[]

    return NextResponse.json({
      success: true,
      logins: rows.map((r) => ({
        id: Number(r.id),
        eventType: String(r.event_type),
        userId: r.user_id ?? null,
        userName:
          [r.first_name, r.last_name].filter(Boolean).join(' ') ||
          r.email ||
          (r.event_data?.identifier as string | undefined) ||
          'Unknown',
        userEmail: r.email ?? null,
        userRole: r.role ?? null,
        ipAddress: r.ip_address ?? null,
        userAgent: r.user_agent ?? null,
        eventData: r.event_data ?? {},
        createdAt: r.created_at,
      })),
      pagination: {
        page,
        limit,
        total: Number(countRow[0]?.total ?? 0),
        totalPages: Math.max(1, Math.ceil(Number(countRow[0]?.total ?? 0) / limit)),
      },
      stats: {
        signins24h: Number(stats[0]?.signins_24h ?? 0),
        failed24h: Number(stats[0]?.failed_24h ?? 0),
        signups7d: Number(stats[0]?.signups_7d ?? 0),
        unique24h: Number(stats[0]?.unique_24h ?? 0),
      },
    })
  } catch (error) {
    console.error('[v0] Get login activity error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch login activity'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
