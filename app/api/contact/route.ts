import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendFormConfirmation } from '@/lib/email'
import { rateLimit } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const { name, email, phone, subject, message, captchaToken } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Spam guard. 5 submissions per IP per 10 minutes is plenty for a
    // real human + a typo-and-retry. Beyond that we 429 hard, which
    // also stops the email-confirmation step from blasting Zepto.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const limit = await rateLimit('contact:ip', ip, 5, 600)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait a few minutes before sending another.' },
        { status: 429 },
      )
    }

    // Verify hCaptcha token
    if (captchaToken && process.env.HCAPTCHA_SECRET_KEY) {
      const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `response=${captchaToken}&secret=${process.env.HCAPTCHA_SECRET_KEY}`
      })
      const captchaData = await captchaResponse.json()
      
      if (!captchaData.success) {
        return NextResponse.json(
          { error: 'Captcha verification failed. Please try again.' },
          { status: 400 }
        )
      }
    }

    // Save to database
    try {
      await sql`
        INSERT INTO contact_messages (name, email, phone, subject, message)
        VALUES (${name}, ${email}, ${phone || null}, ${subject || null}, ${message})
      `
    } catch {
      // Table might not exist, create it
      await sql`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          subject VARCHAR(255),
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      await sql`
        INSERT INTO contact_messages (name, email, phone, subject, message)
        VALUES (${name}, ${email}, ${phone || null}, ${subject || null}, ${message})
      `
    }

    // Send confirmation email to user
    const firstName = name.split(' ')[0]
    let emailSent = false
    
    try {
      emailSent = await sendFormConfirmation({
        email,
        firstName,
        formType: 'Contact Form Submission',
        details: {
          'Name': name,
          'Email': email,
          'Phone': phone || 'Not provided',
          'Subject': subject || 'General Inquiry',
          'Message': message
        }
      })
      
      if (!emailSent) {
        console.error('[v0] Email failed to send - check ZEPTO_MAIL_PASSWORD environment variable')
      }
    } catch (emailError) {
      console.error('[v0] Email error:', emailError)
    }

    return NextResponse.json({ success: true, emailSent })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit message' },
      { status: 500 }
    )
  }
}
