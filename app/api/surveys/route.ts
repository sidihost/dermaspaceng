import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit } from '@/lib/redis'

// ---------------------------------------------------------------------------
// /api/surveys
//
// Public-facing survey endpoint that backs the /survey page.
//
//   POST  – Insert a new survey response into `survey_responses`. Anonymous
//           submissions are allowed (the public survey page is reachable
//           without auth), but if the caller IS signed in we attribute the
//           row to their user id so it can show up on their dashboard +
//           in the admin "respondent" column.
//
// Background:
//   Before this route existed, the /survey page only wrote responses to
//   localStorage and never round-tripped them to the server, which is why
//   the admin /admin/surveys table (read from survey_responses) was always
//   empty even though customers were submitting. This route closes that gap.
//
// Validation mirrors the SQL constraints in scripts/027-create-surveys.sql
// (overall_rating CHECK 1..5) and the radio option lists rendered on the
// /survey page — anything not in those lists is rejected so we don't get
// junk strings written to the table from a crafted request.
// ---------------------------------------------------------------------------

const sql = neon(process.env.DATABASE_URL!)

const VALID_AGREE = ['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree', '']
const VALID_DELAY = ['5 mins', '10 mins', '15 mins', '30 mins', '']
const VALID_VISIT = ['Yes', 'No', 'Not sure', '']

export async function POST(request: NextRequest) {
  try {
    // Spam guard. 5 submissions per IP per hour is plenty for a real
    // customer (they almost always submit once) but stops a script
    // from flooding the admin table from a single source.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const limit = await rateLimit('survey:ip', ip, 5, 3600)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    // The /survey page submits a `data: { aesthetics, ambiance, … }`
    // envelope (matching the SurveyData type). We also accept a flat
    // body for forward-compat with any future direct API consumer.
    const data = (body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body) as Record<string, unknown>

    const aesthetics = String(data.aesthetics ?? '').trim()
    const ambiance = String(data.ambiance ?? '').trim()
    const frontDesk = String(data.frontDesk ?? '').trim()
    const staffProfessional = String(data.staffProfessional ?? '').trim()
    const appointmentDelay = String(data.appointmentDelay ?? '').trim()
    const visitAgain = String(data.visitAgain ?? '').trim()
    const comments = typeof data.comments === 'string' ? data.comments.trim().slice(0, 5000) : ''
    const overallRating = Number(data.overallRating)

    // Whitelist every enum-style field so junk strings can't be
    // injected into the table.
    if (!VALID_AGREE.includes(aesthetics)) {
      return NextResponse.json({ error: 'Invalid aesthetics value' }, { status: 400 })
    }
    if (!VALID_AGREE.includes(ambiance)) {
      return NextResponse.json({ error: 'Invalid ambiance value' }, { status: 400 })
    }
    if (!VALID_AGREE.includes(frontDesk)) {
      return NextResponse.json({ error: 'Invalid front desk value' }, { status: 400 })
    }
    if (!VALID_AGREE.includes(staffProfessional)) {
      return NextResponse.json({ error: 'Invalid staff value' }, { status: 400 })
    }
    if (!VALID_DELAY.includes(appointmentDelay)) {
      return NextResponse.json({ error: 'Invalid delay value' }, { status: 400 })
    }
    if (!VALID_VISIT.includes(visitAgain)) {
      return NextResponse.json({ error: 'Invalid visit-again value' }, { status: 400 })
    }
    if (!Number.isFinite(overallRating) || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: 'Overall rating must be between 1 and 5' },
        { status: 400 },
      )
    }

    // Attach user info if signed in — anonymous submissions stay
    // anonymous. We don't gate behind auth at all because the /survey
    // page is reachable from public marketing links (post-visit
    // emails, QR codes in the spa).
    const user = await getCurrentUser().catch(() => null)
    const userId = user?.id ?? null
    const userEmail = user?.email ?? null

    const inserted = await sql`
      INSERT INTO survey_responses (
        user_id, user_email,
        aesthetics, ambiance, front_desk, staff_professional,
        appointment_delay, overall_rating, visit_again, comments
      )
      VALUES (
        ${userId}, ${userEmail},
        ${aesthetics || null}, ${ambiance || null},
        ${frontDesk || null}, ${staffProfessional || null},
        ${appointmentDelay || null}, ${Math.round(overallRating)},
        ${visitAgain || null}, ${comments || null}
      )
      RETURNING id, created_at
    `

    return NextResponse.json({
      success: true,
      id: inserted[0]?.id,
      createdAt: inserted[0]?.created_at,
    })
  } catch (error) {
    console.error('POST /api/surveys failed', error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
