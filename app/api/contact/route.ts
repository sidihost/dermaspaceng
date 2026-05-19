import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendFormConfirmation } from '@/lib/email'
import {
  honeypotResponse,
  parseJsonBody,
  requireSameOrigin,
  withRateLimit,
} from '@/lib/api-guard'

interface ContactBody {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  captchaToken?: string
}

export async function POST(request: Request) {
  try {
    // 1. Cross-site lockout. Real submissions come from our own
    //    /contact page; a forged fetch from another origin gets a
    //    403 here regardless of cookies or rate-limit state.
    const csrf = requireSameOrigin(request)
    if (csrf) return csrf

    // 2. Per-IP rate limit: 5 submissions per 10 minutes is plenty
    //    for a real human + a typo-and-retry. Beyond that we 429
    //    so the email-confirmation step doesn't blast Zepto.
    const rl = await withRateLimit(request, {
      bucket: 'contact:ip',
      limit: 5,
      windowSec: 600,
    })
    if (rl) return rl

    // 3. Body size cap (16 KB default). Stops a 10 MB blob from
    //    pinning a serverless container.
    const parsed = await parseJsonBody<ContactBody>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    // 4. Honeypot — silently 200 if a bot ticked the hidden field.
    const trap = honeypotResponse(body as Record<string, unknown>)
    if (trap) return trap

    const { name, email, phone, subject, message, captchaToken } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
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
