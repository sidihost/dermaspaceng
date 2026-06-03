/**
 * /api/user/consultations/[id]
 *
 * Returns a single consultation request owned by the signed-in user.
 * Ownership is scoped the same way as the list endpoint: match on
 * `user_id` first, then fall back to email so requests submitted
 * before the account existed still resolve. Returns 404 when the
 * consultation doesn't exist or isn't theirs (we don't distinguish
 * the two so we never leak the existence of someone else's record).
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function normalizeConcerns(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (!raw) return []
  try {
    const parsed = JSON.parse(String(raw))
    return Array.isArray(parsed) ? parsed : [String(raw)]
  } catch {
    return [String(raw)]
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser()
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const rows = (await sql`
    SELECT id::text                                 AS id,
           first_name,
           last_name,
           email,
           phone,
           location,
           TO_CHAR(appointment_date, 'YYYY-MM-DD')  AS appointment_date,
           appointment_time,
           concerns,
           concern_type,
           notes,
           status,
           created_at,
           updated_at
      FROM consultations
     WHERE id = ${id}
       AND (user_id = ${me.id}
            OR (user_id IS NULL AND LOWER(email) = LOWER(${me.email})))
     LIMIT 1
  `) as any[]

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const r = rows[0]
  return NextResponse.json({
    consultation: {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      location: r.location,
      appointmentDate: r.appointment_date,
      appointmentTime: r.appointment_time,
      concerns: normalizeConcerns(r.concerns),
      concernType: r.concern_type ?? null,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    },
  })
}
