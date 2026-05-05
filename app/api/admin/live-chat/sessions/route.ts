import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAllSessions, type LiveChatStatus } from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/admin/live-chat/sessions?status=waiting|active|closed|all
// ---------------------------------------------------------------------------
// Admin-only oversight feed. Returns the most recent 100 sessions joined to
// the customer + assigned staff identity so the dashboard can show one row
// per chat without a second round-trip.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const raw = url.searchParams.get('status') || 'all'
  const valid: LiveChatStatus[] = ['waiting', 'active', 'closed', 'abandoned']
  const filter =
    raw === 'all' || (valid as readonly string[]).includes(raw)
      ? (raw as 'all' | LiveChatStatus)
      : 'all'

  const sessions = await getAllSessions(filter)
  return NextResponse.json({ sessions })
}
