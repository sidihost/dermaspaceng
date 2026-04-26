import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { invalidatePrefix, KEYS } from '@/lib/redis'

export async function GET() {
  try {
    await requireAdmin()
    const banners = await sql`
      SELECT id, message, link_url, link_text, variant, scope,
             is_active, starts_at, ends_at, dismissible, created_at, updated_at
      FROM notification_banners
      ORDER BY created_at DESC
    `
    return NextResponse.json({ banners })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const {
      message,
      link_url = null,
      link_text = null,
      variant = 'info',
      scope = 'site',
      is_active = true,
      starts_at = null,
      ends_at = null,
      dismissible = true,
    } = body
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO notification_banners
        (message, link_url, link_text, variant, scope, is_active,
         starts_at, ends_at, dismissible, created_by)
      VALUES
        (${message}, ${link_url}, ${link_text}, ${variant}, ${scope}, ${is_active},
         ${starts_at}, ${ends_at}, ${dismissible}, ${admin.id})
      RETURNING id
    `
    // Bust every scope's cached list — POST creates a banner that may
    // belong to ANY scope, and we don't want to read-modify-write the
    // body just to know which scope to nuke.
    await invalidatePrefix(KEYS.banners)
    return NextResponse.json({ id: rows[0].id })
  } catch (err) {
    console.error('[admin/banners POST]', err)
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 })
  }
}
