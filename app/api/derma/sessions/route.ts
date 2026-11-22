import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { rateLimit } from '@/lib/redis'
import {
  normalizeDeletedIds,
  parseIsoMs,
  reconcileDermaSessions,
  type SyncableActiveChat,
  type SyncableChatSession,
} from '@/lib/derma-sessions-sync'

// ---------------------------------------------------------------------------
// /api/derma/sessions
//
// Backs the Derma AI chat with server-side persistence AND cross-device
// tombstone reconciliation (`deleted_ids` + `cleared_at`) so deleted chats or
// "Clear all" never resurrect when the user signs in from another device.
// ---------------------------------------------------------------------------

const MAX_PAYLOAD_BYTES = 1_000_000 // ~1 MB

type SessionsRow = {
  sessions: unknown
  active: unknown
  deleted_ids: unknown
  cleared_at: string | null
  updated_at: string
}

let ensureTablePromise: Promise<void> | null = null

function ensureDermaChatSessionsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS derma_chat_sessions (
          user_id UUID PRIMARY KEY,
          sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
          active JSONB,
          deleted_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          cleared_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`
        ALTER TABLE derma_chat_sessions
        ADD COLUMN IF NOT EXISTS deleted_ids JSONB NOT NULL DEFAULT '[]'::jsonb
      `
      await sql`
        ALTER TABLE derma_chat_sessions
        ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ
      `
    })().catch((err) => {
      ensureTablePromise = null
      console.error('[derma/sessions] ensure table failed:', err)
    })
  }
  return ensureTablePromise
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        sessions: [],
        active: null,
        deleted_ids: [],
        cleared_at: null,
      },
      { status: 401 },
    )
  }

  try {
    await ensureDermaChatSessionsTable()
    const rows = (await sql`
      SELECT sessions, active, deleted_ids, cleared_at, updated_at
      FROM derma_chat_sessions
      WHERE user_id = ${user.id}
      LIMIT 1
    `) as unknown as SessionsRow[]

    if (rows.length === 0) {
      return NextResponse.json(
        {
          sessions: [],
          active: null,
          deleted_ids: [],
          cleared_at: null,
          updated_at: null,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const row = rows[0]
    return NextResponse.json(
      {
        sessions: Array.isArray(row.sessions) ? row.sessions : [],
        active: row.active ?? null,
        deleted_ids: normalizeDeletedIds(row.deleted_ids),
        cleared_at: row.cleared_at ? new Date(row.cleared_at).toISOString() : null,
        updated_at: row.updated_at,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('[derma/sessions] GET failed:', err)
    return NextResponse.json(
      {
        sessions: [],
        active: null,
        deleted_ids: [],
        cleared_at: null,
        updated_at: null,
        error: 'Lookup failed',
      },
      { status: 200 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = await rateLimit('derma-sessions', user.id, 120, 60)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, limit.resetAt - Math.floor(Date.now() / 1000))),
        },
      },
    )
  }

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

  const payload = body as {
    sessions?: unknown
    active?: unknown
    deleted_ids?: unknown
    cleared_at?: unknown
  }

  const incomingSessions = (
    Array.isArray(payload.sessions) ? payload.sessions : []
  ) as SyncableChatSession[]
  const incomingActive =
    payload.active === null || payload.active === undefined
      ? null
      : typeof payload.active === 'object'
        ? (payload.active as SyncableActiveChat)
        : null
  const incomingDeletedIds = normalizeDeletedIds(payload.deleted_ids)
  const incomingClearedAtMs =
    typeof payload.cleared_at === 'string' ? parseIsoMs(payload.cleared_at) : 0
  const incomingClearedAt =
    incomingClearedAtMs > 0 ? new Date(incomingClearedAtMs).toISOString() : null

  try {
    await ensureDermaChatSessionsTable()

    const existingRows = (await sql`
      SELECT sessions, active, deleted_ids, cleared_at, updated_at
      FROM derma_chat_sessions
      WHERE user_id = ${user.id}
      LIMIT 1
    `) as unknown as SessionsRow[]

    const existing = existingRows[0]
    const serverSessions = (
      existing && Array.isArray(existing.sessions) ? existing.sessions : []
    ) as SyncableChatSession[]
    const serverDeletedIds = existing
      ? normalizeDeletedIds(existing.deleted_ids)
      : []
    const serverClearedAt = existing?.cleared_at
      ? new Date(existing.cleared_at).toISOString()
      : null

    // Server-side reconciliation guarantees another device with a stale local
    // snapshot can never resurrect sessions deleted or cleared elsewhere.
    const reconciled = reconcileDermaSessions({
      localSessions: incomingSessions,
      serverSessions,
      localDeletedIds: incomingDeletedIds,
      serverDeletedIds,
      localClearedAt: incomingClearedAt,
      serverClearedAt,
      active: incomingActive,
    })

    await sql`
      INSERT INTO derma_chat_sessions (user_id, sessions, active, deleted_ids, cleared_at, updated_at)
      VALUES (
        ${user.id},
        ${JSON.stringify(reconciled.sessions)}::jsonb,
        ${reconciled.active === null ? null : JSON.stringify(reconciled.active)}::jsonb,
        ${JSON.stringify(reconciled.deletedIds)}::jsonb,
        ${reconciled.clearedAt},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET sessions = EXCLUDED.sessions,
          active = EXCLUDED.active,
          deleted_ids = EXCLUDED.deleted_ids,
          cleared_at = EXCLUDED.cleared_at,
          updated_at = NOW()
    `
    return NextResponse.json({
      success: true,
      sessions: reconciled.sessions,
      deleted_ids: reconciled.deletedIds,
      cleared_at: reconciled.clearedAt,
      active: reconciled.active,
    })
  } catch (err) {
    console.error('[derma/sessions] PUT failed:', err)
    return NextResponse.json(
      { error: 'Failed to save sessions' },
      { status: 500 },
    )
  }
}

// Convenience clear endpoint — persists a `cleared_at = NOW()` tombstone row
// instead of deleting the row so other signed-in devices wipe stale caches
// on their next sync rather than pushing old localStorage chats back up.
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = await rateLimit('derma-sessions-clear', user.id, 10, 60)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  try {
    await ensureDermaChatSessionsTable()
    const rows = (await sql`
      INSERT INTO derma_chat_sessions (user_id, sessions, active, deleted_ids, cleared_at, updated_at)
      VALUES (${user.id}, '[]'::jsonb, NULL, '[]'::jsonb, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET sessions = '[]'::jsonb,
          active = NULL,
          deleted_ids = '[]'::jsonb,
          cleared_at = NOW(),
          updated_at = NOW()
      RETURNING cleared_at
    `) as unknown as Array<{ cleared_at: string }>
    const clearedAt = rows[0]?.cleared_at
      ? new Date(rows[0].cleared_at).toISOString()
      : new Date().toISOString()
    return NextResponse.json({ success: true, cleared_at: clearedAt })
  } catch (err) {
    console.error('[derma/sessions] DELETE failed:', err)
    return NextResponse.json(
      { error: 'Failed to clear sessions' },
      { status: 500 },
    )
  }
}
