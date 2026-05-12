import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { sendConsultationConfirmation } from '@/lib/email'
import { verifyHCaptcha, getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
// Per-event QStash reminder: enqueues a one-off message that fires
// 1 hour before the consultation slot. Wrapped fail-soft inside the
// helper, so a QStash outage never breaks consultation creation.
import { scheduleConsultationReminder } from '@/lib/reminders'
import { notifyUser } from '@/lib/notifications'

const sql = neon(process.env.DATABASE_URL!)

const locationNames: Record<string, string> = {
  vi: 'Victoria Island - 237b Muri Okunola St',
  ikoyi: 'Ikoyi - 9 Agbeke Rotinwa Cl, Dolphin Estate'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      location, 
      date, 
      time, 
      concerns, 
      notes,
      captchaToken 
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !location || !date || !time) {
      return NextResponse.json(
        { error: 'All required fields must be filled' },
        { status: 400 }
      )
    }

    // Verify hCaptcha if enabled
    if (process.env.HCAPTCHA_SECRET_KEY && captchaToken) {
      const captchaValid = await verifyHCaptcha(captchaToken)
      if (!captchaValid) {
        return NextResponse.json(
          { error: 'Captcha verification failed' },
          { status: 400 }
        )
      }
    }

    // Save consultation to database. If the caller is signed in we
    // attach their user id so /dashboard/consultations and the
    // notification helpers can find this row later. Anonymous
    // submissions still work — `user_id` is nullable.
    const currentUser = await getCurrentUser().catch(() => null)
    const userId = currentUser?.id ?? null

    const id = uuidv4()
    await sql`
      INSERT INTO consultations (id, user_id, first_name, last_name, email, phone, location, appointment_date, appointment_time, concerns, notes)
      VALUES (${id}, ${userId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${location}, ${date}, ${time}, ${JSON.stringify(concerns || [])}, ${notes || ''})
    `

    // Send confirmation email
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    await sendConsultationConfirmation({
      email,
      firstName,
      location: locationNames[location] || location,
      date: formattedDate,
      time
    })

    // Enqueue the 1-hour-before reminder. Fire-and-forget — a QStash
    // failure here MUST NOT break the user's confirmation response.
    // The helper logs warnings internally and we ignore the promise.
    void scheduleConsultationReminder(id, date, time)

    // Drop an in-app notification so the customer's bell badge lights
    // up the moment they submit. Signed-in customers only — anonymous
    // submissions have no user to attach the notification to.
    if (userId) {
      try {
        await notifyUser({
          userId,
          title: 'Consultation request received',
          message: `Your consultation at ${locationNames[location] || location} on ${formattedDate} at ${time} is pending. We'll confirm shortly.`,
          type: 'status_update',
          referenceType: 'consultation',
          referenceId: id,
          actionUrl: '/dashboard/consultations',
          priority: 'normal',
        })
      } catch (err) {
        console.error('[v0] consultation notifyUser failed', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consultation request submitted successfully'
    })

  } catch (error) {
    console.error('Consultation error:', error)
    return NextResponse.json(
      { error: 'Failed to submit consultation request' },
      { status: 500 }
    )
  }
}
