import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'

/**
 * Admin single-feedback detail API.
 *
 * Backs /admin/feedback/[id] — the dedicated detail page that replaces
 * the old inline expand panel. We pull the single row joined against
 * the users table so the page can show the linked account (name,
 * avatar, email) when the submission came from a signed-in client.
 *
 * Status updates continue to go through PUT /api/admin/feedback (which
 * already validates the status enum and stamps reviewed_at), so this
 * route is read-only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminOrStaff()
    const { id } = await params
    const numericId = Number(id)
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const rows = await sql`
      SELECT
        f.id,
        f.user_id,
        f.name,
        f.email,
        f.category,
        f.experience,
        f.rating,
        f.message,
        f.status,
        f.source,
        f.user_agent,
        f.created_at,
        f.reviewed_at,
        u.first_name AS account_first_name,
        u.last_name  AS account_last_name,
        u.avatar_url AS account_avatar_url,
        u.email      AS account_email
      FROM feedback_submissions f
      LEFT JOIN users u ON u.id = f.user_id
      WHERE f.id = ${numericId}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    return NextResponse.json({ feedback: rows[0] })
  } catch (error) {
    console.error('[v0] Admin feedback detail GET failed:', error)
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 })
  }
}
