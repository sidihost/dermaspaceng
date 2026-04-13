import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user from session
    const sessions = await sql`
      SELECT s.user_id
      FROM sessions s
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const userId = sessions[0].user_id

    // Get recent completed bookings with their services
    const bookings = await sql`
      SELECT 
        b.id,
        b.booking_reference,
        b.location_name,
        b.appointment_date,
        b.appointment_time,
        b.status,
        b.total_price,
        bs.treatment_id,
        bs.treatment_name,
        bs.category_id,
        bs.category_name,
        bs.duration,
        bs.price
      FROM bookings b
      JOIN booking_services bs ON b.id = bs.booking_id
      WHERE b.user_id = ${userId}
        AND b.status IN ('completed', 'confirmed')
      ORDER BY b.appointment_date DESC, b.created_at DESC
      LIMIT 10
    `

    // Group services by booking
    const bookingMap = new Map<string, {
      id: string
      bookingReference: string
      locationName: string
      appointmentDate: string
      appointmentTime: string
      status: string
      totalPrice: number
      services: Array<{
        treatmentId: string
        treatmentName: string
        categoryId: string
        categoryName: string
        duration: number
        price: number
      }>
    }>()

    for (const row of bookings) {
      if (!bookingMap.has(row.id)) {
        bookingMap.set(row.id, {
          id: row.id,
          bookingReference: row.booking_reference,
          locationName: row.location_name,
          appointmentDate: row.appointment_date,
          appointmentTime: row.appointment_time,
          status: row.status,
          totalPrice: row.total_price,
          services: []
        })
      }
      
      bookingMap.get(row.id)!.services.push({
        treatmentId: row.treatment_id,
        treatmentName: row.treatment_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        duration: row.duration,
        price: row.price
      })
    }

    const recentBookings = Array.from(bookingMap.values()).slice(0, 5)

    return NextResponse.json({
      bookings: recentBookings
    })
  } catch (error) {
    console.error('Booking history error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
