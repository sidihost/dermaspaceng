import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getBookingById } from '@/lib/booking'
import {
  notifyBookingPaymentFailed,
  notifyBookingCancelledReminder,
} from '@/lib/notifications'

// ---------------------------------------------------------------------------
// POST /api/admin/bookings/[id]/remind
//
// Admin-triggered nudges. Two flavours:
//
//   { kind: "recovery" }
//     For a booking whose payment failed/abandoned. Fires the same
//     `notifyBookingPaymentFailed` flow the webhook does — mints a
//     fresh recovery token, sends the failure email + in-app
//     notification with a deep-link straight back to Paystack.
//
//   { kind: "rebook", message?: string }
//     For a booking that was cancelled. Sends the "Ready to rebook?"
//     email + in-app notification with a deep-link into the booking
//     wizard. Admins can override the body copy when nudging a VIP
//     ("we have a slot tomorrow at 4pm if you want it").
//
// Returns the recovery URL so the admin UI can copy/paste it into a
// WhatsApp message if email isn\u2019t the right channel for that user.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const kind = body?.kind as 'recovery' | 'rebook' | undefined
  const customMessage =
    typeof body?.message === 'string' ? (body.message as string) : undefined

  const booking = await getBookingById(id)
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  if (kind === 'recovery') {
    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'This booking is already paid.' },
        { status: 400 },
      )
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This booking is cancelled — send a rebook reminder instead.' },
        { status: 400 },
      )
    }
    const reason =
      booking.payment_status === 'failed'
        ? 'Card declined or interrupted at checkout'
        : 'You didn\u2019t finish your booking'
    const result = await notifyBookingPaymentFailed(booking, reason)
    if (!result) {
      return NextResponse.json(
        { error: 'Could not send recovery reminder.' },
        { status: 500 },
      )
    }
    return NextResponse.json({
      ok: true,
      kind: 'recovery',
      recoveryUrl: result.recoveryUrl,
    })
  }

  if (kind === 'rebook') {
    if (booking.status !== 'cancelled' && booking.status !== 'no_show') {
      return NextResponse.json(
        {
          error:
            'Rebook reminders are only for cancelled or no-show bookings.',
        },
        { status: 400 },
      )
    }
    const result = await notifyBookingCancelledReminder(booking, {
      customMessage,
    })
    if (!result) {
      return NextResponse.json(
        { error: 'Could not send rebook reminder.' },
        { status: 500 },
      )
    }
    return NextResponse.json({
      ok: true,
      kind: 'rebook',
      rebookUrl: result.rebookUrl,
    })
  }

  return NextResponse.json(
    { error: 'Unknown reminder kind. Expected "recovery" or "rebook".' },
    { status: 400 },
  )
}
