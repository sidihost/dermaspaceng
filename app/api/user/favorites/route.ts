import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

// Resolve the current session to a user_id, or return null for guests.
// Kept local to this route since favorites are the only surface that
// needs to transparently no-op for unauthenticated callers instead of
// 401-ing the SWR cache.
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) return null

  const sessions = await sql`
    SELECT user_id FROM sessions
    WHERE id = ${sessionId} AND expires_at > NOW()
  `
  if (sessions.length === 0) return null
  return sessions[0].user_id as string
}

// Keep a small allow-list for item_type so client payloads can't
// invent new namespaces. Mirrors the comment in the migration script.
const ALLOWED_TYPES = new Set(['treatment', 'package', 'category', 'post'])

export async function GET() {
  try {
    const userId = await getUserId()
    // Guests get an empty list — simpler than surfacing a 401 to every
    // page that renders a FavoriteButton, and it lets the button stay
    // in "unfavorited" state without error toasts.
    if (!userId) return NextResponse.json({ favorites: [] })

    const rows = await sql`
      SELECT item_type, item_id, item_label, item_href, created_at
      FROM user_favorites
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      favorites: rows.map((r) => ({
        itemType: r.item_type,
        itemId: r.item_id,
        label: r.item_label,
        href: r.item_href,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('[favorites GET]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const itemType = String(body.itemType || '').toLowerCase()
    const itemId = String(body.itemId || '').trim()
    const label = body.label ? String(body.label).slice(0, 255) : null
    const href = body.href ? String(body.href).slice(0, 255) : null

    if (!ALLOWED_TYPES.has(itemType)) {
      return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 })
    }
    if (!itemId || itemId.length > 128) {
      return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 })
    }

    // Upsert so repeat POSTs are idempotent — matches the way the
    // button optimistically toggles on the client. `xmax = 0` is the
    // standard Postgres trick to tell a fresh INSERT apart from an
    // ON CONFLICT update: it's only true for newly-inserted rows, so
    // we can fire the "saved" notification once and stay silent on
    // repeat saves of the same item.
    const upserted = await sql`
      INSERT INTO user_favorites (user_id, item_type, item_id, item_label, item_href)
      VALUES (${userId}, ${itemType}, ${itemId}, ${label}, ${href})
      ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET
        item_label = EXCLUDED.item_label,
        item_href = EXCLUDED.item_href
      RETURNING (xmax = 0) AS inserted
    `
    const isNew = Boolean(upserted[0]?.inserted)

    // Mirror the save into the notification bell so the user has a
    // running record of what they've saved and a one-tap path back to
    // the saved list. Fail-soft + no web push (a self-initiated tap
    // doesn't warrant buzzing the user's other devices).
    if (isNew) {
      const noun =
        itemType === 'post'
          ? 'article'
          : itemType === 'category'
            ? 'category'
            : itemType
      try {
        const { notifyUser } = await import('@/lib/notifications')
        await notifyUser({
          userId,
          title: 'Saved to your list',
          message: label
            ? `“${label}” is now in your saved items.`
            : `A ${noun} was added to your saved items.`,
          type: 'system',
          referenceType: itemType,
          referenceId: itemId,
          actionUrl: '/dashboard/saved',
          priority: 'low',
          push: false,
        })
      } catch (err) {
        console.error('[favorites POST] notify failed', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[favorites POST]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Accept the identifiers from the query string — DELETE bodies are
    // fine in Node but some CDNs strip them, so query is safer.
    const url = new URL(request.url)
    const itemType = (url.searchParams.get('itemType') || '').toLowerCase()
    const itemId = (url.searchParams.get('itemId') || '').trim()

    if (!ALLOWED_TYPES.has(itemType)) {
      return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 })
    }
    if (!itemId) {
      return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 })
    }

    await sql`
      DELETE FROM user_favorites
      WHERE user_id = ${userId}
        AND item_type = ${itemType}
        AND item_id = ${itemId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[favorites DELETE]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
