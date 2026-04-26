import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit } from '@/lib/redis'

/**
 * Public-facing feedback endpoint.
 *
 *   POST /api/feedback   – store a new submission. Anonymous OK.
 *   GET  /api/feedback   – list THE CURRENT USER'S past submissions
 *                          (used by the feedback page to personalise
 *                          the hero copy: "Welcome back — you've
 *                          shared 3 pieces of feedback so far").
 *
 * For admin moderation see /api/admin/feedback.
 *
 * The shape mirrors what the feedback page on /feedback collects:
 *   { category, experience, rating, message, name?, email?, source? }
 *
 * Validation rules match the SQL CHECK constraints in
 * scripts/200-create-feedback-table.sql so a malformed payload is
 * rejected client-side AND server-side.
 */

const VALID_CATEGORIES = ['service', 'staff', 'facility', 'booking', 'suggestion', 'complaint']
const VALID_EXPERIENCE = ['positive', 'neutral', 'negative']
const VALID_SOURCE = ['web', 'shake', 'api']

export async function POST(request: NextRequest) {
  try {
    // Spam / shake-button-mash guard. The mobile app sends feedback
    // automatically when the user shakes the device, so we deliberately
    // pick limits that comfortably accommodate a few honest shakes per
    // hour but reject sustained spam from one IP.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const limit = await rateLimit('feedback:ip', ip, 8, 600)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many submissions. Please slow down and try again later.' },
        { status: 429 },
      )
    }

    const body = (await request.json()) as Record<string, unknown>


    const category = String(body.category ?? '').trim()
    const experience = String(body.experience ?? '').trim()
    const rating = Number(body.rating)
    const message = String(body.message ?? '').trim()
    const nameInput = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null
    const emailInput = typeof body.email === 'string' ? body.email.trim().slice(0, 255) : null
    const sourceRaw = typeof body.source === 'string' ? body.source.trim() : 'web'
    const userAgent = request.headers.get('user-agent')?.slice(0, 1000) ?? null

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!VALID_EXPERIENCE.includes(experience)) {
      return NextResponse.json({ error: 'Invalid experience' }, { status: 400 })
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
      return NextResponse.json({ error: 'Rating must be between 1 and 10' }, { status: 400 })
    }
    if (message.length < 10) {
      return NextResponse.json(
        { error: 'Please share at least 10 characters of feedback' },
        { status: 400 },
      )
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Feedback is too long' }, { status: 400 })
    }

    const source = VALID_SOURCE.includes(sourceRaw) ? sourceRaw : 'web'

    // Attach user info if signed-in. Anonymous submissions stay
    // anonymous — supplied name/email take precedence over the
    // logged-in user's record so a user can choose to deliberately
    // submit something under a different identity (rare but
    // legitimate). When BOTH are missing we fall back to the
    // session's account info so the admin queue can still attribute
    // the entry.
    const user = await getCurrentUser().catch(() => null)
    const userId = user?.id ?? null
    const finalName =
      nameInput ||
      (user ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || null : null)
    const finalEmail = emailInput || user?.email || null

    const inserted = await sql`
      INSERT INTO feedback_submissions (
        user_id, name, email, category, experience, rating, message, source, user_agent
      )
      VALUES (
        ${userId}, ${finalName}, ${finalEmail}, ${category}, ${experience},
        ${Math.round(rating)}, ${message}, ${source}, ${userAgent}
      )
      RETURNING id, created_at
    `

    return NextResponse.json({
      success: true,
      id: inserted[0]?.id,
      createdAt: inserted[0]?.created_at,
    })
  } catch (error) {
    console.error('[v0] Feedback POST failed:', error)
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      // Anonymous callers always see an empty list — keeps the
      // endpoint trivially cacheable on the public side and means
      // the personalised welcome card only appears once we're sure
      // who the user is.
      return NextResponse.json({ submissions: [], total: 0, authenticated: false })
    }

    const rows = await sql`
      SELECT id, category, experience, rating, status, created_at
      FROM feedback_submissions
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 25
    `

    return NextResponse.json({
      authenticated: true,
      total: rows.length,
      submissions: rows.map((r) => ({
        id: r.id,
        category: r.category,
        experience: r.experience,
        rating: r.rating,
        status: r.status,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('[v0] Feedback GET failed:', error)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}
