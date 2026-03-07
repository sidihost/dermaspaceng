import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendFormConfirmation } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { name, email, phone, subject, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
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
    await sendFormConfirmation({
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit message' },
      { status: 500 }
    )
  }
}
