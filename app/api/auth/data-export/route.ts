import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// Right-to-portability: lets the user request a JSON dump of
// everything we have on them. POST files the request, GET returns
// the most-recent state (so the settings page can render
// "Preparing your data export — we'll email you when it's ready").
//
// Generation of the actual bundle is intentionally OUT OF SCOPE
// for this route — it lives in a queued job that compiles the
// JSON, uploads it to a signed-URL location, and updates this
// row to status='ready'. That keeps the request endpoint cheap
// and avoids timing out a dashboard click on a large account.

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Re-filing while a request is in flight is rejected with 409
    // so the user gets a clean message instead of a 500 from the
    // partial unique index.
    const existing = await sql`
      SELECT id, status, requested_at
      FROM data_export_requests
      WHERE user_id = ${user.id} AND status = 'pending'
      LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An export request is already in progress', request: existing[0] },
        { status: 409 },
      )
    }

    const xff = request.headers.get('x-forwarded-for')
    const ip = xff ? xff.split(',')[0]?.trim() : null
    const ua = request.headers.get('user-agent')

    const inserted = await sql`
      INSERT INTO data_export_requests (user_id, status, ip_address, user_agent)
      VALUES (${user.id}, 'pending', ${ip}, ${ua})
      RETURNING id, status, requested_at
    `
    return NextResponse.json({ success: true, request: inserted[0] })
  } catch (error) {
    console.error('[data-export] POST error', error)
    return NextResponse.json({ error: 'Could not file export request' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await sql`
      SELECT id, status, requested_at, ready_at, expires_at, download_url
      FROM data_export_requests
      WHERE user_id = ${user.id}
      ORDER BY requested_at DESC
      LIMIT 5
    `
    return NextResponse.json({
      pending: rows.find((r) => r.status === 'pending') ?? null,
      ready:   rows.find((r) => r.status === 'ready')   ?? null,
      history: rows,
    })
  } catch (error) {
    console.error('[data-export] GET error', error)
    return NextResponse.json({ error: 'Could not load export requests' }, { status: 500 })
  }
}
