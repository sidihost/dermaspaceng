import { NextResponse } from 'next/server'
import { headers, cookies } from 'next/headers'
import { neon } from '@neondatabase/serverless'
import { CURRENT_LEGAL_VERSION } from '@/lib/legal'

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/legal/accept
 * ----------------------
 * Records that the currently signed-in user has accepted the
 * legal pack at `CURRENT_LEGAL_VERSION`. Two writes inside one
 * call:
 *   1. UPDATE users  (drives gating in /api/auth/me)
 *   2. INSERT legal_acceptance_log  (immutable forensic trail)
 *
 * Both writes use the *server* version constant — we deliberately
 * ignore any version the client might try to send. That way a
 * malicious client can't pre-accept a future version they haven't
 * actually seen, and can't bypass a re-prompt by replaying an old
 * acceptance.
 *
 * Body shape:
 *   { surface?: 'signup' | 'dashboard-gate' | 'admin' | string }
 * `surface` is purely a tag we keep for analytics — it tells us
 * where in the app the user accepted from. Omitted/invalid values
 * are clamped to 'unknown' to keep the audit trail tidy.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Resolve session → user. We deliberately use a tiny query
    // instead of going through any auth helper so this route stays
    // dependency-light and snappy on every signup.
    const sessions = await sql`
      SELECT s.user_id
      FROM sessions s
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      LIMIT 1
    `
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }
    const userId = sessions[0].user_id

    let body: { surface?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      // empty body is fine — surface defaults to 'unknown'
    }
    const surface =
      typeof body.surface === 'string' && body.surface.length <= 32
        ? body.surface
        : 'unknown'

    const h = await headers()
    const ip =
      (h.get('x-forwarded-for') || '').split(',')[0]?.trim() || null
    const ua = h.get('user-agent') || null

    // Persist on the user row so the gate read in /api/auth/me is
    // a single column lookup. NOW() is captured server-side — never
    // trust client-supplied timestamps for compliance writes.
    await sql`
      UPDATE users
      SET legal_accepted_version = ${CURRENT_LEGAL_VERSION},
          legal_accepted_at      = NOW()
      WHERE id = ${userId}
    `

    // Append-only audit row. ON CONFLICT (user_id, version) keeps
    // the log clean if the user ever ends up POSTing twice (e.g.
    // double-tapping the button before the first request returns).
    await sql`
      INSERT INTO legal_acceptance_log
        (user_id, version, surface, ip_address, user_agent)
      VALUES
        (${userId}, ${CURRENT_LEGAL_VERSION}, ${surface}, ${ip}, ${ua})
      ON CONFLICT (user_id, version) DO NOTHING
    `

    return NextResponse.json({
      ok: true,
      version: CURRENT_LEGAL_VERSION,
    })
  } catch (error) {
    console.error('[legal/accept] error:', error)
    return NextResponse.json(
      { error: 'Failed to record acceptance' },
      { status: 500 },
    )
  }
}
