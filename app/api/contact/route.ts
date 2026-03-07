import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

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
    await sql`
      INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES (${name}, ${email}, ${phone || null}, ${subject || null}, ${message})
    `

    // TODO: Send email notification to info@dermaspaceng.com

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit message' },
      { status: 500 }
    )
  }
}
