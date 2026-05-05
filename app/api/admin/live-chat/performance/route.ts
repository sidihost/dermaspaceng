import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getStaffPerformance } from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/admin/live-chat/performance
// ---------------------------------------------------------------------------
// One row per staff member with totals, averages, and current presence.
// Powers the Staff Performance page on the admin console.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rows = await getStaffPerformance()
  return NextResponse.json({ rows })
}
