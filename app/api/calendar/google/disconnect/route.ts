/**
 * Disconnects the staff member's Google Calendar. We always revoke
 * the refresh token on Google's side so the user sees Dermaspace
 * disappear from their account-permissions page (transparency =
 * trust). The local connection row + per-booking event records
 * are deleted to leave no orphaned references.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { disconnect } from '@/lib/google-calendar'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  await disconnect(user.id, { revoke: true })
  return NextResponse.json({ ok: true })
}
