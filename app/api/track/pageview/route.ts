import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

/**
 * POST /api/track/pageview
 *
 * Logs one page view. Called by `<PageViewTracker />` on every route
 * change. We deliberately resolve the user FROM the session cookie
 * server-side rather than trusting a client-supplied id — this keeps
 * the endpoint safe to call from anywhere on the site without
 * exposing a user-id parameter that could be spoofed.
 *
 * The `page_views` table is created by scripts/043. Until that
 * migration runs the INSERT will throw — we swallow the error so
 * the endpoint never fails the calling page navigation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      path?: string
      title?: string
      referrer?: string
      sessionId?: string
    }

    const path = (body.path ?? '').slice(0, 500)
    if (!path || !path.startsWith('/')) {
      return NextResponse.json({ ok: true })
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session_id')?.value

    let userId: string | null = null
    if (sessionCookie) {
      try {
        const rows = await sql`
          SELECT user_id FROM sessions
          WHERE id = ${sessionCookie} AND expires_at > NOW()
          LIMIT 1
        `
        userId = (rows[0]?.user_id as string) || null
      } catch {
        /* session table missing/down → log anonymously */
      }
    }

    // Use a separate session id (client-provided, just an opaque
    // grouping key). Capped to 64 chars to match the column type.
    const visitId = (body.sessionId ?? sessionCookie ?? '').toString().slice(0, 64)
    const title = (body.title ?? '').toString().slice(0, 240)
    const referrer = (body.referrer ?? '').toString().slice(0, 500)
    const ua = (request.headers.get('user-agent') ?? '').slice(0, 500)

    try {
      await sql`
        INSERT INTO page_views (user_id, session_id, path, title, referrer, user_agent)
        VALUES (${userId}, ${visitId || null}, ${path}, ${title || null}, ${referrer || null}, ${ua || null})
      `
    } catch (err) {
      // Migration not applied yet — swallow so the user's page nav
      // never fails because of telemetry.
      console.warn('[v0] page_views insert skipped:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] pageview track error:', error)
    return NextResponse.json({ ok: true })
  }
}
