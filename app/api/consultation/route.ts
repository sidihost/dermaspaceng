import { NextResponse } from 'next/server'
import { sendConsultationConfirmation } from '@/lib/email'
import { verifyHCaptcha } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { sql } from '@/lib/db'


const locationNames: Record<string, string> = {
  vi: 'Victoria Island - 237b Muri Okunola St',
  ikoyi: 'Ikoyi - 44A, Awolowo Road'
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

    // Save consultation to database
    const id = uuidv4()
    await sql`
      INSERT INTO consultations (id, first_name, last_name, email, phone, location, appointment_date, appointment_time, concerns, notes)
      VALUES (${id}, ${firstName}, ${lastName}, ${email}, ${phone}, ${location}, ${date}, ${time}, ${JSON.stringify(concerns || [])}, ${notes || ''})
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
