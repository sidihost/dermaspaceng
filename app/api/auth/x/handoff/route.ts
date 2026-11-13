import { NextRequest, NextResponse } from 'next/server'
import { delKey, getJson } from '@/lib/redis'
import { sql } from '@/lib/db'
import { getAuthCookieOptions } from '@/lib/cookie-options'

interface HandoffPayload {
  sessionToken: string
  redirectTo: string
}

/**
 * Redeems a short-lived, single-use X OAuth handoff token from the
 * opener window (which may be running inside the cross-origin AI Studio
 * iframe) and sets the `session_id` cookie directly on the iframe's
 * response so subsequent `/api/auth/me` and page navigations are
 * authenticated even when popup vs. iframe cookies are isolated.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      handoff?: string
    }
    const handoff = typeof body.handoff === 'string' ? body.handoff.trim() : ''
    if (!handoff) {
      return NextResponse.json(
        { error: 'Missing handoff token' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const key = `x_handoff:${handoff}`
    const payload = await getJson<HandoffPayload>(key)
    await delKey(key)

    if (!payload?.sessionToken) {
      return NextResponse.json(
        { error: 'Handoff expired or invalid' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const sessions = await sql`
      SELECT user_id FROM sessions
      WHERE id = ${payload.sessionToken} AND expires_at > NOW()
      LIMIT 1
    `
    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const res = NextResponse.json(
      { success: true, redirectTo: payload.redirectTo || '/dashboard' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    res.cookies.set(
      'session_id',
      payload.sessionToken,
      getAuthCookieOptions({ maxAge: 60 * 60 * 24 * 30 }, request),
    )
    return res
  } catch (err) {
    console.error('[x-auth] handoff error:', err)
    return NextResponse.json(
      { error: 'Failed to complete sign-in' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
