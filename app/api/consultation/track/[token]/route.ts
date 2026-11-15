import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  ensureConsultationRepliesSchema,
  listPublicConsultationReplies,
} from '@/lib/consultation-replies'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Public, token-gated lookup for a single consultation. Anonymous
// customers reach this via the unguessable 64-char token they received
// on submit / by email — no auth required. We expose only the
// non-sensitive fields the customer provided, the AI skin analysis,
// current status, and non-internal conversation replies. Device / IP /
// geo metadata and internal admin notes are intentionally excluded.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!token || !/^[a-f0-9]{20,80}$/i.test(token)) {
      return NextResponse.json({ error: 'Invalid tracking link' }, { status: 400 })
    }

    await ensureConsultationRepliesSchema()

    const rows = (await sql`
      SELECT
        id::text AS id,
        first_name,
        last_name,
        location,
        TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
        appointment_time,
        concerns,
        notes,
        status,
        ai_analysis,
        ai_generated_at,
        created_at,
        updated_at
      FROM consultations
      WHERE track_token = ${token}
      LIMIT 1
    `) as unknown as Array<{
      id: string
      first_name: string | null
      last_name: string | null
      location: string | null
      appointment_date: string | null
      appointment_time: string | null
      concerns: unknown
      notes: string | null
      status: string | null
      ai_analysis: unknown
      ai_generated_at: string | null
      created_at: string
      updated_at: string | null
    }>

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    const c = rows[0]
    const replies = await listPublicConsultationReplies(String(c.id))

    let analysis = null
    if (c.ai_analysis) {
      if (typeof c.ai_analysis === 'string') {
        try {
          analysis = JSON.parse(c.ai_analysis)
        } catch {
          analysis = null
        }
      } else if (typeof c.ai_analysis === 'object') {
        analysis = c.ai_analysis
      }
    }

    return NextResponse.json({
      consultation: {
        id: c.id,
        firstName: c.first_name || 'Guest',
        lastName: c.last_name || '',
        location: c.location || '',
        appointmentDate: c.appointment_date || '',
        appointmentTime: c.appointment_time || '',
        concerns: Array.isArray(c.concerns) ? c.concerns : [],
        notes: c.notes ?? '',
        status: c.status ?? 'pending',
        analysis,
        aiGeneratedAt: c.ai_generated_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        replies,
      },
    })
  } catch (error) {
    console.error('consultation track lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to load consultation' },
      { status: 500 },
    )
  }
}
