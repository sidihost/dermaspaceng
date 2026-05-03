import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots, resolveServices, totalDuration } from '@/lib/booking'

// GET /api/bookings/availability
//   ?locationId=...
//   &date=YYYY-MM-DD
//   &services=catSlug:treatmentId,catSlug:treatmentId
//
// Returns the list of HH:MM slots that still have capacity for the
// total duration of the requested services. Public on purpose — we
// don't need auth to *display* availability, only to *book* it. That
// keeps the booking page responsive for window-shopping visitors.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const date = searchParams.get('date')
    const servicesParam = searchParams.get('services') || ''

    if (!locationId || !date) {
      return NextResponse.json(
        { error: 'locationId and date are required.' },
        { status: 400 },
      )
    }

    // Parse "facials:hydra-facial,brows:brow-shape" into selections.
    const selections = servicesParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [categoryId, treatmentId] = s.split(':')
        return { categoryId, treatmentId }
      })

    if (selections.length === 0) {
      return NextResponse.json(
        { error: 'Pick at least one service to see available slots.' },
        { status: 400 },
      )
    }

    const { resolved, error } = resolveServices(selections)
    if (error) return NextResponse.json({ error }, { status: 400 })
    const duration = totalDuration(resolved)

    const result = await getAvailableSlots({ locationId, date, duration })
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      slots: result.slots,
      duration,
    })
  } catch (err) {
    console.error('[bookings.availability] failed', err)
    return NextResponse.json(
      { error: 'Could not load availability.' },
      { status: 500 },
    )
  }
}
