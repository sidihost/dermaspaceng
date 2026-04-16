import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = body?.email?.toString().trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'A valid email is required.' },
        { status: 400 }
      )
    }

    // Try to link to a logged-in user (optional)
    let userId: string | null = null
    try {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (sessionId) {
        const sessions = await sql`
          SELECT user_id FROM sessions
          WHERE id = ${sessionId} AND expires_at > NOW()
          LIMIT 1
        `
        if (sessions.length > 0) {
          userId = sessions[0].user_id as string
        }
      }
    } catch {
      // non-fatal
    }

    // If the email already exists on the waitlist, return success (idempotent)
    const existing = await sql`
      SELECT id FROM booking_waitlist WHERE email = ${email} LIMIT 1
    `

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message: "You're already on the waitlist.",
      })
    }

    const id = randomUUID()
    await sql`
      INSERT INTO booking_waitlist (id, email, user_id, source)
      VALUES (${id}, ${email}, ${userId}, 'booking_page')
    `

    return NextResponse.json({
      success: true,
      alreadySubscribed: false,
      message: "You're on the waitlist. We'll email you when online booking goes live.",
    })
  } catch (error) {
    console.error('[v0] booking-waitlist POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Could not join the waitlist. Please try again.' },
      { status: 500 }
    )
  }
}
