import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getCurrentUser } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

// ---------------------------------------------------------------------------
// POST /api/auth/signup-progress
//
// Records the highest completed step of the /complete-profile wizard
// (Photo → About → Username → Polish). Called from the wizard whenever
// the user taps "Continue" so the admin console can answer "they signed
// up but never finished — what step are they stuck on?".
//
// Contract:
//   { step: 1 | 2 | 3 | 4 }
//
// Idempotent + monotonic — we only ever raise `signup_step`, never lower
// it. That way navigating back-and-forth in the wizard can't downgrade
// progress, and re-runs of an earlier step don't undo a later one.
// Step 4 is also written as a side-effect of finishing the wizard via
// /api/auth/complete-profile (which sets profile_complete = TRUE), so
// callers don't strictly need to send it here — but doing so keeps the
// admin surface honest if the final POST fails for any reason.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as { step?: unknown }))
    const raw = (body as { step?: unknown }).step
    const step = typeof raw === 'number' ? Math.floor(raw) : NaN
    if (!Number.isFinite(step) || step < 0 || step > 4) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    await sql`
      UPDATE users
         SET signup_step = GREATEST(signup_step, ${step}),
             updated_at = NOW()
       WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true, step })
  } catch (error) {
    console.error('Signup progress error:', error)
    return NextResponse.json(
      { error: 'Failed to record progress' },
      { status: 500 },
    )
  }
}
