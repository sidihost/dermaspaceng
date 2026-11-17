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
  const valid: Array<'all' | 'open' | LiveChatStatus> = [
    'all',
    'open',
    'waiting',
    'active',
    'closed',
    'abandoned',
  ]
  const filter = (valid as readonly string[]).includes(raw)
    ? (raw as 'all' | 'open' | LiveChatStatus)
    : 'all'

  const rawDays = url.searchParams.get('days')
  const parsedDays = rawDays ? Number(rawDays) : undefined
  const days =
    typeof parsedDays === 'number' && Number.isFinite(parsedDays) && parsedDays > 0
      ? parsedDays
      : undefined

  const sessions = await getAllSessions(filter, days)
  return NextResponse.json({ sessions })
}
