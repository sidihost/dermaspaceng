import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/admin/activity/logins/[id]
 *
 * Full detail for a single authentication event from the tamper-evident
 * ledger (`auth_audit_chain`). Powers the login-activity detail page:
 *
 *   • The event itself (type, actor, device, IP, raw event_data).
 *   • Ledger integrity — we re-derive whether this row's `prev_hash`
 *     still matches the `this_hash` of the row immediately before it,
 *     so the admin gets a green "chain intact" / red "chain broken"
 *     signal without running a full-table verification.
 *   • The actor's recent auth timeline (their last handful of events)
 *     so the admin can see the sign-in in the context of that account's
 *     behaviour.
 *   • A count of other events seen from the same IP address, a quick
 *     "is this address noisy?" signal for triaging failed attempts.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id: idParam } = await params
    const id = parseInt(idParam, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
    }

    const rows = (await sql`
      SELECT
        a.id,
        a.event_type,
        a.event_data,
        a.user_id,
        a.ip_address,
        a.user_agent,
        a.created_at,
        a.prev_hash,
        a.this_hash,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at AS user_created_at
      FROM auth_audit_chain a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = ${id}
      LIMIT 1
    `) as any[]

    if (!rows.length) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    const r = rows[0]

    // Chain integrity — the row immediately before this one (by id) is
    // the link this row's prev_hash should reference. For the genesis
    // row there is no predecessor, so prev_hash being NULL is valid.
    const prevRows = (await sql`
      SELECT this_hash
      FROM auth_audit_chain
      WHERE id < ${id}
      ORDER BY id DESC
      LIMIT 1
    `) as any[]
    const predecessorHash: string | null = prevRows[0]?.this_hash ?? null
    const chainLinkIntact =
      predecessorHash === null
        ? r.prev_hash === null || r.prev_hash === undefined
        : r.prev_hash === predecessorHash

    // The actor's recent auth timeline (skip this build for anonymous /
    // unknown-identifier failed attempts where user_id is NULL).
    let timeline: any[] = []
    if (r.user_id) {
      timeline = (await sql`
        SELECT id, event_type, ip_address, user_agent, created_at, event_data
        FROM auth_audit_chain
        WHERE user_id = ${r.user_id}
        ORDER BY created_at DESC
        LIMIT 8
      `) as any[]
    }

    // How chatty is this IP? Quick triage signal for failed attempts.
    let sameIpCount = 0
    let sameIpFailed = 0
    if (r.ip_address) {
      const ipStats = (await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE event_type = 'signin_failed')::int AS failed
        FROM auth_audit_chain
        WHERE ip_address = ${r.ip_address}
      `) as any[]
      sameIpCount = Number(ipStats[0]?.total ?? 0)
      sameIpFailed = Number(ipStats[0]?.failed ?? 0)
    }

    const userName =
      [r.first_name, r.last_name].filter(Boolean).join(' ') ||
      r.email ||
      (r.event_data?.identifier as string | undefined) ||
      'Unknown'

    return NextResponse.json({
      success: true,
      event: {
        id: Number(r.id),
        eventType: String(r.event_type),
        userId: r.user_id ?? null,
        userName,
        userEmail: r.email ?? null,
        userRole: r.role ?? null,
        userAvatarUrl: r.avatar_url ?? null,
        userCreatedAt: r.user_created_at ?? null,
        ipAddress: r.ip_address ?? null,
        userAgent: r.user_agent ?? null,
        eventData: r.event_data ?? {},
        createdAt: r.created_at,
        prevHash: r.prev_hash ?? null,
        thisHash: r.this_hash ?? null,
      },
      integrity: {
        chainLinkIntact,
        predecessorHash,
        isGenesis: predecessorHash === null,
      },
      timeline: timeline.map((t) => ({
        id: Number(t.id),
        eventType: String(t.event_type),
        ipAddress: t.ip_address ?? null,
        userAgent: t.user_agent ?? null,
        createdAt: t.created_at,
        eventData: t.event_data ?? {},
      })),
      ipInsight: {
        total: sameIpCount,
        failed: sameIpFailed,
      },
    })
  } catch (error) {
    console.error('[v0] Get login event detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch event'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
