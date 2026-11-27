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
import { ensureConsultationRepliesSchema } from '@/lib/consultation-replies'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const me = await getCurrentUser()
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureConsultationRepliesSchema()

  const rows = (await sql`
    SELECT c.id::text                                 AS id,
           c.first_name,
           c.last_name,
           c.email,
           c.phone,
           c.location,
           TO_CHAR(c.appointment_date, 'YYYY-MM-DD')  AS appointment_date,
           c.appointment_time,
           c.concerns,
           c.notes,
           c.status,
           c.created_at,
           COALESCE(rc.reply_count, 0)::int           AS reply_count,
           COALESCE(rc.team_reply_count, 0)::int      AS team_reply_count
      FROM consultations c
      LEFT JOIN (
        SELECT request_id,
               COUNT(*) AS reply_count,
               COUNT(*) FILTER (WHERE COALESCE(is_staff, TRUE) = TRUE) AS team_reply_count
          FROM admin_replies
         WHERE request_type = 'consultation'
           AND COALESCE(is_internal, FALSE) = FALSE
         GROUP BY request_id
      ) rc ON rc.request_id = c.id::text
     WHERE c.user_id = ${me.id}
        OR (c.user_id IS NULL AND LOWER(c.email) = LOWER(${me.email}))
     ORDER BY
       CASE WHEN c.status IN ('pending','confirmed') THEN 0 ELSE 1 END,
       COALESCE(c.appointment_date, c.created_at::date) DESC,
       c.created_at DESC
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
      customerAvatarUrl: me.avatar_url ?? null,
      replyCount: Number(r.reply_count ?? 0),
      teamReplyCount: Number(r.team_reply_count ?? 0),
    })),
  })
}
