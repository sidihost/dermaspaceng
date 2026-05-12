import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getCurrentUser } from '@/lib/auth'

// ---------------------------------------------------------------------------
// GET /api/surveys/me
//
// Returns the current signed-in user's MOST RECENT survey response, used by:
//   • /dashboard  – to render the "You've completed our survey" status card
//                   instead of a "Take our survey" CTA when the user has
//                   already submitted one.
//   • /survey     – to seed the intro/recap card from server data instead
//                   of the older localStorage-only `PREV_KEY` (so the recap
//                   survives a browser-data clear, a different device, or
//                   incognito).
//
// Shape:
//   • signed-out users get { submission: null } (with a 200, not a 401 —
//     the dashboard card needs to render the CTA state without an extra
//     error code branch).
//   • signed-in users with no submission also get { submission: null }.
//   • signed-in users with at least one row get { submission: {…} }.
//
// We deliberately only return the LATEST row even though
// survey_responses has no uniqueness on user_id (one user can re-take the
// survey multiple times). Older entries still live in admin /admin/surveys
// for the full history view.
// ---------------------------------------------------------------------------

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const user = await getCurrentUser().catch(() => null)
    if (!user) {
      return NextResponse.json({ submission: null })
    }

    const rows = (await sql`
      SELECT
        id,
        aesthetics,
        ambiance,
        front_desk,
        staff_professional,
        appointment_delay,
        overall_rating,
        visit_again,
        comments,
        created_at
      FROM survey_responses
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `) as Array<{
      id: number
      aesthetics: string | null
      ambiance: string | null
      front_desk: string | null
      staff_professional: string | null
      appointment_delay: string | null
      overall_rating: number | null
      visit_again: string | null
      comments: string | null
      created_at: string
    }>

    const row = rows[0]
    if (!row) {
      return NextResponse.json({ submission: null })
    }

    // Shape the payload to match the /survey page's existing
    // `previousSubmission` model so it can be dropped in with no
    // adaptor code on the client.
    return NextResponse.json({
      submission: {
        id: row.id,
        submittedAt: row.created_at,
        data: {
          aesthetics: row.aesthetics ?? '',
          ambiance: row.ambiance ?? '',
          frontDesk: row.front_desk ?? '',
          staffProfessional: row.staff_professional ?? '',
          appointmentDelay: row.appointment_delay ?? '',
          overallRating: row.overall_rating ?? 0,
          visitAgain: row.visit_again ?? '',
          comments: row.comments ?? '',
        },
      },
    })
  } catch (error) {
    console.error('GET /api/surveys/me failed', error)
    // Render gracefully on the client — a failure here shouldn't
    // break the dashboard or the survey page, so we surface a 200
    // with submission:null and log server-side for monitoring.
    return NextResponse.json({ submission: null })
  }
}
