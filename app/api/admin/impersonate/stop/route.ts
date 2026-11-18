/**
 * POST /api/admin/impersonate/stop
 *
 * Ends an active impersonation session and restores the original
 * admin session cookie. Looks up the breadcrumb columns
 * (sessions.impersonator_session_id) on the current session row to
 * find the admin's real session id, sets the cookie back to that,
 * marks the audit log row's `ended_at`, and deletes the throwaway
 * impersonation session so it can never be reused.
 *
 * Safe to call by anyone holding an impersonation session — there's
 * no admin guard here because the session row itself proves the
 * caller was just impersonating somebody. Calling it from a regular
 * (non-impersonation) session is a no-op that returns 400.
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'
import { applyAuthUidCookie, clearAuthUidCookie } from '@/lib/auth-cache-cookie'
import { getAuthCookieOptions } from '@/lib/cookie-options'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No active session.' },
        { status: 401 }
      )
    }

    const rows = await sql`
      SELECT id, user_id, impersonator_id, impersonator_session_id
      FROM sessions
      WHERE id = ${sessionId} AND expires_at > NOW()
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found.' },
        { status: 401 }
      )
    }

    const session = rows[0] as {
      id: string
      user_id: string
      impersonator_id: string | null
      impersonator_session_id: string | null
    }

    if (!session.impersonator_id || !session.impersonator_session_id) {
      return NextResponse.json(
        { error: 'You are not impersonating anyone.' },
        { status: 400 }
      )
    }

    // Verify the original admin session still exists and is unexpired.
    // If it isn't, we can't restore — the admin must sign in again.
    const adminSessionRows = await sql`
      SELECT id, user_id, expires_at
      FROM sessions
      WHERE id = ${session.impersonator_session_id} AND expires_at > NOW()
      LIMIT 1
    `
    const adminSession = adminSessionRows[0] as
      | { id: string; user_id: string; expires_at: string }
      | undefined

    // Mark audit row as ended. Best-effort.
    try {
      await sql`
        UPDATE admin_impersonation_log
        SET ended_at = NOW()
        WHERE session_id = ${session.id} AND ended_at IS NULL
      `
    } catch (auditErr) {
      console.error('Failed to close impersonation audit row:', auditErr)
    }

    // Delete the throwaway impersonation session so it can't be
    // reused if somebody recovered the cookie value.
    try {
      await sql`DELETE FROM sessions WHERE id = ${session.id}`
    } catch (delErr) {
      console.error('Failed to delete impersonation session:', delErr)
    }

    if (!adminSession) {
      // Admin session expired during impersonation — clear cookie so
      // the admin gets redirected to /signin instead of a half-broken
      // state.
      cookieStore.delete('session_id')
      const expiredRes = NextResponse.json(
        {
          success: true,
          adminSessionExpired: true,
          message:
            'Impersonation ended, but your admin session expired — please sign in again.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
      clearAuthUidCookie(expiredRes, _request)
      return expiredRes
    }

    const response = NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    response.cookies.set(
      'session_id',
      adminSession.id,
      getAuthCookieOptions({ expires: new Date(adminSession.expires_at) }, _request),
    )
    applyAuthUidCookie(response, adminSession.user_id, _request)
    return response
  } catch (error) {
    console.error('Stop impersonate error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to stop impersonation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
