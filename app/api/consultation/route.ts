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
import { getDeviceInfo } from '@/lib/device-info'
import { generateConsultationAnalysis } from '@/lib/consultation-ai'

const sql = neon(process.env.DATABASE_URL!)

const locationNames: Record<string, string> = {
  vi: 'Victoria Island - 237b Muri Okunola St',
  ikoyi: 'Ikoyi - 9 Agbeke Rotinwa Cl, Dolphin Estate'
}

// Weekday numbers each clinic is CLOSED on (0 = Sun ... 6 = Sat).
// Ikoyi is closed Sundays and Mondays; VI is closed Sundays.
const locationClosedDays: Record<string, number[]> = {
  vi: [0],
  ikoyi: [0, 1],
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

    // Reject dates that fall on a day the chosen clinic is closed.
    // The date arrives as 'YYYY-MM-DD'; read the weekday in UTC so it
    // matches the Lagos-day the customer picked (UTC+1, no DST).
    const closedDays = locationClosedDays[location] ?? [0]
    const requestedWeekday = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`).getUTCDay()
    if (closedDays.includes(requestedWeekday)) {
      return NextResponse.json(
        { error: 'This clinic is closed on the selected day. Please pick another date.' },
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

    // Capture device / submission metadata so admins can tell whether a
    // request came from a signed-in customer or an anonymous visitor, and
    // from which browser / OS / device / location. Best-effort — never
    // blocks the submission.
    const device = await getDeviceInfo(request).catch(() => null)
    const isAnonymous = !userId

    const id = uuidv4()

    // Public, unguessable token so anonymous customers can revisit a
    // private tracking page (/consultation/track/<token>) without an
    // account. Two UUIDs concatenated → 64 hex chars of entropy.
    const trackToken = (uuidv4() + uuidv4()).replace(/-/g, '')

    // Generate the AI skin analysis immediately so it's ready on the
    // tracking page the moment the customer lands there. The helper
    // never throws — it falls back to safe generic guidance if every
    // AI provider is unavailable, so this can't break the booking.
    const aiAnalysis = await generateConsultationAnalysis({
      firstName,
      concerns: Array.isArray(concerns) ? concerns : [],
      notes,
    }).catch((err) => {
      console.error('[v0] consultation analysis threw unexpectedly', err)
      return null
    })

    await sql`
      INSERT INTO consultations (
        id, user_id, first_name, last_name, email, phone, location,
        appointment_date, appointment_time, concerns, notes,
        is_anonymous, user_agent, browser, os, device_type,
        ip_address, geo_country, geo_city, geo_region,
        track_token, ai_analysis, ai_generated_at
      )
      VALUES (
        ${id}, ${userId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${location},
        ${date}, ${time}, ${JSON.stringify(concerns || [])}, ${notes || ''},
        ${isAnonymous}, ${device?.userAgent ?? null}, ${device?.browser ?? null},
        ${device?.os ?? null}, ${device?.deviceType ?? null}, ${device?.ipAddress ?? null},
        ${device?.geoCountry ?? null}, ${device?.geoCity ?? null}, ${device?.geoRegion ?? null},
        ${trackToken}, ${aiAnalysis ? JSON.stringify(aiAnalysis) : null},
        ${aiAnalysis ? new Date().toISOString() : null}
      )
    `

    // Send confirmation email
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.dermaspaceng.com'
    ).replace(/\/$/, '')

    await sendConsultationConfirmation({
      email,
      firstName,
      location: locationNames[location] || location,
      date: formattedDate,
      time,
      trackUrl: `${appUrl}/consultation/track/${trackToken}`,
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
      message: 'Consultation request submitted successfully',
      trackToken,
      isAnonymous,
      analysis: aiAnalysis,
    })

  } catch (error) {
    console.error('Consultation error:', error)
    return NextResponse.json(
      { error: 'Failed to submit consultation request' },
      { status: 500 }
    )
  }
}
