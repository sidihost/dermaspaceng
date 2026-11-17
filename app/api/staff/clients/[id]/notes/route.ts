import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"
import { logStaffActivity } from "@/lib/activity-log"

async function ensureClientNotesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS client_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      author_id TEXT,
      author_name TEXT,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminOrStaff()
    const { id: clientId } = await context.params
    if (!clientId) {
      return NextResponse.json({ success: false, error: "Missing client id" }, { status: 400 })
    }

    await ensureClientNotesTable()

    const [savedNotes, bookingNotes] = await Promise.all([
      sql`
        SELECT id, user_id, author_id, author_name, note, created_at
        FROM client_notes
        WHERE user_id = ${clientId}
        ORDER BY created_at DESC
        LIMIT 100
      ` as Promise<any[]>,
      sql`
        SELECT id::text AS booking_id, booking_reference, notes, created_at
        FROM bookings
        WHERE user_id = ${clientId}
          AND COALESCE(TRIM(notes), '') <> ''
        ORDER BY created_at DESC
        LIMIT 30
      `.catch(() => []) as Promise<any[]>,
    ])

    return NextResponse.json({
      success: true,
      notes: savedNotes.map((n) => ({
        id: String(n.id),
        note: String(n.note),
        authorName: n.author_name ? String(n.author_name) : "Staff",
        createdAt: String(n.created_at),
      })),
      bookingNotes: bookingNotes.map((b) => ({
        id: String(b.booking_id),
        bookingReference: String(b.booking_reference),
        note: String(b.notes),
        createdAt: String(b.created_at),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load client notes"
    const status = message.startsWith("Unauthorized") ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireAdminOrStaff()
    const { id: clientId } = await context.params
    if (!clientId) {
      return NextResponse.json({ success: false, error: "Missing client id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const note = String(body.note || "").trim()
    if (!note) {
      return NextResponse.json({ success: false, error: "Note text is required" }, { status: 400 })
    }

    await ensureClientNotesTable()
    const id = uuidv4()
    const authorName = `${me.first_name || ""} ${me.last_name || ""}`.trim() || me.email

    const rows = (await sql`
      INSERT INTO client_notes (id, user_id, author_id, author_name, note)
      VALUES (${id}, ${clientId}, ${me.id}, ${authorName}, ${note.slice(0, 2000)})
      RETURNING id, note, author_name, created_at
    `) as any[]

    try {
      await logStaffActivity({
        staffId: me.id,
        userId: clientId,
        actionType: "client_note_added",
        entityType: "user",
        entityId: clientId,
        description: `Added client care note (${note.slice(0, 60)})`,
      })
    } catch {
      /* activity log is best-effort */
    }

    const r = rows[0]
    return NextResponse.json({
      success: true,
      note: {
        id: String(r.id),
        note: String(r.note),
        authorName: r.author_name ? String(r.author_name) : authorName,
        createdAt: String(r.created_at),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save note"
    const status = message.startsWith("Unauthorized") ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminOrStaff()
    const { id: clientId } = await context.params
    const url = new URL(req.url)
    const noteId = url.searchParams.get("noteId")
    if (!clientId || !noteId) {
      return NextResponse.json({ success: false, error: "noteId is required" }, { status: 400 })
    }
    await ensureClientNotesTable()
    await sql`DELETE FROM client_notes WHERE id = ${noteId} AND user_id = ${clientId}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete note"
    const status = message.startsWith("Unauthorized") ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
