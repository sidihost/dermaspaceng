/**
 * GET /api/admin/impersonate/status
 *
 * Lightweight read for the global ImpersonationBanner. Tells the
 * client whether the active session is an impersonation session and
 * — if so — who's being impersonated and which admin started it.
 *
 * Returns 200 with { impersonating: false } when no session, no
 * cookie, or the session is a regular one. Never throws — the banner
 * is a passive render and a 500 here would just hide the "Stop"
 * button which is the worst case.
 */

import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId) {
      return NextResponse.json({ impersonating: false })
    }

    const rows = await sql`
      SELECT
        s.user_id          AS target_id,
        s.impersonator_id  AS admin_id,
        target.first_name  AS target_first_name,
        target.last_name   AS target_last_name,
        target.email       AS target_email,
        admin.first_name   AS admin_first_name,
        admin.last_name    AS admin_last_name
      FROM sessions s
      LEFT JOIN users target ON target.id = s.user_id
      LEFT JOIN users admin  ON admin.id  = s.impersonator_id
      WHERE s.id = ${sessionId}
        AND s.expires_at > NOW()
        AND s.impersonator_id IS NOT NULL
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ impersonating: false })
    }

    const r = rows[0] as Record<string, string | null>
    return NextResponse.json({
      impersonating: true,
      target: {
        id: r.target_id,
        name: `${r.target_first_name || ''} ${r.target_last_name || ''}`.trim(),
        email: r.target_email,
      },
      admin: {
        id: r.admin_id,
        name: `${r.admin_first_name || ''} ${r.admin_last_name || ''}`.trim(),
      },
    })
  } catch (err) {
    console.error('[v0] Impersonation status error:', err)
    return NextResponse.json({ impersonating: false })
  }
}
