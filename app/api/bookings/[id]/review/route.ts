import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getBookingByReference, getBookingById } from '@/lib/booking'
import { notifyUser } from '@/lib/notifications'

// GET  /api/bookings/[id]/review
// POST /api/bookings/[id]/review
//
// Customer-facing review for a single booking. Owner-gated via the
// same `getBookingBy*` helpers used everywhere else, and only writable
// once the booking has been marked `completed` by staff/admin. We
// allow re-submitting the same review (UPDATE) so the customer can
// fix a typo or add a comment later — that's why the table has a
// UNIQUE(booking_id) constraint plus an `updated_at` column.

interface ReviewRow {
  id: string
  booking_id: string
  user_id: string | null
  rating: number
  cleanliness_rating: number | null
  staff_rating: number | null
  value_rating: number | null
  body: string | null
  would_recommend: boolean | null
  created_at: string
  updated_at: string
}

async function loadReview(bookingId: string): Promise<ReviewRow | null> {
  const rows = (await sql`
    SELECT id::text             AS id,
           booking_id::text     AS booking_id,
           user_id::text        AS user_id,
           rating               AS rating,
           cleanliness_rating   AS cleanliness_rating,
           staff_rating         AS staff_rating,
           value_rating         AS value_rating,
           body                 AS body,
           would_recommend      AS would_recommend,
           created_at           AS created_at,
           updated_at           AS updated_at
      FROM booking_reviews
     WHERE booking_id = ${bookingId}
     LIMIT 1
  `) as unknown as ReviewRow[]
  return rows[0] ?? null
}

function clampRating(n: unknown): number | null {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  const r = Math.round(v)
  if (r < 1 || r > 5) return null
  return r
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    const { id } = await params
    const booking = id.startsWith('DS-')
      ? await getBookingByReference(id, user.id)
      : await getBookingById(id, user.id)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }
    const review = await loadReview(booking.id)
    return NextResponse.json({
      review,
      canReview: booking.status === 'completed',
      bookingStatus: booking.status,
    })
  } catch (err) {
    console.error('[bookings.review.get] failed', err)
    return NextResponse.json({ error: 'Could not load review.' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    const { id } = await params
    const booking = id.startsWith('DS-')
      ? await getBookingByReference(id, user.id)
      : await getBookingById(id, user.id)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }
    if (booking.status !== 'completed') {
      return NextResponse.json(
        {
          error:
            'You can leave a review once your appointment has been marked complete.',
        },
        { status: 400 },
      )
    }

    let body: {
      rating?: unknown
      cleanlinessRating?: unknown
      staffRating?: unknown
      valueRating?: unknown
      body?: unknown
      wouldRecommend?: unknown
    } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
    }

    const rating = clampRating(body.rating)
    if (!rating) {
      return NextResponse.json(
        { error: 'Please pick an overall rating from 1 to 5.' },
        { status: 400 },
      )
    }
    const cleanliness = clampRating(body.cleanlinessRating)
    const staffR = clampRating(body.staffRating)
    const valueR = clampRating(body.valueRating)
    const text = String(body.body ?? '').slice(0, 2000).trim() || null
    const wouldRec =
      body.wouldRecommend === undefined || body.wouldRecommend === null
        ? null
        : Boolean(body.wouldRecommend)

    const existing = await loadReview(booking.id)
    let updated = false
    let created = false

    if (existing) {
      // Owner-only update — already enforced because we only loaded
      // the booking when it belongs to `user.id`.
      await sql`
        UPDATE booking_reviews
           SET rating             = ${rating},
               cleanliness_rating = ${cleanliness},
               staff_rating       = ${staffR},
               value_rating       = ${valueR},
               body               = ${text},
               would_recommend    = ${wouldRec},
               updated_at         = NOW()
         WHERE id = ${existing.id}
      `
      updated = true
    } else {
      await sql`
        INSERT INTO booking_reviews (
          booking_id, user_id, rating, cleanliness_rating, staff_rating,
          value_rating, body, would_recommend
        ) VALUES (
          ${booking.id}, ${user.id}, ${rating}, ${cleanliness}, ${staffR},
          ${valueR}, ${text}, ${wouldRec}
        )
      `
      created = true
    }

    // Notify the assigned staff member (best-effort). High priority on
    // anything 2 stars or below so the operator sees it on their bell
    // immediately and can reach out.
    if (created) {
      try {
        const assignRows = (await sql`
          SELECT assigned_staff_id FROM bookings WHERE id = ${booking.id}
        `) as unknown as Array<{ assigned_staff_id: string | null }>
        const staffId = assignRows[0]?.assigned_staff_id
        if (staffId) {
          await notifyUser({
            userId: staffId,
            title: `New review · ${rating}/5`,
            message: `${booking.customer_name} reviewed booking ${booking.booking_reference}.`,
            type: 'system',
            referenceType: 'booking',
            referenceId: booking.id,
            actionUrl: `/staff/appointments/${booking.id}`,
            priority: rating <= 2 ? 'high' : 'normal',
          })
        }
      } catch {
        /* notifications are best-effort */
      }
    }

    const review = await loadReview(booking.id)
    return NextResponse.json({ review, created, updated })
  } catch (err) {
    console.error('[bookings.review.post] failed', err)
    return NextResponse.json({ error: 'Could not save review.' }, { status: 500 })
  }
}
