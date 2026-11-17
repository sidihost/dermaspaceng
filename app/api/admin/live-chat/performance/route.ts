import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getStaffPerformance } from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/admin/live-chat/performance
// ---------------------------------------------------------------------------
// One row per staff member with totals, averages, and current presence.
// Powers the Staff Performance page on the admin console.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const rawDays = Number(url.searchParams.get('days') || '30')
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.floor(rawDays), 365) : 30

  const performance = await getStaffPerformance(days)
  const to = new Date()
  const from = new Date(to.getTime() - days * 86_400_000)

  return NextResponse.json({
    performance,
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
      days,
    },
  })
}
