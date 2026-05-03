import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBookingByReference, getBookingById } from '@/lib/booking'

// GET /api/bookings/[id]
//
// `[id]` is *either* the database UUID or the human-readable
// `DS-XXXXXX` reference, so we accept both. Customers paste the
// reference into the URL bar from their email; the dashboard uses
// the UUID. We try reference first because that's what users see.
//
// Auth-gated by ownership — admins should use the admin endpoints.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    const { id } = await params

    let booking = null
    if (id.startsWith('DS-')) {
      booking = await getBookingByReference(id, user.id)
    } else {
      booking = await getBookingById(id, user.id)
    }
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }
    return NextResponse.json({ booking })
  } catch (err) {
    console.error('[bookings.detail] failed', err)
    return NextResponse.json(
      { error: 'Could not load booking.' },
      { status: 500 },
    )
  }
}
