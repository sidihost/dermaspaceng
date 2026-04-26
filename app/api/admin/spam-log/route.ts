// ---------------------------------------------------------------------------
// /api/admin/spam-log — read-only view of the comment_spam_log table.
// Admin-only. Returns the most recent 100 entries with the
// suspended user's name + email + current is_active flag joined in,
// so the moderation UI can show "active" vs "still suspended" at a
// glance and offer a one-click reinstate.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await sql`
    SELECT
      l.id,
      l.user_id,
      l.post_id,
      l.body,
      l.urls,
      l.reason,
      l.ip_address,
      l.created_at,
      u.first_name,
      u.last_name,
      u.username,
      u.email,
      u.is_active
    FROM comment_spam_log l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC
    LIMIT 100
  `

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      postId: r.post_id ? String(r.post_id) : null,
      body: String(r.body),
      urls: String(r.urls ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      reason: String(r.reason),
      ipAddress: r.ip_address ? String(r.ip_address) : null,
      createdAt: new Date(r.created_at).toISOString(),
      firstName: r.first_name ? String(r.first_name) : null,
      lastName: r.last_name ? String(r.last_name) : null,
      username: r.username ? String(r.username) : null,
      email: r.email ? String(r.email) : null,
      isActive: r.is_active === true,
    })),
  })
}
