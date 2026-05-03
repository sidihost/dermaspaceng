import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { listUserBookings } from '@/lib/booking'

// GET /api/bookings
//
// "My bookings" — returns the signed-in user's last 100 bookings,
// most recent first, hydrated with their service line items so the
// dashboard cards can render without a second round-trip per row.
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    const bookings = await listUserBookings(user.id)
    return NextResponse.json({ bookings })
  } catch (err) {
    console.error('[bookings.list] failed', err)
    return NextResponse.json(
      { error: 'Could not load your bookings.' },
      { status: 500 },
    )
  }
}
