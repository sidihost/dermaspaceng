/**
 * Returns the current Google Calendar connection state for the
 * authenticated staff member. The UI calls this every time the
 * add-ons page mounts so the green "Connected" pill is always
 * accurate.
 *
 * Shape:
 *   { configured: false }                 // env vars missing
 *   { configured: true, connected: false }
 *   { configured: true, connected: true,
 *     email, picture, lastSyncedAt, status }
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getConnection, isConfigured } from '@/lib/google-calendar'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isConfigured()) return NextResponse.json({ configured: false })

  const conn = await getConnection(user.id)
  if (!conn) return NextResponse.json({ configured: true, connected: false })

  return NextResponse.json({
    configured: true,
    connected: true,
    email: conn.google_account_email,
    picture: conn.google_account_picture,
    status: conn.status,
    lastSyncedAt: conn.last_synced_at,
    lastError: conn.last_error,
  })
}
