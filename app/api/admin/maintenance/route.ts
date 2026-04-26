// ---------------------------------------------------------------------------
// /api/admin/maintenance
//
//   GET  — current maintenance state (admin only)
//   POST — update maintenance state (admin only)
//
// Body for POST:
//   { enabled: boolean, message?: string, eta?: string | null }
//
// The `eta` field is an ISO 8601 string (or null/empty to clear).
// We don't validate the calendar shape strictly — the maintenance
// page tolerates a missing/invalid value by simply not rendering the
// "Expected back" pill.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getMaintenance, setMaintenance } from '@/lib/app-settings'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const settings = await getMaintenance()
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    enabled?: unknown
    message?: unknown
    eta?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const enabled = body.enabled === true
  const message =
    typeof body.message === 'string' && body.message.trim() !== ''
      ? body.message.trim().slice(0, 500)
      : "We're polishing things up. Back in a moment."
  const etaRaw = typeof body.eta === 'string' ? body.eta.trim() : ''
  const eta = etaRaw === '' ? null : etaRaw

  await setMaintenance({ enabled, message, eta }, admin.id)
  const settings = await getMaintenance()
  return NextResponse.json({ settings })
}
