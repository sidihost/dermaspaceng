import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = body?.email?.toString().trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ subscribed: false })
    }

    const rows = await sql`
      SELECT id FROM booking_waitlist WHERE email = ${email} LIMIT 1
    `

    return NextResponse.json({ subscribed: rows.length > 0 })
  } catch (error) {
    console.error('[v0] booking-waitlist check error:', error)
    return NextResponse.json({ subscribed: false })
  }
}
