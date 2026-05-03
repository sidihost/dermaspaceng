import { NextResponse } from 'next/server'
import { listLocations } from '@/lib/booking'

// GET /api/bookings/locations
//
// Public endpoint — the booking wizard's "where would you like to come?"
// step renders this list. We deliberately filter to active locations
// only inside the lib helper so a paused branch instantly disappears
// from the UI without redeploying.
export async function GET() {
  try {
    const locations = await listLocations()
    return NextResponse.json({ locations })
  } catch (err) {
    console.error('[bookings.locations] failed', err)
    return NextResponse.json(
      { error: 'Could not load locations.' },
      { status: 500 },
    )
  }
}
