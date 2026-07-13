import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Public, token-gated lookup for a single consultation. Anonymous
// customers reach this via the unguessable 64-char token they received
// on submit / by email — no auth required. We only ever return the
// non-sensitive fields the customer already provided plus the AI
// analysis and current status. Device / IP / geo metadata and admin
// notes are intentionally NOT exposed here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!token || !/^[a-f0-9]{20,80}$/i.test(token)) {
      return NextResponse.json({ error: 'Invalid tracking link' }, { status: 400 })
    }

    const rows = await sql`
      SELECT
        id, first_name, last_name, location, appointment_date,
        appointment_time, concerns, notes, status, ai_analysis,
        ai_generated_at, created_at
      FROM consultations
      WHERE track_token = ${token}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    const c = rows[0]

    return NextResponse.json({
      consultation: {
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        location: c.location,
        appointmentDate: c.appointment_date,
        appointmentTime: c.appointment_time,
        concerns: c.concerns ?? [],
        notes: c.notes ?? '',
        status: c.status ?? 'pending',
        analysis: c.ai_analysis ?? null,
        aiGeneratedAt: c.ai_generated_at,
        createdAt: c.created_at,
      },
    })
  } catch (error) {
    console.error('[v0] consultation track lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to load consultation' },
      { status: 500 },
    )
  }
}
