import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// ---------------------------------------------------------------------------
// /api/derma/sessions
//
// Backs the Derma AI chat with server-side persistence so a user's
// conversations survive a cache wipe, browser reinstall, or sign-in
// from another device. The client (components/shared/derma-ai.tsx)
// still writes to localStorage on every change (instant, offline-ok)
// but ALSO debounces a PUT here whenever the signed-in user makes a
// change. On mount, the chat fetches GET to hydrate any history it
// doesn't have locally.
//
// Schema (script 543):
//   derma_chat_sessions(user_id PK, sessions JSONB, active JSONB,
//                       updated_at TIMESTAMP)
//
// Security posture:
//   - Auth-gated. Anonymous visitors get 401 and the client falls
//     back to localStorage-only (no leak across devices possible
//     because the bucket key still contains "__anon__").
//   - Size capped at ~1 MB per write — Derma chats are text + a
//     small thumbnail blob URL per attachment, so the cap is roomy
//     but won't let a runaway client bloat the DB.
//   - Strict JSON shape check — we accept `{ sessions: [], active: {} }`
//     and silently drop anything else, so a malicious client can't
//     stash arbitrary JSON in another column.
// ---------------------------------------------------------------------------

const MAX_PAYLOAD_BYTES = 1_000_000 // ~1 MB

type SessionsRow = {
  sessions: unknown
  active: unknown
  updated_at: string
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', sessions: [], active: null },
      { status: 401 },
    )
  }

  try {
    const rows = (await sql`
      SELECT sessions, active, updated_at
      FROM derma_chat_sessions
      WHERE user_id = ${user.id}
      LIMIT 1
    `) as unknown as SessionsRow[]

    if (rows.length === 0) {
      return NextResponse.json({
        sessions: [],
        active: null,
        updated_at: null,
      })
    }

    const row = rows[0]
    return NextResponse.json({
      sessions: Array.isArray(row.sessions) ? row.sessions : [],
      active: row.active ?? null,
      updated_at: row.updated_at,
    })
  } catch (err) {
    console.error('[derma/sessions] GET failed:', err)
    // Fail soft — the client falls back to localStorage so a DB blip
    // never wipes the in-memory conversation the user is reading.
    return NextResponse.json(
      { sessions: [], active: null, updated_at: null, error: 'Lookup failed' },
      { status: 200 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Read the raw body first so we can enforce the size cap before we
  // pay the JSON.parse cost on a multi-megabyte payload.
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Payload too large' },
      { status: 413 },
    )
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const payload = body as { sessions?: unknown; active?: unknown }

  // Whitelist + shape-check. Anything else on the payload is ignored.
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : []
  const active =
    payload.active === null || payload.active === undefined
      ? null
      : typeof payload.active === 'object'
        ? payload.active
        : null

  try {
    await sql`
      INSERT INTO derma_chat_sessions (user_id, sessions, active, updated_at)
      VALUES (
        ${user.id},
        ${JSON.stringify(sessions)}::jsonb,
        ${active === null ? null : JSON.stringify(active)}::jsonb,
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET sessions = EXCLUDED.sessions,
          active = EXCLUDED.active,
          updated_at = NOW()
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[derma/sessions] PUT failed:', err)
    return NextResponse.json(
      { error: 'Failed to save sessions' },
      { status: 500 },
    )
  }
}

// Convenience clear endpoint — wipes server-side history for the
// signed-in user. The "Clear all" button in the chat sidebar calls
// this so the cleared state syncs across devices.
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await sql`DELETE FROM derma_chat_sessions WHERE user_id = ${user.id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[derma/sessions] DELETE failed:', err)
    return NextResponse.json(
      { error: 'Failed to clear sessions' },
      { status: 500 },
    )
  }
}
