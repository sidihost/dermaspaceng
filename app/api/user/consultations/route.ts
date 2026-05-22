/**
 * /api/user/consultations
 *
 * Lists the signed-in user's consultation requests so the dashboard
 * can show pending / confirmed bookings made through the public
 * consultation form. We match on `user_id` first (set when the form
 * was submitted while signed in) and fall back to email so an account
 * created after-the-fact still picks up its earlier requests.
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentUser()
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
           notes,
           status,
           created_at
      FROM consultations
     WHERE user_id = ${me.id}
        OR (user_id IS NULL AND LOWER(email) = LOWER(${me.email}))
     ORDER BY
       CASE WHEN status IN ('pending','confirmed') THEN 0 ELSE 1 END,
       COALESCE(appointment_date, created_at::date) DESC,
       created_at DESC
     LIMIT 25
  `) as any[]

  return NextResponse.json({
    consultations: rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      location: r.location,
      appointmentDate: r.appointment_date,
      appointmentTime: r.appointment_time,
      concerns: Array.isArray(r.concerns)
        ? r.concerns
        : r.concerns
          ? (() => {
              try {
                const parsed = JSON.parse(String(r.concerns))
                return Array.isArray(parsed) ? parsed : [String(r.concerns)]
              } catch {
                return [String(r.concerns)]
              }
            })()
          : [],
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
    })),
  })
}
